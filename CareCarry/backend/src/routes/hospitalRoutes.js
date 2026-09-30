const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { authorize, requireVerifiedStaff } = require('../middleware/authorize');
const { upload, handleUploadError } = require('../middleware/upload');
const {
  resolvePatient,
  createEncounter,
  getEncounters,
  getEncounter,
  updateEncounterStatus,
  dischargeEncounter,
  getHospitalStats,
  getHospitalDepartments,
  getHospitalDoctors,
  uploadReport,
  getEncounterReports,
  createLabOrder,
  getLabOrders,
  updateLabOrderStatus,
  getPharmacyPrescriptions,
  dispensePrescriptionItem,
} = require('../controllers/hospitalController');

router.use(authenticate, authorize('hospital_staff', 'admin'), requireVerifiedStaff);

// Command Center & Stats
router.get('/stats', getHospitalStats);
router.get('/departments', getHospitalDepartments);

// Patient resolution / identification
router.post('/patients/resolve', resolvePatient);
router.post('/patients/lookup', resolvePatient);

// Doctors list for assignment
router.get('/doctors', getHospitalDoctors);

// Encounters & Queue Operations
router.post('/encounters', createEncounter);
router.get('/encounters', getEncounters);
router.get('/encounters/:id', getEncounter);
router.patch('/encounters/:id/status', updateEncounterStatus);
router.post('/encounters/:id/close', (req, res, next) => {
  req.body.queue_status = 'completed';
  return updateEncounterStatus(req, res, next);
});
router.post('/encounters/:id/discharge', dischargeEncounter);

// Medical Documents
router.post('/encounters/:id/reports', upload.single('file'), handleUploadError, uploadReport);
router.get('/encounters/:id/reports', getEncounterReports);
router.post('/reports', upload.single('file'), handleUploadError, uploadReport);

// Laboratory Integration
router.post('/encounters/:id/lab-orders', createLabOrder);
router.get('/encounters/:id/lab-orders', getLabOrders);
router.get('/lab-orders', getLabOrders);
router.patch('/lab-orders/:id/status', updateLabOrderStatus);

// Pharmacy Integration
router.get('/pharmacy/prescriptions', getPharmacyPrescriptions);
router.get('/pharmacy/prescriptions/:encounterId', getPharmacyPrescriptions);
router.patch('/pharmacy/items/:itemId/dispense', dispensePrescriptionItem);
router.patch('/pharmacy/items/:itemId/status', dispensePrescriptionItem);

module.exports = router;
