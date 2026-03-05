const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Inquiry = require('../models/Inquiry');
const Review = require('../models/Review');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');
const { MOGADISHU_DISTRICTS } = require('../constants/districts');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      status,
      verified,
      search,
      sort = 'createdAt'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (verified) query.isVerified = verified === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = {};
    switch (sort) {
      case 'name':
        sortOption = { name: 1 };
        break;
      case '-name':
        sortOption = { name: -1 };
        break;
      case 'email':
        sortOption = { email: 1 };
        break;
      case '-email':
        sortOption = { email: -1 };
        break;
      case 'createdAt':
        sortOption = { createdAt: -1 };
        break;
      case '-createdAt':
        sortOption = { createdAt: 1 };
        break;
      case 'lastLogin':
        sortOption = { lastLogin: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash -refreshToken -emailVerificationToken -passwordResetToken -twoFactorSecret')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    // Get user statistics
    const stats = await User.aggregate([
      { $group: {
        _id: null,
        total: { $sum: 1 },
        tenants: { $sum: { $cond: [{ $eq: ['$role', 'tenant'] }, 1, 0] } },
        landlords: { $sum: { $cond: [{ $eq: ['$role', 'landlord'] }, 1, 0] } },
        admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
        verified: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } }
      }}
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      data: users,
      stats: stats[0] || {},
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

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash -refreshToken')
      .populate('verificationDocuments.verifiedBy', 'name');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user activity
    const [properties, bookings, inquiries, reviews] = await Promise.all([
      Property.countDocuments({ landlordId: user._id }),
      Booking.countDocuments({ $or: [{ tenantId: user._id }, { landlordId: user._id }] }),
      Inquiry.countDocuments({ $or: [{ tenantId: user._id }, { landlordId: user._id }] }),
      Review.countDocuments({ $or: [{ tenantId: user._id }, { landlordId: user._id }] })
    ]);

    // Get recent activity
    const recentActivity = await Booking.find({ $or: [{ tenantId: user._id }, { landlordId: user._id }] })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('propertyId', 'title');

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          properties,
          bookings,
          inquiries,
          reviews
        },
        recentActivity
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify landlord
// @route   PUT /api/admin/users/:id/verify
// @access  Private (Admin)
const verifyLandlord = async (req, res, next) => {
  try {
    const { verified, notes } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'landlord') {
      return res.status(400).json({
        success: false,
        message: 'User is not a landlord'
      });
    }

    user.isVerified = verified;
    user.verificationLevel = verified ? 'verified' : 'none';
    user.meta.notes = notes || user.meta.notes;
    user.meta.lastUpdatedBy = req.user.id;

    // Update verification documents
    if (verified && user.verificationDocuments && user.verificationDocuments.length > 0) {
      user.verificationDocuments.forEach(doc => {
        doc.verified = true;
        doc.verifiedAt = new Date();
        doc.verifiedBy = req.user.id;
      });
    }

    await user.save();

    // Send notification
    await notificationService.createNotification(user._id, verified ? 'verification_approved' : 'verification_rejected', {
      reason: notes
    });

    // Send email
    if (verified) {
      await emailService.sendVerificationApprovedEmail(user);
    } else {
      await emailService.sendVerificationRejectedEmail(user, notes);
    }

    res.status(200).json({
      success: true,
      message: verified ? 'Landlord verified successfully' : 'Landlord verification rejected',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
const updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, role, status, preferences, notes } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (status) user.status = status;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    if (notes) user.meta.notes = notes;

    user.meta.lastUpdatedBy = req.user.id;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow deleting yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Soft delete - deactivate account
    user.status = 'deactivated';
    user.deactivatedAt = new Date();
    user.meta.lastUpdatedBy = req.user.id;
    await user.save();

    // Also deactivate user's properties
    await Property.updateMany(
      { landlordId: user._id },
      { status: 'archived' }
    );

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending properties
// @route   GET /api/admin/properties/pending
// @access  Private (Admin)
const getPendingProperties = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [properties, total] = await Promise.all([
      Property.find({ status: 'pending' })
        .populate('landlordId', 'name email phone isVerified')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Property.countDocuments({ status: 'pending' })
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

// @desc    Approve property
// @route   PUT /api/admin/properties/:id/approve
// @access  Private (Admin)
const approveProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id).populate('landlordId');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    property.status = 'available';
    property.verifiedAt = new Date();
    property.verifiedBy = req.user.id;
    property.verificationStatus = 'verified';
    await property.save();

    // Update landlord stats
    await User.findByIdAndUpdate(property.landlordId._id, {
      $inc: { 'stats.activeListings': 1 }
    });

    // Send notification to landlord
    await notificationService.createNotification(property.landlordId._id, 'property_approved', {
      propertyTitle: property.title,
      propertyId: property._id
    });

    // Send email
    await emailService.sendPropertyApprovedEmail(property, property.landlordId);

    res.status(200).json({
      success: true,
      message: 'Property approved successfully',
      data: property
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject property
// @route   PUT /api/admin/properties/:id/reject
// @access  Private (Admin)
const rejectProperty = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const property = await Property.findById(req.params.id).populate('landlordId');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    property.status = 'rejected';
    property.rejectionReason = reason;
    property.verifiedAt = new Date();
    property.verifiedBy = req.user.id;
    property.verificationStatus = 'rejected';
    await property.save();

    // Send notification to landlord
    await notificationService.createNotification(property.landlordId._id, 'property_rejected', {
      propertyTitle: property.title,
      propertyId: property._id,
      reason
    });

    // Send email
    await emailService.sendPropertyRejectedEmail(property, property.landlordId, reason);

    res.status(200).json({
      success: true,
      message: 'Property rejected',
      data: property
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reports
// @route   GET /api/admin/reports
// @access  Private (Admin)
const getReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, priority } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('reporterId', 'name email')
        .populate('assignedTo', 'name email')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Report.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: reports.length,
      total,
      data: reports,
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

// @desc    Get system statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getSystemStats = async (req, res, next) => {
  try {
    const [
      userStats,
      propertyStats,
      bookingStats,
      inquiryStats,
      reviewStats,
      reportStats,
      recentActivity
    ] = await Promise.all([
      // User statistics
      User.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          tenants: { $sum: { $cond: [{ $eq: ['$role', 'tenant'] }, 1, 0] } },
          landlords: { $sum: { $cond: [{ $eq: ['$role', 'landlord'] }, 1, 0] } },
          admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
          verified: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          newToday: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          }
        }}
      ]),

      // Property statistics
      Property.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          rented: { $sum: { $cond: [{ $eq: ['$status', 'rented'] }, 1, 0] } },
          featured: { $sum: { $cond: [{ $eq: ['$featured', true] }, 1, 0] } },
          avgPrice: { $avg: '$price' },
          totalViews: { $sum: '$metrics.views' }
        }}
      ]),

      // Booking statistics
      Booking.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          totalRevenue: { $sum: '$priceDetails.totalPrice' }
        }}
      ]),

      // Inquiry statistics
      Inquiry.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
          replied: { $sum: { $cond: [{ $eq: ['$status', 'replied'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } }
        }}
      ]),

      // Review statistics
      Review.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$moderationStatus', 'pending'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$moderationStatus', 'approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$moderationStatus', 'rejected'] }, 1, 0] } },
          avgRating: { $avg: '$ratings.overall' }
        }}
      ]),

      // Report statistics
      Report.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          reviewing: { $sum: { $cond: [{ $eq: ['$status', 'reviewing'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
        }}
      ]),

      // Recent activity (last 10 actions)
      Promise.all([
        Property.find().sort({ createdAt: -1 }).limit(3).select('title createdAt'),
        Booking.find().sort({ createdAt: -1 }).limit(3).populate('propertyId', 'title'),
        User.find().sort({ createdAt: -1 }).limit(3).select('name email role createdAt')
      ]).then(([properties, bookings, users]) => ({
        properties,
        bookings,
        users
      }))
    ]);

    // District distribution
    const districtDistribution = await Property.aggregate([
      { $match: { status: 'available' } },
      { $group: {
        _id: '$location.district',
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' }
      }},
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: userStats[0] || {},
        properties: propertyStats[0] || {},
        bookings: bookingStats[0] || {},
        inquiries: inquiryStats[0] || {},
        reviews: reviewStats[0] || {},
        reports: reportStats[0] || {},
        districtDistribution,
        recentActivity
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Moderate review
// @route   PUT /api/admin/reviews/:id/moderate
// @access  Private (Admin)
const moderateReview = async (req, res, next) => {
  try {
    const { status, notes } = req.body;

    const review = await Review.findById(req.params.id)
      .populate('propertyId')
      .populate('tenantId');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await review.moderate(status, notes, req.user.id);

    // Update property rating if approved
    if (status === 'approved') {
      const property = await Property.findById(review.propertyId);
      await property.updateRating();
    }

    // Notify tenant
    await notificationService.createNotification(review.tenantId._id, status === 'approved' ? 'review_approved' : 'review_rejected', {
      propertyTitle: review.propertyId.title,
      reviewId: review._id,
      reason: notes
    });

    // Send email
    if (status === 'approved') {
      await emailService.sendReviewApprovedEmail(review, review.tenantId);
    } else {
      await emailService.sendReviewRejectedEmail(review, review.tenantId, notes);
    }

    res.status(200).json({
      success: true,
      message: `Review ${status}`,
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle featured property
// @route   PUT /api/admin/properties/:id/feature
// @access  Private (Admin)
const toggleFeatured = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    property.featured = !property.featured;
    property.featuredUntil = property.featured 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : null;
    
    await property.save();

    // Notify landlord
    await notificationService.createNotification(property.landlordId, property.featured ? 'property_featured' : 'property_unfeatured', {
      propertyTitle: property.title,
      propertyId: property._id
    });

    res.status(200).json({
      success: true,
      message: property.featured ? 'Property featured' : 'Property unfeatured',
      data: { featured: property.featured }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (Admin)
const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, userId, action } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // This would typically come from an AuditLog model
    // For now, return placeholder
    const logs = [];

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system health
// @route   GET /api/admin/health
// @access  Private (Admin)
const getSystemHealth = async (req, res, next) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      database: 'connected',
      redis: process.env.REDIS_ENABLED === 'true' ? 'connected' : 'disabled',
      services: {
        email: 'operational',
        socket: 'operational'
      }
    };

    res.status(200).json({
      success: true,
      data: health
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send system notification
// @route   POST /api/admin/notifications
// @access  Private (Admin)
const sendSystemNotification = async (req, res, next) => {
  try {
    const { title, message, type, targetUsers, priority } = req.body;

    let userIds = [];

    if (targetUsers === 'all') {
      const users = await User.find({ status: 'active' }).select('_id');
      userIds = users.map(u => u._id);
    } else if (targetUsers === 'landlords') {
      const users = await User.find({ role: 'landlord', status: 'active' }).select('_id');
      userIds = users.map(u => u._id);
    } else if (targetUsers === 'tenants') {
      const users = await User.find({ role: 'tenant', status: 'active' }).select('_id');
      userIds = users.map(u => u._id);
    } else if (Array.isArray(targetUsers)) {
      userIds = targetUsers;
    }

    // Create notifications
    await Notification.createBulkNotifications(userIds, 'system', {
      title,
      message,
      priority: priority || 'medium',
      data: { adminId: req.user.id }
    });

    res.status(200).json({
      success: true,
      message: `Notification sent to ${userIds.length} users`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export data
// @route   GET /api/admin/export/:type
// @access  Private (Admin)
const exportData = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;

    let data = [];
    let filename = '';

    switch (type) {
      case 'users':
        data = await User.find().select('-passwordHash -refreshToken -twoFactorSecret');
        filename = 'users_export';
        break;
      case 'properties':
        data = await Property.find().populate('landlordId', 'name email');
        filename = 'properties_export';
        break;
      case 'bookings':
        data = await Booking.find()
          .populate('propertyId', 'title')
          .populate('tenantId', 'name email')
          .populate('landlordId', 'name email');
        filename = 'bookings_export';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }

    if (format === 'csv') {
      // Convert to CSV
      const json2csv = require('json2csv').parse;
      const csv = json2csv(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
      return res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.json`);
      return res.json(data);
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  verifyLandlord,
  updateUser,
  deleteUser,
  getPendingProperties,
  approveProperty,
  rejectProperty,
  getReports,
  getSystemStats,
  moderateReview,
  toggleFeatured,
  getAuditLogs,
  getSystemHealth,
  sendSystemNotification,
  exportData
};