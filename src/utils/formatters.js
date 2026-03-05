const moment = require('moment');

// Format price
const formatPrice = (price, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

// Format date
const formatDate = (date, format = 'short') => {
  if (!date) return '';
  
  const d = new Date(date);
  
  const formats = {
    short: {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    },
    long: {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    },
    time: {
      hour: '2-digit',
      minute: '2-digit'
    },
    datetime: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    },
    iso: 'yyyy-mm-dd',
    filename: 'YYYYMMDD_HHmmss'
  };
  
  if (format === 'iso') {
    return d.toISOString().split('T')[0];
  }
  
  if (format === 'filename') {
    return moment(d).format('YYYYMMDD_HHmmss');
  }
  
  return new Intl.DateTimeFormat('en-US', formats[format] || formats.short).format(d);
};

// Format phone number
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Somali format: +252 61 234 5678
  if (cleaned.startsWith('252')) {
    const match = cleaned.match(/^(\d{3})(\d{2})(\d{3})(\d{4})$/);
    if (match) {
      return `+${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
    }
  }
  
  // Local format: 061 234 5678
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]}`;
    }
  }
  
  return phone;
};

// Format number with commas
const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US').format(num);
};

// Format percentage
const formatPercentage = (value, decimals = 1) => {
  return `${value.toFixed(decimals)}%`;
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format duration
const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  
  return `${mins}m`;
};

// Format address
const formatAddress = (address) => {
  if (!address) return '';
  
  const parts = [];
  
  if (address.street) parts.push(address.street);
  if (address.district) parts.push(address.district);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.country) parts.push(address.country);
  
  return parts.join(', ');
};

// Format search query
const formatSearchQuery = (query) => {
  return query
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Format rating
const formatRating = (rating) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  
  return {
    value: rating.toFixed(1),
    stars: '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars),
    percentage: (rating / 5) * 100,
    fullStars,
    halfStar,
    emptyStars
  };
};

// Format relative time
const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);
  
  if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
  
  if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  
  if (seconds > 30) {
    return `${seconds} seconds ago`;
  }
  
  return 'Just now';
};

// Format list to string
const formatList = (list, conjunction = 'and') => {
  if (!list || list.length === 0) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} ${conjunction} ${list[1]}`;
  
  const last = list.pop();
  return `${list.join(', ')}, ${conjunction} ${last}`;
};

// Format name (capitalize first letter of each word)
const formatName = (name) => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Format boolean to Yes/No
const formatBoolean = (value) => {
  return value ? 'Yes' : 'No';
};

// Format time ago
const formatTimeAgo = (date) => {
  return moment(date).fromNow();
};

// Format distance
const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

// Format area
const formatArea = (sqm) => {
  return `${Math.round(sqm)} m²`;
};

// Format percentage change
const formatPercentageChange = (oldValue, newValue) => {
  if (oldValue === 0) return '+100%';
  const change = ((newValue - oldValue) / oldValue) * 100;
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
};

// Format JSON
const formatJSON = (obj, pretty = true) => {
  return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
};

module.exports = {
  formatPrice,
  formatDate,
  formatPhoneNumber,
  formatNumber,
  formatPercentage,
  formatFileSize,
  formatDuration,
  formatAddress,
  formatSearchQuery,
  formatRating,
  formatRelativeTime,
  formatList,
  formatName,
  formatBoolean,
  formatTimeAgo,
  formatDistance,
  formatArea,
  formatPercentageChange,
  formatJSON
};