const ADMIN_ROLES = new Set(['admin', 'sub_admin'])

export function isAdminRole(role) {
  return ADMIN_ROLES.has(role)
}

export function canManageUsers(role) {
  return isAdminRole(role)
}
