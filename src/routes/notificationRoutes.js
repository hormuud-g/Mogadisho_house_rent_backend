const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validation');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  archiveNotification,
  deleteNotification,
  getPreferences,
  updatePreferences,
  getSettings,
  updateSettings,
  testNotification
} = require('../controllers/notificationController');

// Validation rules
const preferencesValidation = [
  body('email')
    .optional()
    .isBoolean().withMessage('Email preference must be a boolean'),
  body('sms')
    .optional()
    .isBoolean().withMessage('SMS preference must be a boolean'),
  body('push')
    .optional()
    .isBoolean().withMessage('Push preference must be a boolean'),
  body('marketing')
    .optional()
    .isBoolean().withMessage('Marketing preference must be a boolean')
];

const settingsValidation = [
  body('account')
    .optional()
    .isBoolean().withMessage('Account setting must be a boolean'),
  body('property')
    .optional()
    .isBoolean().withMessage('Property setting must be a boolean'),
  body('booking')
    .optional()
    .isBoolean().withMessage('Booking setting must be a boolean'),
  body('inquiry')
    .optional()
    .isBoolean().withMessage('Inquiry setting must be a boolean'),
  body('review')
    .optional()
    .isBoolean().withMessage('Review setting must be a boolean'),
  body('favorite')
    .optional()
    .isBoolean().withMessage('Favorite setting must be a boolean'),
  body('payment')
    .optional()
    .isBoolean().withMessage('Payment setting must be a boolean'),
  body('report')
    .optional()
    .isBoolean().withMessage('Report setting must be a boolean'),
  body('system')
    .optional()
    .isBoolean().withMessage('System setting must be a boolean'),
  body('marketing')
    .optional()
    .isBoolean().withMessage('Marketing setting must be a boolean')
];

// Routes
router.get('/',
  protect,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('type').optional().isString(),
  query('isRead').optional().isBoolean(),
  getNotifications
);

router.get('/unread-count',
  protect,
  getUnreadCount
);

router.get('/preferences',
  protect,
  getPreferences
);

router.get('/settings',
  protect,
  getSettings
);

router.put('/preferences',
  protect,
  validate(preferencesValidation),
  updatePreferences
);

router.put('/settings',
  protect,
  validate(settingsValidation),
  updateSettings
);

router.put('/:id/read',
  protect,
  markAsRead
);

router.put('/read-all',
  protect,
  markAllAsRead
);

router.put('/:id/dismiss',
  protect,
  dismissNotification
);

router.put('/:id/archive',
  protect,
  archiveNotification
);

router.delete('/:id',
  protect,
  deleteNotification
);

router.post('/test',
  protect,
  testNotification
);

module.exports = router;