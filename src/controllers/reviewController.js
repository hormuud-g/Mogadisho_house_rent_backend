const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

// @desc    Create review
// @route   POST /api/properties/:propertyId/reviews
// @access  Private (Tenant)
const createReview = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { ratings, title, comment, pros, cons } = req.body;

    // Check if user has a completed booking for this property
    const booking = await Booking.findOne({
      propertyId,
      tenantId: req.user.id,
      status: 'completed'
    });

    if (!booking) {
      return res.status(403).json({
        success: false,
        message: 'You can only review properties you have booked and completed'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      propertyId,
      tenantId: req.user.id,
      bookingId: booking._id
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this property'
      });
    }

    // Get property and landlord
    const property = await Property.findById(propertyId);
    const landlord = await User.findById(property.landlordId);

    // Create review
    const review = await Review.create({
      propertyId,
      tenantId: req.user.id,
      bookingId: booking._id,
      landlordId: property.landlordId,
      ratings,
      title: title || 'Review',
      comment,
      pros: pros || [],
      cons: cons || [],
      moderationStatus: 'pending'
    });

    // Update booking
    booking.reviewSubmitted = true;
    booking.reviewId = review._id;
    await booking.save();

    // Update property metrics
    await property.updateRating();

    // Update user review count
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.totalReviews': 1 }
    });

    // Notify landlord
    await notificationService.createNotification(landlord._id, 'review_received', {
      propertyTitle: property.title,
      reviewId: review._id,
      rating: ratings.overall,
      comment: comment.substring(0, 100),
      tenantName: req.user.name
    });

    // Send email
    await emailService.sendReviewReceivedEmail(review, property, landlord, req.user);

    // Notify admins for moderation
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await notificationService.createNotification(admin._id, 'review_flagged', {
        propertyTitle: property.title,
        reviewId: review._id,
        tenantName: req.user.name,
        action: 'pending_moderation'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully and pending moderation',
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get property reviews
// @route   GET /api/properties/:propertyId/reviews
// @access  Public
const getPropertyReviews = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'highest') {
      sortOption = { 'ratings.overall': -1 };
    } else if (sort === 'lowest') {
      sortOption = { 'ratings.overall': 1 };
    } else if (sort === 'helpful') {
      sortOption = { 'helpful.count': -1 };
    }

    const reviews = await Review.getPropertyReviews(propertyId, page, limit, sortOption);

    // Get rating distribution
    const distribution = await Review.getRatingDistribution(propertyId);

    // Get statistics
    const stats = await Review.getReviewStats(propertyId);

    res.status(200).json({
      success: true,
      data: reviews.reviews,
      stats,
      distribution,
      pagination: reviews.pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private (Tenant)
const updateReview = async (req, res, next) => {
  try {
    const { ratings, title, comment, pros, cons } = req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check ownership
    if (review.tenantId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    // Update fields
    if (ratings) review.ratings = ratings;
    if (title) review.title = title;
    if (comment) review.comment = comment;
    if (pros) review.pros = pros;
    if (cons) review.cons = cons;

    // Reset moderation status if updated by tenant
    if (review.tenantId.toString() === req.user.id) {
      review.moderationStatus = 'pending';
    }

    await review.save();

    // Update property rating
    const property = await Property.findById(review.propertyId);
    await property.updateRating();

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private (Tenant/Admin)
const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check ownership
    if (review.tenantId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    const propertyId = review.propertyId;
    await review.deleteOne();

    // Update property rating
    const property = await Property.findById(propertyId);
    await property.updateRating();

    // Update user review count
    await User.findByIdAndUpdate(review.tenantId, {
      $inc: { 'stats.totalReviews': -1 }
    });

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
const markHelpful = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user is trying to mark their own review
    if (review.tenantId.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot mark your own review as helpful'
      });
    }

    await review.markHelpful(req.user.id);

    // Notify review author if they have notifications enabled
    const author = await User.findById(review.tenantId);
    if (author?.preferences?.notifications?.push) {
      await notificationService.createNotification(author._id, 'review_helpful', {
        propertyTitle: (await Property.findById(review.propertyId)).title,
        reviewId: review._id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Review marked as helpful',
      data: {
        helpful: review.helpful,
        notHelpful: review.notHelpful
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark review as not helpful
// @route   POST /api/reviews/:id/not-helpful
// @access  Private
const markNotHelpful = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user is trying to mark their own review
    if (review.tenantId.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot mark your own review'
      });
    }

    await review.markNotHelpful(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Review marked as not helpful',
      data: {
        helpful: review.helpful,
        notHelpful: review.notHelpful
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reply to review (landlord only)
// @route   POST /api/reviews/:id/reply
// @access  Private (Landlord)
const replyToReview = async (req, res, next) => {
  try {
    const { comment } = req.body;

    const review = await Review.findById(req.params.id)
      .populate('propertyId')
      .populate('tenantId');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user is the landlord of this property
    if (review.propertyId.landlordId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the property landlord can reply to reviews'
      });
    }

    await review.addLandlordReply(comment, req.user.id);

    // Notify tenant
    await notificationService.createNotification(review.tenantId._id, 'review_replied', {
      propertyTitle: review.propertyId.title,
      reviewId: review._id,
      landlordName: req.user.name,
      reply: comment
    });

    // Send email
    await emailService.sendReviewReplyEmail(review, review.propertyId, req.user, review.tenantId, comment);

    res.status(200).json({
      success: true,
      message: 'Reply added successfully',
      data: review.landlordReply
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Report review
// @route   POST /api/reviews/:id/report
// @access  Private
const reportReview = async (req, res, next) => {
  try {
    const { reason, description } = req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user is trying to report their own review
    if (review.tenantId.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report your own review'
      });
    }

    await review.report(reason, description, req.user.id);

    // Create report in Report model
    const Report = require('../models/Report');
    await Report.create({
      reporterId: req.user.id,
      reportedItemId: review._id,
      reportedItemType: 'Review',
      reason,
      description,
      priority: 'medium',
      status: 'pending'
    });

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await notificationService.createNotification(admin._id, 'report_received', {
        itemType: 'Review',
        reportId: review._id,
        reason
      });
    }

    res.status(200).json({
      success: true,
      message: 'Review reported successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getPropertyReviews,
  updateReview,
  deleteReview,
  markHelpful,
  markNotHelpful,
  replyToReview,
  reportReview
};