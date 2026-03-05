const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^\+252\d{7,9}$/, 'Phone must be in +252 format (e.g., +252612345678)']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    select: false
  },
  role: {
    type: String,
    enum: ['tenant', 'landlord', 'admin'],
    default: 'tenant'
  },

  // Verification Status
  isVerified: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isIdentityVerified: {
    type: Boolean,
    default: false
  },
  verificationLevel: {
    type: String,
    enum: ['none', 'basic', 'verified', 'trusted'],
    default: 'none'
  },

  // Profile Information
  profileImage: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  occupation: String,
  company: String,
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },

  // Address Information
  address: {
    street: String,
    district: String,
    city: {
      type: String,
      default: 'Mogadishu'
    },
    state: String,
    country: {
      type: String,
      default: 'Somalia'
    },
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // Landlord Specific Fields
  verificationDocuments: [{
    type: {
      type: String,
      enum: ['id_card', 'passport', 'business_license', 'property_deed', 'utility_bill']
    },
    number: String,
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    verified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    expiryDate: Date,
    notes: String
  }],
  businessName: String,
  businessRegistration: String,
  taxId: String,
  yearsOfExperience: Number,
  propertiesOwned: Number,

  // Statistics and Counts
  stats: {
    propertyCount: {
      type: Number,
      default: 0
    },
    activeListings: {
      type: Number,
      default: 0
    },
    totalBookings: {
      type: Number,
      default: 0
    },
    completedBookings: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    favoriteCount: {
      type: Number,
      default: 0
    },
    responseRate: {
      type: Number,
      default: 0
    },
    responseTime: {
      type: Number, // in hours
      default: 0
    },
    viewCount: {
      type: Number,
      default: 0
    }
  },

  // Preferences
  preferences: {
    language: {
      type: String,
      enum: ['en', 'so', 'ar'],
      default: 'en'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    timezone: {
      type: String,
      default: 'Africa/Mogadishu'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      },
      marketing: {
        type: Boolean,
        default: false
      }
    },
    privacy: {
      showEmail: {
        type: Boolean,
        default: false
      },
      showPhone: {
        type: Boolean,
        default: true
      },
      showProfile: {
        type: Boolean,
        default: true
      }
    }
  },

  // Account Security
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  loginAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  lockUntil: {
    type: Date,
    select: false
  },
  lastLogin: Date,
  lastLoginIp: String,
  lastActive: Date,
  deviceTokens: [{
    type: String,
    select: false
  }],

  // Account Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'deactivated', 'banned'],
    default: 'active'
  },
  suspensionReason: String,
  suspendedUntil: Date,
  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deactivatedAt: Date,
  reactivationToken: String,
  reactivationExpires: Date,

  // Tokens
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  phoneVerificationToken: String,
  phoneVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  refreshToken: String,
  refreshTokenExpires: Date,

  // Metadata
  meta: {
    registeredFrom: String, // IP or referrer
    userAgent: String,
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    tags: [String]
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Virtual for profile completeness
userSchema.virtual('profileCompleteness').get(function() {
  let completeness = 0;
  const fields = ['email', 'phone', 'profileImage', 'bio', 'address.street', 'address.district'];
  
  fields.forEach(field => {
    if (this.get(field)) completeness += 100 / fields.length;
  });
  
  return Math.round(completeness);
});

// Virtual for isOnline (within last 15 minutes)
userSchema.virtual('isOnline').get(function() {
  if (!this.lastActive) return false;
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return this.lastActive > fifteenMinutesAgo;
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ 'location.district': 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('passwordHash') && this.passwordHash) {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  }
  
  // Update timestamps
  this.updatedAt = Date.now();
  
  next();
});

// Pre-update middleware
userSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.generateAuthToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      id: this._id,
      role: this.role,
      name: this.name,
      email: this.email,
      verificationLevel: this.verificationLevel
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

userSchema.methods.generateRefreshToken = function() {
  this.refreshToken = crypto.randomBytes(40).toString('hex');
  this.refreshTokenExpires = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  return this.refreshToken;
};

userSchema.methods.generateEmailVerificationToken = function() {
  this.emailVerificationToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return this.emailVerificationToken;
};

userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

userSchema.methods.generatePhoneVerificationToken = function() {
  this.phoneVerificationToken = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  this.phoneVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return this.phoneVerificationToken;
};

userSchema.methods.incrementLoginAttempts = function() {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  // Increment attempts
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account if max attempts reached
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // Lock for 2 hours
  }
  
  return this.updateOne(updates);
};

userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.updateStats = async function(type, increment = true) {
  const update = {};
  const value = increment ? 1 : -1;
  
  switch(type) {
    case 'property':
      update['stats.propertyCount'] = value;
      if (increment) update['stats.activeListings'] = value;
      break;
    case 'booking':
      update['stats.totalBookings'] = value;
      break;
    case 'completed':
      update['stats.completedBookings'] = value;
      break;
    case 'review':
      update['stats.totalReviews'] = value;
      break;
    case 'favorite':
      update['stats.favoriteCount'] = value;
      break;
    case 'view':
      update['stats.viewCount'] = value;
      break;
  }
  
  return this.updateOne({ $inc: update });
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.twoFactorSecret;
  delete user.loginAttempts;
  delete user.lockUntil;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  delete user.phoneVerificationToken;
  delete user.phoneVerificationExpires;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.refreshToken;
  delete user.refreshTokenExpires;
  delete user.deviceTokens;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);