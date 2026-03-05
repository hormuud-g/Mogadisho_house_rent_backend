const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const validate = require('../middleware/validation');
const {
  getDistricts,
  getDistrictDetails,
  getPropertyTypes,
  getAmenities,
  getFaqs,
  getMarketOverview,
  getPlatformStats,
  getContactInfo,
  getAboutInfo,
  healthCheck,
  getVersion,
  globalSearch
} = require('../controllers/publicController');

// Validation rules
const searchValidation = [
  query('q')
    .optional()
    .isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
  query('type')
    .optional()
    .isIn(['all', 'properties', 'landlords', 'districts']).withMessage('Invalid search type'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
];

const districtValidation = [
  query('id')
    .optional()
    .isString().withMessage('District ID must be a string')
];

// Public routes - no authentication required
router.get('/districts', getDistricts);
router.get('/districts/:id', getDistrictDetails);
router.get('/property-types', getPropertyTypes);
router.get('/amenities', getAmenities);
router.get('/faqs', getFaqs);
router.get('/market-overview', getMarketOverview);
router.get('/stats', getPlatformStats);
router.get('/contact', getContactInfo);
router.get('/about', getAboutInfo);
router.get('/health', healthCheck);
router.get('/version', getVersion);

router.get('/search',
  validate(searchValidation),
  globalSearch
);

module.exports = router;