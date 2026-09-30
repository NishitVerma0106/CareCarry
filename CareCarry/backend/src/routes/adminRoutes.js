const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const {
  getPendingDoctors,
  verifyDoctor,
  suspendDoctor,
  getPendingHospitals,
  verifyHospital,
  getAuditLogs,
  getStatistics,
  getAllUsers,
  updateUserStatus,
} = require('../controllers/adminController');

router.use(authenticate, authorize('admin'));

// Doctors
router.get('/doctors/pending', getPendingDoctors);
router.get('/doctors', (req, res, next) => { req.query.status = 'all'; getPendingDoctors(req, res, next); });
router.patch('/doctors/:id/verify', verifyDoctor);
router.patch('/doctors/:id/suspend', suspendDoctor);

// Hospitals
router.get('/hospitals/pending', getPendingHospitals);
router.get('/hospitals', (req, res, next) => { req.query.status = 'all'; getPendingHospitals(req, res, next); });
router.patch('/hospitals/:id/verify', verifyHospital);

// Users
router.get('/users', getAllUsers);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/toggle-active', updateUserStatus);

// Governance & Monitoring
router.get('/audit-logs', getAuditLogs);
router.get('/statistics', getStatistics);

module.exports = router;
