const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const validate = require('../middleware/validation');
const rateLimiters = require('../middleware/rateLimiter');
const {
  createBooking,
  getUserBookings,
  getBooking,
  cancelBooking,
  confirmBooking,
  completeBooking,
  getBookingCalendar,
  markNoShow,
  addBookingMessage,
  getBookingStats
} = require('../controllers/bookingController');

// Validation rules
const bookingValidation = [
  body('propertyId')
    .isMongoId().withMessage('Valid property ID is required'),
  body('checkIn')
    .isISO8601().withMessage('Valid check-in date is required')
    .custom(value => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) {
        throw new Error('Check-in date cannot be in the past');
      }
      return true;
    }),
  body('checkOut')
    .isISO8601().withMessage('Valid check-out date is required')
    .custom((value, { req }) => {
      const checkIn = new Date(req.body.checkIn);
      const checkOut = new Date(value);
      if (checkOut <= checkIn) {
        throw new Error('Check-out date must be after check-in date');
      }
      return true;
    }),
  body('guests.adults')
    .isInt({ min: 1, max: 10 }).withMessage('Adults must be between 1 and 10'),
  body('guests.children')
    .optional()
    .isInt({ min: 0, max: 5 }).withMessage('Children must be between 0 and 5'),
  body('guests.infants')
    .optional()
    .isInt({ min: 0, max: 3 }).withMessage('Infants must be between 0 and 3'),
  body('specialRequests')
    .optional()
    .isLength({ max: 500 }).withMessage('Special requests cannot exceed 500 characters')
];

const cancelValidation = [
  body('reason')
    .optional()
    .isLength({ max: 200 }).withMessage('Reason cannot exceed 200 characters')
];

const messageValidation = [
  body('message')
    .notEmpty().withMessage('Message is required')
    .isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters')
];

const calendarValidation = [
  query('month')
    .isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  query('year')
    .isInt({ min: 2020, max: 2030 }).withMessage('Year must be between 2020 and 2030'),
  query('propertyId')
    .optional()
    .isMongoId().withMessage('Valid property ID is required')
];

// Routes
router.post('/',
  protect,
  authorize('tenant'),
  rateLimiters.bookingCreate,
  validate(bookingValidation),
  createBooking
);

router.get('/',
  protect,
  getUserBookings
);

router.get('/stats',
  protect,
  authorize('landlord', 'admin'),
  getBookingStats
);

router.get('/calendar',
  protect,
  authorize('landlord'),
  validate(calendarValidation),
  getBookingCalendar
);

router.get('/:id',
  protect,
  getBooking
);

router.put('/:id/cancel',
  protect,
  validate(cancelValidation),
  cancelBooking
);

router.put('/:id/confirm',
  protect,
  authorize('landlord'),
  confirmBooking
);

router.put('/:id/complete',
  protect,
  authorize('landlord'),
  completeBooking
);

router.put('/:id/no-show',
  protect,
  authorize('landlord'),
  markNoShow
);

router.post('/:id/messages',
  protect,
  validate(messageValidation),
  addBookingMessage
);

module.exports = router;