const express = require('express');
const router = express.Router();
const { register, login, logout, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');

// Register validation middleware
const validateRegister = (req, res, next) => {
  const { email, password, first_name, fullName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }
  if (!first_name && !fullName) {
    return res.status(400).json({ success: false, message: 'Name is required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }
  next();
};

// Login validation middleware
const validateLogin = (req, res, next) => {
  const { email, identifier, password } = req.body;
  const loginId = identifier || email;
  if (!loginId || !password) {
    return res.status(400).json({ success: false, message: 'Email or User ID and password are required.' });
  }
  next();
};

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;
