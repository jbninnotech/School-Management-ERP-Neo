import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;
    // In test environment or test runner, always use the test database
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      if (uri && !uri.includes('_test')) {
        if (uri.includes('/school_erp?')) {
          uri = uri.replace('/school_erp?', '/school_erp_test?');
        } else if (uri.includes('/school_erp')) {
          uri = uri.replace('/school_erp', '/school_erp_test');
        }
      }
    }

    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected to database [${conn.connection.name}]: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Stop server if DB connection fails
  }
};

export default connectDB;
