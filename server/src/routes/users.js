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
      .select('id, username, full_name, email, role, class_group_id, is_active, last_login, class_groups(name)')
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

// Teacher fetches students in their own class (no admin required)
router.get('/my-class-students', authenticateToken, async (req, res) => {
  try {
    const classId = req.user.class_group_id
    if (!classId) return res.json([])
    const { data, error } = await supabase
      .from('users')
      .select('id, username, full_name, email, is_active, last_login, class_group_id')
      .eq('class_group_id', classId)
      .eq('role', 'student')
      .order('full_name')
    if (error) throw error
    res.json(data || [])
  } catch {
    res.status(500).json({ error: 'Failed to fetch class students' })
  }
})

router.get('/class-groups', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('class_groups')
      .select('id, name, grade, section, code')
      .order('grade')
      .order('section')
    if (error) throw error
    res.json(data || [])
  } catch {
    res.status(500).json({ error: 'Failed to fetch class groups' })
  }
})

// Bulk import class groups from Excel
router.post('/class-groups/bulk', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { classes } = req.body
    if (!Array.isArray(classes) || classes.length === 0)
      return res.status(400).json({ error: 'No classes provided' })

    const { data: school } = await supabase.from('schools').select('id').limit(1).single()
    if (!school) return res.status(400).json({ error: 'No school found' })

    const results = { created: [], failed: [] }

    for (const c of classes) {
      const name = String(c.class_name || c.name || '').trim()
      const code = String(c.code || '').trim()
      if (!name) { results.failed.push({ name: code || '?', reason: 'Missing class name' }); continue }

      // Parse grade and section from name
      let grade, section
      if (name.toLowerCase().startsWith('nursery')) {
        grade = -1
        section = name.includes(' - ') ? name.split(' - ')[1].trim() : 'A'
      } else if (name.toLowerCase().startsWith('prep')) {
        grade = 0
        section = name.includes(' - ') ? name.split(' - ')[1].trim() : 'A'
      } else {
        const m = name.match(/^class\s+(\d+)\s+-\s+(.+)$/i)
        if (!m) { results.failed.push({ name, reason: 'Cannot parse class name' }); continue }
        grade = parseInt(m[1])
        section = m[2].trim()
      }

      const { data, error } = await supabase.from('class_groups').upsert({
        school_id: school.id, name, grade, section, code: code || null
      }, { onConflict: 'school_id,grade,section' }).select('id, name, grade, section, code').single()

      if (error) results.failed.push({ name, reason: error.message })
      else results.created.push(data)
    }

    res.status(201).json(results)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Bulk class import failed' })
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

// Any logged-in user can change their own password
router.patch('/me/password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both current and new password are required' })
    if (new_password.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' })

    const { data: user, error } = await supabase.from('users').select('password_hash').eq('id', req.user.id).single()
    if (error || !user) return res.status(404).json({ error: 'User not found' })

    const valid = await bcrypt.compare(current_password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })

    const password_hash = await bcrypt.hash(new_password, 12)
    const { error: updateErr } = await supabase.from('users').update({ password_hash }).eq('id', req.user.id)
    if (updateErr) throw updateErr
    res.json({ message: 'Password changed successfully' })
  } catch {
    res.status(500).json({ error: 'Failed to change password' })
  }
})

// Bulk create users from Excel import
router.post('/bulk', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { users, default_password } = req.body
    if (!Array.isArray(users) || users.length === 0) return res.status(400).json({ error: 'No users provided' })
    if (!default_password || default_password.length < 8) return res.status(400).json({ error: 'Default password must be at least 8 characters' })

    const { data: school } = await supabase.from('schools').select('id').limit(1).single()
    const defaultHash = await bcrypt.hash(default_password, 12)

    const results = { created: [], failed: [] }

    for (const u of users) {
      if (!u.username || !u.full_name || !u.role) {
        results.failed.push({ username: u.username || '?', reason: 'Missing required fields' })
        continue
      }
      const password_hash = u.password && u.password.length >= 8
        ? await bcrypt.hash(u.password, 12)
        : defaultHash
      const { data, error } = await supabase.from('users').insert({
        username: String(u.username).trim().toLowerCase(),
        full_name: String(u.full_name).trim(),
        email: u.email || null,
        role: u.role,
        class_group_id: u.class_group_id || null,
        password_hash,
        school_id: school?.id
      }).select('id, username, full_name, role').single()

      if (error) {
        results.failed.push({ username: u.username, reason: error.code === '23505' ? 'Username already exists' : error.message })
      } else {
        results.created.push(data)
      }
    }

    res.status(201).json(results)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Bulk create failed' })
  }
})

// Edit user details
router.patch('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { full_name, email, class_group_id, role, is_active } = req.body
    const updates = {}
    if (full_name !== undefined) updates.full_name = full_name
    if (email !== undefined) updates.email = email || null
    if (class_group_id !== undefined) updates.class_group_id = class_group_id || null
    if (role !== undefined) updates.role = role
    if (is_active !== undefined) updates.is_active = is_active
    const { data, error } = await supabase.from('users').update(updates).eq('id', req.params.id)
      .select('id, username, full_name, email, role, class_group_id, is_active').single()
    if (error) throw error
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// Delete user
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('users').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ message: 'User deleted' })
  } catch {
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

// Bulk password reset for a class
router.post('/class/:classId/reset-password', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { password } = req.body
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
    const password_hash = await bcrypt.hash(password, 12)
    const { data, error } = await supabase.from('users')
      .update({ password_hash })
      .eq('class_group_id', req.params.classId)
      .eq('role', 'student')
      .select('id')
    if (error) throw error
    res.json({ message: `Reset passwords for ${data?.length || 0} students` })
  } catch {
    res.status(500).json({ error: 'Failed to reset passwords' })
  }
})

export default router
