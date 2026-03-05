const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  // Inquiry Identification
  inquiryNumber: {
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
  
  // Inquiry Details
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    minlength: [10, 'Message must be at least 10 characters'],
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  category: {
    type: String,
    enum: ['general', 'booking', 'price', 'availability', 'viewing', 'amenities', 'location', 'contract', 'other'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Attachments
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Conversation Thread
  replies: [{
    message: {
      type: String,
      required: true,
      maxlength: [2000, 'Reply cannot exceed 2000 characters']
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderRole: {
      type: String,
      enum: ['tenant', 'landlord', 'admin']
    },
    attachments: [{
      name: String,
      url: String,
      type: String,
      size: Number
    }],
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'closed', 'archived'],
    default: 'new'
  },
  
  // Viewing Request
  viewingRequest: {
    requested: {
      type: Boolean,
      default: false
    },
    preferredDates: [Date],
    preferredTimes: [String],
    alternateContact: String,
    notes: String,
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'confirmed', 'completed', 'cancelled']
    },
    scheduledDate: Date,
    scheduledTime: String,
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    confirmedAt: Date,
    completedAt: Date,
    feedback: String
  },
  
  // Response Tracking
  firstResponseAt: Date,
  firstResponseBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastRepliedAt: Date,
  lastRepliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  responseCount: {
    type: Number,
    default: 0
  },
  
  // Metadata
  closedAt: Date,
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closedReason: String,
  
  // Ratings (for feedback on landlord response)
  rating: {
    responseTime: {
      type: Number,
      min: 1,
      max: 5
    },
    helpfulness: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    ratedAt: Date
  },
  
  // Flags
  isUrgent: {
    type: Boolean,
    default: false
  },
  isEscalated: {
    type: Boolean,
    default: false
  },
  escalatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  escalatedAt: Date,
  escalationReason: String,
  
  // Metadata
  meta: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'email', 'phone'],
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

// Virtual for response time (in hours)
inquirySchema.virtual('responseTime').get(function() {
  if (!this.firstResponseAt) return null;
  const diffMs = this.firstResponseAt - this.createdAt;
  return Math.round(diffMs / (1000 * 60 * 60));
});

// Virtual for isResolved
inquirySchema.virtual('isResolved').get(function() {
  return ['closed', 'archived'].includes(this.status);
});

// Virtual for last activity
inquirySchema.virtual('lastActivity').get(function() {
  if (this.replies && this.replies.length > 0) {
    return this.replies[this.replies.length - 1].createdAt;
  }
  return this.createdAt;
});

// Indexes
inquirySchema.index({ inquiryNumber: 1 }, { unique: true });
inquirySchema.index({ propertyId: 1 });
inquirySchema.index({ tenantId: 1 });
inquirySchema.index({ landlordId: 1 });
inquirySchema.index({ status: 1 });
inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ lastRepliedAt: -1 });

// Pre-save middleware
inquirySchema.pre('save', async function(next) {
  // Generate inquiry number if not exists
  if (!this.inquiryNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.inquiryNumber = `INQ${year}${month}${random}`;
  }
  
  // Update status based on replies
  if (this.isModified('replies')) {
    const lastReply = this.replies[this.replies.length - 1];
    this.lastRepliedAt = new Date();
    this.lastRepliedBy = lastReply.senderId;
    this.responseCount = this.replies.length;
    
    if (this.status === 'new') {
      this.status = 'replied';
    }
    
    // Set first response time
    if (!this.firstResponseAt) {
      this.firstResponseAt = new Date();
      this.firstResponseBy = lastReply.senderId;
    }
  }
  
  next();
});

// Pre-update middleware
inquirySchema.pre('findOneAndUpdate', function() {
  const update = this.getUpdate();
  if (update.$push && update.$push.replies) {
    update.$set = update.$set || {};
    update.$set.lastRepliedAt = new Date();
    update.$set.lastRepliedBy = update.$push.replies.senderId;
    update.$set.responseCount = { $inc: 1 };
  }
});

// Methods
inquirySchema.methods.addReply = async function(senderId, message, attachments = [], senderRole) {
  this.replies.push({
    message,
    senderId,
    senderRole: senderRole || (senderId.equals(this.tenantId) ? 'tenant' : 'landlord'),
    attachments,
    createdAt: new Date()
  });
  
  this.lastRepliedAt = new Date();
  this.lastRepliedBy = senderId;
  this.responseCount = this.replies.length;
  
  if (this.status === 'new') {
    this.status = 'replied';
  }
  
  // Set first response if this is the first reply
  if (!this.firstResponseAt) {
    this.firstResponseAt = new Date();
    this.firstResponseBy = senderId;
  }
  
  return this.save();
};

inquirySchema.methods.markAsRead = async function() {
  if (this.status === 'new') {
    this.status = 'read';
    await this.save();
  }
  return this;
};

inquirySchema.methods.close = async function(closedBy, reason = '') {
  this.status = 'closed';
  this.closedAt = new Date();
  this.closedBy = closedBy;
  this.closedReason = reason;
  
  return this.save();
};

inquirySchema.methods.requestViewing = async function(dates, times, notes = '') {
  this.viewingRequest = {
    requested: true,
    preferredDates: dates,
    preferredTimes: times,
    notes,
    status: 'pending'
  };
  
  return this.save();
};

inquirySchema.methods.scheduleViewing = async function(date, time, scheduledBy) {
  if (this.viewingRequest) {
    this.viewingRequest.scheduledDate = date;
    this.viewingRequest.scheduledTime = time;
    this.viewingRequest.status = 'scheduled';
    this.viewingRequest.confirmedBy = scheduledBy;
    this.viewingRequest.confirmedAt = new Date();
    
    await this.save();
  }
  return this;
};

inquirySchema.methods.completeViewing = async function(feedback = '') {
  if (this.viewingRequest) {
    this.viewingRequest.status = 'completed';
    this.viewingRequest.completedAt = new Date();
    this.viewingRequest.feedback = feedback;
    
    await this.save();
  }
  return this;
};

inquirySchema.methods.rate = async function(responseTime, helpfulness, comment = '') {
  this.rating = {
    responseTime,
    helpfulness,
    comment,
    ratedAt: new Date()
  };
  
  return this.save();
};

inquirySchema.methods.escalate = async function(reason, escalatedTo) {
  this.isEscalated = true;
  this.escalatedTo = escalatedTo;
  this.escalatedAt = new Date();
  this.escalationReason = reason;
  this.priority = 'urgent';
  
  return this.save();
};

// Static methods
inquirySchema.statics.getUnansweredInquiries = function(hours = 24) {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hours);
  
  return this.find({
    status: { $in: ['new', 'read'] },
    createdAt: { $lte: cutoff }
  }).populate('propertyId tenantId landlordId');
};

inquirySchema.statics.getHighPriorityInquiries = function() {
  return this.find({
    priority: { $in: ['high', 'urgent'] },
    status: { $ne: 'closed' }
  }).sort({ createdAt: -1 });
};

inquirySchema.statics.getInquiriesForProperty = function(propertyId, limit = 50) {
  return this.find({ propertyId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('tenantId', 'name email profileImage');
};

inquirySchema.statics.getStatsForLandlord = async function(landlordId) {
  const stats = await this.aggregate([
    { $match: { landlordId: mongoose.Types.ObjectId(landlordId) } },
    { $group: {
      _id: null,
      totalInquiries: { $sum: 1 },
      unanswered: { $sum: { $cond: [{ $in: ['$status', ['new', 'read']] }, 1, 0] } },
      avgResponseTime: { $avg: '$responseTime' },
      avgRating: { $avg: '$rating.helpfulness' }
    }}
  ]);
  
  return stats[0] || {
    totalInquiries: 0,
    unanswered: 0,
    avgResponseTime: 0,
    avgRating: 0
  };
};

module.exports = mongoose.model('Inquiry', inquirySchema);