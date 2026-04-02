import { Router } from 'express'
import multer from 'multer'
import { authenticateToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import supabase from '../db/supabase.js'
import { getSignedUrl } from '../services/storage.js'
import { sendPushToClass } from '../services/fcm.js'
import { sendParentEmailForHomework } from '../services/email.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { user } = req
    let query = supabase.from('homework').select('id, title, description, type, due_date, created_at, class_group_id')

    if (user.role === 'student') query = query.eq('class_group_id', user.class_group_id)
    else if (user.role === 'teacher') {
      const { data: cgs } = await supabase.from('class_groups').select('id').eq('school_id', user.school_id)
      const ids = (cgs || []).map((c) => c.id)
      query = query.in('class_group_id', ids).eq('created_by', user.id)
    } else if (user.role === 'parent') {
      const { data: child } = await supabase.from('users').select('class_group_id').eq('id', user.parent_of_user_id).single()
      if (child) query = query.eq('class_group_id', child.class_group_id)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch homework' })
  }
})

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase.from('homework').select('*').eq('id', req.params.id).single()
    if (error || !data) return res.status(404).json({ error: 'Homework not found' })
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to fetch homework' })
  }
})

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

router.post('/', authenticateToken, requireRole('teacher', 'admin'), upload.single('file'), async (req, res) => {
  try {
    const { title, description, type, due_date, class_group_id, questions } = req.body
    if (!title || !type || !due_date || !class_group_id) return res.status(400).json({ error: 'Missing required fields' })

    let file_path = null
    if (type === 'pdf' && req.file) {
      const fileName = `homework/${Date.now()}_${req.file.originalname.replace(/[^a-z0-9.]/gi, '_')}`
      const { error: uploadErr } = await supabase.storage.from('homework-pdfs').upload(fileName, req.file.buffer, { contentType: req.file.mimetype })
      if (uploadErr) throw uploadErr
      file_path = fileName
    }

    const { data: hw, error } = await supabase.from('homework').insert({ title, description, type, due_date, class_group_id, created_by: req.user.id, file_path }).select().single()
    if (error) throw error

    if (type === 'quiz' && questions) {
      const parsed = JSON.parse(questions)
      const qRows = parsed.map((q, i) => ({ homework_id: hw.id, question_text: q.question_text, options: q.options, correct_option: q.correct_option, order_index: i }))
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

export default router
