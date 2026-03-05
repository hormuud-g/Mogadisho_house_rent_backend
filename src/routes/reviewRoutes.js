const express = require('express');
const router = express.Router({ mergeParams: true });
const { body, query } = require('express-validator');
const { protect, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const validate = require('../middleware/validation');
const {
  createReview,
  getPropertyReviews,
  updateReview,
  deleteReview,
  markHelpful,
  markNotHelpful,
  replyToReview,
  reportReview
} = require('../controllers/reviewController');

// Validation rules
const reviewValidation = [
  body('ratings.overall')
    .isInt({ min: 1, max: 5 }).withMessage('Overall rating must be between 1 and 5'),
  body('ratings.accuracy')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Accuracy rating must be between 1 and 5'),
  body('ratings.communication')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Communication rating must be between 1 and 5'),
  body('ratings.cleanliness')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Cleanliness rating must be between 1 and 5'),
  body('ratings.location')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Location rating must be between 1 and 5'),
  body('ratings.checkIn')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Check-in rating must be between 1 and 5'),
  body('ratings.value')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Value rating must be between 1 and 5'),
  body('title')
    .notEmpty().withMessage('Review title is required')
    .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
  body('comment')
    .notEmpty().withMessage('Review comment is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Comment must be between 10 and 1000 characters'),
  body('pros')
    .optional()
    .isArray().withMessage('Pros must be an array'),
  body('cons')
    .optional()
    .isArray().withMessage('Cons must be an array')
];

const replyValidation = [
  body('comment')
    .notEmpty().withMessage('Reply is required')
    .isLength({ max: 500 }).withMessage('Reply cannot exceed 500 characters')
];

const reportValidation = [
  body('reason')
    .isIn(['spam', 'inappropriate', 'offensive', 'fake', 'harassment', 'other'])
    .withMessage('Invalid report reason'),
  body('description')
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
];

// Routes
router.post('/',
  protect,
  authorize('tenant'),
  validate(reviewValidation),
  createReview
);

router.get('/',
  optionalAuth,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('sort').optional().isIn(['recent', 'highest', 'lowest', 'helpful']),
  getPropertyReviews
);

router.post('/:reviewId/helpful',
  protect,
  markHelpful
);

router.post('/:reviewId/not-helpful',
  protect,
  markNotHelpful
);

router.post('/:reviewId/reply',
  protect,
  authorize('landlord'),
  validate(replyValidation),
  replyToReview
);

router.post('/:reviewId/report',
  protect,
  validate(reportValidation),
  reportReview
);

router.route('/:reviewId')
  .put(protect, validate(reviewValidation), updateReview)
  .delete(protect, deleteReview);

module.exports = router;