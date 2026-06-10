module.exports = function devCors(req, res, next){
  // Development CORS helper that supports credentialed requests from localhost dev servers.
  // Configure allowed origins via ENV if needed.
  const allowed = (process.env.DEV_ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(s=>s.trim());
  const origin = req.headers.origin;
  if(origin && allowed.includes(origin)){
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if(req.method === 'OPTIONS') return res.sendStatus(200);
  next();
};
