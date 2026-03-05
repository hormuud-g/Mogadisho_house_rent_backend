module.exports = {
  // User roles
  ROLES: {
    TENANT: 'tenant',
    LANDLORD: 'landlord',
    ADMIN: 'admin'
  },
  
  // Role hierarchy (higher number = more privileges)
  ROLE_HIERARCHY: {
    admin: 3,
    landlord: 2,
    tenant: 1
  },
  
  // Role permissions matrix
  PERMISSIONS: {
    tenant: [
      'read:properties',
      'read:property',
      'create:booking',
      'read:ownBookings',
      'update:ownBooking',
      'cancel:ownBooking',
      'create:inquiry',
      'read:ownInquiries',
      'create:review',
      'read:ownReviews',
      'update:ownReview',
      'delete:ownReview',
      'create:favorite',
      'delete:favorite',
      'read:ownFavorites',
      'read:notifications',
      'update:notification'
    ],
    
    landlord: [
      'read:properties',
      'read:property',
      'create:property',
      'update:ownProperties',
      'delete:ownProperties',
      'read:ownProperties',
      'read:bookings',
      'update:booking',
      'confirm:booking',
      'complete:booking',
      'cancel:booking',
      'read:inquiries',
      'reply:inquiry',
      'close:inquiry',
      'reply:review',
      'read:analytics',
      'read:notifications',
      'update:notification'
    ],
    
    admin: [
      'read:all',
      'create:all',
      'update:all',
      'delete:all',
      'manage:users',
      'verify:users',
      'manage:roles',
      'moderate:properties',
      'approve:property',
      'reject:property',
      'moderate:reviews',
      'moderate:inquiries',
      'manage:reports',
      'resolve:report',
      'read:analytics',
      'manage:system',
      'manage:settings',
      'view:logs',
      'export:data',
      'import:data'
    ]
  },
  
  // Role descriptions
  ROLE_DESCRIPTIONS: {
    tenant: 'Property seeker who can search, inquire, book, and review properties',
    landlord: 'Property owner who can list and manage properties and respond to inquiries',
    admin: 'Platform moderator with full access to manage users, content, and system settings'
  },
  
  // Default role for new registrations
  DEFAULT_ROLE: 'tenant',
  
  // Roles that require verification
  VERIFICATION_REQUIRED: ['landlord'],
  
  // Roles that can list properties
  CAN_LIST_PROPERTIES: ['landlord', 'admin'],
  
  // Roles that can book properties
  CAN_BOOK_PROPERTIES: ['tenant', 'admin'],
  
  // Roles that can review properties
  CAN_REVIEW_PROPERTIES: ['tenant', 'admin'],
  
  // Role colors (for UI)
  ROLE_COLORS: {
    tenant: '#10b981', // green
    landlord: '#3b82f6', // blue
    admin: '#ef4444' // red
  },
  
  // Role icons (for UI)
  ROLE_ICONS: {
    tenant: '👤',
    landlord: '🏠',
    admin: '⚙️'
  }
};