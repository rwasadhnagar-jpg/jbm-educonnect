import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import supabase from '../db/supabase.js'

const router = Router()

router.get('/:homeworkId/questions', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('id, question_text, options, order_index, correct_option')
      .eq('homework_id', req.params.homeworkId)
      .order('order_index')

    if (error) throw error

    const role = req.user.role
    const questions = (data || []).map((q) => {
      if (role === 'student') {
        const { correct_option, ...rest } = q
        return rest
      }
      return q
    })

    res.json(questions)
  } catch {
    res.status(500).json({ error: 'Failed to fetch questions' })
  }
})

router.post('/:homeworkId/submit', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { answers } = req.body
    if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'Answers object required' })

    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('id, correct_option')
      .eq('homework_id', req.params.homeworkId)

    if (!questions?.length) return res.status(404).json({ error: 'Quiz not found' })

    const existing = await supabase.from('quiz_answers').select('id').eq('student_id', req.user.id).eq('question_id', questions[0].id).single()
    if (existing.data) return res.status(409).json({ error: 'Quiz already submitted' })

    const rows = questions.map((q) => ({
      student_id: req.user.id,
      question_id: q.id,
      selected_option: answers[q.id] ?? null,
      is_correct: answers[q.id] === q.correct_option,
      answered_at: new Date().toISOString()
    }))

    const { error } = await supabase.from('quiz_answers').insert(rows)
    if (error) throw error

    const score = rows.filter((r) => r.is_correct).length
    res.json({ score, total: questions.length, percentage: Math.round((score / questions.length) * 100) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to submit quiz' })
  }
})

router.get('/:homeworkId/results', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quiz_answers')
      .select('student_id, is_correct, users!quiz_answers_student_id_fkey(full_name)')
      .in('question_id', supabase.from('quiz_questions').select('id').eq('homework_id', req.params.homeworkId))

    if (error) throw error
    res.json(data || [])
  } catch {
    res.status(500).json({ error: 'Failed to fetch results' })
  }
})

export default router
