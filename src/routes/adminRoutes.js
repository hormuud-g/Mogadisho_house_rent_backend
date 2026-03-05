const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const validate = require('../middleware/validation');
const rateLimiters = require('../middleware/rateLimiter');
const {
  getUsers,
  getUser,
  verifyLandlord,
  updateUser,
  deleteUser,
  getPendingProperties,
  approveProperty,
  rejectProperty,
  getReports,
  getSystemStats,
  moderateReview,
  toggleFeatured,
  getAuditLogs,
  getSystemHealth,
  sendSystemNotification,
  exportData
} = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));
router.use(rateLimiters.admin);

// Validation rules
const verifyLandlordValidation = [
  body('verified')
    .isBoolean().withMessage('Verified must be true or false'),
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

const updateUserValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail().withMessage('Please enter a valid email'),
  body('phone')
    .optional()
    .matches(/^\+252\d{7,9}$/).withMessage('Phone must be in +252 format'),
  body('role')
    .optional()
    .isIn(['tenant', 'landlord', 'admin']).withMessage('Invalid role'),
  body('status')
    .optional()
    .isIn(['active', 'suspended', 'deactivated', 'banned']).withMessage('Invalid status'),
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

const rejectPropertyValidation = [
  body('reason')
    .notEmpty().withMessage('Reason is required')
    .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
];

const moderateReviewValidation = [
  body('status')
    .isIn(['approved', 'rejected', 'flagged']).withMessage('Invalid moderation status'),
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

const notificationValidation = [
  body('title')
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('message')
    .notEmpty().withMessage('Message is required')
    .isLength({ max: 1000 }).withMessage('Message cannot exceed 1000 characters'),
  body('type')
    .optional()
    .isString().withMessage('Type must be a string'),
  body('targetUsers')
    .notEmpty().withMessage('Target users is required'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
];

// User management
router.get('/users',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isString(),
  query('status').optional().isString(),
  query('verified').optional().isBoolean(),
  query('search').optional().isString(),
  query('sort').optional().isString(),
  getUsers
);

router.get('/users/:id',
  getUser
);

router.put('/users/:id/verify',
  validate(verifyLandlordValidation),
  verifyLandlord
);

router.put('/users/:id',
  validate(updateUserValidation),
  updateUser
);

router.delete('/users/:id',
  deleteUser
);

// Property moderation
router.get('/properties/pending',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  getPendingProperties
);

router.put('/properties/:id/approve',
  approveProperty
);

router.put('/properties/:id/reject',
  validate(rejectPropertyValidation),
  rejectProperty
);

router.put('/properties/:id/feature',
  toggleFeatured
);

// Reports
router.get('/reports',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isString(),
  query('priority').optional().isString(),
  getReports
);

// Reviews
router.put('/reviews/:id/moderate',
  validate(moderateReviewValidation),
  moderateReview
);

// Statistics
router.get('/stats',
  getSystemStats
);

router.get('/health',
  getSystemHealth
);

router.get('/audit-logs',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('userId').optional().isMongoId(),
  query('action').optional().isString(),
  getAuditLogs
);

// System
router.post('/notifications',
  validate(notificationValidation),
  sendSystemNotification
);

router.get('/export/:type',
  query('format').optional().isIn(['json', 'csv']),
  exportData
);

module.exports = router;