const { verifyAccessToken } = require('../auth');

// General auth middleware to protect routes.
// Checks for Bearer token, verifies it, 
// and attaches user info to req.user.
function requireAuth(req, res, next){
  const auth = req.headers.authorization;
  if(!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthenticated' });
  const token = auth.slice(7);
  try{
    req.user = verifyAccessToken(token);
    return next();
  }catch(err){
    return res.status(401).json({ error: 'invalid_token' });
  }
}

function requireRole(roleName){
  return (req, res, next) => {
    if(!req.user) return res.status(401).json({ error: 'unauthenticated' });
    if(req.user.role !== roleName && req.user.role !== 'Admin') return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

function requireRoles(...roles){
  const allowed = Array.isArray(roles[0]) ? roles[0] : roles;
  return (req, res, next) => {
    if(!req.user) return res.status(401).json({ error: 'unauthenticated' });
    if(allowed.includes(req.user.role) || req.user.role === 'Admin') return next();
    return res.status(403).json({ error: 'forbidden' });
  };
}

module.exports = { requireAuth, requireRole, requireRoles };
