import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import app from './app.js';
import connectDB from './config/db.js';
import { seedDefaultTemplates } from './config/defaultAssessmentTemplates.js';
import { checkAndAutoSubmitExpiredAttempts } from './services/examEngineService.js';

const PORT = process.env.PORT || 5000;

// Connect to Database and start server
const startServer = async () => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 School ERP Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  await connectDB();

  // Seed Assessment Templates
  try {
    await seedDefaultTemplates();
    console.log('📚 Assessment Templates verified & seeded');
  } catch (err) {
    console.error('Template seeding notice:', err.message);
  }

  // Periodic lazy check worker for auto-submitting expired in-progress attempts (every 30s)
  setInterval(async () => {
    try {
      await checkAndAutoSubmitExpiredAttempts();
    } catch (e) {
      // quiet catch for periodic background sweep
    }
  }, 30000);

  return server;
};

startServer();
