import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import supabase from '../db/supabase.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' })

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash, role, full_name, email, class_group_id, school_id')
      .eq('username', username.trim().toLowerCase())
      .single()

    if (error || !user) return res.status(401).json({ error: 'Invalid username or password' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' })

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
      email: user.email,
      class_group_id: user.class_group_id,
      school_id: user.school_id
    }

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' })

    res.json({ token, refreshToken, user: payload })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed. Please try again.' })
  }
})

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' })
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    const { data: user } = await supabase.from('users').select('id, username, role, full_name, email, class_group_id, school_id').eq('id', decoded.id).single()
    if (!user) return res.status(401).json({ error: 'User not found' })
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, full_name: user.full_name, email: user.email, class_group_id: user.class_group_id, school_id: user.school_id }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ token })
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' })
  }
})

router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logged out successfully' })
})

export default router
