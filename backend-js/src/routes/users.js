const Router = require('express').Router;
const router = Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { createUser, listUsers, getUser, updateUser, deleteUser, assignUserToWorkspace } = require('../controllers/userController');

// create user (admin-only)
router.post('/', requireAuth, requireRole('Admin'), createUser);
// list users (admin-only)
router.get('/', requireAuth, requireRole('Admin'), listUsers);
// get single user
router.get('/:id', requireAuth, requireRole('Admin'), getUser);
// update user
router.put('/:id', requireAuth, requireRole('Admin'), updateUser);
// delete user
router.delete('/:id', requireAuth, requireRole('Admin'), deleteUser);
// assign/unassign workspace
router.put('/:id/workspace', requireAuth, requireRole('Admin'), assignUserToWorkspace);

module.exports = router;
