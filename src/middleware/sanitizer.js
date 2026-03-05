const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const he = require('he');

// XSS white list - allowed HTML tags and attributes
const xssOptions = {
  whiteList: {}, // No HTML tags allowed by default
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'frame'],
  onTagAttr: (tag, name, value, isWhiteAttr) => {
    // Don't allow any attributes
    return '';
  }
};

// Custom XSS sanitization
const sanitizeXSS = (input) => {
  if (typeof input === 'string') {
    // Decode HTML entities first
    let decoded = he.decode(input);
    // Apply XSS filter
    return xss(decoded, xssOptions);
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeXSS(item));
  }
  
  if (input && typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeXSS(value);
    }
    return sanitized;
  }
  
  return input;
};

// Sanitize SQL injection (basic)
const sanitizeSQL = (input) => {
  if (typeof input === 'string') {
    // Remove SQL injection patterns
    return input
      .replace(/['"\\;]/g, '')
      .replace(/\b(select|insert|update|delete|drop|union|exec|declare|cast|create|alter)\b/gi, '');
  }
  return input;
};

// Sanitize phone numbers
const sanitizePhone = (phone) => {
  if (typeof phone === 'string') {
    // Remove all non-digit characters except +
    return phone.replace(/[^\d+]/g, '');
  }
  return phone;
};

// Sanitize email
const sanitizeEmail = (email) => {
  if (typeof email === 'string') {
    return email.toLowerCase().trim();
  }
  return email;
};

// Sanitize URLs
const sanitizeUrl = (url) => {
  if (typeof url === 'string') {
    // Only allow http and https protocols
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return '';
  }
  return url;
};

// Main sanitizer middleware
const sanitizer = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body) {
      // Apply NoSQL injection prevention
      req.body = mongoSanitize.sanitize(req.body);
      
      // Apply XSS prevention
      req.body = sanitizeXSS(req.body);
      
      // Special handling for specific fields
      if (req.body.phone) {
        req.body.phone = sanitizePhone(req.body.phone);
      }
      
      if (req.body.email) {
        req.body.email = sanitizeEmail(req.body.email);
      }
      
      if (req.body.website || req.body.url) {
        const urlField = req.body.website ? 'website' : 'url';
        req.body[urlField] = sanitizeUrl(req.body[urlField]);
      }
    }

    // Sanitize query
    if (req.query) {
      req.query = mongoSanitize.sanitize(req.query);
      req.query = sanitizeXSS(req.query);
    }

    // Sanitize params
    if (req.params) {
      req.params = mongoSanitize.sanitize(req.params);
      req.params = sanitizeXSS(req.params);
    }

    // Sanitize headers (remove potentially dangerous headers)
    const dangerousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-original-url'];
    dangerousHeaders.forEach(header => {
      if (req.headers[header]) {
        delete req.headers[header];
      }
    });

    next();
  } catch (error) {
    console.error('Sanitization error:', error);
    next(error);
  }
};

// Deep sanitize for nested objects
const deepSanitize = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object') {
      sanitized[key] = deepSanitize(value);
    } else if (typeof value === 'string') {
      sanitized[key] = xss(he.decode(value), xssOptions);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// Validate and sanitize file names
const sanitizeFilename = (filename) => {
  if (!filename) return filename;
  
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\.\//g, '');
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');
  
  return sanitized;
};

module.exports = sanitizer;
module.exports.deepSanitize = deepSanitize;
module.exports.sanitizeFilename = sanitizeFilename;
module.exports.sanitizeXSS = sanitizeXSS;
module.exports.sanitizePhone = sanitizePhone;
module.exports.sanitizeEmail = sanitizeEmail;