const Inquiry = require('../models/Inquiry');
const Property = require('../models/Property');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

// @desc    Create inquiry
// @route   POST /api/inquiries
// @access  Private (Tenant)
const createInquiry = async (req, res, next) => {
  try {
    const { propertyId, subject, message, category } = req.body;

    // Get property
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if tenant is trying to inquire about own property
    if (property.landlordId.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot inquire about your own property'
      });
    }

    // Get landlord
    const landlord = await User.findById(property.landlordId);

    // Create inquiry
    const inquiry = await Inquiry.create({
      propertyId,
      tenantId: req.user.id,
      landlordId: property.landlordId,
      subject,
      message,
      category: category || 'general',
      status: 'new'
    });

    // Update property metrics
    property.metrics.inquiries += 1;
    await property.save();

    // Send notifications
    await notificationService.createNotification(landlord._id, 'inquiry_received', {
      propertyTitle: property.title,
      inquiryId: inquiry._id,
      inquiryNumber: inquiry.inquiryNumber,
      tenantName: req.user.name,
      message: inquiry.message
    });

    // Send email
    await emailService.sendInquiryReceivedEmail(inquiry, property, req.user, landlord);

    res.status(201).json({
      success: true,
      message: 'Inquiry sent successfully',
      data: inquiry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user inquiries
// @route   GET /api/inquiries
// @access  Private
const getUserInquiries = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, role = 'tenant' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      [role === 'landlord' ? 'landlordId' : 'tenantId']: req.user.id
    };

    if (status) {
      query.status = status;
    }

    const [inquiries, total] = await Promise.all([
      Inquiry.find(query)
        .populate('propertyId', 'title images location price type')
        .populate('tenantId', 'name email profileImage')
        .populate('landlordId', 'name email profileImage')
        .populate('lastRepliedBy', 'name')
        .sort({ lastRepliedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Inquiry.countDocuments(query)
    ]);

    // Get unread count
    const unreadCount = inquiries.reduce((count, inquiry) => {
      const lastReply = inquiry.replies[inquiry.replies.length - 1];
      if (lastReply && lastReply.senderId.toString() !== req.user.id && !lastReply.isRead) {
        return count + 1;
      }
      return count;
    }, 0);

    res.status(200).json({
      success: true,
      count: inquiries.length,
      total,
      unreadCount,
      data: inquiries,
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

// @desc    Get single inquiry
// @route   GET /api/inquiries/:id
// @access  Private
const getInquiry = async (req, res, next) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
      .populate('propertyId')
      .populate('tenantId', 'name email phone profileImage')
      .populate('landlordId', 'name email phone profileImage')
      .populate('replies.senderId', 'name role profileImage')
      .populate('firstResponseBy', 'name')
      .populate('lastRepliedBy', 'name')
      .populate('escalatedTo', 'name');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Check authorization
    if (inquiry.tenantId._id.toString() !== req.user.id &&
        inquiry.landlordId._id.toString() !== req.user.id &&
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this inquiry'
      });
    }

    // Mark as read if viewing as recipient
    if (inquiry.landlordId._id.toString() === req.user.id && inquiry.status === 'new') {
      await inquiry.markAsRead();
    }

    // Mark replies as read
    let updated = false;
    inquiry.replies.forEach(reply => {
      if (reply.senderId._id.toString() !== req.user.id && !reply.isRead) {
        reply.isRead = true;
        reply.readAt = new Date();
        updated = true;
      }
    });

    if (updated) {
      await inquiry.save();
    }

    res.status(200).json({
      success: true,
      data: inquiry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reply to inquiry
// @route   POST /api/inquiries/:id/reply
// @access  Private (Landlord/Tenant)
const replyToInquiry = async (req, res, next) => {
  try {
    const { message } = req.body;

    const inquiry = await Inquiry.findById(req.params.id)
      .populate('propertyId')
      .populate('tenantId')
      .populate('landlordId');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Check authorization
    const isTenant = inquiry.tenantId._id.toString() === req.user.id;
    const isLandlord = inquiry.landlordId._id.toString() === req.user.id;

    if (!isTenant && !isLandlord && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reply to this inquiry'
      });
    }

    // Check if inquiry is closed
    if (inquiry.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reply to a closed inquiry'
      });
    }

    // Determine sender role
    const senderRole = isLandlord ? 'landlord' : (isTenant ? 'tenant' : 'admin');

    // Add reply
    await inquiry.addReply(req.user.id, message, [], senderRole);

    // Determine recipient
    const recipientId = isLandlord 
      ? inquiry.tenantId._id 
      : (isTenant ? inquiry.landlordId._id : (inquiry.tenantId._id.toString() === req.user.id ? inquiry.landlordId._id : inquiry.tenantId._id));

    // Send notification
    await notificationService.createNotification(recipientId, 'inquiry_replied', {
      propertyTitle: inquiry.propertyId.title,
      inquiryId: inquiry._id,
      inquiryNumber: inquiry.inquiryNumber,
      senderName: req.user.name,
      reply: message
    });

    // Send email
    await emailService.sendInquiryReplyEmail(inquiry, inquiry.propertyId, {
      message,
      senderName: req.user.name
    }, await User.findById(recipientId));

    res.status(200).json({
      success: true,
      message: 'Reply sent successfully',
      data: inquiry.replies[inquiry.replies.length - 1]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Close inquiry
// @route   PUT /api/inquiries/:id/close
// @access  Private
const closeInquiry = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Check authorization (both parties can close)
    if (inquiry.tenantId.toString() !== req.user.id &&
        inquiry.landlordId.toString() !== req.user.id &&
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to close this inquiry'
      });
    }

    await inquiry.close(req.user.id, reason);

    // Notify the other party
    const notifyUserId = req.user.id === inquiry.tenantId.toString()
      ? inquiry.landlordId
      : inquiry.tenantId;

    await notificationService.createNotification(notifyUserId, 'inquiry_closed', {
      inquiryNumber: inquiry.inquiryNumber,
      propertyTitle: (await Property.findById(inquiry.propertyId)).title,
      inquiryId: inquiry._id
    });

    res.status(200).json({
      success: true,
      message: 'Inquiry closed successfully',
      data: inquiry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Schedule viewing
// @route   POST /api/inquiries/:id/viewing
// @access  Private (Tenant)
const scheduleViewing = async (req, res, next) => {
  try {
    const { date, time, notes } = req.body;

    const inquiry = await Inquiry.findById(req.params.id)
      .populate('propertyId')
      .populate('landlordId');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Check authorization
    if (inquiry.tenantId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to schedule viewing for this inquiry'
      });
    }

    await inquiry.requestViewing([new Date(date)], [time], notes);

    // Notify landlord
    await notificationService.createNotification(inquiry.landlordId._id, 'viewing_scheduled', {
      propertyTitle: inquiry.propertyId.title,
      inquiryId: inquiry._id,
      tenantName: req.user.name,
      date: new Date(date).toLocaleDateString(),
      time
    });

    // Send email
    await emailService.sendViewingRequestEmail(inquiry, inquiry.propertyId, req.user, inquiry.landlordId, {
      date: new Date(date).toLocaleDateString(),
      time,
      notes
    });

    res.status(200).json({
      success: true,
      message: 'Viewing scheduled successfully',
      data: inquiry.viewingRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm viewing
// @route   PUT /api/inquiries/:id/viewing/confirm
// @access  Private (Landlord)
const confirmViewing = async (req, res, next) => {
  try {
    const { date, time } = req.body;

    const inquiry = await Inquiry.findById(req.params.id)
      .populate('propertyId')
      .populate('tenantId');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Check authorization
    if (inquiry.landlordId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to confirm viewing for this inquiry'
      });
    }

    await inquiry.scheduleViewing(date, time, req.user.id);

    // Notify tenant
    await notificationService.createNotification(inquiry.tenantId._id, 'viewing_confirmed', {
      propertyTitle: inquiry.propertyId.title,
      inquiryId: inquiry._id,
      date: new Date(date).toLocaleDateString(),
      time
    });

    res.status(200).json({
      success: true,
      message: 'Viewing confirmed successfully',
      data: inquiry.viewingRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete viewing
// @route   PUT /api/inquiries/:id/viewing/complete
// @access  Private (Tenant)
const completeViewing = async (req, res, next) => {
  try {
    const { feedback } = req.body;

    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Check authorization
    if (inquiry.tenantId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete viewing for this inquiry'
      });
    }

    await inquiry.completeViewing(feedback);

    res.status(200).json({
      success: true,
      message: 'Viewing completed successfully',
      data: inquiry.viewingRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Rate inquiry response
// @route   POST /api/inquiries/:id/rate
// @access  Private (Tenant)
const rateInquiry = async (req, res, next) => {
  try {
    const { responseTime, helpfulness, comment } = req.body;

    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Check authorization
    if (inquiry.tenantId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to rate this inquiry'
      });
    }

    await inquiry.rate(responseTime, helpfulness, comment);

    // Update landlord's response rate stats
    const landlord = await User.findById(inquiry.landlordId);
    if (landlord) {
      const inquiries = await Inquiry.find({ 
        landlordId: inquiry.landlordId,
        'rating.helpfulness': { $exists: true }
      });
      
      const avgRating = inquiries.reduce((sum, i) => sum + (i.rating?.helpfulness || 0), 0) / inquiries.length;
      
      landlord.stats.responseRate = avgRating * 20; // Convert 1-5 to percentage
      await landlord.save();
    }

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully',
      data: inquiry.rating
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Escalate inquiry
// @route   POST /api/inquiries/:id/escalate
// @access  Private (Tenant/Admin)
const escalateInquiry = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Check authorization
    if (inquiry.tenantId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to escalate this inquiry'
      });
    }

    // Find an admin to escalate to
    const admin = await User.findOne({ role: 'admin' });

    await inquiry.escalate(reason, admin?._id);

    // Notify admin
    if (admin) {
      await notificationService.createNotification(admin._id, 'inquiry_escalated', {
        inquiryNumber: inquiry.inquiryNumber,
        inquiryId: inquiry._id,
        tenantName: (await User.findById(inquiry.tenantId)).name,
        reason
      });
    }

    res.status(200).json({
      success: true,
      message: 'Inquiry escalated successfully',
      data: inquiry
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInquiry,
  getUserInquiries,
  getInquiry,
  replyToInquiry,
  closeInquiry,
  scheduleViewing,
  confirmViewing,
  completeViewing,
  rateInquiry,
  escalateInquiry
};