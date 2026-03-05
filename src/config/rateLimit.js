module.exports = {
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
    }
  },

  // Property creation
  propertyCreate: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 10, // 10 properties per day
    message: {
      success: false,
      message: 'Daily property creation limit reached (10 properties).'
    }
  },

  // Booking creation
  bookingCreate: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 bookings per hour
    message: {
      success: false,
      message: 'Hourly booking limit reached (20 bookings).'
    }
  },

  // Inquiry creation
  inquiryCreate: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30, // 30 inquiries per hour
    message: {
      success: false,
      message: 'Hourly inquiry limit reached (30 inquiries).'
    }
  },

  // File upload
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: {
      success: false,
      message: 'Hourly upload limit reached (20 files).'
    }
  },

  // Admin endpoints
  admin: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: {
      success: false,
      message: 'Admin rate limit exceeded.'
    }
  }
};