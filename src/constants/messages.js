module.exports = {
  // Success messages
  SUCCESS: {
    // General
    OPERATION_SUCCESSFUL: 'Operation completed successfully',
    DATA_RETRIEVED: 'Data retrieved successfully',
    DATA_CREATED: 'Data created successfully',
    DATA_UPDATED: 'Data updated successfully',
    DATA_DELETED: 'Data deleted successfully',
    
    // Authentication
    REGISTER_SUCCESS: 'Registration successful. Please verify your email.',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    PROFILE_UPDATED: 'Profile updated successfully',
    PASSWORD_CHANGED: 'Password changed successfully',
    PASSWORD_RESET_EMAIL_SENT: 'If your email is registered, you will receive a password reset link',
    PASSWORD_RESET_SUCCESS: 'Password reset successful',
    EMAIL_VERIFIED: 'Email verified successfully',
    VERIFICATION_EMAIL_SENT: 'Verification email sent',
    
    // Properties
    PROPERTY_CREATED: 'Property created successfully and pending approval',
    PROPERTY_UPDATED: 'Property updated successfully',
    PROPERTY_DELETED: 'Property deleted successfully',
    PROPERTY_APPROVED: 'Property approved successfully',
    PROPERTY_REJECTED: 'Property rejected successfully',
    PROPERTY_FEATURED_TOGGLED: 'Property featured status updated',
    
    // Bookings
    BOOKING_CREATED: 'Booking request sent successfully',
    BOOKING_CONFIRMED: 'Booking confirmed successfully',
    BOOKING_CANCELLED: 'Booking cancelled successfully',
    BOOKING_COMPLETED: 'Booking completed successfully',
    
    // Inquiries
    INQUIRY_SENT: 'Inquiry sent successfully',
    INQUIRY_REPLIED: 'Reply sent successfully',
    INQUIRY_CLOSED: 'Inquiry closed successfully',
    VIEWING_SCHEDULED: 'Viewing scheduled successfully',
    
    // Reviews
    REVIEW_CREATED: 'Review submitted successfully',
    REVIEW_UPDATED: 'Review updated successfully',
    REVIEW_DELETED: 'Review deleted successfully',
    REVIEW_MODERATED: 'Review moderated successfully',
    REVIEW_HELPFUL_MARKED: 'Review marked as helpful',
    
    // Favorites
    FAVORITE_ADDED: 'Property added to favorites',
    FAVORITE_REMOVED: 'Property removed from favorites',
    
    // Notifications
    NOTIFICATION_MARKED_READ: 'Notification marked as read',
    ALL_NOTIFICATIONS_READ: 'All notifications marked as read',
    NOTIFICATION_DELETED: 'Notification deleted',
    
    // Admin
    USER_VERIFIED: 'User verified successfully',
    USER_DELETED: 'User deleted successfully',
    REPORT_RESOLVED: 'Report resolved successfully',
    
    // Files
    FILE_UPLOADED: 'File uploaded successfully',
    FILE_DELETED: 'File deleted successfully'
  },
  
  // Error messages
  ERROR: {
    // General
    SERVER_ERROR: 'Server error occurred',
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Not authorized',
    FORBIDDEN: 'Access forbidden',
    VALIDATION_ERROR: 'Validation failed',
    DUPLICATE_ERROR: 'Duplicate entry',
    RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
    
    // Authentication
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_EXISTS: 'Email already registered',
    PHONE_EXISTS: 'Phone number already registered',
    USER_NOT_FOUND: 'User not found',
    INVALID_TOKEN: 'Invalid token',
    TOKEN_EXPIRED: 'Token expired',
    INVALID_PASSWORD: 'Current password is incorrect',
    SAME_PASSWORD: 'New password must be different from current password',
    EMAIL_NOT_VERIFIED: 'Please verify your email first',
    ACCOUNT_DISABLED: 'Account has been disabled',
    
    // Properties
    PROPERTY_NOT_FOUND: 'Property not found',
    PROPERTY_NOT_AVAILABLE: 'Property is not available',
    PROPERTY_PENDING: 'Property is pending approval',
    PROPERTY_REJECTED: 'Property has been rejected',
    PROPERTY_ALREADY_RENTED: 'Property is already rented',
    NOT_PROPERTY_OWNER: 'You do not own this property',
    INVALID_DISTRICT: 'Invalid Mogadishu district',
    
    // Bookings
    BOOKING_NOT_FOUND: 'Booking not found',
    BOOKING_DATES_UNAVAILABLE: 'Property not available for selected dates',
    INVALID_DATES: 'Check-out date must be after check-in date',
    PAST_DATE: 'Cannot book dates in the past',
    BOOKING_NOT_CANCELLABLE: 'Booking cannot be cancelled',
    NOT_BOOKING_OWNER: 'You do not own this booking',
    BOOKING_ALREADY_REVIEWED: 'Booking already has a review',
    
    // Inquiries
    INQUIRY_NOT_FOUND: 'Inquiry not found',
    INQUIRY_CLOSED: 'Inquiry is closed',
    NOT_INQUIRY_OWNER: 'You do not own this inquiry',
    NOT_INQUIRY_RECIPIENT: 'You are not the recipient of this inquiry',
    
    // Reviews
    REVIEW_NOT_FOUND: 'Review not found',
    REVIEW_ALREADY_EXISTS: 'You have already reviewed this property',
    REVIEW_PENDING_MODERATION: 'Review is pending moderation',
    NOT_REVIEW_OWNER: 'You do not own this review',
    CANNOT_REVIEW_OWN_PROPERTY: 'Cannot review your own property',
    
    // Favorites
    FAVORITE_EXISTS: 'Property already in favorites',
    FAVORITE_NOT_FOUND: 'Favorite not found',
    
    // Files
    FILE_TOO_LARGE: 'File too large',
    INVALID_FILE_TYPE: 'Invalid file type',
    UPLOAD_FAILED: 'File upload failed',
    
    // Permissions
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
    ROLE_REQUIRED: 'Role required',
    
    // User
    USER_NOT_VERIFIED: 'User not verified',
    LANDLORD_NOT_VERIFIED: 'Landlord not verified',
    CANNOT_DELETE_SELF: 'Cannot delete your own account',
    
    // System
    MAINTENANCE_MODE: 'System is under maintenance',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable'
  },
  
  // Validation messages
  VALIDATION: {
    REQUIRED: '{{field}} is required',
    MIN_LENGTH: '{{field}} must be at least {{min}} characters',
    MAX_LENGTH: '{{field}} cannot exceed {{max}} characters',
    MIN_VALUE: '{{field}} must be at least {{min}}',
    MAX_VALUE: '{{field}} cannot exceed {{max}}',
    INVALID_EMAIL: 'Please enter a valid email',
    INVALID_PHONE: 'Phone must be in +252 format',
    INVALID_PASSWORD: 'Password must be at least 6 characters and contain at least one number',
    PASSWORDS_MATCH: 'Passwords do not match',
    INVALID_DATE: 'Please enter a valid date',
    FUTURE_DATE: 'Date must be in the future',
    PAST_DATE: 'Date must be in the past',
    INVALID_NUMBER: '{{field}} must be a number',
    INVALID_INTEGER: '{{field}} must be an integer',
    INVALID_BOOLEAN: '{{field}} must be true or false',
    INVALID_ARRAY: '{{field}} must be an array',
    INVALID_OBJECT: '{{field}} must be an object',
    INVALID_ID: 'Invalid ID format',
    INVALID_ENUM: '{{field}} must be one of: {{values}}',
    INVALID_URL: 'Please enter a valid URL',
    INVALID_COORDINATES: 'Invalid coordinates',
    PRICE_RANGE_INVALID: 'Min price cannot be greater than max price'
  },
  
  // Info messages
  INFO: {
    WELCOME: 'Welcome to Kirada Guryaha',
    EMAIL_VERIFICATION_SENT: 'Verification email sent. Please check your inbox.',
    PASSWORD_RESET_EMAIL_SENT: 'Password reset email sent',
    CHECK_EMAIL: 'Please check your email for further instructions',
    PROFILE_INCOMPLETE: 'Please complete your profile',
    DOCUMENTS_REQUIRED: 'Please upload verification documents',
    FEATURE_COMING_SOON: 'This feature is coming soon',
    MAINTENANCE_SCHEDULED: 'Scheduled maintenance in {{time}}'
  },
  
  // Warning messages
  WARNING: {
    ACCOUNT_NOT_VERIFIED: 'Your account is not verified. Please verify your email.',
    LANDLORD_NOT_VERIFIED: 'Your landlord account is pending verification. You cannot list properties yet.',
    PENDING_APPROVAL: 'Your property is pending approval',
    BOOKING_PENDING: 'Your booking request is pending landlord confirmation',
    LOW_RATING: 'This property has a low rating',
    LIMITED_AVAILABILITY: 'Limited availability for selected dates',
    PRICE_CHANGE: 'Prices may have changed since you last viewed'
  },
  
  // Helper function to format validation messages
  formatValidationMessage: (key, params) => {
    let message = module.exports.VALIDATION[key] || key;
    
    if (params) {
      Object.keys(params).forEach(param => {
        message = message.replace(`{{${param}}}`, params[param]);
      });
    }
    
    return message;
  },
  
  // Helper function to get error message
  getErrorMessage: (key) => {
    return module.exports.ERROR[key] || module.exports.ERROR.SERVER_ERROR;
  },
  
  // Helper function to get success message
  getSuccessMessage: (key) => {
    return module.exports.SUCCESS[key] || module.exports.SUCCESS.OPERATION_SUCCESSFUL;
  }
};