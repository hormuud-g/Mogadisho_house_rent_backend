const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/User');
const Review = require('../models/Review');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private (Tenant)
const createBooking = async (req, res, next) => {
  try {
    const { propertyId, checkIn, checkOut, guests, specialRequests } = req.body;

    // Get property
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check property availability
    if (property.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Property is not available for booking'
      });
    }

    // Check if tenant is trying to book own property
    if (property.landlordId.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot book your own property'
      });
    }

    // Check availability for dates
    const isAvailable = await property.isAvailableForDates(checkIn, checkOut);
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Property is not available for the selected dates'
      });
    }

    // Calculate nights and price
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const totalNights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    
    // Validate minimum/maximum stay
    if (totalNights < property.availability.minimumStay) {
      return res.status(400).json({
        success: false,
        message: `Minimum stay is ${property.availability.minimumStay} nights`
      });
    }
    
    if (totalNights > property.availability.maximumStay) {
      return res.status(400).json({
        success: false,
        message: `Maximum stay is ${property.availability.maximumStay} nights`
      });
    }

    const totalPrice = totalNights * property.price;

    // Get landlord
    const landlord = await User.findById(property.landlordId);

    // Create booking
    const booking = await Booking.create({
      propertyId,
      tenantId: req.user.id,
      landlordId: property.landlordId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      totalNights,
      priceDetails: {
        nightlyRate: property.price,
        totalNights,
        subtotal: totalPrice,
        cleaningFee: property.cleaningFee || 0,
        securityDeposit: property.securityDeposit || 0,
        totalPrice: totalPrice + (property.cleaningFee || 0)
      },
      specialRequests,
      guestDetails: {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone
      },
      status: 'pending'
    });

    // Update property metrics
    property.metrics.bookings += 1;
    await property.save();

    // Send notifications
    await notificationService.createNotification(landlord._id, 'booking_request', {
      propertyTitle: property.title,
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      tenantName: req.user.name,
      checkIn: checkInDate.toLocaleDateString(),
      checkOut: checkOutDate.toLocaleDateString()
    });

    // Send emails
    await emailService.sendBookingRequestEmail(booking, property, req.user, landlord);

    res.status(201).json({
      success: true,
      message: 'Booking request sent successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user bookings
// @route   GET /api/bookings
// @access  Private
const getUserBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, role = 'tenant' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { 
      [role === 'landlord' ? 'landlordId' : 'tenantId']: req.user.id 
    };
    
    if (status) {
      query.status = status;
    }

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('propertyId', 'title images location price type')
        .populate('tenantId', 'name email phone profileImage')
        .populate('landlordId', 'name email phone profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(query)
    ]);

    // Get upcoming and past counts
    const now = new Date();
    const upcoming = await Booking.countDocuments({
      ...query,
      checkIn: { $gt: now },
      status: { $in: ['pending', 'confirmed'] }
    });
    
    const past = await Booking.countDocuments({
      ...query,
      checkOut: { $lt: now },
      status: 'completed'
    });

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      data: bookings,
      counts: {
        upcoming,
        past,
        total
      },
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

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('propertyId')
      .populate('tenantId', 'name email phone profileImage')
      .populate('landlordId', 'name email phone profileImage');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (booking.tenantId._id.toString() !== req.user.id && 
        booking.landlordId._id.toString() !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    // Check if review exists
    let review = null;
    if (booking.status === 'completed' && booking.tenantId._id.toString() === req.user.id) {
      review = await Review.findOne({ bookingId: booking._id });
    }

    res.status(200).json({
      success: true,
      data: booking,
      review: review ? { id: review._id, submitted: true } : { submitted: false }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private (Tenant/Landlord/Admin)
const cancelBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id)
      .populate('propertyId')
      .populate('tenantId')
      .populate('landlordId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (booking.tenantId._id.toString() !== req.user.id && 
        booking.landlordId._id.toString() !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    // Check if booking can be cancelled
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel booking with status: ${booking.status}`
      });
    }

    // Update booking
    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledAt = new Date();
    booking.cancelledBy = req.user.id;
    await booking.save();

    // Determine who to notify
    const notifyUser = booking.tenantId._id.toString() === req.user.id 
      ? booking.landlordId 
      : booking.tenantId;

    // Send notifications
    await notificationService.createNotification(notifyUser._id, 'booking_cancelled', {
      bookingNumber: booking.bookingNumber,
      propertyTitle: booking.propertyId.title,
      bookingId: booking._id,
      reason: reason
    });

    // Send email
    await emailService.sendBookingCancelledEmail(
      booking, 
      booking.propertyId, 
      notifyUser, 
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm booking
// @route   PUT /api/bookings/:id/confirm
// @access  Private (Landlord)
const confirmBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('propertyId')
      .populate('tenantId')
      .populate('landlordId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (booking.landlordId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to confirm this booking'
      });
    }

    // Check if booking can be confirmed
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm booking with status: ${booking.status}`
      });
    }

    // Update booking
    booking.status = 'confirmed';
    booking.confirmedAt = new Date();
    booking.confirmedBy = req.user.id;
    await booking.save();

    // Update property metrics
    await Property.findByIdAndUpdate(booking.propertyId._id, {
      $inc: { 'metrics.completedBookings': 1 }
    });

    // Notify tenant
    await notificationService.createNotification(booking.tenantId._id, 'booking_confirmed', {
      propertyTitle: booking.propertyId.title,
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      checkIn: booking.checkIn.toLocaleDateString(),
      checkOut: booking.checkOut.toLocaleDateString()
    });

    // Send email
    await emailService.sendBookingConfirmedEmail(booking, booking.propertyId, booking.tenantId);

    res.status(200).json({
      success: true,
      message: 'Booking confirmed successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete booking
// @route   PUT /api/bookings/:id/complete
// @access  Private (Landlord)
const completeBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (booking.landlordId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this booking'
      });
    }

    // Check if booking can be completed
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Cannot complete booking with status: ${booking.status}`
      });
    }

    // Check if check-out date has passed
    const now = new Date();
    if (booking.checkOut > now) {
      return res.status(400).json({
        success: false,
        message: 'Cannot complete booking before check-out date'
      });
    }

    // Update booking
    booking.status = 'completed';
    booking.completedAt = new Date();
    await booking.save();

    // Notify tenant
    await notificationService.createNotification(booking.tenantId, 'booking_completed', {
      propertyTitle: booking.propertyId?.title || 'Property',
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber
    });

    res.status(200).json({
      success: true,
      message: 'Booking completed successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get booking calendar
// @route   GET /api/bookings/calendar
// @access  Private (Landlord)
const getBookingCalendar = async (req, res, next) => {
  try {
    const { month, year, propertyId } = req.query;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const query = {
      landlordId: req.user.id,
      $or: [
        { checkIn: { $gte: startDate, $lte: endDate } },
        { checkOut: { $gte: startDate, $lte: endDate } }
      ],
      status: { $in: ['confirmed', 'completed'] }
    };

    if (propertyId) {
      query.propertyId = propertyId;
    }

    const bookings = await Booking.find(query)
      .populate('propertyId', 'title images')
      .populate('tenantId', 'name')
      .sort({ checkIn: 1 });

    // Group by date
    const calendar = {};
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      calendar[dateStr] = {
        date: new Date(d),
        bookings: []
      };
    }

    bookings.forEach(booking => {
      const checkInStr = booking.checkIn.toISOString().split('T')[0];
      const checkOutStr = booking.checkOut.toISOString().split('T')[0];
      
      if (calendar[checkInStr]) {
        calendar[checkInStr].bookings.push({
          ...booking.toObject(),
          type: 'check-in'
        });
      }
      
      if (calendar[checkOutStr]) {
        calendar[checkOutStr].bookings.push({
          ...booking.toObject(),
          type: 'check-out'
        });
      }
    });

    res.status(200).json({
      success: true,
      data: Object.values(calendar)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark no-show
// @route   PUT /api/bookings/:id/no-show
// @access  Private (Landlord)
const markNoShow = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (booking.landlordId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    // Check if booking can be marked as no-show
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Cannot mark as no-show booking with status: ${booking.status}`
      });
    }

    // Check if check-in date has passed
    const now = new Date();
    if (booking.checkIn > now) {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark as no-show before check-in date'
      });
    }

    // Update booking
    booking.status = 'no_show';
    booking.timeline.push({
      status: 'no_show',
      note: 'Tenant did not show up',
      updatedBy: req.user.id
    });
    await booking.save();

    // Notify tenant
    await notificationService.createNotification(booking.tenantId, 'booking_no_show', {
      propertyTitle: booking.propertyId?.title || 'Property',
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber
    });

    res.status(200).json({
      success: true,
      message: 'Booking marked as no-show',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add message to booking
// @route   POST /api/bookings/:id/messages
// @access  Private
const addBookingMessage = async (req, res, next) => {
  try {
    const { message } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (booking.tenantId.toString() !== req.user.id && 
        booking.landlordId.toString() !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to message on this booking'
      });
    }

    await booking.addMessage(req.user.id, message);

    // Notify the other party
    const notifyUserId = req.user.id === booking.tenantId.toString() 
      ? booking.landlordId 
      : booking.tenantId;

    await notificationService.createNotification(notifyUserId, 'booking_message', {
      bookingNumber: booking.bookingNumber,
      bookingId: booking._id,
      senderName: req.user.name
    });

    res.status(200).json({
      success: true,
      message: 'Message added successfully',
      data: booking.messages[booking.messages.length - 1]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get booking statistics
// @route   GET /api/bookings/stats
// @access  Private (Landlord/Admin)
const getBookingStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const matchStage = role === 'landlord' 
      ? { landlordId: mongoose.Types.ObjectId(userId) }
      : {};

    const stats = await Booking.aggregate([
      { $match: matchStage },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        noShow: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
        totalRevenue: { $sum: '$priceDetails.totalPrice' }
      }}
    ]);

    // Get monthly trends
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trends = await Booking.aggregate([
      { $match: { 
        ...matchStage,
        createdAt: { $gte: thirtyDaysAgo }
      }},
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        revenue: { $sum: '$priceDetails.totalPrice' }
      }},
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: stats[0] || {
          total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0, totalRevenue: 0
        },
        trends
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getBooking,
  cancelBooking,
  confirmBooking,
  completeBooking,
  getBookingCalendar,
  markNoShow,
  addBookingMessage,
  getBookingStats
};