const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const validate = require('../middleware/validation');
const rateLimiters = require('../middleware/rateLimiter');
const {
  createInquiry,
  getUserInquiries,
  getInquiry,
  replyToInquiry,
  closeInquiry,
  scheduleViewing,
  confirmViewing,
  completeViewing,
  rateInquiry,
  escalateInquiry
} = require('../controllers/inquiryController');

// Validation rules
const inquiryValidation = [
  body('propertyId')
    .isMongoId().withMessage('Valid property ID is required'),
  body('subject')
    .notEmpty().withMessage('Subject is required')
    .isLength({ max: 200 }).withMessage('Subject cannot exceed 200 characters'),
  body('message')
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Message must be between 10 and 1000 characters'),
  body('category')
    .optional()
    .isIn(['general', 'booking', 'price', 'availability', 'viewing', 'amenities', 'location', 'contract', 'other'])
    .withMessage('Invalid category')
];

const replyValidation = [
  body('message')
    .notEmpty().withMessage('Reply message is required')
    .isLength({ max: 1000 }).withMessage('Reply cannot exceed 1000 characters')
];

const viewingValidation = [
  body('date')
    .isISO8601().withMessage('Valid date is required'),
  body('time')
    .notEmpty().withMessage('Time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Time must be in HH:MM format'),
  body('notes')
    .optional()
    .isLength({ max: 200 }).withMessage('Notes cannot exceed 200 characters')
];

const rateValidation = [
  body('responseTime')
    .isInt({ min: 1, max: 5 }).withMessage('Response time rating must be between 1 and 5'),
  body('helpfulness')
    .isInt({ min: 1, max: 5 }).withMessage('Helpfulness rating must be between 1 and 5'),
  body('comment')
    .optional()
    .isLength({ max: 200 }).withMessage('Comment cannot exceed 200 characters')
];

const escalateValidation = [
  body('reason')
    .notEmpty().withMessage('Reason is required')
    .isLength({ max: 200 }).withMessage('Reason cannot exceed 200 characters')
];

// Routes
router.post('/',
  protect,
  authorize('tenant'),
  rateLimiters.inquiryCreate,
  validate(inquiryValidation),
  createInquiry
);

router.get('/',
  protect,
  getUserInquiries
);

router.get('/:id',
  protect,
  getInquiry
);

router.post('/:id/reply',
  protect,
  validate(replyValidation),
  replyToInquiry
);

router.put('/:id/close',
  protect,
  validate([body('reason').optional().isLength({ max: 200 })]),
  closeInquiry
);

router.post('/:id/viewing',
  protect,
  authorize('tenant'),
  validate(viewingValidation),
  scheduleViewing
);

router.put('/:id/viewing/confirm',
  protect,
  authorize('landlord'),
  validate(viewingValidation),
  confirmViewing
);

router.put('/:id/viewing/complete',
  protect,
  authorize('tenant'),
  validate([body('feedback').optional().isLength({ max: 200 })]),
  completeViewing
);

router.post('/:id/rate',
  protect,
  authorize('tenant'),
  validate(rateValidation),
  rateInquiry
);

router.post('/:id/escalate',
  protect,
  validate(escalateValidation),
  escalateInquiry
);

module.exports = router;