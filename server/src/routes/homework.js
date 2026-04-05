import { Router } from 'express'
import multer from 'multer'
import { authenticateToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import supabase from '../db/supabase.js'
import { getSignedUrl } from '../services/storage.js'
import { sendPushToClass } from '../services/fcm.js'
import { sendParentEmailForHomework } from '../services/email.js'
import { logAuditEvent } from '../services/audit.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// GET all homework
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { user } = req
    let query = supabase.from('homework').select('id, title, description, type, due_date, created_at, class_group_id, subject, max_marks, category')

    if (user.role === 'student') query = query.eq('class_group_id', user.class_group_id)
    else if (user.role === 'teacher') query = query.eq('created_by', user.id)
    else if (user.role === 'parent') {
      const { data: child } = await supabase.from('users').select('class_group_id').eq('id', user.parent_of_user_id).single()
      if (child) query = query.eq('class_group_id', child.class_group_id)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    const homeworkIds = (data || []).map((item) => item.id)
    let submissions = []
    if (homeworkIds.length) {
      const { data: submissionData } = await supabase
        .from('homework_submissions')
        .select('homework_id, student_id, marks_obtained, submitted_at')
        .in('homework_id', homeworkIds)
      submissions = submissionData || []
    }
    const submissionMap = submissions.reduce((acc, row) => {
      if (!acc[row.homework_id]) acc[row.homework_id] = { submitted_count: 0, checked_count: 0, late_count: 0 }
      acc[row.homework_id].submitted_count += 1
      if (row.marks_obtained !== null && row.marks_obtained !== undefined) acc[row.homework_id].checked_count += 1
      return acc
    }, {})
    res.json((data || []).map((item) => ({
      ...item,
      submitted_count: submissionMap[item.id]?.submitted_count || 0,
      checked_count: submissionMap[item.id]?.checked_count || 0
    })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch homework' })
  }
})

// GET single homework
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase.from('homework').select('*').eq('id', req.params.id).single()
    if (error || !data) return res.status(404).json({ error: 'Homework not found' })
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to fetch homework' })
  }
})

// GET PDF signed URL
router.get('/:id/pdf-url', authenticateToken, async (req, res) => {
  try {
    const { data: hw } = await supabase.from('homework').select('file_path, type').eq('id', req.params.id).single()
    if (!hw || hw.type !== 'pdf' || !hw.file_path) return res.status(404).json({ error: 'PDF not found' })
    const url = await getSignedUrl(hw.file_path)
    res.json({ url })
  } catch {
    res.status(500).json({ error: 'Failed to generate PDF URL' })
  }
})

// GET submissions for a homework (teacher/admin)
router.get('/:id/submissions', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { data: hw } = await supabase.from('homework').select('class_group_id, created_by').eq('id', req.params.id).single()
    if (!hw) return res.status(404).json({ error: 'Homework not found' })
    if (hw.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })

    const { data: students } = await supabase.from('users')
      .select('id, full_name, username')
      .eq('class_group_id', hw.class_group_id)
      .eq('role', 'student')
      .order('full_name')

    const { data: submissions } = await supabase.from('homework_submissions')
      .select('*')
      .eq('homework_id', req.params.id)

    const submissionMap = {}
    ;(submissions || []).forEach(s => { submissionMap[s.student_id] = s })

    const result = (students || []).map(s => ({
      student_id: s.id,
      full_name: s.full_name,
      username: s.username,
      submitted: !!submissionMap[s.id],
      submission: submissionMap[s.id]
        ? {
            ...submissionMap[s.id],
            is_late: submissionMap[s.id]?.submitted_at
              ? new Date(submissionMap[s.id].submitted_at) > new Date(hw.due_date)
              : false
          }
        : null
    }))

    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch submissions' })
  }
})

// GET student's own submission
router.get('/:id/my-submission', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('homework_submissions')
      .select('*')
      .eq('homework_id', req.params.id)
      .eq('student_id', req.user.id)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    res.json(data || null)
  } catch {
    res.status(500).json({ error: 'Failed to fetch submission' })
  }
})

// POST submit homework (student)
router.post('/:id/submit', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { text_response } = req.body
    const { data: existing } = await supabase.from('homework_submissions')
      .select('id')
      .eq('homework_id', req.params.id)
      .eq('student_id', req.user.id)
      .single()

    if (existing) {
      const { data, error } = await supabase.from('homework_submissions')
        .update({ text_response, submitted_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select().single()
      if (error) throw error
      await logAuditEvent({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'submit',
        entityType: 'homework',
        entityId: req.params.id,
        details: { update: true }
      })
      return res.json(data)
    }

    const { data, error } = await supabase.from('homework_submissions').insert({
      homework_id: req.params.id,
      student_id: req.user.id,
      text_response
    }).select().single()
    if (error) throw error
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'submit',
      entityType: 'homework',
      entityId: req.params.id
    })
    res.status(201).json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to submit homework' })
  }
})

// PATCH grade a submission (teacher/admin)
router.patch('/:id/submissions/:studentId/grade', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { marks_obtained, teacher_remark } = req.body
    const { data, error } = await supabase.from('homework_submissions')
      .update({
        marks_obtained: parseFloat(marks_obtained),
        teacher_remark: teacher_remark || null,
        graded_by: req.user.id,
        graded_at: new Date().toISOString()
      })
      .eq('homework_id', req.params.id)
      .eq('student_id', req.params.studentId)
      .select().single()
    if (error) throw error
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'grade',
      entityType: 'homework_submission',
      entityId: data.id
    })
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to grade submission' })
  }
})

// POST create homework
router.post('/', authenticateToken, requireRole('teacher', 'admin'), upload.single('file'), async (req, res) => {
  try {
    const { title, description, type, due_date, class_group_id, questions, subject, max_marks, category } = req.body
    if (!title || !type || !due_date || !class_group_id) return res.status(400).json({ error: 'Missing required fields' })

    let file_path = null
    if (type === 'pdf' && req.file) {
      const fileName = `homework/${Date.now()}_${req.file.originalname.replace(/[^a-z0-9.]/gi, '_')}`
      const { error: uploadErr } = await supabase.storage.from('homework-pdfs').upload(fileName, req.file.buffer, { contentType: req.file.mimetype })
      if (uploadErr) throw uploadErr
      file_path = fileName
    }

    const { data: hw, error } = await supabase.from('homework').insert({
      title, description, type, due_date, class_group_id,
      created_by: req.user.id, file_path,
      subject: subject || null,
      max_marks: max_marks ? parseInt(max_marks) : null,
      category: category || 'Homework'
    }).select().single()
    if (error) throw error
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'create',
      entityType: 'homework',
      entityId: hw.id,
      details: { title, type, class_group_id }
    })

    if (type === 'quiz' && questions) {
      const parsed = JSON.parse(questions)
      const qRows = parsed.map((q, i) => ({
        homework_id: hw.id, question_text: q.question_text,
        options: q.options, correct_option: q.correct_option, order_index: i
      }))
      await supabase.from('quiz_questions').insert(qRows)
    }

    sendPushToClass(class_group_id, `New Homework: ${title}`, `Due ${new Date(due_date).toLocaleDateString('en-IN')}`).catch(() => {})
    sendParentEmailForHomework(class_group_id, title, due_date).catch(() => {})

    res.status(201).json(hw)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create homework' })
  }
})

// PATCH edit homework (teacher/admin)
router.patch('/:id', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { title, description, due_date, subject, max_marks, category } = req.body
    const { data: hw } = await supabase.from('homework').select('created_by').eq('id', req.params.id).single()
    if (!hw) return res.status(404).json({ error: 'Homework not found' })
    if (hw.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })

    const updates = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (due_date !== undefined) updates.due_date = due_date
    if (subject !== undefined) updates.subject = subject
    if (max_marks !== undefined) updates.max_marks = max_marks ? parseInt(max_marks) : null
    if (category !== undefined) updates.category = category

    const { data, error } = await supabase.from('homework').update(updates).eq('id', req.params.id).select().single()
    if (error) throw error
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'update',
      entityType: 'homework',
      entityId: req.params.id,
      details: updates
    })
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to update homework' })
  }
})

// DELETE homework (teacher/admin)
router.delete('/:id', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { data: hw } = await supabase.from('homework').select('created_by').eq('id', req.params.id).single()
    if (!hw) return res.status(404).json({ error: 'Homework not found' })
    if (hw.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const { error } = await supabase.from('homework').delete().eq('id', req.params.id)
    if (error) throw error
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'delete',
      entityType: 'homework',
      entityId: req.params.id
    })
    res.json({ message: 'Homework deleted' })
  } catch {
    res.status(500).json({ error: 'Failed to delete homework' })
  }
})

export default router
