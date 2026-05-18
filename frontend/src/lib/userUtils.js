// Small utilities for user role checks
// Prefer explicit `user.roles` array from backend; fallback to `user.role` string.
export function getRoles(user){
  if(!user) return []
  if(Array.isArray(user.roles)) return user.roles.map(r=>String(r).toLowerCase())
  if(user.role) return [String(user.role).toLowerCase()]
  return []
}

export function getRoleLower(user){
  const roles = getRoles(user)
  return roles.length ? roles[0] : ''
}

export function hasRole(user, roleName){
  if(!roleName) return false
  const name = String(roleName).toLowerCase()
  const roles = getRoles(user)
  return roles.includes(name)
}

export default { getRoles, getRoleLower, hasRole }
