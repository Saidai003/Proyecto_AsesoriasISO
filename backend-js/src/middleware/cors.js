module.exports = function devCors(req, res, next){
  // Development CORS helper. In production use the `cors` package with strict origin list.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if(req.method === 'OPTIONS') return res.sendStatus(200);
  next();
};
