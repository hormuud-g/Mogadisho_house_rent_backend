const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/User');

class BookingService {
  // Calculate booking price
  calculatePrice(property, checkIn, checkOut, guests = { adults: 1 }) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    const subtotal = property.price * nights;
    const cleaningFee = property.cleaningFee || 0;
    const securityDeposit = property.securityDeposit || 0;
    const serviceFee = Math.round(subtotal * 0.05); // 5% service fee
    const total = subtotal + cleaningFee + securityDeposit + serviceFee;

    return {
      nights,
      nightlyRate: property.price,
      subtotal,
      cleaningFee,
      securityDeposit,
      serviceFee,
      total,
      currency: 'USD'
    };
  }

  // Validate booking dates
  validateDates(checkIn, checkOut) {
    const now = new Date();
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Reset time part for accurate date comparison
    now.setHours(0, 0, 0, 0);
    checkInDate.setHours(0, 0, 0, 0);
    checkOutDate.setHours(0, 0, 0, 0);

    if (checkInDate < now) {
      return {
        valid: false,
        error: 'Check-in date cannot be in the past'
      };
    }

    if (checkOutDate <= checkInDate) {
      return {
        valid: false,
        error: 'Check-out date must be after check-in date'
      };
    }

    const maxDays = 365;
    const daysDiff = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > maxDays) {
      return {
        valid: false,
        error: `Maximum booking duration is ${maxDays} days`
      };
    }

    return { valid: true, nights: daysDiff };
  }

  // Check if property is available for dates
  async checkAvailability(propertyId, checkIn, checkOut, excludeBookingId = null) {
    try {
      const query = {
        propertyId,
        status: { $in: ['confirmed', 'pending'] },
        $or: [
          { checkIn: { $lt: checkOut, $gte: checkIn } },
          { checkOut: { $gt: checkIn, $lte: checkOut } },
          { checkIn: { $lte: checkIn }, checkOut: { $gte: checkOut } }
        ]
      };

      if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
      }

      const conflictingBooking = await Booking.findOne(query);
      return !conflictingBooking;
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }

  // Get unavailable dates for a property
  async getUnavailableDates(propertyId, months = 3) {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);

      const bookings = await Booking.find({
        propertyId,
        status: { $in: ['confirmed', 'pending'] },
        $or: [
          { checkIn: { $lte: endDate, $gte: startDate } },
          { checkOut: { $lte: endDate, $gte: startDate } }
        ]
      }).select('checkIn checkOut');

      const unavailableDates = [];
      bookings.forEach(booking => {
        let currentDate = new Date(booking.checkIn);
        while (currentDate <= booking.checkOut) {
          unavailableDates.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });

      return unavailableDates;
    } catch (error) {
      console.error('Error getting unavailable dates:', error);
      throw error;
    }
  }

  // Create booking
  async createBooking(bookingData) {
    try {
      const property = await Property.findById(bookingData.propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      // Validate dates
      const dateValidation = this.validateDates(bookingData.checkIn, bookingData.checkOut);
      if (!dateValidation.valid) {
        throw new Error(dateValidation.error);
      }

      // Check availability
      const isAvailable = await this.checkAvailability(
        bookingData.propertyId,
        bookingData.checkIn,
        bookingData.checkOut
      );

      if (!isAvailable) {
        throw new Error('Property not available for selected dates');
      }

      // Calculate price
      const priceDetails = this.calculatePrice(
        property,
        bookingData.checkIn,
        bookingData.checkOut,
        bookingData.guests
      );

      // Create booking
      const booking = await Booking.create({
        ...bookingData,
        totalNights: priceDetails.nights,
        priceDetails,
        status: 'pending'
      });

      // Update property metrics
      property.metrics.bookings += 1;
      await property.save();

      return booking;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  // Get booking calendar
  async getBookingCalendar(landlordId, year, month, propertyId = null) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const query = {
        landlordId,
        $or: [
          { checkIn: { $gte: startDate, $lte: endDate } },
          { checkOut: { $gte: startDate, $lte: endDate } }
        ],
        status: { $in: ['confirmed', 'pending'] }
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
          bookings: [],
          available: true
        };
      }

      bookings.forEach(booking => {
        let currentDate = new Date(booking.checkIn);
        while (currentDate <= booking.checkOut) {
          const dateStr = currentDate.toISOString().split('T')[0];
          if (calendar[dateStr]) {
            calendar[dateStr].bookings.push({
              id: booking._id,
              property: booking.propertyId,
              tenant: booking.tenantId,
              status: booking.status,
              checkIn: booking.checkIn,
              checkOut: booking.checkOut
            });
            calendar[dateStr].available = false;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });

      return Object.values(calendar);
    } catch (error) {
      console.error('Error getting booking calendar:', error);
      throw error;
    }
  }

  // Get booking statistics
  async getBookingStats(userId, role) {
    try {
      const matchStage = role === 'landlord' 
        ? { landlordId: mongoose.Types.ObjectId(userId) }
        : { tenantId: mongoose.Types.ObjectId(userId) };

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
          totalSpent: { $sum: '$priceDetails.total' },
          avgPrice: { $avg: '$priceDetails.total' }
        }}
      ]);

      // Get monthly trends
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const trends = await Booking.aggregate([
        { $match: { 
          ...matchStage,
          createdAt: { $gte: sixMonthsAgo }
        }},
        { $group: {
          _id: { 
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$priceDetails.total' }
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      // Get popular months
      const popularMonths = await Booking.aggregate([
        { $match: matchStage },
        { $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 }
        }},
        { $sort: { count: -1 } },
        { $limit: 3 }
      ]);

      return {
        summary: stats[0] || {
          total: 0, pending: 0, confirmed: 0, completed: 0, 
          cancelled: 0, noShow: 0, totalSpent: 0, avgPrice: 0
        },
        trends,
        popularMonths
      };
    } catch (error) {
      console.error('Error getting booking stats:', error);
      throw error;
    }
  }

  // Check for upcoming check-ins and send reminders
  async checkUpcomingCheckIns() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const bookings = await Booking.find({
        status: 'confirmed',
        checkIn: { $gte: tomorrow, $lt: dayAfterTomorrow }
      }).populate('tenantId propertyId');

      return bookings;
    } catch (error) {
      console.error('Error checking upcoming check-ins:', error);
      throw error;
    }
  }

  // Check for overdue check-outs
  async checkOverdueCheckOuts() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const bookings = await Booking.find({
        status: 'confirmed',
        checkOut: { $lt: today }
      }).populate('tenantId propertyId landlordId');

      return bookings;
    } catch (error) {
      console.error('Error checking overdue check-outs:', error);
      throw error;
    }
  }

  // Auto-expire pending bookings
  async expirePendingBookings(hours = 48) {
    try {
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() - hours);

      const result = await Booking.updateMany(
        {
          status: 'pending',
          createdAt: { $lt: expiryDate }
        },
        {
          status: 'expired',
          $push: {
            timeline: {
              status: 'expired',
              note: 'Booking expired due to no response',
              timestamp: new Date()
            }
          }
        }
      );

      return result;
    } catch (error) {
      console.error('Error expiring pending bookings:', error);
      throw error;
    }
  }

  // Get booking conflicts
  async getBookingConflicts(propertyId, checkIn, checkOut) {
    try {
      const conflicts = await Booking.find({
        propertyId,
        status: { $in: ['confirmed', 'pending'] },
        $or: [
          { checkIn: { $lt: checkOut, $gte: checkIn } },
          { checkOut: { $gt: checkIn, $lte: checkOut } },
          { checkIn: { $lte: checkIn }, checkOut: { $gte: checkOut } }
        ]
      }).populate('tenantId', 'name');

      return conflicts;
    } catch (error) {
      console.error('Error getting booking conflicts:', error);
      throw error;
    }
  }

  // Calculate occupancy rate
  async calculateOccupancyRate(propertyId, months = 6) {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      
      const endDate = new Date();

      const bookings = await Booking.find({
        propertyId,
        status: 'completed',
        checkOut: { $gte: startDate, $lte: endDate }
      });

      let totalNights = 0;
      bookings.forEach(booking => {
        const nights = Math.ceil((booking.checkOut - booking.checkIn) / (1000 * 60 * 60 * 24));
        totalNights += nights;
      });

      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const occupancyRate = (totalNights / totalDays) * 100;

      return {
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        totalNights,
        totalDays,
        bookingCount: bookings.length
      };
    } catch (error) {
      console.error('Error calculating occupancy rate:', error);
      throw error;
    }
  }
}

module.exports = new BookingService();