const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [20, 'Description must be at least 20 characters'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  summary: {
    type: String,
    maxlength: [300, 'Summary cannot exceed 300 characters']
  },
  
  // Property Details
  type: {
    type: String,
    required: true,
    enum: ['apartment', 'house', 'room', 'office', 'shop', 'land', 'villa', 'commercial', 'warehouse', 'studio']
  },
  category: {
    type: String,
    enum: ['residential', 'commercial', 'industrial', 'land', 'mixed-use']
  },
  status: {
    type: String,
    enum: ['available', 'rented', 'pending', 'rejected', 'archived', 'under_maintenance'],
    default: 'pending'
  },
  
  // Pricing
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [1, 'Price must be greater than 0'],
    max: [1000000, 'Price cannot exceed 1,000,000']
  },
  priceUnit: {
    type: String,
    enum: ['monthly', 'weekly', 'daily', 'yearly'],
    default: 'monthly'
  },
  securityDeposit: {
    type: Number,
    min: 0,
    default: 0
  },
  cleaningFee: {
    type: Number,
    min: 0,
    default: 0
  },
  utilitiesIncluded: {
    type: Boolean,
    default: false
  },
  utilitiesDetails: String,
  
  // Size and Layout
  size: {
    type: Number,
    required: [true, 'Size is required'],
    min: 1
  },
  sizeUnit: {
    type: String,
    enum: ['sqft', 'sqm'],
    default: 'sqm'
  },
  bedrooms: {
    type: Number,
    required: true,
    min: 0,
    max: 20
  },
  bathrooms: {
    type: Number,
    required: true,
    min: 0,
    max: 20
  },
  halfBathrooms: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  floors: {
    type: Number,
    min: 1,
    default: 1
  },
  floorLevel: {
    type: Number,
    min: 0,
    default: 0
  },
  totalFloors: Number,
  
  // Location
  location: {
    district: {
      type: String,
      required: [true, 'District is required']
    },
    subDistrict: String,
    area: String,
    street: String,
    buildingName: String,
    unitNumber: String,
    address: {
      type: String,
      required: [true, 'Address is required'],
      maxlength: [300, 'Address cannot exceed 300 characters']
    },
    landmark: String,
    coordinates: {
      lat: {
        type: Number,
        min: -90,
        max: 90
      },
      lng: {
        type: Number,
        min: -180,
        max: 180
      }
    },
    mapUrl: String,
    what3words: String
  },
  
  // Media
  images: [{
    url: {
      type: String,
      required: true
    },
    thumbnail: String,
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  videos: [{
    url: String,
    title: String,
    thumbnail: String,
    type: {
      type: String,
      enum: ['youtube', 'vimeo', 'upload']
    }
  }],
  virtualTour: String,
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: Date
  }],
  
  // Features and Amenities
  amenities: [{
    type: String,
    enum: ['wifi', 'parking', 'security', 'generator', 'water_tank', 'ac', 'furnished', 
           'kitchen', 'balcony', 'elevator', 'guard', 'cctv', 'swimming_pool', 'gym',
           'playground', 'garden', 'terrace', 'storage', 'laundry', 'internet', 
           'satellite_tv', 'intercom', 'emergency_exit', 'fire_extinguisher']
  }],
  furnishing: {
    type: String,
    enum: ['unfurnished', 'semi-furnished', 'fully-furnished'],
    default: 'unfurnished'
  },
  appliances: [String],
  parkingSpaces: {
    type: Number,
    default: 0
  },
  parkingType: {
    type: String,
    enum: ['none', 'street', 'off-street', 'garage', 'valet']
  },
  
  // Rules and Policies
  rules: {
    smoking: {
      type: String,
      enum: ['allowed', 'not-allowed', 'outdoor-only'],
      default: 'not-allowed'
    },
    pets: {
      type: String,
      enum: ['allowed', 'not-allowed', 'small-only', 'negotiable'],
      default: 'not-allowed'
    },
    parties: {
      type: String,
      enum: ['allowed', 'not-allowed', 'quiet-only'],
      default: 'not-allowed'
    },
    children: {
      type: String,
      enum: ['allowed', 'not-allowed'],
      default: 'allowed'
    },
    additionalRules: String
  },
  
  // Availability
  availability: {
    availableFrom: Date,
    availableTo: Date,
    minimumStay: {
      type: Number,
      min: 1,
      default: 1
    },
    maximumStay: {
      type: Number,
      max: 365,
      default: 365
    },
    noticePeriod: {
      type: Number, // days
      default: 0
    },
    availabilityCalendar: [{
      date: Date,
      isAvailable: Boolean,
      price: Number
    }]
  },
  
  // Contact Information
  contactInfo: {
    phone: String,
    email: String,
    whatsapp: String,
    preferredMethod: {
      type: String,
      enum: ['phone', 'email', 'whatsapp', 'in-app'],
      default: 'in-app'
    },
    viewingInstructions: String
  },
  
  // Owner Information
  landlordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyManager: {
    name: String,
    phone: String,
    email: String
  },
  
  // Property Management
  managementType: {
    type: String,
    enum: ['owner', 'agent', 'company'],
    default: 'owner'
  },
  agency: {
    name: String,
    license: String,
    contact: String
  },
  
  // Lease Terms
  leaseTerms: {
    minLease: {
      type: Number, // months
      default: 6
    },
    maxLease: Number,
    leaseType: {
      type: String,
      enum: ['fixed', 'month-to-month', 'negotiable'],
      default: 'fixed'
    },
    renewalOptions: Boolean,
    earlyTermination: String
  },
  
  // Statistics
  metrics: {
    views: {
      type: Number,
      default: 0
    },
    uniqueViews: {
      type: Number,
      default: 0
    },
    favorites: {
      type: Number,
      default: 0
    },
    inquiries: {
      type: Number,
      default: 0
    },
    bookings: {
      type: Number,
      default: 0
    },
    completedBookings: {
      type: Number,
      default: 0
    },
    reviews: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    responseRate: {
      type: Number,
      default: 0
    },
    responseTime: {
      type: Number, // in hours
      default: 0
    }
  },
  
  // SEO and Discovery
  slug: {
    type: String,
    unique: true
  },
  tags: [String],
  keywords: [String],
  featured: {
    type: Boolean,
    default: false
  },
  featuredUntil: Date,
  promoted: {
    type: Boolean,
    default: false
  },
  promotedUntil: Date,
  
  // Verification and Moderation
  verificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: String,
  moderationNotes: String,
  
  // Metadata
  meta: {
    source: String,
    externalId: String,
    importedFrom: String,
    importedAt: Date,
    lastSyncedAt: Date,
    notes: String
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastViewedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for reviews
propertySchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'propertyId',
  options: { sort: { createdAt: -1 } }
});

// Virtual for current availability
propertySchema.virtual('isAvailable').get(function() {
  if (this.status !== 'available') return false;
  if (this.availability.availableFrom && this.availability.availableFrom > new Date()) return false;
  if (this.availability.availableTo && this.availability.availableTo < new Date()) return false;
  return true;
});

// Virtual for full address
propertySchema.virtual('fullAddress').get(function() {
  const parts = [];
  if (this.location.address) parts.push(this.location.address);
  if (this.location.district) parts.push(this.location.district);
  if (this.location.city) parts.push(this.location.city);
  return parts.join(', ');
});

// Virtual for price per sqm
propertySchema.virtual('pricePerSqm').get(function() {
  if (!this.size) return null;
  let price = this.price;
  if (this.priceUnit === 'yearly') price = price / 12;
  if (this.priceUnit === 'weekly') price = price * 4.33;
  if (this.priceUnit === 'daily') price = price * 30;
  
  let size = this.size;
  if (this.sizeUnit === 'sqft') size = size * 0.092903; // convert to sqm
  
  return Math.round(price / size);
});

// Indexes
propertySchema.index({ title: 'text', description: 'text', summary: 'text' });
propertySchema.index({ 'location.district': 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ type: 1 });
propertySchema.index({ bedrooms: 1 });
propertySchema.index({ bathrooms: 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ landlordId: 1 });
propertySchema.index({ 'location.coordinates': '2dsphere' });
propertySchema.index({ createdAt: -1 });
propertySchema.index({ featured: -1 });
propertySchema.index({ 'metrics.views': -1 });
propertySchema.index({ 'metrics.averageRating': -1 });

// Pre-save middleware
propertySchema.pre('save', async function(next) {
  // Generate slug from title
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Ensure unique slug
    const Model = this.constructor;
    const existing = await Model.findOne({ slug: this.slug, _id: { $ne: this._id } });
    if (existing) {
      this.slug = `${this.slug}-${Date.now().toString(36)}`;
    }
  }
  
  // Set summary if not provided
  if (!this.summary && this.description) {
    this.summary = this.description.substring(0, 297) + '...';
  }
  
  // Update timestamps
  this.updatedAt = Date.now();
  
  next();
});

// Pre-update middleware
propertySchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Methods
propertySchema.methods.incrementViews = async function(userId = null) {
  const update = { $inc: { 'metrics.views': 1 } };
  if (userId) {
    // Track unique views per user (would need additional collection)
  }
  return this.updateOne(update);
};

propertySchema.methods.updateRating = async function() {
  const Review = mongoose.model('Review');
  const stats = await Review.aggregate([
    { $match: { propertyId: this._id, moderationStatus: 'approved' } },
    { $group: {
      _id: '$propertyId',
      avgRating: { $avg: '$ratings.overall' },
      count: { $sum: 1 }
    }}
  ]);
  
  if (stats.length > 0) {
    this.metrics.averageRating = stats[0].avgRating;
    this.metrics.reviews = stats[0].count;
  } else {
    this.metrics.averageRating = 0;
    this.metrics.reviews = 0;
  }
  
  return this.save();
};

propertySchema.methods.isAvailableForDates = async function(checkIn, checkOut) {
  const Booking = mongoose.model('Booking');
  
  const conflictingBooking = await Booking.findOne({
    propertyId: this._id,
    status: { $in: ['confirmed', 'pending'] },
    $or: [
      { checkIn: { $lt: checkOut, $gte: checkIn } },
      { checkOut: { $gt: checkIn, $lte: checkOut } },
      { checkIn: { $lte: checkIn }, checkOut: { $gte: checkOut } }
    ]
  });
  
  return !conflictingBooking;
};

propertySchema.methods.getCalendar = async function(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const Booking = mongoose.model('Booking');
  const bookings = await Booking.find({
    propertyId: this._id,
    status: { $in: ['confirmed', 'pending'] },
    $or: [
      { checkIn: { $gte: startDate, $lte: endDate } },
      { checkOut: { $gte: startDate, $lte: endDate } }
    ]
  });
  
  return bookings;
};

// Static methods
propertySchema.statics.getFeatured = function(limit = 10) {
  return this.find({ 
    featured: true, 
    status: 'available' 
  })
  .sort({ featuredUntil: -1 })
  .limit(limit);
};

propertySchema.statics.getByDistrict = function(district, limit = 20) {
  return this.find({ 
    'location.district': district,
    status: 'available'
  })
  .sort({ 'metrics.views': -1 })
  .limit(limit);
};

propertySchema.statics.search = function(query, filters = {}) {
  const searchQuery = {
    $text: { $search: query },
    status: 'available',
    ...filters
  };
  
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

module.exports = mongoose.model('Property', propertySchema);