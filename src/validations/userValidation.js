const { body, query, param } = require('express-validator');
const { REGEX } = require('../utils/constants');

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
  
  body('dateOfBirth')
    .optional()
    .isISO8601().withMessage('Invalid date format')
    .custom(value => {
      const dob = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      
      if (age < 18) {
        throw new Error('You must be at least 18 years old');
      }
      if (age > 120) {
        throw new Error('Invalid date of birth');
      }
      return true;
    }),
  
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer-not-to-say']).withMessage('Invalid gender option'),
  
  body('occupation')
    .optional()
    .isLength({ max: 100 }).withMessage('Occupation cannot exceed 100 characters')
    .trim()
    .escape(),
  
  body('company')
    .optional()
    .isLength({ max: 100 }).withMessage('Company name cannot exceed 100 characters')
    .trim()
    .escape(),
  
  body('address')
    .optional()
    .isObject().withMessage('Address must be an object'),
  
  body('address.street')
    .optional()
    .isLength({ max: 100 }).withMessage('Street cannot exceed 100 characters')
    .trim()
    .escape(),
  
  body('address.district')
    .optional()
    .isLength({ max: 50 }).withMessage('District cannot exceed 50 characters')
    .trim()
    .escape(),
  
  body('address.city')
    .optional()
    .isLength({ max: 50 }).withMessage('City cannot exceed 50 characters')
    .trim()
    .escape(),
  
  body('address.postalCode')
    .optional()
    .isLength({ max: 20 }).withMessage('Postal code cannot exceed 20 characters')
    .trim()
    .escape()
];

// Update preferences validation
const updatePreferencesValidation = [
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
  
  body('notifications.email')
    .optional()
    .isBoolean().withMessage('Email notification preference must be a boolean'),
  
  body('notifications.sms')
    .optional()
    .isBoolean().withMessage('SMS notification preference must be a boolean'),
  
  body('notifications.push')
    .optional()
    .isBoolean().withMessage('Push notification preference must be a boolean'),
  
  body('notifications.marketing')
    .optional()
    .isBoolean().withMessage('Marketing notification preference must be a boolean'),
  
  body('privacy')
    .optional()
    .isObject().withMessage('Privacy settings must be an object'),
  
  body('privacy.showEmail')
    .optional()
    .isBoolean().withMessage('Show email preference must be a boolean'),
  
  body('privacy.showPhone')
    .optional()
    .isBoolean().withMessage('Show phone preference must be a boolean'),
  
  body('privacy.showProfile')
    .optional()
    .isBoolean().withMessage('Show profile preference must be a boolean')
];

// Update notification preferences validation
const updateNotificationPreferencesValidation = [
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

// Verification documents validation
const verificationDocumentsValidation = [
  body('documents')
    .isArray({ min: 1, max: 5 }).withMessage('Please provide 1-5 documents'),
  
  body('documents.*.type')
    .notEmpty().withMessage('Document type is required')
    .isIn(['id_card', 'passport', 'business_license', 'property_deed', 'utility_bill'])
    .withMessage('Invalid document type'),
  
  body('documents.*.number')
    .notEmpty().withMessage('Document number is required')
    .isLength({ max: 50 }).withMessage('Document number cannot exceed 50 characters')
    .trim()
    .escape(),
  
  body('documents.*.name')
    .notEmpty().withMessage('Document name is required')
    .isLength({ max: 100 }).withMessage('Document name cannot exceed 100 characters')
    .trim()
    .escape(),
  
  body('documents.*.url')
    .notEmpty().withMessage('Document URL is required')
    .isURL().withMessage('Invalid document URL'),
  
  body('documents.*.expiryDate')
    .optional()
    .isISO8601().withMessage('Invalid expiry date format')
    .custom(value => {
      const expiryDate = new Date(value);
      const today = new Date();
      if (expiryDate < today) {
        throw new Error('Document has expired');
      }
      return true;
    })
];

// User ID validation
const userIdValidation = [
  param('id')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID format')
];

// User search validation
const userSearchValidation = [
  query('q')
    .optional()
    .isLength({ min: 2 }).withMessage('Search query must be at least 2 characters')
    .trim()
    .escape(),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt()
    .default(1),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
    .toInt()
    .default(10),
  
  query('role')
    .optional()
    .isIn(['tenant', 'landlord', 'admin']).withMessage('Invalid role'),
  
  query('status')
    .optional()
    .isIn(['active', 'suspended', 'deactivated', 'banned']).withMessage('Invalid status'),
  
  query('verified')
    .optional()
    .isBoolean().withMessage('Verified must be a boolean')
    .toBoolean()
];

// Favorites validation
const favoritesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt()
    .default(1),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
    .toInt()
    .default(10),
  
  query('folder')
    .optional()
    .isString().withMessage('Folder must be a string')
    .trim()
    .escape()
];

// Add to favorites validation
const addToFavoritesValidation = [
  body('propertyId')
    .notEmpty().withMessage('Property ID is required')
    .isMongoId().withMessage('Invalid property ID format'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
    .trim()
    .escape(),
  
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),
  
  body('folder')
    .optional()
    .isString().withMessage('Folder must be a string')
    .trim()
    .escape()
];

// Account deletion validation
const deleteAccountValidation = [
  body('password')
    .notEmpty().withMessage('Password is required to delete account'),
  
  body('reason')
    .optional()
    .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
    .trim()
    .escape(),
  
  body('confirm')
    .notEmpty().withMessage('Please confirm account deletion')
    .custom(value => value === true).withMessage('You must confirm account deletion')
];

// Reactivate account validation
const reactivateAccountValidation = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail()
    .toLowerCase(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
];

// User statistics validation
const userStatsValidation = [
  query('period')
    .optional()
    .isIn(['day', 'week', 'month', 'year', 'all']).withMessage('Invalid period')
    .default('month')
];

module.exports = {
  updateProfileValidation,
  updatePreferencesValidation,
  updateNotificationPreferencesValidation,
  verificationDocumentsValidation,
  userIdValidation,
  userSearchValidation,
  favoritesValidation,
  addToFavoritesValidation,
  deleteAccountValidation,
  reactivateAccountValidation,
  userStatsValidation
};