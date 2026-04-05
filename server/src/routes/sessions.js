import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import supabase from '../db/supabase.js'
import { createJitsiRoom } from '../services/jitsi.js'
import { sendPushToClass } from '../services/fcm.js'
import { logAuditEvent } from '../services/audit.js'

const router = Router()

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { user } = req
    let query = supabase.from('sessions').select('id, title, subject, start_time, end_time, status, class_group_id, teacher_id, notes, created_at')

    if (user.role === 'student' || user.role === 'parent') {
      const classGroupId = user.class_group_id ||
        (user.role === 'parent'
          ? (await supabase.from('users').select('class_group_id').eq('id', user.parent_of_user_id).single()).data?.class_group_id
          : null)
      if (classGroupId) query = query.eq('class_group_id', classGroupId)
    } else if (user.role === 'teacher') {
      query = query.eq('teacher_id', user.id)
    }

    const { data, error } = await query.order('start_time', { ascending: true })
    if (error) throw error
    const sessionIds = (data || []).map((item) => item.id)
    let joinCounts = []
    if (sessionIds.length) {
      const { data: joinData } = await supabase
        .from('audit_logs')
        .select('entity_id')
        .eq('entity_type', 'session')
        .eq('action', 'join')
        .in('entity_id', sessionIds)
      joinCounts = joinData || []
    }
    const joinMap = joinCounts.reduce((acc, row) => {
      acc[row.entity_id] = (acc[row.entity_id] || 0) + 1
      return acc
    }, {})
    res.json((data || []).map((item) => ({
      ...item,
      participant_count: joinMap[item.id] || 0
    })))
  } catch {
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
})

router.post('/', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { title, subject, class_group_id, start_time, end_time } = req.body
    if (!title || !class_group_id || !start_time || !end_time)
      return res.status(400).json({ error: 'Missing required fields' })
    if (new Date(end_time) <= new Date(start_time))
      return res.status(400).json({ error: 'end_time must be after start_time' })

    const { data, error } = await supabase.from('sessions').insert({
      title, subject: subject || null, class_group_id,
      teacher_id: req.user.id,
      start_time, end_time,
      meet_uri: null, meet_space_name: null,
      status: 'scheduled'
    }).select().single()

    if (!error && data) {
      const { meetUrl, roomName } = createJitsiRoom(data.id)
      await supabase.from('sessions').update({ meet_uri: meetUrl, meet_space_name: roomName }).eq('id', data.id)
      data.meet_uri = meetUrl
      data.meet_space_name = roomName
    }

    if (error) throw error
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'create',
      entityType: 'session',
      entityId: data.id,
      details: { title, class_group_id, start_time, end_time, subject: subject || null }
    })

    sendPushToClass(class_group_id, `Session Scheduled: ${title}`, `Starts ${new Date(start_time).toLocaleString('en-IN')}`).catch(() => {})
    res.status(201).json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to schedule session' })
  }
})

router.patch('/:id/start', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { data: session } = await supabase.from('sessions').select('*').eq('id', req.params.id).single()
    if (!session) return res.status(404).json({ error: 'Session not found' })
    if (session.teacher_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' })

    const { data, error } = await supabase.from('sessions').update({ status: 'live' }).eq('id', req.params.id).select().single()
    if (error) throw error
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'start',
      entityType: 'session',
      entityId: req.params.id
    })

    sendPushToClass(session.class_group_id, `Session is LIVE: ${session.title}`, 'Join now on JBM EduConnect!').catch(() => {})
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to start session' })
  }
})

router.patch('/:id/end', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { data: session } = await supabase.from('sessions').select('teacher_id').eq('id', req.params.id).single()
    if (!session) return res.status(404).json({ error: 'Session not found' })
    if (session.teacher_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' })

    const { data, error } = await supabase.from('sessions').update({ status: 'ended' }).eq('id', req.params.id).select().single()
    if (error) throw error
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'end',
      entityType: 'session',
      entityId: req.params.id
    })
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to end session' })
  }
})

// PATCH add/update notes on a session
router.patch('/:id/notes', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { notes } = req.body
    const { data: session } = await supabase.from('sessions').select('teacher_id').eq('id', req.params.id).single()
    if (!session) return res.status(404).json({ error: 'Session not found' })
    if (session.teacher_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' })

    const { data, error } = await supabase.from('sessions').update({ notes }).eq('id', req.params.id).select().single()
    if (error) throw error
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'update_notes',
      entityType: 'session',
      entityId: req.params.id
    })
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to save notes' })
  }
})

// DELETE (cancel) a session
router.delete('/:id', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { data: session } = await supabase.from('sessions').select('teacher_id, status').eq('id', req.params.id).single()
    if (!session) return res.status(404).json({ error: 'Session not found' })
    if (session.teacher_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' })
    if (session.status === 'live')
      return res.status(400).json({ error: 'Cannot delete a live session. End it first.' })

    const { error } = await supabase.from('sessions').delete().eq('id', req.params.id)
    if (error) throw error
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'delete',
      entityType: 'session',
      entityId: req.params.id
    })
    res.json({ message: 'Session deleted' })
  } catch {
    res.status(500).json({ error: 'Failed to delete session' })
  }
})

// GET attendance for a session
router.get('/:id/attendance', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { data: session } = await supabase.from('sessions').select('class_group_id, teacher_id').eq('id', req.params.id).single()
    if (!session) return res.status(404).json({ error: 'Session not found' })
    if (session.teacher_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' })

    const { data: students } = await supabase.from('users')
      .select('id, full_name, username')
      .eq('class_group_id', session.class_group_id)
      .eq('role', 'student')
      .order('full_name')

    const { data: attendance } = await supabase.from('session_attendance')
      .select('*')
      .eq('session_id', req.params.id)

    const attMap = {}
    ;(attendance || []).forEach(a => { attMap[a.student_id] = a.status })

    const result = (students || []).map(s => ({
      student_id: s.id,
      full_name: s.full_name,
      username: s.username,
      status: attMap[s.id] || 'absent'
    }))
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch attendance' })
  }
})

// POST save attendance (bulk upsert)
router.post('/:id/attendance', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { attendance } = req.body
    if (!Array.isArray(attendance)) return res.status(400).json({ error: 'attendance must be an array' })

    const rows = attendance.map(entry => ({
      session_id: req.params.id,
      student_id: entry.student_id,
      status: entry.status || 'present',
      marked_at: new Date().toISOString()
    }))

    const { error } = await supabase.from('session_attendance')
      .upsert(rows, { onConflict: 'session_id,student_id' })
    if (error) throw error
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'save_attendance',
      entityType: 'session',
      entityId: req.params.id,
      details: { count: rows.length }
    })
    res.json({ message: `Attendance saved for ${rows.length} students` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save attendance' })
  }
})

// POST join session
router.post('/:id/join', authenticateToken, requireRole('student', 'teacher', 'admin'), async (req, res) => {
  try {
    const { user } = req
    const { data: session, error } = await supabase
      .from('sessions')
      .select('id, title, status, start_time, end_time, class_group_id, meet_uri')
      .eq('id', req.params.id)
      .single()

    if (error || !session) return res.status(404).json({ error: 'Session not found' })
    if (session.status !== 'live') return res.status(403).json({ error: 'Session is not live yet. Wait for the teacher to start it.' })

    const now = new Date()
    if (now > new Date(session.end_time)) return res.status(403).json({ error: 'This session has ended' })

    if (user.role === 'student' && session.class_group_id !== user.class_group_id)
      return res.status(403).json({ error: 'You are not enrolled in this class' })

    if (!session.meet_uri)
      return res.status(503).json({ error: 'Jitsi Meet link not available for this session' })

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: 'join',
      entityType: 'session',
      entityId: session.id
    })
    res.json({ meetUrl: session.meet_uri })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to get session link' })
  }
})

export default router
