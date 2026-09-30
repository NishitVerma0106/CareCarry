const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { resolveQrToken, resolveCarecarryId } = require('../controllers/identityController');

// QR Token Resolution (supports POST /api/identity/resolve and POST /api/identity/qr/resolve)
router.post('/resolve', authenticate, authorize('hospital_staff', 'doctor', 'admin'), resolveQrToken);
router.post('/qr/resolve', authenticate, authorize('hospital_staff', 'doctor', 'admin'), resolveQrToken);

// Direct CareCarry ID Resolution
router.get('/resolve/:carecarryId', authenticate, authorize('hospital_staff', 'doctor', 'admin'), resolveCarecarryId);

module.exports = router;
