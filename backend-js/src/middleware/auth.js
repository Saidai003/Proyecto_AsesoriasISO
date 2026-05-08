const { verifyAccessToken } = require('../auth');

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

module.exports = { requireAuth, requireRole };
