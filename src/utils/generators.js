const crypto = require('crypto');

// Generate unique ID with prefix
const generateId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
};

// Generate booking reference
const generateBookingReference = () => {
  const prefix = 'BOK';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  
  return `${prefix}${year}${month}${day}${random}`;
};

// Generate inquiry reference
const generateInquiryReference = () => {
  const prefix = 'INQ';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `${prefix}${year}${month}${random}`;
};

// Generate review reference
const generateReviewReference = () => {
  const prefix = 'REV';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${prefix}${timestamp}${random}`;
};

// Generate report reference
const generateReportReference = () => {
  const prefix = 'RPT';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  
  return `${prefix}${year}${month}${random}`;
};

// Generate notification reference
const generateNotificationReference = () => {
  const prefix = 'NOT';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `${prefix}${year}${month}${day}${random}`;
};

// Generate property reference
const generatePropertyReference = () => {
  const prefix = 'PRP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  
  return `${prefix}${timestamp}${random}`;
};

// Generate OTP (One Time Password)
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
};

// Generate random password
const generateRandomPassword = (length = 10) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + special;
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Generate filename for uploads
const generateFilename = (originalname) => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = originalname.split('.').pop();
  
  return `${timestamp}-${random}.${ext}`;
};

// Generate token
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate API key
const generateApiKey = () => {
  const prefix = 'kg_';
  const random = crypto.randomBytes(24).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  return `${prefix}${random}`;
};

// Generate slug from text
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// Generate username from email
const generateUsername = (email) => {
  const base = email.split('@')[0];
  const cleaned = base.replace(/[^a-zA-Z0-9]/g, '');
  const random = Math.floor(Math.random() * 1000);
  
  return `${cleaned}${random}`;
};

// Generate invoice number
const generateInvoiceNumber = () => {
  const prefix = 'INV';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `${prefix}${year}${month}${day}${sequence}`;
};

// Generate transaction ID
const generateTransactionId = () => {
  const prefix = 'TXN';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  
  return `${prefix}${timestamp}${random}`;
};

// Generate coupon code
const generateCouponCode = (length = 8) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let code = '';
  
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return code;
};

// Generate tracking number
const generateTrackingNumber = () => {
  const prefix = 'TRK';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  
  return `${prefix}${timestamp}${random}`;
};

// Generate session ID
const generateSessionId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Generate CSRF token
const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('base64');
};

// Generate verification code
const generateVerificationCode = (length = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let code = '';
  
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return code;
};

// Generate color (hex)
const generateColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

module.exports = {
  generateId,
  generateBookingReference,
  generateInquiryReference,
  generateReviewReference,
  generateReportReference,
  generateNotificationReference,
  generatePropertyReference,
  generateOTP,
  generateRandomPassword,
  generateFilename,
  generateToken,
  generateApiKey,
  generateSlug,
  generateUsername,
  generateInvoiceNumber,
  generateTransactionId,
  generateCouponCode,
  generateTrackingNumber,
  generateSessionId,
  generateCsrfToken,
  generateVerificationCode,
  generateColor
};