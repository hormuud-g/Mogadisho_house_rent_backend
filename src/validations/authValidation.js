const { body } = require('express-validator');
const { REGEX } = require('../utils/constants');

// Register validation
const registerValidation = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
    .trim()
    .escape(),
  
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail()
    .toLowerCase(),
  
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .matches(REGEX.SOMALI_PHONE).withMessage('Phone must be in +252 format or start with 0 (e.g., +252612345678 or 0612345678)')
    .custom((value) => {
      // Additional validation for Somali phone numbers
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.startsWith('252') && cleaned.length !== 12) {
        throw new Error('Invalid Somali phone number length');
      }
      if (cleaned.startsWith('0') && cleaned.length !== 10) {
        throw new Error('Invalid local phone number length');
      }
      return true;
    }),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter'),
  
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  body('role')
    .optional()
    .isIn(['tenant', 'landlord']).withMessage('Role must be either tenant or landlord')
    .default('tenant'),
  
  body('terms')
    .notEmpty().withMessage('You must accept the terms and conditions')
    .isBoolean().withMessage('Terms must be a boolean')
    .custom(value => value === true).withMessage('You must accept the terms and conditions')
];

// Login validation
const loginValidation = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail()
    .toLowerCase(),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  body('rememberMe')
    .optional()
    .isBoolean().withMessage('Remember me must be a boolean')
];

// Change password validation
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .matches(/\d/).withMessage('New password must contain at least one number')
    .matches(/[a-zA-Z]/).withMessage('New password must contain at least one letter')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
  
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// Forgot password validation
const forgotPasswordValidation = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail()
    .toLowerCase()
];

// Reset password validation
const resetPasswordValidation = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter'),
  
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// Update profile validation
const updateProfileValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
    .trim()
    .escape(),
  
  body('phone')
    .optional()
    .matches(REGEX.SOMALI_PHONE).withMessage('Phone must be in +252 format or start with 0'),
  
  body('bio')
    .optional()
    .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters')
    .trim()
    .escape(),
  
  body('address')
    .optional()
    .isObject().withMessage('Address must be an object'),
  
  body('address.street')
    .optional()
    .isString().withMessage('Street must be a string')
    .trim()
    .escape(),
  
  body('address.district')
    .optional()
    .isString().withMessage('District must be a string')
    .trim()
    .escape(),
  
  body('address.city')
    .optional()
    .isString().withMessage('City must be a string')
    .trim()
    .escape(),
  
  body('preferredLanguage')
    .optional()
    .isIn(['en', 'so', 'ar']).withMessage('Preferred language must be en, so, or ar'),
  
  body('profileImage')
    .optional()
    .isURL().withMessage('Profile image must be a valid URL')
];

// Email verification validation
const verifyEmailValidation = [
  body('token')
    .notEmpty().withMessage('Verification token is required')
    .isLength({ min: 32, max: 64 }).withMessage('Invalid verification token')
];

// Resend verification validation
const resendVerificationValidation = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail()
    .toLowerCase()
];

// Refresh token validation
const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required')
    .isLength({ min: 40, max: 40 }).withMessage('Invalid refresh token')
];

// 2FA validation
const twoFactorValidation = [
  body('token')
    .notEmpty().withMessage('2FA token is required')
    .isLength({ min: 6, max: 6 }).withMessage('Invalid 2FA token')
    .isNumeric().withMessage('2FA token must be numeric')
];

module.exports = {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  updateProfileValidation,
  verifyEmailValidation,
  resendVerificationValidation,
  refreshTokenValidation,
  twoFactorValidation
};