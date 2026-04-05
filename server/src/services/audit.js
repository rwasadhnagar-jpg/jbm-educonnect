import supabase from '../db/supabase.js'

export async function logAuditEvent({
  actorId = null,
  actorRole = null,
  action,
  entityType,
  entityId = null,
  details = null
}) {
  if (!action || !entityType) return

  try {
    await supabase.from('audit_logs').insert({
      actor_id: actorId,
      actor_role: actorRole,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details
    })
  } catch (error) {
    console.error('Audit log failed:', error.message)
  }
}
