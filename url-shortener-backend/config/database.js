const mongoose = require('mongoose');

// MongoDB connection configuration
const connectDB = async () => {
  try {
    // MongoDB connection string - update with your MongoDB details
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/url_shortener';
    
    const options = {
      // Connection pool settings
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      
      // Retry settings
      retryWrites: true,
      w: 'majority',
      
      // Application name for MongoDB logs
      appName: 'URL-Shortener'
    };

    const conn = await mongoose.connect(mongoURI, options);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Log connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('Error during MongoDB disconnection:', err);
        process.exit(1);
      }
    });
    
    return conn;
    
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    
    // In development, you might want to continue without DB
    if (process.env.NODE_ENV === 'development') {
      console.warn('Continuing without database connection in development mode');
      return null;
    }
    
    // In production, exit the process
    process.exit(1);
  }
};

// Health check function
const checkDBConnection = () => {
  return mongoose.connection.readyState === 1;
};

// Get connection stats
const getDBStats = async () => {
  if (!checkDBConnection()) {
    return { connected: false };
  }
  
  try {
    const db = mongoose.connection.db;
    const stats = await db.stats();
    
    return {
      connected: true,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
      readyState: mongoose.connection.readyState,
      collections: stats.collections,
      dataSize: stats.dataSize,
      indexSize: stats.indexSize,
      objects: stats.objects
    };
  } catch (error) {
    return {
      connected: true,
      error: error.message
    };
  }
};

module.exports = {
  connectDB,
  checkDBConnection,
  getDBStats
};