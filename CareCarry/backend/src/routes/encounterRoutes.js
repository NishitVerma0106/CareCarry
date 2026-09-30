const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { upload, handleUploadError } = require('../middleware/upload');
const {
  createEncounter,
  getEncounters,
  getEncounter,
  updateEncounterStatus,
  dischargeEncounter,
  uploadReport,
  getEncounterReports,
  createLabOrder,
  getLabOrders,
} = require('../controllers/hospitalController');

router.use(authenticate, authorize('hospital_staff', 'doctor', 'admin'));

// Core Encounter Lifecycle
router.post('/', createEncounter);
router.get('/', getEncounters);
router.get('/:id', getEncounter);
router.patch('/:id/status', updateEncounterStatus);
router.post('/:id/close', (req, res, next) => {
  req.body.queue_status = 'completed';
  return updateEncounterStatus(req, res, next);
});
router.post('/:id/discharge', dischargeEncounter);

// Attached Documents
router.post('/:id/reports', upload.single('file'), handleUploadError, uploadReport);
router.get('/:id/reports', getEncounterReports);

// Attached Lab Orders
router.post('/:id/lab-orders', createLabOrder);
router.get('/:id/lab-orders', getLabOrders);

module.exports = router;
