const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Notification Identification
  notificationNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // Recipient
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Notification Type
  type: {
    type: String,
    required: true,
    enum: [
      // Account
      'welcome',
      'email_verified',
      'phone_verified',
      'profile_updated',
      'password_changed',
      'account_suspended',
      'account_reactivated',
      
      // Verification
      'verification_submitted',
      'verification_approved',
      'verification_rejected',
      'documents_required',
      
      // Properties
      'property_created',
      'property_approved',
      'property_rejected',
      'property_updated',
      'property_deleted',
      'property_featured',
      'property_expiring',
      'property_view_milestone',
      
      // Bookings
      'booking_request',
      'booking_confirmed',
      'booking_cancelled',
      'booking_completed',
      'booking_reminder',
      'booking_checkin_reminder',
      'booking_checkout_reminder',
      'booking_no_show',
      'booking_expiring',
      
      // Inquiries
      'inquiry_received',
      'inquiry_replied',
      'inquiry_closed',
      'inquiry_escalated',
      'viewing_scheduled',
      'viewing_reminder',
      'viewing_cancelled',
      
      // Reviews
      'review_received',
      'review_replied',
      'review_flagged',
      'review_approved',
      'review_rejected',
      'review_helpful',
      
      // Favorites
      'favorite_price_change',
      'favorite_status_change',
      'favorite_reminder',
      'favorite_expiring',
      
      // Payments
      'payment_due',
      'payment_received',
      'payment_overdue',
      'payment_refunded',
      'payment_failed',
      
      // Reports
      'report_received',
      'report_updated',
      'report_resolved',
      'report_action_taken',
      
      // System
      'system_alert',
      'maintenance',
      'feature_update',
      'security_alert',
      'login_alert',
      'new_device_login'
    ]
  },
  
  // Content
  title: {
    type: String,
    required: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  body: {
    type: String,
    maxlength: [5000, 'Body cannot exceed 5000 characters']
  },
  
  // Data (for linking to resources)
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Actions
  actions: [{
    label: String,
    url: String,
    type: {
      type: String,
      enum: ['primary', 'secondary', 'danger', 'link']
    },
    icon: String,
    data: mongoose.Schema.Types.Mixed
  }],
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Read Status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  
  // Delivery Status
  delivery: {
    inApp: {
      delivered: {
        type: Boolean,
        default: true
      },
      deliveredAt: {
        type: Date,
        default: Date.now
      }
    },
    email: {
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      emailId: String,
      error: String
    },
    push: {
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      pushId: String,
      error: String
    },
    sms: {
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      smsId: String,
      error: String
    }
  },
  
  // Expiry
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiry: 30 days from creation
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  
  // Scheduling
  scheduledFor: Date,
  sentAt: Date,
  
  // Dismissal
  isDismissed: {
    type: Boolean,
    default: false
  },
  dismissedAt: Date,
  
  // Archiving
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  
  // Categorization
  category: {
    type: String,
    enum: ['account', 'property', 'booking', 'inquiry', 'review', 'favorite', 'payment', 'report', 'system'],
    required: true
  },
  
  // Tags for filtering
  tags: [String],
  
  // Metadata
  meta: {
    source: {
      type: String,
      enum: ['system', 'user', 'admin', 'automated'],
      default: 'system'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    ipAddress: String,
    userAgent: String,
    version: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for age (in days)
notificationSchema.virtual('age').get(function() {
  const diffMs = Date.now() - this.createdAt;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
});

// Virtual for isExpired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for isScheduled
notificationSchema.virtual('isScheduled').get(function() {
  return this.scheduledFor && this.scheduledFor > new Date();
});

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ userId: 1, category: 1 });
notificationSchema.index({ userId: 1, priority: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ createdAt: -1 });

// Pre-save middleware
notificationSchema.pre('save', async function(next) {
  // Generate notification number if not exists
  if (!this.notificationNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.notificationNumber = `NOT${year}${month}${day}${random}`;
  }
  
  // Set category based on type
  if (!this.category) {
    const typeCategoryMap = {
      // Account
      'welcome': 'account',
      'email_verified': 'account',
      'phone_verified': 'account',
      'profile_updated': 'account',
      'password_changed': 'account',
      'account_suspended': 'account',
      'account_reactivated': 'account',
      
      // Verification
      'verification_submitted': 'account',
      'verification_approved': 'account',
      'verification_rejected': 'account',
      'documents_required': 'account',
      
      // Properties
      'property_created': 'property',
      'property_approved': 'property',
      'property_rejected': 'property',
      'property_updated': 'property',
      'property_deleted': 'property',
      'property_featured': 'property',
      'property_expiring': 'property',
      'property_view_milestone': 'property',
      
      // Bookings
      'booking_request': 'booking',
      'booking_confirmed': 'booking',
      'booking_cancelled': 'booking',
      'booking_completed': 'booking',
      'booking_reminder': 'booking',
      'booking_checkin_reminder': 'booking',
      'booking_checkout_reminder': 'booking',
      'booking_no_show': 'booking',
      'booking_expiring': 'booking',
      
      // Inquiries
      'inquiry_received': 'inquiry',
      'inquiry_replied': 'inquiry',
      'inquiry_closed': 'inquiry',
      'inquiry_escalated': 'inquiry',
      'viewing_scheduled': 'inquiry',
      'viewing_reminder': 'inquiry',
      'viewing_cancelled': 'inquiry',
      
      // Reviews
      'review_received': 'review',
      'review_replied': 'review',
      'review_flagged': 'review',
      'review_approved': 'review',
      'review_rejected': 'review',
      'review_helpful': 'review',
      
      // Favorites
      'favorite_price_change': 'favorite',
      'favorite_status_change': 'favorite',
      'favorite_reminder': 'favorite',
      'favorite_expiring': 'favorite',
      
      // Payments
      'payment_due': 'payment',
      'payment_received': 'payment',
      'payment_overdue': 'payment',
      'payment_refunded': 'payment',
      'payment_failed': 'payment',
      
      // Reports
      'report_received': 'report',
      'report_updated': 'report',
      'report_resolved': 'report',
      'report_action_taken': 'report',
      
      // System
      'system_alert': 'system',
      'maintenance': 'system',
      'feature_update': 'system',
      'security_alert': 'system',
      'login_alert': 'system',
      'new_device_login': 'system'
    };
    
    this.category = typeCategoryMap[this.type] || 'system';
  }
  
  // Set priority based on type if not set
  if (!this.priority) {
    const priorityMap = {
      // High priority
      'account_suspended': 'urgent',
      'security_alert': 'urgent',
      'payment_overdue': 'high',
      'booking_request': 'high',
      'booking_confirmed': 'high',
      'booking_cancelled': 'high',
      'inquiry_received': 'high',
      'report_action_taken': 'high',
      'verification_approved': 'high',
      'verification_rejected': 'high',
      'property_approved': 'high',
      'property_rejected': 'high',
      
      // Medium priority
      'booking_reminder': 'medium',
      'viewing_scheduled': 'medium',
      'review_received': 'medium',
      'payment_due': 'medium',
      'property_expiring': 'medium',
      'favorite_price_change': 'medium',
      'favorite_status_change': 'medium',
      
      // Low priority (default)
      'welcome': 'low',
      'email_verified': 'low',
      'profile_updated': 'low',
      'password_changed': 'low',
      'feature_update': 'low',
      'maintenance': 'low'
    };
    
    this.priority = priorityMap[this.type] || 'low';
  }
  
  // Handle scheduled notifications
  if (this.scheduledFor && this.scheduledFor > new Date()) {
    // Don't send yet, just save
  } else {
    this.sentAt = new Date();
  }
  
  next();
});

// Methods
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsUnread = async function() {
  this.isRead = false;
  this.readAt = null;
  return this.save();
};

notificationSchema.methods.dismiss = async function() {
  this.isDismissed = true;
  this.dismissedAt = new Date();
  return this.save();
};

notificationSchema.methods.archive = async function() {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

notificationSchema.methods.unarchive = async function() {
  this.isArchived = false;
  this.archivedAt = null;
  return this.save();
};

notificationSchema.methods.markEmailSent = async function(emailId) {
  this.delivery.email = {
    delivered: true,
    deliveredAt: new Date(),
    emailId
  };
  return this.save();
};

notificationSchema.methods.markPushSent = async function(pushId) {
  this.delivery.push = {
    delivered: true,
    deliveredAt: new Date(),
    pushId
  };
  return this.save();
};

notificationSchema.methods.markSmsSent = async function(smsId) {
  this.delivery.sms = {
    delivered: true,
    deliveredAt: new Date(),
    smsId
  };
  return this.save();
};

notificationSchema.methods.markDeliveryFailed = async function(channel, error) {
  if (this.delivery[channel]) {
    this.delivery[channel].error = error;
  }
  return this.save();
};

notificationSchema.methods.addAction = async function(label, url, type = 'primary', icon = null, data = {}) {
  this.actions.push({
    label,
    url,
    type,
    icon,
    data
  });
  return this.save();
};

notificationSchema.methods.removeAction = async function(index) {
  if (index >= 0 && index < this.actions.length) {
    this.actions.splice(index, 1);
    await this.save();
  }
  return this;
};

notificationSchema.methods.extendExpiry = async function(days = 30) {
  this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return this.save();
};

// Static methods
notificationSchema.statics.createNotification = async function(userId, type, data = {}) {
  const notificationData = this.getNotificationTemplate(type, data);
  
  return this.create({
    userId,
    type,
    title: notificationData.title,
    message: notificationData.message,
    body: notificationData.body,
    data: notificationData.data || data,
    priority: notificationData.priority,
    actions: notificationData.actions || []
  });
};

notificationSchema.statics.createBulkNotifications = async function(userIds, type, data = {}) {
  const notificationData = this.getNotificationTemplate(type, data);
  const notifications = [];
  
  for (const userId of userIds) {
    notifications.push({
      userId,
      type,
      title: notificationData.title,
      message: notificationData.message,
      body: notificationData.body,
      data: notificationData.data || data,
      priority: notificationData.priority,
      actions: notificationData.actions || []
    });
  }
  
  return this.insertMany(notifications);
};

notificationSchema.statics.getNotificationTemplate = function(type, data) {
  const templates = {
    // Account
    'welcome': {
      title: 'Welcome to Kirada Guryaha! 🏠',
      message: `Welcome ${data.name || 'to Kirada Guryaha'}! Start exploring properties in Mogadishu.`,
      body: `We're excited to have you join our community. Whether you're looking for a place to rent or listing your property, we're here to help.`,
      priority: 'low',
      actions: [
        { label: 'Explore Properties', url: '/properties', type: 'primary' },
        { label: 'Complete Profile', url: '/profile', type: 'secondary' }
      ]
    },
    
    'email_verified': {
      title: 'Email Verified Successfully ✅',
      message: 'Your email address has been verified.',
      body: 'Thank you for verifying your email. Your account is now more secure.',
      priority: 'low',
      actions: [
        { label: 'Go to Dashboard', url: '/dashboard', type: 'primary' }
      ]
    },
    
    'account_suspended': {
      title: 'Account Suspended ⚠️',
      message: 'Your account has been suspended.',
      body: data.reason || 'Please contact support for more information.',
      priority: 'urgent',
      actions: [
        { label: 'Contact Support', url: '/support', type: 'primary' }
      ]
    },
    
    // Verification
    'verification_approved': {
      title: 'Verification Approved! ✅',
      message: 'Your landlord verification has been approved.',
      body: 'You can now start listing properties on Kirada Guryaha.',
      priority: 'high',
      actions: [
        { label: 'List a Property', url: '/properties/new', type: 'primary' }
      ]
    },
    
    'verification_rejected': {
      title: 'Verification Rejected ❌',
      message: 'Your verification documents were not approved.',
      body: data.reason || 'Please submit new documents for verification.',
      priority: 'high',
      actions: [
        { label: 'Resubmit Documents', url: '/verification', type: 'primary' }
      ]
    },
    
    // Properties
    'property_approved': {
      title: 'Property Approved! 🎉',
      message: `Your property "${data.propertyTitle}" has been approved and is now live.`,
      body: 'Potential tenants can now see and book your property.',
      priority: 'high',
      actions: [
        { label: 'View Property', url: `/properties/${data.propertyId}`, type: 'primary' },
        { label: 'Manage Listings', url: '/landlord/properties', type: 'secondary' }
      ]
    },
    
    'property_rejected': {
      title: 'Property Update',
      message: `Your property "${data.propertyTitle}" needs revisions.`,
      body: data.reason || 'Please update your property listing and resubmit.',
      priority: 'high',
      actions: [
        { label: 'Edit Property', url: `/properties/${data.propertyId}/edit`, type: 'primary' }
      ]
    },
    
    'property_view_milestone': {
      title: 'Popular Property! 📈',
      message: `Your property "${data.propertyTitle}" has reached ${data.views} views.`,
      body: 'Consider featuring it to get even more exposure.',
      priority: 'low',
      actions: [
        { label: 'View Stats', url: `/landlord/properties/${data.propertyId}/analytics`, type: 'primary' }
      ]
    },
    
    // Bookings
    'booking_request': {
      title: 'New Booking Request 📅',
      message: `You have a new booking request for ${data.propertyTitle}`,
      body: `${data.tenantName} wants to book from ${data.checkIn} to ${data.checkOut}.`,
      priority: 'high',
      actions: [
        { label: 'View Request', url: `/landlord/bookings/${data.bookingId}`, type: 'primary' },
        { label: 'Confirm', url: `/landlord/bookings/${data.bookingId}/confirm`, type: 'secondary' }
      ]
    },
    
    'booking_confirmed': {
      title: 'Booking Confirmed! ✅',
      message: `Your booking for ${data.propertyTitle} is confirmed.`,
      body: `Booking reference: ${data.bookingNumber}. Check-in: ${data.checkIn}`,
      priority: 'high',
      actions: [
        { label: 'View Booking', url: `/bookings/${data.bookingId}`, type: 'primary' }
      ]
    },
    
    'booking_cancelled': {
      title: 'Booking Cancelled',
      message: `Booking ${data.bookingNumber} has been cancelled.`,
      body: data.reason || 'The booking has been cancelled.',
      priority: 'high',
      actions: [
        { label: 'View Details', url: `/bookings/${data.bookingId}`, type: 'secondary' }
      ]
    },
    
    'booking_reminder': {
      title: 'Booking Reminder ⏰',
      message: `Your booking at ${data.propertyTitle} starts tomorrow!`,
      body: `Check-in: ${data.checkIn}. Please contact the landlord for check-in instructions.`,
      priority: 'medium',
      actions: [
        { label: 'View Booking', url: `/bookings/${data.bookingId}`, type: 'primary' },
        { label: 'Contact Landlord', url: `/inquiries/new?property=${data.propertyId}`, type: 'secondary' }
      ]
    },
    
    'booking_checkin_reminder': {
      title: 'Check-in Today! 🏠',
      message: `You're checking into ${data.propertyTitle} today.`,
      body: `Check-in time: ${data.checkInTime || '2:00 PM'}. Have a great stay!`,
      priority: 'high',
      actions: [
        { label: 'View Details', url: `/bookings/${data.bookingId}`, type: 'primary' }
      ]
    },
    
    'booking_checkout_reminder': {
      title: 'Check-out Today',
      message: `You're checking out from ${data.propertyTitle} today.`,
      body: `Check-out time: ${data.checkOutTime || '11:00 AM'}. Thank you for staying with us!`,
      priority: 'medium',
      actions: [
        { label: 'Leave a Review', url: `/bookings/${data.bookingId}/review`, type: 'primary' }
      ]
    },
    
    'booking_completed': {
      title: 'Stay Completed ✨',
      message: `Your stay at ${data.propertyTitle} is complete.`,
      body: 'We hope you had a wonderful experience. Please leave a review!',
      priority: 'medium',
      actions: [
        { label: 'Write a Review', url: `/bookings/${data.bookingId}/review`, type: 'primary' }
      ]
    },
    
    // Inquiries
    'inquiry_received': {
      title: 'New Inquiry 💬',
      message: `${data.tenantName} inquired about ${data.propertyTitle}`,
      body: data.message || 'You have a new inquiry about your property.',
      priority: 'high',
      actions: [
        { label: 'Reply', url: `/landlord/inquiries/${data.inquiryId}`, type: 'primary' }
      ]
    },
    
    'inquiry_replied': {
      title: 'Reply to Your Inquiry',
      message: `${data.landlordName} replied to your inquiry about ${data.propertyTitle}`,
      body: data.reply || 'You have a new reply to your inquiry.',
      priority: 'medium',
      actions: [
        { label: 'View Reply', url: `/inquiries/${data.inquiryId}`, type: 'primary' }
      ]
    },
    
    'viewing_scheduled': {
      title: 'Viewing Scheduled 📍',
      message: `Viewing scheduled for ${data.propertyTitle}`,
      body: `Date: ${data.date} at ${data.time}. Please be on time.`,
      priority: 'high',
      actions: [
        { label: 'View Details', url: `/inquiries/${data.inquiryId}`, type: 'primary' },
        { label: 'Add to Calendar', url: data.calendarUrl, type: 'secondary' }
      ]
    },
    
    'viewing_reminder': {
      title: 'Viewing Tomorrow',
      message: `Reminder: Your viewing for ${data.propertyTitle} is tomorrow.`,
      body: `Time: ${data.time}. Location: ${data.address}`,
      priority: 'medium',
      actions: [
        { label: 'View Details', url: `/inquiries/${data.inquiryId}`, type: 'primary' }
      ]
    },
    
    // Reviews
    'review_received': {
      title: 'New Review ⭐',
      message: `You received a new review for ${data.propertyTitle}`,
      body: `Rating: ${data.rating}/5. "${data.comment}"`,
      priority: 'medium',
      actions: [
        { label: 'View Review', url: `/landlord/reviews/${data.reviewId}`, type: 'primary' },
        { label: 'Reply', url: `/landlord/reviews/${data.reviewId}/reply`, type: 'secondary' }
      ]
    },
    
    'review_replied': {
      title: 'Landlord Replied to Review',
      message: `${data.landlordName} replied to your review.`,
      body: data.reply || 'A landlord has responded to your review.',
      priority: 'low',
      actions: [
        { label: 'View Reply', url: `/reviews/${data.reviewId}`, type: 'primary' }
      ]
    },
    
    'review_helpful': {
      title: 'Review Marked Helpful',
      message: 'Someone found your review helpful!',
      body: 'Your review is helping other tenants make informed decisions.',
      priority: 'low'
    },
    
    // Favorites
    'favorite_price_change': {
      title: 'Price Change Alert 💰',
      message: `Price changed for ${data.propertyTitle}`,
      body: `Old price: $${data.oldPrice}. New price: $${data.newPrice}. ${data.newPrice < data.oldPrice ? 'Price dropped!' : 'Price increased.'}`,
      priority: 'medium',
      actions: [
        { label: 'View Property', url: `/properties/${data.propertyId}`, type: 'primary' }
      ]
    },
    
    'favorite_status_change': {
      title: 'Status Update',
      message: `${data.propertyTitle} is now ${data.status}`,
      body: 'The property status has changed. Check it out!',
      priority: 'medium',
      actions: [
        { label: 'View Property', url: `/properties/${data.propertyId}`, type: 'primary' }
      ]
    },
    
    'favorite_reminder': {
      title: 'Favorite Reminder',
      message: `Don't forget about ${data.propertyTitle}`,
      body: data.note || 'You saved this property. Consider reaching out to the landlord.',
      priority: 'low',
      actions: [
        { label: 'View Property', url: `/properties/${data.propertyId}`, type: 'primary' },
        { label: 'Send Inquiry', url: `/inquiries/new?property=${data.propertyId}`, type: 'secondary' }
      ]
    },
    
    // Payments (for future implementation)
    'payment_due': {
      title: 'Payment Due',
      message: `Payment of $${data.amount} is due for ${data.propertyTitle}`,
      body: `Due date: ${data.dueDate}. Please arrange payment with your landlord.`,
      priority: 'high',
      actions: [
        { label: 'View Details', url: `/bookings/${data.bookingId}`, type: 'primary' }
      ]
    },
    
    'payment_received': {
      title: 'Payment Received',
      message: `Payment of $${data.amount} received for ${data.propertyTitle}`,
      body: 'Thank you for your payment.',
      priority: 'medium'
    },
    
    'payment_overdue': {
      title: 'Payment Overdue ⚠️',
      message: `Payment of $${data.amount} is overdue for ${data.propertyTitle}`,
      body: `Original due date: ${data.dueDate}. Please contact your landlord.`,
      priority: 'urgent',
      actions: [
        { label: 'Contact Landlord', url: `/inquiries/new?property=${data.propertyId}`, type: 'primary' }
      ]
    },
    
    // Reports
    'report_received': {
      title: 'Report Received',
      message: 'Your report has been received and is being reviewed.',
      body: `Report #${data.reportNumber}. We'll notify you of any updates.`,
      priority: 'medium',
      actions: [
        { label: 'View Report', url: `/reports/${data.reportId}`, type: 'secondary' }
      ]
    },
    
    'report_resolved': {
      title: 'Report Resolved',
      message: `Your report #${data.reportNumber} has been resolved.`,
      body: data.resolution || 'Thank you for helping keep our community safe.',
      priority: 'medium',
      actions: [
        { label: 'View Resolution', url: `/reports/${data.reportId}`, type: 'primary' }
      ]
    },
    
    // System
    'system_alert': {
      title: 'System Alert',
      message: data.message || 'Important system notification',
      body: data.body || 'Please review this system notification.',
      priority: 'urgent',
      actions: data.actions || []
    },
    
    'maintenance': {
      title: 'Scheduled Maintenance',
      message: 'System maintenance scheduled',
      body: data.message || 'The platform may be unavailable during this time.',
      priority: 'medium'
    },
    
    'feature_update': {
      title: 'New Feature Available! 🎉',
      message: data.message || 'Check out what\'s new on Kirada Guryaha',
      body: data.description || 'We\'ve added new features to improve your experience.',
      priority: 'low',
      actions: [
        { label: 'Learn More', url: '/updates', type: 'primary' }
      ]
    },
    
    'security_alert': {
      title: 'Security Alert 🔒',
      message: data.message || 'Unusual activity detected on your account',
      body: data.body || 'If this was you, no action needed. Otherwise, secure your account immediately.',
      priority: 'urgent',
      actions: [
        { label: 'Secure Account', url: '/security', type: 'primary' },
        { label: 'Contact Support', url: '/support', type: 'secondary' }
      ]
    },
    
    'login_alert': {
      title: 'New Login Detected',
      message: `New login from ${data.location || 'unknown location'}`,
      body: `Device: ${data.device || 'Unknown device'}. Time: ${data.time || 'Just now'}`,
      priority: 'medium',
      actions: [
        { label: 'Review Activity', url: '/security', type: 'primary' }
      ]
    },
    
    'new_device_login': {
      title: 'New Device Login',
      message: `Your account was accessed from a new device`,
      body: `Device: ${data.device}. If this wasn't you, please secure your account.`,
      priority: 'high',
      actions: [
        { label: 'Review Devices', url: '/security/devices', type: 'primary' },
        { label: 'Change Password', url: '/security/password', type: 'secondary' }
      ]
    }
  };
  
  return templates[type] || {
    title: 'Notification',
    message: data.message || 'You have a new notification',
    body: data.body || '',
    priority: 'medium',
    actions: []
  };
};

notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ userId, isRead: false, isDismissed: false, isArchived: false });
};

notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

notificationSchema.statics.markAllAsDismissed = async function(userId) {
  return this.updateMany(
    { userId, isDismissed: false },
    { isDismissed: true, dismissedAt: new Date() }
  );
};

notificationSchema.statics.archiveOldNotifications = async function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.updateMany(
    { createdAt: { $lt: cutoffDate }, isArchived: false },
    { isArchived: true, archivedAt: new Date() }
  );
};

notificationSchema.statics.deleteExpired = async function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isArchived: true, createdAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } // 90 days
    ]
  });
};

notificationSchema.statics.getNotificationsByType = function(userId, type, limit = 50) {
  return this.find({ userId, type })
    .sort({ createdAt: -1 })
    .limit(limit);
};

notificationSchema.statics.getNotificationsByPriority = function(userId, priority, limit = 50) {
  return this.find({ userId, priority })
    .sort({ createdAt: -1 })
    .limit(limit);
};

notificationSchema.statics.getRecentNotifications = function(userId, limit = 20) {
  return this.find({ userId, isDismissed: false, isArchived: false })
    .sort({ createdAt: -1 })
    .limit(limit);
};

notificationSchema.statics.searchNotifications = function(userId, query) {
  return this.find({
    userId,
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { message: { $regex: query, $options: 'i' } },
      { body: { $regex: query, $options: 'i' } }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(50);
};

notificationSchema.statics.getNotificationStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    { $group: {
      _id: null,
      total: { $sum: 1 },
      unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
      dismissed: { $sum: { $cond: [{ $eq: ['$isDismissed', true] }, 1, 0] } },
      archived: { $sum: { $cond: [{ $eq: ['$isArchived', true] }, 1, 0] } }
    }}
  ]);
  
  const byType = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    { $group: {
      _id: '$type',
      count: { $sum: 1 }
    }},
    { $sort: { count: -1 } }
  ]);
  
  const byPriority = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    { $group: {
      _id: '$priority',
      count: { $sum: 1 }
    }}
  ]);
  
  return {
    totals: stats[0] || { total: 0, unread: 0, dismissed: 0, archived: 0 },
    byType,
    byPriority
  };
};

module.exports = mongoose.model('Notification', notificationSchema);