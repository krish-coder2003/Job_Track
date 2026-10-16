import mongoose from 'mongoose';

/**
 * Utility to sanitize MongoDB URIs and error messages to ensure credentials
 * are never leaked in logs, terminal output, or stack traces.
 *
 * Masks credentials like `mongodb+srv://user:secret123@cluster.xyz`
 * to `mongodb+srv://user:****@cluster.xyz`.
 */
export const sanitizeMongoURI = (messageOrUri = '') => {
  if (typeof messageOrUri !== 'string') return '';
  return messageOrUri.replace(
    /(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/gi,
    '$1****$3'
  );
};

// Track whether connection lifecycle event listeners have been registered
let listenersRegistered = false;

const registerConnectionListeners = () => {
  if (listenersRegistered) return;

  mongoose.connection.on('error', (err) => {
    console.error(`[MongoDB] Runtime connection error: ${sanitizeMongoURI(err.message)}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Connection lost. Disconnected from database.');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB] Connection re-established.');
  });

  listenersRegistered = true;
};

/**
 * Connect to MongoDB using Mongoose and the MONGODB_URI environment variable.
 * Throws an error on failure to ensure server does not listen on unready state.
 */
export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    const errorMsg = 'MONGODB_URI is not defined in environment variables. Please check server/.env file.';
    console.error(`[MongoDB] Configuration Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  registerConnectionListeners();

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(
      `[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`
    );
    return conn;
  } catch (error) {
    const sanitizedError = sanitizeMongoURI(error.message);
    console.error(`[MongoDB] Connection failed: ${sanitizedError}`);
    throw new Error(sanitizedError);
  }
};

/**
 * Disconnect cleanly from MongoDB for graceful server shutdown.
 */
export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      console.log('[MongoDB] Connection closed cleanly.');
    }
  } catch (error) {
    console.error(`[MongoDB] Error during disconnect: ${sanitizeMongoURI(error.message)}`);
    throw error;
  }
};

/**
 * Helper to check current database status.
 * Values: 'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'unknown'
 */
export const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
};

