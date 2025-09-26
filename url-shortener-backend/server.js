// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const geoip = require('geoip-lite');
const validator = require('validator');

// MongoDB imports
const { connectDB, checkDBConnection, getDBStats } = require('./config/database');
const UrlService = require('./services/UrlService');

const app = express();
const PORT = process.env.PORT || 8080;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Custom logging middleware (as per requirements)
const logger = {
  info: (message, data = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      data
    };
    // Replace console.log with custom logging implementation
    process.stdout.write(JSON.stringify(logEntry) + '\n');
  },
  error: (message, error = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: error.message || error
    };
    process.stderr.write(JSON.stringify(logEntry) + '\n');
  },
  warn: (message, data = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      data
    };
    process.stdout.write(JSON.stringify(logEntry) + '\n');
  }
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));

// Initialize MongoDB connection
let dbConnected = false;
connectDB().then((conn) => {
  if (conn) {
    dbConnected = true;
    logger.info('Database connected successfully');
  }
}).catch((error) => {
  logger.error('Database connection failed', error);
});

// Utility functions
const generateShortcode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const isValidUrl = (string) => {
  return validator.isURL(string, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
    allow_underscores: false,
    allow_trailing_dot: false,
    allow_protocol_relative_urls: false
  });
};

const getLocationFromIP = (ip) => {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return 'Local Development';
  }
  
  const geo = geoip.lookup(ip);
  if (geo) {
    return `${geo.city || 'Unknown City'}, ${geo.country || 'Unknown Country'}`;
  }
  return 'Unknown Location';
};

const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip ||
         '127.0.0.1';
};

// Cleanup expired URLs every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  if (!dbConnected) return;
  
  try {
    const cleanedCount = await UrlService.cleanupExpiredUrls();
    if (cleanedCount > 0) {
      logger.info('Cleaned up expired URLs', { count: cleanedCount });
    }
  } catch (error) {
    logger.error('Error during cleanup', error);
  }
});

// Routes

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbStats = await getDBStats();
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: dbStats
    });
  } catch (error) {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: { connected: false, error: error.message }
    });
  }
});

// Create short URL
app.post('/shorturls', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    const { url, validity, shortcode, tags, description } = req.body;
    
    // Validate required URL
    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required',
        code: 'MISSING_URL'
      });
    }
    
    // Validate URL format
    if (!isValidUrl(url)) {
      return res.status(400).json({ 
        error: 'Invalid URL format. URL must include protocol (http:// or https://)',
        code: 'INVALID_URL'
      });
    }
    
    // Validate custom shortcode if provided
    if (shortcode) {
      if (!/^[a-zA-Z0-9]+$/.test(shortcode)) {
        return res.status(400).json({
          error: 'Shortcode must contain only alphanumeric characters',
          code: 'INVALID_SHORTCODE'
        });
      }
      
      if (shortcode.length < 3 || shortcode.length > 20) {
        return res.status(400).json({
          error: 'Shortcode must be between 3 and 20 characters',
          code: 'INVALID_SHORTCODE_LENGTH'
        });
      }
    }
    
    // Validate validity period
    const validityMinutes = validity || 30; // Default to 30 minutes
    if (validityMinutes <= 0 || validityMinutes > 525600) { // Max 1 year
      return res.status(400).json({
        error: 'Validity must be between 1 and 525600 minutes (1 year)',
        code: 'INVALID_VALIDITY'
      });
    }
    
    // Create short URL using service
    const result = await UrlService.createShortUrl({
      originalUrl: url,
      validity: validityMinutes,
      shortcode,
      tags: tags || [],
      description
    });
    
    logger.info('Short URL created', {
      shortcode: result.shortcode,
      originalUrl: result.originalUrl,
      validity: validityMinutes
    });
    
    res.status(201).json({
      shortLink: result.shortLink,
      expiry: result.expiresAt,
      shortcode: result.shortcode
    });
    
  } catch (error) {
    logger.error('Error creating short URL', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Custom shortcode already exists. Please choose a different one.',
        code: 'SHORTCODE_EXISTS'
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Get URL statistics
app.get('/shorturls/:shortcode', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    const { shortcode } = req.params;
    
    const stats = await UrlService.getUrlStats(shortcode);
    
    if (!stats) {
      return res.status(404).json({
        error: 'Short URL not found',
        code: 'NOT_FOUND'
      });
    }
    
    // Format response for frontend compatibility
    const response = {
      originalUrl: stats.originalUrl,
      createdAt: stats.createdAt,
      expiresAt: stats.expiresAt,
      totalClicks: stats.totalClicks,
      clickDetails: stats.analytics.recentClicks.map(click => ({
        timestamp: click.timestamp,
        source: click.referer,
        location: `${click.location.city || 'Unknown'}, ${click.location.country || 'Unknown'}`
      })),
      // Additional analytics data
      analytics: {
        locationStats: stats.analytics.locationStats,
        deviceStats: stats.analytics.deviceStats,
        refererStats: stats.analytics.refererStats
      }
    };
    
    logger.info('Statistics requested', {
      shortcode,
      totalClicks: stats.totalClicks
    });
    
    res.json(response);
    
  } catch (error) {
    logger.error('Error retrieving statistics', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Get all URLs (for frontend stats page)
app.get('/shorturls', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    const { page = 1, limit = 50, includeInactive = 'true' } = req.query;
    
    const result = await UrlService.getAllUrls({
      page: parseInt(page),
      limit: parseInt(limit),
      includeInactive: includeInactive === 'true'
    });
    
    res.json(result.urls);
    
  } catch (error) {
    logger.error('Error retrieving all URLs', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Delete URL
app.delete('/shorturls/:shortcode', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    const { shortcode } = req.params;
    
    // Check if URL exists first
    const existingUrl = await UrlService.getUrlByShortcode(shortcode);
    
    if (!existingUrl) {
      return res.status(404).json({
        error: 'Short URL not found',
        code: 'NOT_FOUND'
      });
    }
    
    // Delete the URL and its associated clicks
    const deleteResult = await UrlService.deleteUrl(shortcode);
    
    if (deleteResult.success) {
      logger.info('URL deleted successfully', {
        shortcode,
        originalUrl: existingUrl.originalUrl
      });
      
      res.json({
        message: 'URL deleted successfully',
        shortcode
      });
    } else {
      logger.error('Failed to delete URL', { shortcode, error: deleteResult.error });
      res.status(500).json({
        error: deleteResult.error || 'Failed to delete URL',
        code: 'DELETE_FAILED'
      });
    }
    
  } catch (error) {
    logger.error('Error deleting URL', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Redirect to original URL (catch-all route - must be last!)
app.get('/:shortcode', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    const { shortcode } = req.params;
    
    // Prepare request data for click tracking
    const requestData = {
      ip: getClientIP(req),
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer')
    };
    
    // Record click and get original URL
    const originalUrl = await UrlService.recordClick(shortcode, requestData);
    
    if (!originalUrl) {
      logger.warn('Short URL not found or expired', { shortcode });
      return res.status(404).json({
        error: 'Short URL not found or has expired',
        code: 'NOT_FOUND'
      });
    }
    
    logger.info('URL click recorded', {
      shortcode,
      referer: requestData.referer || 'Direct'
    });
    
    // Redirect to original URL
    res.redirect(302, originalUrl);
    
  } catch (error) {
    logger.error('Error processing redirect', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    baseUrl: BASE_URL,
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = app;