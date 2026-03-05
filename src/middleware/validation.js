const { validationResult } = require('express-validator');

// Validate request against express-validator rules
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  };
};

// Custom validators
const customValidators = {
  // Check if value is a valid MongoDB ObjectId
  isObjectId: (value) => {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(value);
  },

  // Check if date is in the future
  isFutureDate: (value) => {
    const date = new Date(value);
    const now = new Date();
    return date > now;
  },

  // Check if date is in the past
  isPastDate: (value) => {
    const date = new Date(value);
    const now = new Date();
    return date < now;
  },

  // Check if value is a valid Somali phone number
  isSomaliPhone: (value) => {
    const somaliRegex = /^\+252\d{7,9}$/;
    return somaliRegex.test(value);
  },

  // Check if value is a valid price
  isValidPrice: (value) => {
    return typeof value === 'number' && value > 0 && value <= 1000000;
  },

  // Check if value is a valid rating (1-5)
  isValidRating: (value) => {
    return typeof value === 'number' && value >= 1 && value <= 5;
  },

  // Check if check-out date is after check-in date
  isValidDateRange: (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return end > start;
  },

  // Check if guest count is valid
  isValidGuestCount: (adults, children = 0, infants = 0, maxGuests = 10) => {
    const total = adults + children + infants;
    return adults >= 1 && total <= maxGuests;
  }
};

// Sanitize input
const sanitize = {
  // Trim whitespace
  trim: (value) => {
    if (typeof value === 'string') return value.trim();
    return value;
  },

  // Convert to lowercase
  toLowerCase: (value) => {
    if (typeof value === 'string') return value.toLowerCase();
    return value;
  },

  // Convert to uppercase
  toUpperCase: (value) => {
    if (typeof value === 'string') return value.toUpperCase();
    return value;
  },

  // Convert to number
  toNumber: (value) => {
    const num = Number(value);
    return isNaN(num) ? value : num;
  },

  // Convert to boolean
  toBoolean: (value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  },

  // Remove HTML tags
  stripHtml: (value) => {
    if (typeof value === 'string') {
      return value.replace(/<[^>]*>/g, '');
    }
    return value;
  }
};

module.exports = validate;
module.exports.customValidators = customValidators;
module.exports.sanitize = sanitize;