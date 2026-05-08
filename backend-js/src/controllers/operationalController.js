async function operational(req, res){
  // req.user set by requireAuth; verify workspace assignment
  try{
    if(!req.user || !req.user.workspace_id) return res.status(403).json({ error: 'no_workspace' });
    return res.json({ message: 'Login exitoso como Responsable del SGC' });
  }catch(err){
    console.error('operational error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { operational };
