const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validation');
const rateLimiters = require('../middleware/rateLimiter');
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  refreshToken
} = require('../controllers/authController');

// Validation rules
const registerValidation = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('phone')
    .matches(/^\+252\d{7,9}$/).withMessage('Phone must be in +252 format (e.g., +252612345678)'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),
  body('role')
    .optional()
    .isIn(['tenant', 'landlord']).withMessage('Role must be either tenant or landlord')
];

const loginValidation = [
  body('email')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .matches(/\d/).withMessage('New password must contain at least one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];

const forgotPasswordValidation = [
  body('email')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail()
];

const resetPasswordValidation = [
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number')
];

const updateProfileValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^\+252\d{7,9}$/).withMessage('Phone must be in +252 format'),
  body('bio')
    .optional()
    .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
  body('address')
    .optional()
    .isObject().withMessage('Address must be an object'),
  body('preferredLanguage')
    .optional()
    .isIn(['en', 'so', 'ar']).withMessage('Preferred language must be en, so, or ar')
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required')
];

// Routes
router.post('/register', 
  rateLimiters.auth,
  validate(registerValidation), 
  register
);

router.post('/login', 
  rateLimiters.auth,
  validate(loginValidation), 
  login
);

router.post('/logout', 
  protect, 
  logout
);

router.get('/me', 
  protect, 
  getMe
);

router.put('/profile', 
  protect, 
  validate(updateProfileValidation), 
  updateProfile
);

router.post('/change-password', 
  protect, 
  validate(changePasswordValidation), 
  changePassword
);

router.post('/forgot-password', 
  rateLimiters.auth,
  validate(forgotPasswordValidation), 
  forgotPassword
);

router.post('/reset-password/:token', 
  rateLimiters.auth,
  validate(resetPasswordValidation), 
  resetPassword
);

router.get('/verify-email/:token', 
  verifyEmail
);

router.post('/resend-verification', 
  rateLimiters.auth,
  validate(forgotPasswordValidation), 
  resendVerification
);

router.post('/refresh-token', 
  validate(refreshTokenValidation), 
  refreshToken
);

module.exports = router;