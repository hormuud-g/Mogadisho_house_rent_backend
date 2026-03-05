const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  // Relationships
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  
  // Personal Notes
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  tags: [{
    type: String,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  
  // Reminders
  reminder: {
    enabled: {
      type: Boolean,
      default: false
    },
    date: Date,
    type: {
      type: String,
      enum: ['viewing', 'contact', 'price_check', 'availability', 'other']
    },
    note: String,
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    snoozedUntil: Date
  },
  
  // Price Tracking
  priceTracking: {
    enabled: {
      type: Boolean,
      default: false
    },
    initialPrice: Number,
    currentPrice: Number,
    priceHistory: [{
      price: Number,
      date: {
        type: Date,
        default: Date.now
      }
    }],
    lastChecked: Date,
    notifyOnChange: {
      type: Boolean,
      default: true
    }
  },
  
  // Status Tracking
  statusHistory: [{
    status: String,
    date: {
      type: Date,
      default: Date.now
    },
    notified: {
      type: Boolean,
      default: false
    }
  }],
  
  // Sharing
  shared: {
    isShared: {
      type: Boolean,
      default: false
    },
    sharedWith: [{
      email: String,
      sharedAt: Date,
      accessToken: String,
      expiresAt: Date
    }],
    publicLink: String
  },
  
  // Metadata
  viewCount: {
    type: Number,
    default: 0
  },
  lastViewedAt: Date,
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  
  // Custom Folder/Category
  folder: {
    type: String,
    default: 'default'
  },
  customOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Ensure unique favorite per tenant-property
favoriteSchema.index({ tenantId: 1, propertyId: 1 }, { unique: true });

// Indexes for queries
favoriteSchema.index({ tenantId: 1, createdAt: -1 });
favoriteSchema.index({ tenantId: 1, folder: 1 });
favoriteSchema.index({ propertyId: 1 });
favoriteSchema.index({ 'reminder.date': 1 });

// Pre-save middleware
favoriteSchema.pre('save', async function(next) {
  // Initialize price tracking if enabled
  if (this.isModified('priceTracking.enabled') && this.priceTracking.enabled && !this.priceTracking.initialPrice) {
    const Property = mongoose.model('Property');
    const property = await Property.findById(this.propertyId);
    if (property) {
      this.priceTracking.initialPrice = property.price;
      this.priceTracking.currentPrice = property.price;
      this.priceTracking.priceHistory.push({
        price: property.price,
        date: new Date()
      });
    }
  }
  
  next();
});

// Post-save middleware
favoriteSchema.post('save', async function() {
  // Update user's favorite count
  const User = mongoose.model('User');
  const count = await mongoose.model('Favorite').countDocuments({ 
    tenantId: this.tenantId,
    isArchived: false 
  });
  
  await User.findByIdAndUpdate(this.tenantId, {
    'stats.favoriteCount': count
  });
});

// Post-remove middleware
favoriteSchema.post('remove', async function() {
  // Update user's favorite count
  const User = mongoose.model('User');
  const count = await mongoose.model('Favorite').countDocuments({ 
    tenantId: this.tenantId,
    isArchived: false 
  });
  
  await User.findByIdAndUpdate(this.tenantId, {
    'stats.favoriteCount': count
  });
});

// Methods
favoriteSchema.methods.addNote = async function(note) {
  this.notes = note;
  return this.save();
};

favoriteSchema.methods.addTag = async function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    await this.save();
  }
  return this;
};

favoriteSchema.methods.removeTag = async function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

favoriteSchema.methods.setReminder = async function(date, type, note = '') {
  this.reminder = {
    enabled: true,
    date,
    type,
    note,
    completed: false
  };
  
  return this.save();
};

favoriteSchema.methods.snoozeReminder = async function(until) {
  if (this.reminder && this.reminder.enabled) {
    this.reminder.snoozedUntil = until;
    await this.save();
  }
  return this;
};

favoriteSchema.methods.completeReminder = async function() {
  if (this.reminder) {
    this.reminder.completed = true;
    this.reminder.completedAt = new Date();
    await this.save();
  }
  return this;
};

favoriteSchema.methods.enablePriceTracking = async function() {
  const Property = mongoose.model('Property');
  const property = await Property.findById(this.propertyId);
  
  this.priceTracking = {
    enabled: true,
    initialPrice: property.price,
    currentPrice: property.price,
    priceHistory: [{
      price: property.price,
      date: new Date()
    }],
    lastChecked: new Date(),
    notifyOnChange: true
  };
  
  return this.save();
};

favoriteSchema.methods.checkPriceChange = async function() {
  const Property = mongoose.model('Property');
  const property = await Property.findById(this.propertyId);
  
  if (this.priceTracking.enabled && property.price !== this.priceTracking.currentPrice) {
    this.priceTracking.priceHistory.push({
      price: property.price,
      date: new Date()
    });
    
    const oldPrice = this.priceTracking.currentPrice;
    this.priceTracking.currentPrice = property.price;
    this.priceTracking.lastChecked = new Date();
    
    await this.save();
    
    return {
      changed: true,
      oldPrice,
      newPrice: property.price,
      difference: property.price - oldPrice,
      percentageChange: ((property.price - oldPrice) / oldPrice) * 100
    };
  }
  
  return { changed: false };
};

favoriteSchema.methods.checkStatusChange = async function() {
  const Property = mongoose.model('Property');
  const property = await Property.findById(this.propertyId);
  
  const lastStatus = this.statusHistory[this.statusHistory.length - 1]?.status;
  
  if (property.status !== lastStatus) {
    this.statusHistory.push({
      status: property.status,
      date: new Date(),
      notified: false
    });
    
    await this.save();
    
    return {
      changed: true,
      oldStatus: lastStatus,
      newStatus: property.status
    };
  }
  
  return { changed: false };
};

favoriteSchema.methods.incrementView = async function() {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  return this.save();
};

favoriteSchema.methods.archive = async function() {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

favoriteSchema.methods.unarchive = async function() {
  this.isArchived = false;
  this.archivedAt = null;
  return this.save();
};

favoriteSchema.methods.share = async function(email) {
  const accessToken = require('crypto').randomBytes(32).toString('hex');
  
  if (!this.shared.isShared) {
    this.shared.isShared = true;
  }
  
  this.shared.sharedWith.push({
    email,
    sharedAt: new Date(),
    accessToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  });
  
  return this.save();
};

favoriteSchema.methods.generatePublicLink = async function() {
  const accessToken = require('crypto').randomBytes(32).toString('hex');
  
  this.shared.isShared = true;
  this.shared.publicLink = accessToken;
  
  await this.save();
  
  return `${process.env.FRONTEND_URL}/shared/favorites/${accessToken}`;
};

// Static methods
favoriteSchema.statics.getFavoritesByTenant = function(tenantId, folder = null) {
  const query = { tenantId, isArchived: false };
  if (folder) {
    query.folder = folder;
  }
  
  return this.find(query)
    .populate('propertyId')
    .sort({ customOrder: 1, createdAt: -1 });
};

favoriteSchema.statics.getFavoritesByProperty = function(propertyId) {
  return this.find({ propertyId, isArchived: false })
    .populate('tenantId', 'name email profileImage');
};

favoriteSchema.statics.getFolders = async function(tenantId) {
  const result = await this.aggregate([
    { $match: { tenantId: mongoose.Types.ObjectId(tenantId), isArchived: false } },
    { $group: {
      _id: '$folder',
      count: { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
  ]);
  
  return result;
};

favoriteSchema.statics.getReminders = function(date) {
  const query = {
    'reminder.enabled': true,
    'reminder.completed': false,
    'reminder.date': { $lte: date }
  };
  
  if (date) {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    query['reminder.date'] = { $lte: endOfDay };
  }
  
  return this.find(query)
    .populate('propertyId')
    .populate('tenantId');
};

module.exports = mongoose.model('Favorite', favoriteSchema);