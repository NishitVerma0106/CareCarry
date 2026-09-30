const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { upload, handleUploadError } = require('../middleware/upload');
const {
  createLabOrder,
  getLabOrders,
  updateLabOrderStatus,
  uploadReport,
} = require('../controllers/hospitalController');

router.use(authenticate, authorize('hospital_staff', 'doctor', 'admin'));

// Lab Orders
router.post('/orders', createLabOrder);
router.get('/orders', getLabOrders);
router.get('/orders/:id', getLabOrders);
router.patch('/orders/:id/status', updateLabOrderStatus);

// Lab Results upload and linkage
router.post('/results', upload.single('file'), handleUploadError, async (req, res, next) => {
  // If orderId provided, document_type defaults to lab_report
  req.body.document_type = req.body.document_type || 'lab_report';
  return uploadReport(req, res, next);
});

module.exports = router;
