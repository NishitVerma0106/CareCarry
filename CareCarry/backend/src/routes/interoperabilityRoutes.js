const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const {
  getProviders,
  patientMatch,
  discoverPatientRecords,
  fetchFederatedDocument,
  linkAbhaId,
  getInteroperabilityStats,
} = require('../controllers/interoperabilityController');

router.use(authenticate);

// Healthcare Network Providers
router.get('/providers', getProviders);
router.get('/stats', getInteroperabilityStats);

// Patient Identity Matching across Hospital HIS
router.post('/patient-match', authorize('hospital_staff', 'doctor', 'admin'), patientMatch);

// Federated Record Discovery (Metadata query across connected systems)
router.get('/records', authorize('hospital_staff', 'doctor', 'patient', 'admin'), discoverPatientRecords);
router.get('/patient/:carecarryId/records', authorize('hospital_staff', 'doctor', 'patient', 'admin'), discoverPatientRecords);

// On-demand Federated Document Streaming (Retrieved from source HIS, not stored permanently)
router.get('/records/:recordId/fetch', authorize('hospital_staff', 'doctor', 'patient', 'admin'), fetchFederatedDocument);
router.get('/documents/:recordId/stream', authorize('hospital_staff', 'doctor', 'patient', 'admin'), fetchFederatedDocument);

// National Health Identity (ABHA) Mapping
router.post('/abha/link', authorize('patient', 'hospital_staff', 'doctor', 'admin'), linkAbhaId);

module.exports = router;
