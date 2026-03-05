module.exports = {
  // Booking statuses
  BOOKING_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
    NO_SHOW: 'no_show',
    EXPIRED: 'expired'
  },
  
  // Booking status colors (for UI)
  BOOKING_STATUS_COLORS: {
    pending: '#f59e0b', // orange
    confirmed: '#10b981', // green
    cancelled: '#ef4444', // red
    completed: '#3b82f6', // blue
    no_show: '#6b7280', // gray
    expired: '#9ca3af' // light gray
  },
  
  // Booking status descriptions
  BOOKING_STATUS_DESCRIPTIONS: {
    pending: 'Awaiting landlord confirmation',
    confirmed: 'Booking confirmed by landlord',
    cancelled: 'Booking cancelled',
    completed: 'Stay completed',
    no_show: 'Tenant did not show up',
    expired: 'Booking request expired'
  },
  
  // Guest limits
  GUEST_LIMITS: {
    MAX_ADULTS: 10,
    MAX_CHILDREN: 5,
    MAX_INFANTS: 3,
    MAX_TOTAL: 15
  },
  
  // Guest age definitions (in years)
  GUEST_AGES: {
    ADULT_MIN: 18,
    CHILD_MIN: 2,
    CHILD_MAX: 17,
    INFANT_MAX: 2
  },
  
  // Cancellation reasons
  CANCELLATION_REASONS: [
    'change_of_plans',
    'found_another_property',
    'price_too_high',
    'landlord_unresponsive',
    'property_issues',
    'emergency',
    'personal_reasons',
    'other'
  ],
  
  // Cancellation reason labels
  CANCELLATION_REASON_LABELS: {
    change_of_plans: 'Change of plans',
    found_another_property: 'Found another property',
    price_too_high: 'Price too high',
    landlord_unresponsive: 'Landlord unresponsive',
    property_issues: 'Issues with property',
    emergency: 'Emergency situation',
    personal_reasons: 'Personal reasons',
    other: 'Other'
  },
  
  // Booking timeline events
  TIMELINE_EVENTS: {
    CREATED: 'created',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
    NO_SHOW: 'no_show',
    MODIFIED: 'modified',
    REMINDER_SENT: 'reminder_sent'
  },
  
  // Reminder times (in hours before check-in)
  REMINDER_TIMES: [24, 12, 3],
  
  // Booking limits
  LIMITS: {
    MIN_STAY: 1, // day
    MAX_STAY: 365, // days
    MIN_ADVANCE_BOOKING: 0, // days
    MAX_ADVANCE_BOOKING: 365, // days
    MAX_ACTIVE_BOOKINGS_PER_USER: 10,
    MAX_PENDING_BOOKINGS_PER_USER: 5
  },
  
  // Default booking values
  DEFAULTS: {
    status: 'pending',
    guests: {
      adults: 1,
      children: 0,
      infants: 0
    }
  },
  
  // Required fields
  REQUIRED_FIELDS: [
    'propertyId',
    'checkIn',
    'checkOut',
    'guests.adults'
  ],
  
  // Booking prefix for reference numbers
  BOOKING_PREFIX: 'BOK',
  
  // Booking expiration (in hours)
  PENDING_EXPIRY_HOURS: 48,
  
  // Check-in/out times (24-hour format)
  DEFAULT_CHECKIN_TIME: '14:00',
  DEFAULT_CHECKOUT_TIME: '11:00',
  
  // Booking calculations
  CALCULATIONS: {
    INCLUDE_CLEANING_FEE: false,
    CLEANING_FEE_AMOUNT: 0,
    INCLUDE_SECURITY_DEPOSIT: false,
    SECURITY_DEPOSIT_AMOUNT: 0,
    TAX_RATE: 0 // No tax on rentals in Somalia
  },
  
  // Get status label
  getStatusLabel: (status) => {
    const labels = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      cancelled: 'Cancelled',
      completed: 'Completed',
      no_show: 'No Show',
      expired: 'Expired'
    };
    return labels[status] || status;
  },
  
  // Validate guest counts
  validateGuests: (adults, children = 0, infants = 0) => {
    const limits = module.exports.GUEST_LIMITS;
    
    if (adults < 1) return false;
    if (adults > limits.MAX_ADULTS) return false;
    if (children > limits.MAX_CHILDREN) return false;
    if (infants > limits.MAX_INFANTS) return false;
    
    const total = adults + children + infants;
    if (total > limits.MAX_TOTAL) return false;
    
    return true;
  },
  
  // Calculate total nights
  calculateNights: (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },
  
  // Calculate total price
  calculatePrice: (nights, pricePerNight) => {
    return nights * pricePerNight;
  }
};