import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import examRoutes from './routes/examRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import academicRoutes from './routes/academicRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import questionPaperRoutes from './routes/questionPaperRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import examPatternRoutes from './routes/examPatternRoutes.js';

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow Postman / server-to-server requests with no origin
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('CORS: origin not allowed'));
    },
    credentials: true,
  })
);

// ─── BODY PARSERS ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── MONGO SANITIZATION (prevent NoSQL injection) ──────────────────────────
// In Express 5, req.query has only a getter so sanitize req.body and req.params safely
app.use((req, res, next) => {
  if (req.body) {
    mongoSanitize.sanitize(req.body);
  }
  if (req.params) {
    mongoSanitize.sanitize(req.params);
  }
  next();
});

// ─── RATE LIMITING ─────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please wait 15 minutes.' },
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/v1/auth/login', authLimiter);

// ─── LOGGING ───────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── HEALTH CHECK ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'School ERP API is active' });
});

// ─── APP ROUTES (supporting both /api and /api/v1) ─────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

app.use('/api/exams', examRoutes);
app.use('/api/v1/exams', examRoutes);

app.use('/api/questions', questionRoutes);
app.use('/api/v1/questions', questionRoutes);

app.use('/api/academic', academicRoutes);
app.use('/api/v1/academic', academicRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/api/v1/notifications', notificationRoutes);

app.use('/api/question-papers', questionPaperRoutes);
app.use('/api/v1/question-papers', questionPaperRoutes);

app.use('/api/upload', uploadRoutes);
app.use('/api/v1/upload', uploadRoutes);

app.use('/api/exam-patterns', examPatternRoutes);
app.use('/api/v1/exam-patterns', examPatternRoutes);

// ─── 404 HANDLER ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// ─── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Don't log CORS errors as 500
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('❌ SERVER ERROR:', err);
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

export default app;
