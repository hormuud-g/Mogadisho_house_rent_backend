// API endpoints
const API_ENDPOINTS = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  PROPERTIES: '/api/properties',
  BOOKINGS: '/api/bookings',
  INQUIRIES: '/api/inquiries',
  REVIEWS: '/api/reviews',
  NOTIFICATIONS: '/api/notifications',
  REPORTS: '/api/reports',
  ADMIN: '/api/admin',
  PUBLIC: '/api/public'
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

// HTTP methods
const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  OPTIONS: 'OPTIONS',
  HEAD: 'HEAD'
};

// Content types
const CONTENT_TYPES = {
  JSON: 'application/json',
  HTML: 'text/html',
  TEXT: 'text/plain',
  XML: 'application/xml',
  FORM: 'application/x-www-form-urlencoded',
  MULTIPART: 'multipart/form-data',
  PDF: 'application/pdf',
  CSV: 'text/csv',
  ZIP: 'application/zip'
};

// File upload limits
const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_DOCUMENT_SIZE: 20 * 1024 * 1024, // 20MB
  MAX_FILES_PER_UPLOAD: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/mpeg', 'video/quicktime']
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  DEFAULT_SORT: 'createdAt',
  DEFAULT_ORDER: 'desc'
};

// Date formats
const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  SHORT: 'MMM D, YYYY',
  LONG: 'MMMM D, YYYY',
  FULL: 'dddd, MMMM D, YYYY',
  DATETIME: 'MMM D, YYYY h:mm A',
  TIME: 'h:mm A',
  FILENAME: 'YYYYMMDD_HHmmss',
  API: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
};

// Time periods
const TIME_PERIODS = {
  MILLISECOND: 1,
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000
};

// Cache durations (in seconds)
const CACHE_DURATIONS = {
  NONE: 0,
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
  WEEK: 604800 // 7 days
};

// Regular expressions
const REGEX = {
  EMAIL: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
  PHONE: /^\+252\d{7,9}$/,
  SOMALI_PHONE: /^(\+252|0)\d{7,9}$/,
  PASSWORD: /^(?=.*\d).{6,}$/,
  OBJECT_ID: /^[0-9a-fA-F]{24}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  NUMERIC: /^\d+$/
};

// Environment
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  TESTING: 'testing',
  STAGING: 'staging',
  PRODUCTION: 'production'
};

// Log levels
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly'
};

// Sort orders
const SORT_ORDERS = {
  ASC: 'asc',
  DESC: 'desc',
  ASCENDING: 'ascending',
  DESCENDING: 'descending'
};

// Boolean strings
const BOOLEAN_STRINGS = {
  TRUE: 'true',
  FALSE: 'false',
  YES: 'yes',
  NO: 'no',
  ON: 'on',
  OFF: 'off',
  ONE: '1',
  ZERO: '0'
};

// Currency codes
const CURRENCIES = {
  USD: 'USD',
  SOS: 'SOS',
  EUR: 'EUR',
  GBP: 'GBP'
};

// Language codes
const LANGUAGES = {
  ENGLISH: 'en',
  SOMALI: 'so',
  ARABIC: 'ar'
};

// Timezones
const TIMEZONES = {
  MOGADISHU: 'Africa/Mogadishu',
  UTC: 'UTC',
  DEFAULT: 'Africa/Mogadishu'
};

// Default values
const DEFAULTS = {
  LANGUAGE: 'en',
  CURRENCY: 'USD',
  TIMEZONE: 'Africa/Mogadishu',
  COUNTRY: 'Somalia',
  CITY: 'Mogadishu',
  PAGE_SIZE: 10,
  DATE_FORMAT: 'MMM D, YYYY',
  TIME_FORMAT: 'h:mm A'
};

// Error codes
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  THIRD_PARTY_ERROR: 'THIRD_PARTY_ERROR'
};

module.exports = {
  API_ENDPOINTS,
  HTTP_STATUS,
  HTTP_METHODS,
  CONTENT_TYPES,
  UPLOAD_LIMITS,
  PAGINATION,
  DATE_FORMATS,
  TIME_PERIODS,
  CACHE_DURATIONS,
  REGEX,
  ENVIRONMENTS,
  LOG_LEVELS,
  SORT_ORDERS,
  BOOLEAN_STRINGS,
  CURRENCIES,
  LANGUAGES,
  TIMEZONES,
  DEFAULTS,
  ERROR_CODES
};