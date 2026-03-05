// Central export for all constants
const roles = require('./roles');
const districts = require('./districts');
const property = require('./property');
const booking = require('./booking');
const messages = require('./messages');

module.exports = {
  ...roles,
  ...districts,
  ...property,
  ...booking,
  ...messages,
  
  // App constants
  APP_NAME: 'Kirada Guryaha',
  APP_VERSION: '1.0.0',
  APP_DESCRIPTION: 'Rental Property Platform API - Mogadishu District',
  
  // API constants
  API_PREFIX: '/api',
  API_DOCS: '/api-docs',
  
  // Date formats
  DATE_FORMATS: {
    SHORT: 'YYYY-MM-DD',
    LONG: 'MMMM Do YYYY',
    FULL: 'dddd, MMMM Do YYYY, h:mm:ss a',
    TIME: 'h:mm a'
  },
  
  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },
  
  // File upload
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    MAX_FILES_PER_UPLOAD: 10
  },
  
  // Cache durations (in seconds)
  CACHE: {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    DAY: 86400 // 24 hours
  },
  
  // HTTP status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE: 422,
    TOO_MANY_REQUESTS: 429,
    SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503
  },
  
  // Timeouts (in milliseconds)
  TIMEOUTS: {
    DEFAULT: 30000, // 30 seconds
    LONG: 60000, // 1 minute
    UPLOAD: 120000 // 2 minutes
  }
};