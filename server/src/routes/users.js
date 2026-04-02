import { Router } from 'express'
import bcrypt from 'bcrypt'
import { authenticateToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import supabase from '../db/supabase.js'

const router = Router()

router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, full_name, email, role, class_group_id, class_groups(name)')
      .order('full_name')
    if (error) throw error
    const users = (data || []).map((u) => ({
      ...u,
      class_group_name: u.class_groups?.name || null,
      class_groups: undefined
    }))
    res.json(users)
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

router.get('/class-groups', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('class_groups')
      .select('id, name, grade, section')
      .order('grade')
      .order('section')
    if (error) throw error
    res.json(data || [])
  } catch {
    res.status(500).json({ error: 'Failed to fetch class groups' })
  }
})

router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { username, full_name, email, role, class_group_id, password } = req.body
    if (!username || !role || !password) return res.status(400).json({ error: 'username, role, and password are required' })
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

    const password_hash = await bcrypt.hash(password, 12)
    const { data: school } = await supabase.from('schools').select('id').limit(1).single()

    const { data, error } = await supabase.from('users').insert({
      username: username.trim().toLowerCase(),
      full_name,
      email: email || null,
      role,
      class_group_id: class_group_id || null,
      password_hash,
      school_id: school?.id
    }).select('id, username, full_name, email, role, class_group_id').single()

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Username already exists' })
      throw error
    }
    res.status(201).json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

router.patch('/:id/password', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { password } = req.body
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
    const password_hash = await bcrypt.hash(password, 12)
    const { error } = await supabase.from('users').update({ password_hash }).eq('id', req.params.id)
    if (error) throw error
    res.json({ message: 'Password updated successfully' })
  } catch {
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

export default router
