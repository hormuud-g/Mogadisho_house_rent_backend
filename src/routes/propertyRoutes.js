const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { protect, optionalAuth } = require('../middleware/auth');
const { authorize, checkOwnership } = require('../middleware/roleCheck');
const validate = require('../middleware/validation');
const { uploadMultiple } = require('../middleware/upload');
const rateLimiters = require('../middleware/rateLimiter');
const {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  searchProperties,
  getLandlordProperties,
  getPriceComparison,
  getNearbyProperties,
  toggleFavorite,
  getPropertyAnalytics
} = require('../controllers/propertyController');

// Validation rules
const propertyValidation = [
  body('title')
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 20, max: 2000 }).withMessage('Description must be between 20 and 2000 characters'),
  body('price')
    .isNumeric().withMessage('Price must be a number')
    .custom(value => value > 0).withMessage('Price must be greater than 0')
    .custom(value => value <= 1000000).withMessage('Price cannot exceed 1,000,000'),
  body('type')
    .isIn(['apartment', 'house', 'room', 'office', 'shop', 'land', 'villa', 'commercial', 'warehouse', 'studio'])
    .withMessage('Invalid property type'),
  body('bedrooms')
    .isInt({ min: 0, max: 20 }).withMessage('Bedrooms must be between 0 and 20'),
  body('bathrooms')
    .isInt({ min: 0, max: 20 }).withMessage('Bathrooms must be between 0 and 20'),
  body('size')
    .isNumeric().withMessage('Size must be a number')
    .custom(value => value > 0).withMessage('Size must be greater than 0'),
  body('location.district')
    .notEmpty().withMessage('District is required'),
  body('location.address')
    .notEmpty().withMessage('Address is required')
    .isLength({ max: 300 }).withMessage('Address cannot exceed 300 characters')
];

const propertyUpdateValidation = propertyValidation.map(validation => {
  if (validation.builder && validation.builder.fields) {
    return validation.optional();
  }
  return validation;
});

const searchValidation = [
  query('q')
    .optional()
    .isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('minPrice')
    .optional()
    .isInt({ min: 0 }).withMessage('Min price must be a positive number'),
  query('maxPrice')
    .optional()
    .isInt({ min: 0 }).withMessage('Max price must be a positive number')
];

const priceComparisonValidation = [
  query('district')
    .optional()
    .isString().withMessage('District must be a string'),
  query('type')
    .optional()
    .isString().withMessage('Type must be a string')
];

const nearbyValidation = [
  query('lat')
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  query('lng')
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  query('radius')
    .optional()
    .isInt({ min: 100, max: 50000 }).withMessage('Radius must be between 100 and 50000 meters')
];

// Public routes
router.get('/', 
  optionalAuth,
  validate(searchValidation), 
  getProperties
);

router.get('/search', 
  validate(searchValidation), 
  searchProperties
);

router.get('/price-comparison', 
  validate(priceComparisonValidation), 
  getPriceComparison
);

router.get('/nearby', 
  validate(nearbyValidation), 
  getNearbyProperties
);

router.get('/landlord/:id', 
  optionalAuth,
  getLandlordProperties
);

router.get('/:id', 
  optionalAuth, 
  getProperty
);

// Protected routes
router.post('/',
  protect,
  authorize('landlord', 'admin'),
  rateLimiters.propertyCreate,
  uploadMultiple('images', 10),
  validate(propertyValidation),
  createProperty
);

router.put('/:id',
  protect,
  checkOwnership('Property'),
  uploadMultiple('images', 10),
  validate(propertyUpdateValidation),
  updateProperty
);

router.delete('/:id',
  protect,
  checkOwnership('Property'),
  deleteProperty
);

router.post('/:id/favorite',
  protect,
  authorize('tenant'),
  toggleFavorite
);

router.delete('/:id/favorite',
  protect,
  authorize('tenant'),
  toggleFavorite
);

router.get('/:id/analytics',
  protect,
  authorize('landlord', 'admin'),
  checkOwnership('Property'),
  getPropertyAnalytics
);

module.exports = router;