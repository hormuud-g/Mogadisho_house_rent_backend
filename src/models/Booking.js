const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Booking Identification
  bookingNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // Relationships
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  landlordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Dates
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    required: true
  },
  checkInTime: {
    type: String,
    default: '14:00'
  },
  checkOutTime: {
    type: String,
    default: '11:00'
  },
  bookedAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: Date,
  cancelledAt: Date,
  completedAt: Date,
  
  // Guest Information
  guests: {
    adults: {
      type: Number,
      required: true,
      min: 1,
      max: 20
    },
    children: {
      type: Number,
      default: 0,
      min: 0,
      max: 10
    },
    infants: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    pets: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    }
  },
  
  // Guest Details
  guestDetails: {
    name: String,
    email: String,
    phone: String,
    idNumber: String,
    idType: String,
    nationality: String
  },
  
  // Pricing
  priceDetails: {
    nightlyRate: {
      type: Number,
      required: true
    },
    totalNights: {
      type: Number,
      required: true
    },
    subtotal: {
      type: Number,
      required: true
    },
    cleaningFee: {
      type: Number,
      default: 0
    },
    securityDeposit: {
      type: Number,
      default: 0
    },
    serviceFee: {
      type: Number,
      default: 0
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    discountCode: String,
    totalPrice: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  
  // Payment (No actual payment processing, just tracking)
  payment: {
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'not_required'],
      default: 'not_required'
    },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'mobile_money', 'other']
    },
    dueDate: Date,
    paidAt: Date,
    paidAmount: Number,
    transactionId: String,
    notes: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'expired'],
    default: 'pending'
  },
  
  // Requests and Notes
  specialRequests: {
    type: String,
    maxlength: [1000, 'Special requests cannot exceed 1000 characters']
  },
  cancellationReason: String,
  cancellationPolicy: String,
  
  // Timeline
  timeline: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedByRole: String
  }],
  
  // Communications
  messages: [{
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    attachments: [String],
    sentAt: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date
  }],
  
  // Notifications
  notifications: {
    tenantConfirmationSent: {
      type: Boolean,
      default: false
    },
    landlordNotificationSent: {
      type: Boolean,
      default: false
    },
    reminderSent: {
      type: Boolean,
      default: false
    },
    reminderSentAt: Date,
    reviewReminderSent: {
      type: Boolean,
      default: false
    }
  },
  
  // Review
  reviewSubmitted: {
    type: Boolean,
    default: false
  },
  reviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  },
  
  // Check-in/out tracking
  checkInDetails: {
    actualCheckIn: Date,
    checkInMethod: String,
    checkInNotes: String,
    keysProvided: Boolean
  },
  checkOutDetails: {
    actualCheckOut: Date,
    checkOutNotes: String,
    keysReturned: Boolean,
    propertyCondition: String
  },
  
  // Disputes
  dispute: {
    hasDispute: {
      type: Boolean,
      default: false
    },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    description: String,
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved', 'closed']
    },
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolution: String
  },
  
  // Metadata
  meta: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'admin'],
      default: 'web'
    },
    ipAddress: String,
    userAgent: String,
    notes: String,
    tags: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for duration in days
bookingSchema.virtual('duration').get(function() {
  const diffTime = Math.abs(this.checkOut - this.checkIn);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for isCurrent
bookingSchema.virtual('isCurrent').get(function() {
  const now = new Date();
  return this.status === 'confirmed' && 
         this.checkIn <= now && 
         this.checkOut >= now;
});

// Virtual for isUpcoming
bookingSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  return (this.status === 'confirmed' || this.status === 'pending') && 
         this.checkIn > now;
});

// Virtual for isPast
bookingSchema.virtual('isPast').get(function() {
  const now = new Date();
  return this.checkOut < now;
});

// Indexes
bookingSchema.index({ bookingNumber: 1 }, { unique: true });
bookingSchema.index({ propertyId: 1 });
bookingSchema.index({ tenantId: 1 });
bookingSchema.index({ landlordId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ checkIn: 1, checkOut: 1 });
bookingSchema.index({ createdAt: -1 });

// Pre-save middleware
bookingSchema.pre('save', async function(next) {
  // Generate booking number if not exists
  if (!this.bookingNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.bookingNumber = `BOK${year}${month}${day}${random}`;
  }
  
  // Add to timeline if status changed
  if (this.isModified('status')) {
    this.timeline.push({
      status: this.status,
      note: `Booking status changed to ${this.status}`,
      timestamp: new Date()
    });
    
    // Set timestamps based on status
    if (this.status === 'confirmed' && !this.confirmedAt) {
      this.confirmedAt = new Date();
    } else if (this.status === 'cancelled' && !this.cancelledAt) {
      this.cancelledAt = new Date();
    } else if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    }
  }
  
  next();
});

// Pre-update middleware
bookingSchema.pre('findOneAndUpdate', function() {
  const update = this.getUpdate();
  if (update.status) {
    update.$push = update.$push || {};
    update.$push.timeline = {
      status: update.status,
      note: `Booking status changed to ${update.status}`,
      timestamp: new Date()
    };
  }
});

// Methods
bookingSchema.methods.confirm = async function(confirmedBy) {
  this.status = 'confirmed';
  this.confirmedAt = new Date();
  this.confirmedBy = confirmedBy;
  
  this.timeline.push({
    status: 'confirmed',
    note: 'Booking confirmed',
    updatedBy: confirmedBy
  });
  
  return this.save();
};

bookingSchema.methods.cancel = async function(reason, cancelledBy) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  
  this.timeline.push({
    status: 'cancelled',
    note: `Booking cancelled: ${reason}`,
    updatedBy: cancelledBy
  });
  
  return this.save();
};

bookingSchema.methods.complete = async function() {
  this.status = 'completed';
  this.completedAt = new Date();
  
  this.timeline.push({
    status: 'completed',
    note: 'Booking completed'
  });
  
  return this.save();
};

bookingSchema.methods.addMessage = async function(senderId, message, attachments = []) {
  this.messages.push({
    senderId,
    message,
    attachments,
    sentAt: new Date()
  });
  
  return this.save();
};

bookingSchema.methods.markMessageRead = async function(messageId) {
  const message = this.messages.id(messageId);
  if (message) {
    message.isRead = true;
    message.readAt = new Date();
    await this.save();
  }
  return this;
};

// Static methods
bookingSchema.statics.getUpcomingCheckIns = function(days = 1) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  return this.find({
    status: 'confirmed',
    checkIn: { $gte: startDate, $lte: endDate }
  }).populate('tenantId propertyId');
};

bookingSchema.statics.getUpcomingCheckOuts = function(days = 1) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  return this.find({
    status: 'confirmed',
    checkOut: { $gte: startDate, $lte: endDate }
  }).populate('tenantId propertyId');
};

bookingSchema.statics.getOverdueCheckOuts = function() {
  const now = new Date();
  
  return this.find({
    status: 'confirmed',
    checkOut: { $lt: now }
  }).populate('tenantId propertyId');
};

bookingSchema.statics.getBookingsForDateRange = function(startDate, endDate, propertyId = null) {
  const query = {
    status: { $in: ['confirmed', 'pending'] },
    $or: [
      { checkIn: { $gte: startDate, $lte: endDate } },
      { checkOut: { $gte: startDate, $lte: endDate } }
    ]
  };
  
  if (propertyId) {
    query.propertyId = propertyId;
  }
  
  return this.find(query).populate('propertyId');
};

module.exports = mongoose.model('Booking', bookingSchema);