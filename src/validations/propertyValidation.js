const { body, query } = require('express-validator');
const { MOGADISHU_DISTRICTS } = require('../constants/districts');
const { PROPERTY_TYPES, AMENITIES } = require('../constants/property');

// Create property validation
const createPropertyValidation = [
  body('title')
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters')
    .trim()
    .escape(),
  
  body('description')
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 20, max: 2000 }).withMessage('Description must be between 20 and 2000 characters')
    .trim()
    .escape(),
  
  body('summary')
    .optional()
    .isLength({ max: 300 }).withMessage('Summary cannot exceed 300 characters')
    .trim()
    .escape(),
  
  body('price')
    .notEmpty().withMessage('Price is required')
    .isNumeric().withMessage('Price must be a number')
    .custom(value => value > 0).withMessage('Price must be greater than 0')
    .custom(value => value <= 1000000).withMessage('Price cannot exceed 1,000,000'),
  
  body('priceUnit')
    .optional()
    .isIn(['monthly', 'weekly', 'daily', 'yearly']).withMessage('Invalid price unit')
    .default('monthly'),
  
  body('securityDeposit')
    .optional()
    .isNumeric().withMessage('Security deposit must be a number')
    .custom(value => value >= 0).withMessage('Security deposit cannot be negative'),
  
  body('cleaningFee')
    .optional()
    .isNumeric().withMessage('Cleaning fee must be a number')
    .custom(value => value >= 0).withMessage('Cleaning fee cannot be negative'),
  
  body('type')
    .notEmpty().withMessage('Property type is required')
    .isIn(PROPERTY_TYPES).withMessage('Invalid property type'),
  
  body('bedrooms')
    .notEmpty().withMessage('Number of bedrooms is required')
    .isInt({ min: 0, max: 20 }).withMessage('Bedrooms must be between 0 and 20'),
  
  body('bathrooms')
    .notEmpty().withMessage('Number of bathrooms is required')
    .isInt({ min: 0, max: 20 }).withMessage('Bathrooms must be between 0 and 20'),
  
  body('size')
    .notEmpty().withMessage('Size is required')
    .isNumeric().withMessage('Size must be a number')
    .custom(value => value > 0).withMessage('Size must be greater than 0')
    .custom(value => value <= 10000).withMessage('Size cannot exceed 10,000'),
  
  body('sizeUnit')
    .optional()
    .isIn(['sqft', 'sqm']).withMessage('Size unit must be sqft or sqm')
    .default('sqm'),
  
  body('location.district')
    .notEmpty().withMessage('District is required')
    .custom(value => {
      const validDistricts = MOGADISHU_DISTRICTS.map(d => d.id);
      if (!validDistricts.includes(value)) {
        throw new Error('Invalid Mogadishu district');
      }
      return true;
    }),
  
  body('location.subDistrict')
    .optional()
    .isString().withMessage('Sub-district must be a string')
    .trim()
    .escape(),
  
  body('location.address')
    .notEmpty().withMessage('Address is required')
    .isLength({ max: 300 }).withMessage('Address cannot exceed 300 characters')
    .trim()
    .escape(),
  
  body('location.landmark')
    .optional()
    .isLength({ max: 100 }).withMessage('Landmark cannot exceed 100 characters')
    .trim()
    .escape(),
  
  body('location.coordinates.lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  
  body('location.coordinates.lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  
  body('amenities')
    .optional()
    .isArray().withMessage('Amenities must be an array')
    .custom(values => {
      if (values && values.length > 0) {
        const invalid = values.filter(v => !AMENITIES.includes(v));
        if (invalid.length > 0) {
          throw new Error(`Invalid amenities: ${invalid.join(', ')}`);
        }
      }
      return true;
    }),
  
  body('furnishing')
    .optional()
    .isIn(['unfurnished', 'semi-furnished', 'fully-furnished']).withMessage('Invalid furnishing option'),
  
  body('parkingSpaces')
    .optional()
    .isInt({ min: 0, max: 10 }).withMessage('Parking spaces must be between 0 and 10'),
  
  body('rules.smoking')
    .optional()
    .isIn(['allowed', 'not-allowed', 'outdoor-only']).withMessage('Invalid smoking rule'),
  
  body('rules.pets')
    .optional()
    .isIn(['allowed', 'not-allowed', 'small-only', 'negotiable']).withMessage('Invalid pets rule'),
  
  body('rules.parties')
    .optional()
    .isIn(['allowed', 'not-allowed', 'quiet-only']).withMessage('Invalid parties rule'),
  
  body('availability.availableFrom')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  
  body('availability.minimumStay')
    .optional()
    .isInt({ min: 1 }).withMessage('Minimum stay must be at least 1 day'),
  
  body('availability.maximumStay')
    .optional()
    .isInt({ max: 365 }).withMessage('Maximum stay cannot exceed 365 days'),
  
  body('contactInfo.phone')
    .optional()
    .matches(/^\+252\d{7,9}$/).withMessage('Phone must be in +252 format'),
  
  body('contactInfo.email')
    .optional()
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),
  
  body('featured')
    .optional()
    .isBoolean().withMessage('Featured must be a boolean')
];

// Update property validation
const updatePropertyValidation = createPropertyValidation.map(validation => {
  // Make all fields optional for update
  if (validation.builder && validation.builder.fields) {
    return validation.optional();
  }
  return validation;
});

// Property search validation
const searchPropertiesValidation = [
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
  
  query('district')
    .optional()
    .custom(value => {
      const validDistricts = MOGADISHU_DISTRICTS.map(d => d.id);
      if (!validDistricts.includes(value)) {
        throw new Error('Invalid Mogadishu district');
      }
      return true;
    }),
  
  query('minPrice')
    .optional()
    .isInt({ min: 0 }).withMessage('Min price must be a positive number')
    .toInt(),
  
  query('maxPrice')
    .optional()
    .isInt({ min: 0 }).withMessage('Max price must be a positive number')
    .toInt()
    .custom((value, { req }) => {
      if (req.query.minPrice && value < parseInt(req.query.minPrice)) {
        throw new Error('Max price must be greater than min price');
      }
      return true;
    }),
  
  query('type')
    .optional()
    .isIn(PROPERTY_TYPES).withMessage('Invalid property type'),
  
  query('bedrooms')
    .optional()
    .isInt({ min: 0, max: 10 }).withMessage('Bedrooms must be between 0 and 10')
    .toInt(),
  
  query('bathrooms')
    .optional()
    .isInt({ min: 0, max: 10 }).withMessage('Bathrooms must be between 0 and 10')
    .toInt(),
  
  query('amenities')
    .optional()
    .custom(value => {
      const amenities = value.split(',');
      const invalid = amenities.filter(a => !AMENITIES.includes(a));
      if (invalid.length > 0) {
        throw new Error(`Invalid amenities: ${invalid.join(', ')}`);
      }
      return true;
    }),
  
  query('furnished')
    .optional()
    .isIn(['unfurnished', 'semi-furnished', 'fully-furnished']).withMessage('Invalid furnishing option'),
  
  query('sort')
    .optional()
    .isIn(['price_asc', 'price_desc', 'newest', 'oldest', 'most_viewed', 'highest_rated'])
    .withMessage('Invalid sort option')
    .default('newest')
];

// Price comparison validation
const priceComparisonValidation = [
  query('district')
    .optional()
    .custom(value => {
      const validDistricts = MOGADISHU_DISTRICTS.map(d => d.id);
      if (!validDistricts.includes(value)) {
        throw new Error('Invalid Mogadishu district');
      }
      return true;
    }),
  
  query('type')
    .optional()
    .isIn(PROPERTY_TYPES).withMessage('Invalid property type')
];

// Nearby properties validation
const nearbyPropertiesValidation = [
  query('lat')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude')
    .toFloat(),
  
  query('lng')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
    .toFloat(),
  
  query('radius')
    .optional()
    .isInt({ min: 100, max: 50000 }).withMessage('Radius must be between 100 and 50000 meters')
    .toInt()
    .default(5000),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
    .toInt()
    .default(20)
];

// Property ID validation
const propertyIdValidation = [
  body('propertyId')
    .notEmpty().withMessage('Property ID is required')
    .isMongoId().withMessage('Invalid property ID format')
];

// Favorite validation
const favoriteValidation = [
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
    .trim()
    .escape(),
  
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),
  
  body('reminder.date')
    .optional()
    .isISO8601().withMessage('Invalid reminder date'),
  
  body('reminder.type')
    .optional()
    .isIn(['viewing', 'contact', 'price_check', 'availability', 'other'])
    .withMessage('Invalid reminder type')
];

module.exports = {
  createPropertyValidation,
  updatePropertyValidation,
  searchPropertiesValidation,
  priceComparisonValidation,
  nearbyPropertiesValidation,
  propertyIdValidation,
  favoriteValidation
};