const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const {
  getPharmacyPrescriptions,
  dispensePrescriptionItem,
} = require('../controllers/hospitalController');

router.use(authenticate, authorize('hospital_staff', 'doctor', 'admin'));

// Prescriptions in Pharmacy Queue
router.get('/prescriptions', getPharmacyPrescriptions);
router.get('/prescriptions/:encounterId', getPharmacyPrescriptions);

// Dispensing Medication
router.patch('/prescriptions/:id/status', (req, res, next) => {
  // If id is item id or prescription
  req.params.itemId = req.params.id;
  return dispensePrescriptionItem(req, res, next);
});
router.patch('/items/:itemId/dispense', dispensePrescriptionItem);
router.patch('/items/:itemId/status', dispensePrescriptionItem);

module.exports = router;
