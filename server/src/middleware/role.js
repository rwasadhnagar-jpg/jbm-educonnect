import { isAdminRole } from '../services/role-utils.js'

function expandRoles(roles) {
  if (roles.includes('admin')) {
    return [...new Set([...roles, 'sub_admin'])]
  }
  return roles
}

export function requireRole(...roles) {
  const allowedRoles = expandRoles(roles)

  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' })
    if (allowedRoles.includes(req.user.role)) return next()
    if (roles.includes('admin') && isAdminRole(req.user.role)) return next()
    return res.status(403).json({ error: 'Insufficient permissions' })
  }
}
