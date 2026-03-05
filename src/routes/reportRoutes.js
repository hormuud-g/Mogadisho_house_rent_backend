const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const validate = require('../middleware/validation');
const {
  createReport,
  getReports,
  getReport,
  assignReport,
  takeAction,
  resolveReport,
  dismissReport,
  escalateReport,
  addNote,
  appealReport,
  decideAppeal,
  getReportStats
} = require('../controllers/reportController');

// Validation rules
const createReportValidation = [
  body('reportedItemId')
    .isMongoId().withMessage('Valid item ID is required'),
  body('reportedItemType')
    .isIn(['Property', 'User', 'Review', 'Inquiry', 'Booking', 'Message'])
    .withMessage('Invalid item type'),
  body('reason')
    .isIn(['spam', 'inappropriate', 'fake', 'harassment', 'scam', 'misleading', 'offensive', 'illegal', 'duplicate', 'wrong_category', 'incorrect_info', 'other'])
    .withMessage('Invalid report reason'),
  body('description')
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority')
];

const assignValidation = [
  body('adminId')
    .optional()
    .isMongoId().withMessage('Valid admin ID is required')
];

const actionValidation = [
  body('action')
    .isIn(['warning_issued', 'content_removed', 'user_suspended', 'user_banned', 'property_removed', 'review_removed', 'no_action', 'escalated'])
    .withMessage('Invalid action'),
  body('description')
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('effectiveUntil')
    .optional()
    .isISO8601().withMessage('Valid date is required')
];

const resolveValidation = [
  body('decision')
    .isIn(['upheld', 'rejected', 'partially_upheld'])
    .withMessage('Invalid decision'),
  body('summary')
    .notEmpty().withMessage('Summary is required')
    .isLength({ max: 500 }).withMessage('Summary cannot exceed 500 characters')
];

const dismissValidation = [
  body('reason')
    .notEmpty().withMessage('Reason is required')
    .isLength({ max: 200 }).withMessage('Reason cannot exceed 200 characters')
];

const noteValidation = [
  body('note')
    .notEmpty().withMessage('Note is required')
    .isLength({ max: 500 }).withMessage('Note cannot exceed 500 characters'),
  body('isPrivate')
    .optional()
    .isBoolean().withMessage('isPrivate must be a boolean')
];

const appealValidation = [
  body('reason')
    .notEmpty().withMessage('Reason is required')
    .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
];

const decideAppealValidation = [
  body('decision')
    .isIn(['granted', 'denied'])
    .withMessage('Decision must be granted or denied')
];

// Routes - All report routes require authentication
router.use(protect);

// User routes
router.post('/',
  validate(createReportValidation),
  createReport
);

router.get('/stats',
  authorize('admin'),
  getReportStats
);

router.get('/',
  authorize('admin'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isString(),
  query('priority').optional().isString(),
  query('type').optional().isString(),
  query('assignedTo').optional().isMongoId(),
  getReports
);

router.get('/:id',
  authorize('admin'),
  getReport
);

// Admin routes
router.put('/:id/assign',
  authorize('admin'),
  validate(assignValidation),
  assignReport
);

router.post('/:id/actions',
  authorize('admin'),
  validate(actionValidation),
  takeAction
);

router.put('/:id/resolve',
  authorize('admin'),
  validate(resolveValidation),
  resolveReport
);

router.put('/:id/dismiss',
  authorize('admin'),
  validate(dismissValidation),
  dismissReport
);

router.put('/:id/escalate',
  authorize('admin'),
  validate([body('reason').optional().isLength({ max: 200 })]),
  escalateReport
);

router.post('/:id/notes',
  authorize('admin'),
  validate(noteValidation),
  addNote
);

// Appeal routes
router.post('/:id/appeal',
  validate(appealValidation),
  appealReport
);

router.put('/:id/appeal/decide',
  authorize('admin'),
  validate(decideAppealValidation),
  decideAppeal
);

module.exports = router;