const crypto = require('crypto');
const moment = require('moment');

// Generate random string
const generateRandomString = (length = 10) => {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
};

// Generate random number
const generateRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Format phone number to Somali format
const formatSomaliPhone = (phone) => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a Somali number
  if (cleaned.startsWith('252')) {
    const match = cleaned.match(/^(\d{3})(\d{2})(\d{3})(\d{4})$/);
    if (match) {
      return `+${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
    }
  } else if (cleaned.startsWith('0')) {
    const withoutZero = cleaned.substring(1);
    if (withoutZero.match(/^\d{8}$/)) {
      return `+252 ${withoutZero.substring(0, 2)} ${withoutZero.substring(2, 5)} ${withoutZero.substring(5)}`;
    }
  }
  
  return phone;
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Paginate results
const paginate = (page = 1, limit = 10) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  const skip = (pageNum - 1) * limitNum;
  const take = limitNum;
  
  return {
    skip,
    limit: take,
    page: pageNum,
    take
  };
};

// Build pagination response
const paginationResponse = (page, limit, total) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  return {
    page: pageNum,
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum),
    hasNext: pageNum < Math.ceil(total / limitNum),
    hasPrev: pageNum > 1
  };
};

// Extract file extension
const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

// Generate slug from string
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

// Mask email (show only first 3 chars and domain)
const maskEmail = (email) => {
  const [username, domain] = email.split('@');
  const maskedUsername = username.slice(0, 3) + '*'.repeat(username.length - 3);
  return `${maskedUsername}@${domain}`;
};

// Mask phone (show only last 4 digits)
const maskPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 8) return phone;
  const lastFour = cleaned.slice(-4);
  return '*'.repeat(cleaned.length - 4) + lastFour;
};

// Parse comma-separated string to array
const parseCSV = (str) => {
  if (!str) return [];
  return str.split(',').map(item => item.trim());
};

// Deep clone object
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Check if object is empty
const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

// Remove undefined and null values from object
const cleanObject = (obj) => {
  const cleaned = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
};

// Pick specific fields from object
const pick = (obj, fields) => {
  const picked = {};
  fields.forEach(field => {
    if (obj.hasOwnProperty(field)) {
      picked[field] = obj[field];
    }
  });
  return picked;
};

// Omit specific fields from object
const omit = (obj, fields) => {
  const omitted = { ...obj };
  fields.forEach(field => {
    delete omitted[field];
  });
  return omitted;
};

// Group array by key
const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

// Sort array by key
const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    if (order === 'asc') {
      return a[key] > b[key] ? 1 : -1;
    } else {
      return a[key] < b[key] ? 1 : -1;
    }
  });
};

// Unique array
const unique = (array) => {
  return [...new Set(array)];
};

// Chunk array into smaller arrays
const chunk = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Sleep/delay function
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Retry function with exponential backoff
const retry = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await sleep(delay * Math.pow(2, i));
    }
  }
  
  throw lastError;
};

// Calculate percentage
const percentage = (value, total) => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

// Calculate average
const average = (numbers) => {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return sum / numbers.length;
};

// Format bytes to human readable
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Generate random color
const randomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

// Check if string is JSON
const isJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

// Safe JSON parse
const safeJSONParse = (str, defaultValue = null) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
};

// Merge objects deeply
const deepMerge = (target, source) => {
  const output = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (isObject(source[key]) && isObject(target[key])) {
        output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }
  }
  
  return output;
};

// Check if value is object
const isObject = (value) => {
  return value && typeof value === 'object' && !Array.isArray(value);
};

module.exports = {
  generateRandomString,
  generateRandomNumber,
  formatSomaliPhone,
  calculateDistance,
  paginate,
  paginationResponse,
  getFileExtension,
  generateSlug,
  maskEmail,
  maskPhone,
  parseCSV,
  deepClone,
  isEmpty,
  cleanObject,
  pick,
  omit,
  groupBy,
  sortBy,
  unique,
  chunk,
  sleep,
  retry,
  percentage,
  average,
  formatBytes,
  randomColor,
  isJSON,
  safeJSONParse,
  deepMerge,
  isObject
};