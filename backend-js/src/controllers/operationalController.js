async function operational(req, res){
  // req.user set by requireAuth; verify workspace assignment
  try{
    // allow Admin to specify workspace via query/body when inspecting client
    let workspaceId = null
    if(req.user && req.user.workspace_id) workspaceId = req.user.workspace_id
    else if(req.user && req.user.role === 'Admin'){
      const q = (req.query && (req.query.workspace || req.query.workspace_id)) || (req.body && req.body.workspace_id)
      const wid = q ? Number(q) : null
      if(wid && !Number.isNaN(wid)) workspaceId = wid
    }
    if(!workspaceId) return res.status(403).json({ error: 'no_workspace' });
    return res.json({ message: 'Login exitoso como Responsable del SGC' });
  }catch(err){
    console.error('operational error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { operational };
