const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');

// Rate limit configurations
const rateLimitConfig = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
      success: false,
      message: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Auth endpoints (stricter)
  auth: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 attempts per hour
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later.'
    },
    skipSuccessfulRequests: true, // Don't count successful requests
  },

  // Property creation
  propertyCreate: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 10, // 10 properties per day
    message: {
      success: false,
      message: 'Daily property creation limit reached (10 properties).'
    },
  },

  // Booking creation
  bookingCreate: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 bookings per hour
    message: {
      success: false,
      message: 'Hourly booking limit reached (20 bookings).'
    },
  },

  // Inquiry creation
  inquiryCreate: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30, // 30 inquiries per hour
    message: {
      success: false,
      message: 'Hourly inquiry limit reached (30 inquiries).'
    },
  },

  // File upload
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: {
      success: false,
      message: 'Hourly upload limit reached (20 files).'
    },
  },

  // Admin endpoints
  admin: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: {
      success: false,
      message: 'Admin rate limit exceeded.'
    },
  },

  // Search endpoints
  search: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: {
      success: false,
      message: 'Search rate limit exceeded. Please slow down.'
    },
  }
};

// Create rate limiter with optional Redis store
const createRateLimiter = (config, useRedis = false) => {
  const options = {
    windowMs: config.windowMs,
    max: config.max,
    message: config.message,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user ? req.user.id : req.ip;
    },
    skip: (req) => {
      // Skip rate limiting for admin users
      return req.user && req.user.role === 'admin';
    },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: config.message.message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil(config.windowMs / 1000)
      });
    }
  };

  // Use Redis store if enabled and available
  if (useRedis && process.env.REDIS_ENABLED === 'true') {
    const redisClient = getRedisClient();
    if (redisClient) {
      options.store = new RedisStore({
        client: redisClient,
        prefix: 'rl:',
      });
    }
  }

  return rateLimit(options);
};

// Create specific rate limiters
const rateLimiters = {
  general: createRateLimiter(rateLimitConfig.general),
  auth: createRateLimiter(rateLimitConfig.auth, true),
  propertyCreate: createRateLimiter(rateLimitConfig.propertyCreate, true),
  bookingCreate: createRateLimiter(rateLimitConfig.bookingCreate, true),
  inquiryCreate: createRateLimiter(rateLimitConfig.inquiryCreate, true),
  upload: createRateLimiter(rateLimitConfig.upload, true),
  admin: createRateLimiter(rateLimitConfig.admin),
  search: createRateLimiter(rateLimitConfig.search),
};

// Dynamic rate limiter based on user role
const dynamicRateLimiter = (config) => {
  return (req, res, next) => {
    // Higher limits for verified users
    if (req.user && req.user.isVerified) {
      config.max = Math.floor(config.max * 1.5);
    }
    
    // Even higher for trusted users
    if (req.user && req.user.verificationLevel === 'trusted') {
      config.max = Math.floor(config.max * 2);
    }

    return createRateLimiter(config)(req, res, next);
  };
};

module.exports = rateLimiters;
module.exports.dynamicRateLimiter = dynamicRateLimiter;
module.exports.rateLimitConfig = rateLimitConfig;