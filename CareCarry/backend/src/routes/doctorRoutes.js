const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { authorize, requireVerifiedDoctor } = require('../middleware/authorize');
const {
  getEncounters,
  getClinicalSummary,
  createConsultation,
  updateConsultation,
  createDiagnosis,
  createPrescription,
  getPatientHistory,
  updateEncounterStatus,
} = require('../controllers/doctorController');

router.use(authenticate, authorize('doctor'), requireVerifiedDoctor);

// Encounter Queue (Section 14 & 18)
router.get('/encounters', getEncounters);
router.get('/me/queue', getEncounters);
router.patch('/encounters/:id/status', updateEncounterStatus);

// Clinical Summary (Section 15 & 18)
router.get('/encounters/:id/clinical-summary', getClinicalSummary);
router.get('/patients/:patientId/summary', getClinicalSummary);

// Clinical Actions
router.post('/consultations', createConsultation);
router.put('/consultations/:id', updateConsultation);
router.post('/diagnoses', createDiagnosis);
router.post('/prescriptions', createPrescription);

// History
router.get('/patients/:id/history', getPatientHistory);

module.exports = router;
