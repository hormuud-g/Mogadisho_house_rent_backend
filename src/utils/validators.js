const { MOGADISHU_DISTRICTS } = require('../constants/districts');

// Validate Somali phone number
const isSomaliPhone = (phone) => {
  const somaliRegex = /^\+252\d{7,9}$/;
  const localRegex = /^0\d{8,9}$/;
  return somaliRegex.test(phone) || localRegex.test(phone);
};

// Validate email
const isValidEmail = (email) => {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

// Validate password strength
const isStrongPassword = (password) => {
  // At least 6 characters, 1 number
  const passwordRegex = /^(?=.*\d).{6,}$/;
  return passwordRegex.test(password);
};

// Validate Mogadishu district
const isValidDistrict = (district) => {
  return MOGADISHU_DISTRICTS.some(d => 
    d.id === district || 
    d.name.toLowerCase() === district.toLowerCase() ||
    d.somali.toLowerCase() === district.toLowerCase()
  );
};

// Validate dates (check-in before check-out)
const areValidDates = (checkIn, checkOut) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const now = new Date();
  
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  return start >= now && end > start;
};

// Validate price range
const isValidPriceRange = (min, max) => {
  if (min && max && min > max) return false;
  if (min && min < 0) return false;
  if (max && max < 0) return false;
  return true;
};

// Validate file type
const isValidFileType = (filename, allowedTypes) => {
  const ext = filename.split('.').pop().toLowerCase();
  return allowedTypes.includes(ext);
};

// Validate file size
const isValidFileSize = (size, maxSize) => {
  return size <= maxSize;
};

// Validate MongoDB ObjectId
const isValidObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

// Validate URL
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Validate age (for guest age restrictions)
const isValidAge = (age, min = 0, max = 120) => {
  return age >= min && age <= max;
};

// Validate guest count
const isValidGuestCount = (adults, children = 0, infants = 0, maxGuests = 10) => {
  const total = adults + children + infants;
  return adults >= 1 && total <= maxGuests;
};

// Validate rating (1-5)
const isValidRating = (rating) => {
  return rating >= 1 && rating <= 5;
};

// Validate property type
const isValidPropertyType = (type) => {
  const validTypes = ['apartment', 'house', 'room', 'office', 'shop', 'land', 'villa', 'commercial', 'warehouse', 'studio'];
  return validTypes.includes(type);
};

// Validate booking status
const isValidBookingStatus = (status) => {
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'expired'];
  return validStatuses.includes(status);
};

// Validate user role
const isValidRole = (role) => {
  const validRoles = ['tenant', 'landlord', 'admin'];
  return validRoles.includes(role);
};

// Validate language
const isValidLanguage = (lang) => {
  const validLanguages = ['en', 'so', 'ar'];
  return validLanguages.includes(lang);
};

// Validate currency
const isValidCurrency = (currency) => {
  const validCurrencies = ['USD', 'SOS'];
  return validCurrencies.includes(currency);
};

// Validate UUID
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Validate credit card (Luhn algorithm)
const isValidCreditCard = (cardNumber) => {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  
  let sum = 0;
  let alternate = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);
    
    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    alternate = !alternate;
  }
  
  return sum % 10 === 0;
};

// Validate IP address
const isValidIP = (ip) => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

// Validate coordinates
const isValidCoordinates = (lat, lng) => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

module.exports = {
  isSomaliPhone,
  isValidEmail,
  isStrongPassword,
  isValidDistrict,
  areValidDates,
  isValidPriceRange,
  isValidFileType,
  isValidFileSize,
  isValidObjectId,
  isValidUrl,
  isValidAge,
  isValidGuestCount,
  isValidRating,
  isValidPropertyType,
  isValidBookingStatus,
  isValidRole,
  isValidLanguage,
  isValidCurrency,
  isValidUUID,
  isValidCreditCard,
  isValidIP,
  isValidCoordinates
};