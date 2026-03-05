const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Review Identification
  reviewNumber: {
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
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  landlordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Ratings (1-5 scale)
  ratings: {
    overall: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    accuracy: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    cleanliness: {
      type: Number,
      min: 1,
      max: 5
    },
    location: {
      type: Number,
      min: 1,
      max: 5
    },
    checkIn: {
      type: Number,
      min: 1,
      max: 5
    },
    value: {
      type: Number,
      min: 1,
      max: 5
    },
    amenities: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  
  // Review Content
  title: {
    type: String,
    required: [true, 'Review title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    minlength: [10, 'Comment must be at least 10 characters'],
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },
  pros: [{
    type: String,
    maxlength: [100, 'Pros cannot exceed 100 characters']
  }],
  cons: [{
    type: String,
    maxlength: [100, 'Cons cannot exceed 100 characters']
  }],
  
  // Media
  photos: [{
    url: String,
    thumbnail: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  videos: [{
    url: String,
    thumbnail: String
  }],
  
  // Landlord Response
  landlordReply: {
    comment: {
      type: String,
      maxlength: [1000, 'Reply cannot exceed 1000 characters']
    },
    repliedAt: Date,
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editHistory: [{
      comment: String,
      editedAt: Date
    }]
  },
  
  // Moderation
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending'
  },
  moderationNotes: String,
  moderatedAt: Date,
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: String,
  
  // Helpful Votes
  helpful: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  notHelpful: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  
  // Reporting
  reported: {
    isReported: {
      type: Boolean,
      default: false
    },
    reason: String,
    description: String,
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reportedAt: Date,
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolution: String
  },
  
  // Verification
  verified: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Metadata
  stayDate: Date,
  isUpdated: {
    type: Boolean,
    default: false
  },
  updatedAt: Date,
  ipAddress: String,
  userAgent: String,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for average rating
reviewSchema.virtual('averageRating').get(function() {
  const ratings = Object.values(this.ratings).filter(r => typeof r === 'number');
  if (ratings.length === 0) return 0;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
});

// Virtual for helpful percentage
reviewSchema.virtual('helpfulPercentage').get(function() {
  const total = this.helpful.count + this.notHelpful.count;
  if (total === 0) return 0;
  return Math.round((this.helpful.count / total) * 100);
});

// Indexes
reviewSchema.index({ reviewNumber: 1 }, { unique: true });
reviewSchema.index({ propertyId: 1 });
reviewSchema.index({ tenantId: 1 });
reviewSchema.index({ landlordId: 1 });
reviewSchema.index({ bookingId: 1 });
reviewSchema.index({ moderationStatus: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ 'ratings.overall': -1 });

// Ensure one review per booking
reviewSchema.index({ bookingId: 1 }, { unique: true });

// Pre-save middleware
reviewSchema.pre('save', async function(next) {
  // Generate review number if not exists
  if (!this.reviewNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.reviewNumber = `REV${year}${month}${random}`;
  }
  
  // Set stay date from booking
  if (!this.stayDate && this.bookingId) {
    const Booking = mongoose.model('Booking');
    const booking = await Booking.findById(this.bookingId);
    if (booking) {
      this.stayDate = booking.checkIn;
    }
  }
  
  // Handle updates
  if (!this.isNew) {
    this.isUpdated = true;
    this.updatedAt = new Date();
  }
  
  next();
});

// Post-save middleware
reviewSchema.post('save', async function() {
  // Update property ratings
  const Property = mongoose.model('Property');
  await Property.findByIdAndUpdate(this.propertyId, {
    $inc: { 'metrics.reviews': 1 }
  });
  
  // Trigger property rating recalculation
  const property = await Property.findById(this.propertyId);
  if (property) {
    await property.updateRating();
  }
  
  // Update tenant's review count
  const User = mongoose.model('User');
  await User.findByIdAndUpdate(this.tenantId, {
    $inc: { 'stats.totalReviews': 1 }
  });
});

// Post-remove middleware
reviewSchema.post('remove', async function() {
  // Update property ratings
  const Property = mongoose.model('Property');
  await Property.findByIdAndUpdate(this.propertyId, {
    $inc: { 'metrics.reviews': -1 }
  });
  
  // Trigger property rating recalculation
  const property = await Property.findById(this.propertyId);
  if (property) {
    await property.updateRating();
  }
  
  // Update tenant's review count
  const User = mongoose.model('User');
  await User.findByIdAndUpdate(this.tenantId, {
    $inc: { 'stats.totalReviews': -1 }
  });
});

// Methods
reviewSchema.methods.addLandlordReply = async function(comment, landlordId) {
  const reply = {
    comment,
    repliedBy: landlordId,
    repliedAt: new Date()
  };
  
  // Save current reply to history if editing
  if (this.landlordReply && this.landlordReply.comment) {
    reply.editHistory = [{
      comment: this.landlordReply.comment,
      editedAt: this.landlordReply.repliedAt
    }];
    reply.isEdited = true;
  }
  
  this.landlordReply = reply;
  return this.save();
};

reviewSchema.methods.markHelpful = async function(userId) {
  if (!this.helpful.users.includes(userId)) {
    // Remove from not helpful if present
    const notHelpfulIndex = this.notHelpful.users.indexOf(userId);
    if (notHelpfulIndex > -1) {
      this.notHelpful.users.splice(notHelpfulIndex, 1);
      this.notHelpful.count -= 1;
    }
    
    this.helpful.users.push(userId);
    this.helpful.count += 1;
    await this.save();
  }
  return this;
};

reviewSchema.methods.markNotHelpful = async function(userId) {
  if (!this.notHelpful.users.includes(userId)) {
    // Remove from helpful if present
    const helpfulIndex = this.helpful.users.indexOf(userId);
    if (helpfulIndex > -1) {
      this.helpful.users.splice(helpfulIndex, 1);
      this.helpful.count -= 1;
    }
    
    this.notHelpful.users.push(userId);
    this.notHelpful.count += 1;
    await this.save();
  }
  return this;
};

reviewSchema.methods.report = async function(reason, description, reportedBy) {
  this.reported = {
    isReported: true,
    reason,
    description,
    reportedBy,
    reportedAt: new Date()
  };
  
  this.moderationStatus = 'flagged';
  return this.save();
};

reviewSchema.methods.moderate = async function(status, notes, moderatedBy) {
  this.moderationStatus = status;
  this.moderationNotes = notes;
  this.moderatedAt = new Date();
  this.moderatedBy = moderatedBy;
  
  if (status === 'rejected') {
    this.rejectionReason = notes;
  }
  
  return this.save();
};

reviewSchema.methods.verify = async function(verifiedBy) {
  this.verified = {
    isVerified: true,
    verifiedAt: new Date(),
    verifiedBy
  };
  
  return this.save();
};

// Static methods
reviewSchema.statics.getPropertyReviews = function(propertyId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  
  return this.find({ 
    propertyId, 
    moderationStatus: 'approved' 
  })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .populate('tenantId', 'name profileImage')
  .populate('landlordReply.repliedBy', 'name');
};

reviewSchema.statics.getTenantReviews = function(tenantId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  
  return this.find({ tenantId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('propertyId', 'title images location');
};

reviewSchema.statics.getPendingModeration = function(limit = 50) {
  return this.find({ 
    moderationStatus: { $in: ['pending', 'flagged'] } 
  })
  .sort({ createdAt: 1 })
  .limit(limit)
  .populate('tenantId', 'name email')
  .populate('propertyId', 'title landlordId');
};

reviewSchema.statics.getReviewStats = async function(propertyId) {
  const stats = await this.aggregate([
    { $match: { propertyId: mongoose.Types.ObjectId(propertyId), moderationStatus: 'approved' } },
    { $group: {
      _id: null,
      totalReviews: { $sum: 1 },
      avgOverall: { $avg: '$ratings.overall' },
      avgAccuracy: { $avg: '$ratings.accuracy' },
      avgCommunication: { $avg: '$ratings.communication' },
      avgCleanliness: { $avg: '$ratings.cleanliness' },
      avgLocation: { $avg: '$ratings.location' },
      avgCheckIn: { $avg: '$ratings.checkIn' },
      avgValue: { $avg: '$ratings.value' },
      avgAmenities: { $avg: '$ratings.amenities' }
    }}
  ]);
  
  return stats[0] || {
    totalReviews: 0,
    avgOverall: 0,
    avgAccuracy: 0,
    avgCommunication: 0,
    avgCleanliness: 0,
    avgLocation: 0,
    avgCheckIn: 0,
    avgValue: 0,
    avgAmenities: 0
  };
};

reviewSchema.statics.getRatingDistribution = async function(propertyId) {
  const distribution = await this.aggregate([
    { $match: { propertyId: mongoose.Types.ObjectId(propertyId), moderationStatus: 'approved' } },
    { $group: {
      _id: '$ratings.overall',
      count: { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
  ]);
  
  const result = {};
  for (let i = 1; i <= 5; i++) {
    result[i] = distribution.find(d => d._id === i)?.count || 0;
  }
  
  return result;
};

module.exports = mongoose.model('Review', reviewSchema);