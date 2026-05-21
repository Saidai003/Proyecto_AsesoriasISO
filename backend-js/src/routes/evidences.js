const Router = require('express').Router;
const router = Router();
const { requireAuth } = require('../middleware/auth');
const { listByRequisito, createEvidence, updateEvidence, deleteEvidence, downloadEvidence, getEvidenceHistory } = require('../controllers/evidenceController');

router.get('/requisito/:id', requireAuth, listByRequisito);
router.get('/:id/download', requireAuth, downloadEvidence);
router.get('/:id/history', requireAuth, getEvidenceHistory);
router.post('/', requireAuth, createEvidence);
router.patch('/:id', requireAuth, updateEvidence);
router.delete('/:id', requireAuth, deleteEvidence);

module.exports = router;
