const Router = require('express').Router;
const router = Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { listWorkspaces, createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace } = require('../controllers/useWorkspaces');

// list workspaces (admin-only)
router.get('/', requireAuth, requireRole('Admin'), listWorkspaces);
// other workspace endpoints (optional)
router.post('/', requireAuth, requireRole('Admin'), createWorkspace);
router.get('/:id', requireAuth, requireRole('Admin'), getWorkspace);
router.put('/:id', requireAuth, requireRole('Admin'), updateWorkspace);
router.delete('/:id', requireAuth, requireRole('Admin'), deleteWorkspace);

module.exports = router;
