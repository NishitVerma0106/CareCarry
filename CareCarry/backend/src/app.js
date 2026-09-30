const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const adminRoutes = require('./routes/adminRoutes');
const identityRoutes = require('./routes/identityRoutes');
const encounterRoutes = require('./routes/encounterRoutes');
const labRoutes = require('./routes/labRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const interoperabilityRoutes = require('./routes/interoperabilityRoutes');

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting — global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many auth attempts. Try again later.' },
});

app.use(globalLimiter);

// ─── Parsers ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Static file serving for uploaded documents (local fallback or direct access)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CareCarry API is running.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── Routes (Both singular & plural supported) ─────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);

app.use('/api/patient', patientRoutes);
app.use('/api/patients', patientRoutes);

app.use('/api/doctor', doctorRoutes);
app.use('/api/doctors', doctorRoutes);

app.use('/api/hospital', hospitalRoutes);
app.use('/api/hospitals', hospitalRoutes);

app.use('/api/encounters', encounterRoutes);
app.use('/api/encounter', encounterRoutes);

app.use('/api/lab', labRoutes);
app.use('/api/pharmacy', pharmacyRoutes);

app.use('/api/admin', adminRoutes);
app.use('/api/identity', identityRoutes);
app.use('/api/interoperability', interoperabilityRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack || err.message);

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred.'
    : err.message;

  res.status(statusCode).json({ success: false, message });
});

module.exports = app;
