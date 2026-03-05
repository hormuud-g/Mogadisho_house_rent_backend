const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const notificationService = require('../services/notificationService');

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Public
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-verificationDocuments -meta -preferences.notifications');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't return sensitive data for non-owners/admins
    if (req.user && (req.user.id === user.id || req.user.role === 'admin')) {
      // Return full profile for owner/admin
    } else {
      // Return limited public profile
      user.phone = undefined;
      user.email = undefined;
      user.address = undefined;
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user properties
// @route   GET /api/users/:id/properties
// @access  Public
const getUserProperties = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { landlordId: req.params.id };
    
    // Only show available properties to public
    if (!req.user || (req.user.id !== req.params.id && req.user.role !== 'admin')) {
      query.status = 'available';
    } else if (status) {
      query.status = status;
    }

    const [properties, total] = await Promise.all([
      Property.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Property.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: properties.length,
      total,
      data: properties,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user reviews
// @route   GET /api/users/:id/reviews
// @access  Public
const getUserReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { 
      landlordId: req.params.id,
      moderationStatus: 'approved'
    };

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('tenantId', 'name profileImage')
        .populate('propertyId', 'title images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments(query)
    ]);

    // Get rating statistics
    const stats = await Review.getReviewStats(req.params.id);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      data: reviews,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user favorites
// @route   GET /api/users/favorites
// @access  Private
const getUserFavorites = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const Favorite = require('../models/Favorite');
    
    const [favorites, total] = await Promise.all([
      Favorite.find({ tenantId: req.user.id, isArchived: false })
        .populate({
          path: 'propertyId',
          populate: { path: 'landlordId', select: 'name profileImage' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Favorite.countDocuments({ tenantId: req.user.id, isArchived: false })
    ]);

    res.status(200).json({
      success: true,
      count: favorites.length,
      total,
      data: favorites,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Private
const updatePreferences = async (req, res, next) => {
  try {
    const { language, currency, timezone, notifications, privacy } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        'preferences.language': language,
        'preferences.currency': currency,
        'preferences.timezone': timezone,
        'preferences.notifications': notifications,
        'preferences.privacy': privacy
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: user.preferences
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload profile image
// @route   POST /api/users/profile-image
// @access  Private
const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: `/uploads/profiles/${req.file.filename}` },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: { profileImage: user.profileImage }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete account
// @route   DELETE /api/users/account
// @access  Private
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user.id).select('+passwordHash');

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    // Soft delete - deactivate account
    user.status = 'deactivated';
    user.deactivatedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reactivate account
// @route   POST /api/users/reactivate
// @access  Public
const reactivateAccount = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.status !== 'deactivated') {
      return res.status(400).json({
        success: false,
        message: 'Account is not deactivated'
      });
    }

    user.status = 'active';
    user.deactivatedAt = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account reactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private
const getUserStats = async (req, res, next) => {
  try {
    let stats = {};

    if (req.user.role === 'landlord') {
      // Landlord stats
      const [properties, bookings, reviews, inquiries] = await Promise.all([
        Property.countDocuments({ landlordId: req.user.id }),
        Booking.countDocuments({ landlordId: req.user.id }),
        Review.countDocuments({ landlordId: req.user.id }),
        require('../models/Inquiry').countDocuments({ landlordId: req.user.id })
      ]);

      stats = {
        properties,
        bookings,
        reviews,
        inquiries,
        responseRate: req.user.stats.responseRate,
        averageRating: req.user.stats.averageRating
      };
    } else if (req.user.role === 'tenant') {
      // Tenant stats
      const [bookings, favorites, reviews, inquiries] = await Promise.all([
        Booking.countDocuments({ tenantId: req.user.id }),
        require('../models/Favorite').countDocuments({ tenantId: req.user.id }),
        Review.countDocuments({ tenantId: req.user.id }),
        require('../models/Inquiry').countDocuments({ tenantId: req.user.id })
      ]);

      stats = {
        bookings,
        favorites,
        reviews,
        inquiries
      };
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserById,
  getUserProperties,
  getUserReviews,
  getUserFavorites,
  updatePreferences,
  uploadProfileImage,
  deleteAccount,
  reactivateAccount,
  getUserStats
};