const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const validate = require('../middleware/validation');
const { uploadSingle } = require('../middleware/upload');
const {
  getUserById,
  getUserProperties,
  getUserReviews,
  getUserFavorites,
  updatePreferences,
  uploadProfileImage,
  deleteAccount,
  reactivateAccount,
  getUserStats
} = require('../controllers/userController');

// Validation rules
const preferencesValidation = [
  body('language')
    .optional()
    .isIn(['en', 'so', 'ar']).withMessage('Language must be en, so, or ar'),
  body('currency')
    .optional()
    .isIn(['USD', 'SOS']).withMessage('Currency must be USD or SOS'),
  body('timezone')
    .optional()
    .isString().withMessage('Timezone must be a string'),
  body('notifications')
    .optional()
    .isObject().withMessage('Notifications must be an object'),
  body('privacy')
    .optional()
    .isObject().withMessage('Privacy must be an object')
];

const reactivateValidation = [
  body('email')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

// Public routes
router.get('/:id', getUserById);
router.get('/:id/properties', getUserProperties);
router.get('/:id/reviews', getUserReviews);

// Protected routes
router.get('/favorites', 
  protect, 
  getUserFavorites
);

router.get('/stats', 
  protect, 
  getUserStats
);

router.put('/preferences', 
  protect, 
  validate(preferencesValidation), 
  updatePreferences
);

router.post('/profile-image', 
  protect,
  uploadSingle('profileImage'),
  uploadProfileImage
);

router.delete('/account', 
  protect,
  body('password').notEmpty().withMessage('Password is required'),
  validate([body('password').notEmpty()]),
  deleteAccount
);

router.post('/reactivate', 
  validate(reactivateValidation), 
  reactivateAccount
);

module.exports = router;