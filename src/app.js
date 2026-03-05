const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require('./config/database');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { httpLogger } = require('./middleware/logger');
const sanitizer = require('./middleware/sanitizer');
const rateLimiters = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const publicRoutes = require('./routes/publicRoutes');
const testRoutes = require('./routes/testRoutes');

// Import jobs
const emailJobs = require('./jobs/emailJobs');
const cleanupJobs = require('./jobs/cleanupJobs');
const notificationJobs = require('./jobs/notificationJobs');

// Import services
const emailService = require('./services/emailService');
const cacheService = require('./services/cacheService');

// Initialize express app
const app = express();

// ============================================
// Database Connection
// ============================================
connectDB();

// ============================================
// Service Initialization
// ============================================
(async () => {
  try {
    // Initialize email service
    await emailService.initialize();
    
    // Initialize cache service
    await cacheService.initialize();
    
    // Initialize scheduled jobs
    if (process.env.NODE_ENV === 'production') {
      emailJobs.initialize();
      cleanupJobs.initialize();
      notificationJobs.initialize();
    }
    
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
  }
})();

// ============================================
// Global Middleware
// ============================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// HTTP logging
app.use(httpLogger);

// Input sanitization (XSS, NoSQL injection)
app.use(sanitizer);

// Apply rate limiting
app.use('/api', rateLimiters.general);
app.use('/api/auth', rateLimiters.auth);
app.use('/api/properties', rateLimiters.search);
app.use('/api/uploads', rateLimiters.upload);

// ============================================
// API Routes
// ============================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      cache: cacheService.connected ? 'connected' : 'disabled',
      socket: app.get('io') ? 'initialized' : 'not initialized'
    }
  });
});

// API version endpoint
app.get('/version', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      version: process.env.npm_package_version || '1.0.0',
      apiVersion: 'v1',
      name: 'Kirada Guryaha API',
      description: 'Rental Property Platform API - Mogadishu District'
    }
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/test', testRoutes);

// ============================================
// API Documentation (if in development)
// ============================================
if (process.env.NODE_ENV === 'development') {
  try {
    const swaggerUi = require('swagger-ui-express');
    const swaggerDocument = require('../swagger.json');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log('✅ Swagger UI initialized');
  } catch (error) {
    console.log('⚠️ Swagger UI not available:', error.message);
  }
  
  // API test page
  app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/test.html'));
  });
}

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ============================================
// Graceful Shutdown
// ============================================
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
  console.log('\n🛑 Received shutdown signal, cleaning up...');
  
  // Stop scheduled jobs
  try {
    emailJobs.stopAll();
    cleanupJobs.stopAll();
    notificationJobs.stopAll();
    console.log('✅ Scheduled jobs stopped');
  } catch (error) {
    console.error('❌ Error stopping jobs:', error.message);
  }
  
  // Close cache connection
  try {
    await cacheService.close();
    console.log('✅ Cache connection closed');
  } catch (error) {
    console.error('❌ Error closing cache:', error.message);
  }
  
  // Close database connection
  try {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database:', error.message);
  }
  
  process.exit(0);
}

module.exports = app;