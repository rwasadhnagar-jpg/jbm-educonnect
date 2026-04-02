import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import supabase from '../db/supabase.js'

const router = Router()

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    res.json(data || [])
  } catch {
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
    res.json({ message: 'Marked as read' })
  } catch {
    res.status(500).json({ error: 'Failed to update notification' })
  }
})

router.post('/fcm-token', authenticateToken, async (req, res) => {
  try {
    const { fcm_token } = req.body
    if (!fcm_token) return res.status(400).json({ error: 'fcm_token required' })
    await supabase.from('users').update({ fcm_token }).eq('id', req.user.id)
    res.json({ message: 'FCM token saved' })
  } catch {
    res.status(500).json({ error: 'Failed to save FCM token' })
  }
})

export default router
