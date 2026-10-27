import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5000;

// Connect to Database and start server
const startServer = async () => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 School ERP Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  await connectDB();
  return server;
};

startServer();
