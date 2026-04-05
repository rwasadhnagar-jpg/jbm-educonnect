import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import supabase from '../db/supabase.js'
import { logAuditEvent } from '../services/audit.js'

const router = Router()

// Get announcements (filtered by role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { user } = req
    let query = supabase
      .from('announcements')
      .select('id, title, message, target_class_group_id, created_at, is_pinned, class_groups(name), users(full_name)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (user.role === 'student' || user.role === 'teacher') {
      query = query.or(`target_class_group_id.is.null,target_class_group_id.eq.${user.class_group_id}`)
    }

    const { data, error } = await query
    if (error) throw error
    res.json((data || []).map(a => ({
      ...a,
      class_name: a.class_groups?.name || 'All Classes',
      created_by_name: a.users?.full_name || 'Admin',
      class_groups: undefined,
      users: undefined
    })))
  } catch {
    res.status(500).json({ error: 'Failed to fetch announcements' })
  }
})

// Create announcement (admin only)
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { title, message, target_class_group_id } = req.body
    if (!title || !message) return res.status(400).json({ error: 'Title and message are required' })

    const { data: school } = await supabase.from('schools').select('id').limit(1).single()
    const { data, error } = await supabase.from('announcements').insert({
      title, message,
      target_class_group_id: target_class_group_id || null,
      created_by: req.user.id,
      school_id: school?.id
    }).select().single()

    if (error) throw error
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'create',
      entityType: 'announcement',
      entityId: data.id
    })
    res.status(201).json(data)
  } catch {
    res.status(500).json({ error: 'Failed to create announcement' })
  }
})

// Delete announcement
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('announcements').delete().eq('id', req.params.id)
    if (error) throw error
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'delete',
      entityType: 'announcement',
      entityId: req.params.id
    })
    res.json({ message: 'Deleted' })
  } catch {
    res.status(500).json({ error: 'Failed to delete announcement' })
  }
})

// PATCH edit announcement (admin only)
router.patch('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { title, message, is_pinned } = req.body
    const updates = {}
    if (title !== undefined) updates.title = title
    if (message !== undefined) updates.message = message
    if (is_pinned !== undefined) updates.is_pinned = is_pinned
    const { data, error } = await supabase.from('announcements').update(updates).eq('id', req.params.id).select().single()
    if (error) throw error
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'update',
      entityType: 'announcement',
      entityId: req.params.id,
      details: updates
    })
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to update announcement' })
  }
})

export default router
