import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import supabase from '../db/supabase.js'
import { createMeetSpace } from '../services/googlemeet.js'
import { sendPushToClass } from '../services/fcm.js'

const router = Router()

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { user } = req
    let query = supabase.from('sessions').select('id, title, start_time, end_time, status, class_group_id, teacher_id')

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
    res.json(data || [])
  } catch {
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
})

router.post('/', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { title, class_group_id, start_time, end_time } = req.body
    if (!title || !class_group_id || !start_time || !end_time)
      return res.status(400).json({ error: 'Missing required fields' })
    if (new Date(end_time) <= new Date(start_time))
      return res.status(400).json({ error: 'end_time must be after start_time' })

    // Create a Google Meet space using the teacher's Workspace email
    let meet_uri = null
    let meet_space_name = null
    try {
      const { data: teacher } = await supabase.from('users').select('email').eq('id', req.user.id).single()
      if (teacher?.email) {
        const space = await createMeetSpace(teacher.email)
        meet_uri = space.meetingUri
        meet_space_name = space.spaceName
      }
    } catch (meetErr) {
      console.warn('Google Meet space creation failed, session saved without Meet link:', meetErr.message)
    }

    const { data, error } = await supabase.from('sessions').insert({
      title,
      class_group_id,
      teacher_id: req.user.id,
      start_time,
      end_time,
      meet_uri,
      meet_space_name,
      status: 'scheduled'
    }).select().single()

    if (error) throw error

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

    sendPushToClass(session.class_group_id, `Session is LIVE: ${session.title}`, 'Join now in Google Meet!').catch(() => {})
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to start session' })
  }
})

router.patch('/:id/end', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('sessions').update({ status: 'ended' }).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to end session' })
  }
})

// Returns the Google Meet URI for authorized users — never exposes it to parents
router.post('/:id/join', authenticateToken, requireRole('student', 'teacher'), async (req, res) => {
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
      return res.status(503).json({ error: 'Google Meet link not available for this session' })

    res.json({ meetUrl: session.meet_uri })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to get session link' })
  }
})

export default router
