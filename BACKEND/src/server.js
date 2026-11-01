import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import app from './app.js';
import connectDB from './config/db.js';
import { seedDefaultTemplates } from './config/defaultAssessmentTemplates.js';
import { checkAndAutoSubmitExpiredAttempts } from './services/examEngineService.js';
import { checkAndAutoLaunchScheduledExams } from './services/examSchedulerService.js';

const PORT = process.env.PORT || 5000;

// Create HTTP server and attach Socket.IO
const httpServer = createServer(app);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

export const io = new SocketIO(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  // Join user's personal notification room
  socket.on('join_user_room', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
    }
  });

  // Join exam monitor room (teachers/admins watching a live exam)
  socket.on('join_exam_monitor', (examId) => {
    if (examId) {
      socket.join(`exam_monitor_${examId}`);
    }
  });

  socket.on('leave_exam_monitor', (examId) => {
    if (examId) {
      socket.leave(`exam_monitor_${examId}`);
    }
  });

  socket.on('disconnect', () => {
    // Rooms are cleaned up automatically
  });
});

// Helper: emit notification to a specific user
export const emitNotificationToUser = (userId, notification) => {
  io.to(`user_${userId}`).emit('new_notification', notification);
};

// Helper: emit exam monitor update to watchers
export const emitExamMonitorUpdate = (examId, data) => {
  io.to(`exam_monitor_${examId}`).emit('exam_monitor_update', data);
};

// Connect to Database and start server
const startServer = async () => {
  await connectDB();

  // Seed Assessment Templates
  try {
    await seedDefaultTemplates();
    console.log('📚 Assessment Templates verified & seeded');
  } catch (err) {
    console.error('Template seeding notice:', err.message);
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 School ERP Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`🔌 Socket.IO enabled`);
  });

  // Periodic background sweep: auto-submit expired in-progress attempts (every 30s)
  setInterval(async () => {
    try {
      await checkAndAutoSubmitExpiredAttempts();
    } catch (e) {
      // quiet catch for periodic background sweep
    }
  }, 30000);

  // Periodic scheduler: auto-launch scheduled exams whose start time has arrived (every 15s)
  setInterval(async () => {
    try {
      await checkAndAutoLaunchScheduledExams();
    } catch (e) {
      // quiet catch
    }
  }, 15000);

  return httpServer;
};

// Only automatically start listening if executed directly (e.g. node src/server.js)
// When imported in tests, do not call startServer() to avoid EADDRINUSE on port 5000
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
