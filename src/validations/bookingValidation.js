const { body, query } = require('express-validator');

// Create booking validation
const createBookingValidation = [
  body('propertyId')
    .notEmpty().withMessage('Property ID is required')
    .isMongoId().withMessage('Invalid property ID format'),
  
  body('checkIn')
    .notEmpty().withMessage('Check-in date is required')
    .isISO8601().withMessage('Invalid check-in date format')
    .custom(value => {
      const checkIn = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      checkIn.setHours(0, 0, 0, 0);
      
      if (checkIn < today) {
        throw new Error('Check-in date cannot be in the past');
      }
      return true;
    }),
  
  body('checkOut')
    .notEmpty().withMessage('Check-out date is required')
    .isISO8601().withMessage('Invalid check-out date format')
    .custom((value, { req }) => {
      const checkIn = new Date(req.body.checkIn);
      const checkOut = new Date(value);
      
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      
      if (checkOut <= checkIn) {
        throw new Error('Check-out date must be after check-in date');
      }
      
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      if (nights > 365) {
        throw new Error('Booking duration cannot exceed 365 days');
      }
      
      return true;
    }),
  
  body('guests.adults')
    .notEmpty().withMessage('Number of adults is required')
    .isInt({ min: 1, max: 10 }).withMessage('Adults must be between 1 and 10')
    .toInt(),
  
  body('guests.children')
    .optional()
    .isInt({ min: 0, max: 5 }).withMessage('Children must be between 0 and 5')
    .toInt()
    .default(0),
  
  body('guests.infants')
    .optional()
    .isInt({ min: 0, max: 3 }).withMessage('Infants must be between 0 and 3')
    .toInt()
    .default(0),
  
  body('guests.pets')
    .optional()
    .isInt({ min: 0, max: 5 }).withMessage('Pets must be between 0 and 5')
    .toInt()
    .default(0),
  
  body('specialRequests')
    .optional()
    .isLength({ max: 500 }).withMessage('Special requests cannot exceed 500 characters')
    .trim()
    .escape(),
  
  body('guestDetails')
    .optional()
    .isObject().withMessage('Guest details must be an object'),
  
  body('guestDetails.name')
    .optional()
    .isString().withMessage('Guest name must be a string')
    .trim()
    .escape(),
  
  body('guestDetails.email')
    .optional()
    .isEmail().withMessage('Invalid guest email')
    .normalizeEmail(),
  
  body('guestDetails.phone')
    .optional()
    .matches(/^\+252\d{7,9}$/).withMessage('Guest phone must be in +252 format')
];

// Update booking validation
const updateBookingValidation = [
  body('checkIn')
    .optional()
    .isISO8601().withMessage('Invalid check-in date format')
    .custom(value => {
      const checkIn = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      checkIn.setHours(0, 0, 0, 0);
      
      if (checkIn < today) {
        throw new Error('Check-in date cannot be in the past');
      }
      return true;
    }),
  
  body('checkOut')
    .optional()
    .isISO8601().withMessage('Invalid check-out date format')
    .custom((value, { req }) => {
      if (!req.body.checkIn && !req.body.checkOut) return true;
      
      const checkIn = new Date(req.body.checkIn || req.params.originalCheckIn);
      const checkOut = new Date(value);
      
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      
      if (checkOut <= checkIn) {
        throw new Error('Check-out date must be after check-in date');
      }
      return true;
    }),
  
  body('guests.adults')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Adults must be between 1 and 10')
    .toInt(),
  
  body('guests.children')
    .optional()
    .isInt({ min: 0, max: 5 }).withMessage('Children must be between 0 and 5')
    .toInt(),
  
  body('guests.infants')
    .optional()
    .isInt({ min: 0, max: 3 }).withMessage('Infants must be between 0 and 3')
    .toInt(),
  
  body('specialRequests')
    .optional()
    .isLength({ max: 500 }).withMessage('Special requests cannot exceed 500 characters')
    .trim()
    .escape()
];

// Cancel booking validation
const cancelBookingValidation = [
  body('reason')
    .optional()
    .isLength({ max: 200 }).withMessage('Cancellation reason cannot exceed 200 characters')
    .trim()
    .escape()
];

// Booking status validation
const bookingStatusValidation = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])
    .withMessage('Invalid booking status')
];

// Booking ID validation
const bookingIdValidation = [
  param('id')
    .notEmpty().withMessage('Booking ID is required')
    .isMongoId().withMessage('Invalid booking ID format')
];

// Message validation
const messageValidation = [
  body('message')
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 1, max: 500 }).withMessage('Message must be between 1 and 500 characters')
    .trim()
    .escape()
];

// Review validation (for booking)
const bookingReviewValidation = [
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
    .toInt(),
  
  body('comment')
    .optional()
    .isLength({ min: 10, max: 500 }).withMessage('Comment must be between 10 and 500 characters')
    .trim()
    .escape()
];

// Calendar validation
const calendarValidation = [
  query('month')
    .notEmpty().withMessage('Month is required')
    .isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12')
    .toInt(),
  
  query('year')
    .notEmpty().withMessage('Year is required')
    .isInt({ min: 2020, max: 2030 }).withMessage('Year must be between 2020 and 2030')
    .toInt(),
  
  query('propertyId')
    .optional()
    .isMongoId().withMessage('Invalid property ID format')
];

// Booking statistics validation
const bookingStatsValidation = [
  query('period')
    .optional()
    .isIn(['day', 'week', 'month', 'year']).withMessage('Invalid period')
    .default('month'),
  
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (req.query.startDate && value < req.query.startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

module.exports = {
  createBookingValidation,
  updateBookingValidation,
  cancelBookingValidation,
  bookingStatusValidation,
  bookingIdValidation,
  messageValidation,
  bookingReviewValidation,
  calendarValidation,
  bookingStatsValidation
};