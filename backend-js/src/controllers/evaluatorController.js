async function evaluator(req, res){
  try{
    if(!req.user || !req.user.workspace_id) return res.status(403).json({ error: 'no_workspace' });
    return res.json({ message: 'Login exitoso como Evaluador' });
  }catch(err){
    console.error('evaluator error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { evaluator };
