const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { upload, handleUploadError } = require('../middleware/upload');
const {
  getMyProfile,
  updateMyProfile,
  getCareCarryId,
  getTimeline,
  uploadReport,
  getMyReports,
  getMyConsultations,
  getMyPrescriptions,
  getAccess,
  updateConsent,
} = require('../controllers/patientController');

router.use(authenticate, authorize('patient'));

// Profile
router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);

// CareCard / CareCarry ID
router.get('/carecard', getCareCarryId);
router.get('/me/carecarry-id', getCareCarryId);

// Longitudinal Timeline
router.get('/timeline', getTimeline);
router.get('/me/timeline', getTimeline);

// Medical Reports (Section 8: Patient Medical Report Upload)
router.get('/reports', getMyReports);
router.post('/reports', upload.single('file'), handleUploadError, uploadReport);

// Consultations & Prescriptions
router.get('/consultations', getMyConsultations);
router.get('/prescriptions', getMyPrescriptions);

// Consent & Access History
router.get('/access', getAccess);
router.get('/me/access-history', getAccess);
router.patch('/access/:id', updateConsent);
router.post('/access/:id/approve', (req, res, next) => { req.body.status = 'approved'; updateConsent(req, res, next); });
router.post('/access/:id/reject', (req, res, next) => { req.body.status = 'rejected'; updateConsent(req, res, next); });
router.post('/access/:id/revoke', (req, res, next) => { req.body.status = 'revoked'; updateConsent(req, res, next); });

module.exports = router;
