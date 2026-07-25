const Router = require('express').Router;
const router = Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { listByRequisito, createEvidence, updateEvidence, deleteEvidence, downloadEvidence, getEvidenceHistory } = require('../controllers/evidenceController');

router.get('/requisito/:id', requireAuth, listByRequisito);
router.get('/:id/download', requireAuth, downloadEvidence);
router.get('/:id/history', requireAuth, getEvidenceHistory);
router.post('/', requireAuth, requireRole('Responsable SGC'), createEvidence);
// La aprobación/rechazo es una decisión del Evaluador, no una edición del archivo.
router.patch('/:id/estado', requireAuth, requireRole('Evaluador'), updateEvidence);
router.patch('/:id', requireAuth, requireRole('Responsable SGC'), updateEvidence);
router.delete('/:id', requireAuth, requireRole('Responsable SGC'), deleteEvidence);

module.exports = router;
