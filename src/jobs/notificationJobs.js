const cron = require('node-cron');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Property = require('../models/Property');
const notificationService = require('../services/notificationService');
const { logger } = require('../middleware/logger');

class NotificationJobs {
  constructor() {
    this.jobs = [];
  }

  // Initialize all notification jobs
  initialize() {
    this.sendCheckInReminders();
    this.sendCheckOutReminders();
    this.sendBookingReminders();
    this.sendViewingReminders();
    this.sendUnreadInquiryReminders();
    this.sendPriceDropAlerts();
    this.sendPropertyExpiryWarnings();
    this.cleanupOldNotifications();
    
    logger.info('✅ Notification jobs initialized');
  }

  // Send check-in reminders (24 hours before)
  sendCheckInReminders() {
    const job = cron.schedule('0 8 * * *', async () => { // Run at 8 AM daily
      try {
        logger.info('Running check-in reminder job...');
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

        const bookings = await Booking.find({
          status: 'confirmed',
          checkIn: { $gte: tomorrow, $lt: dayAfterTomorrow }
        }).populate('tenantId propertyId');

        let sentCount = 0;
        for (const booking of bookings) {
          try {
            await notificationService.createNotification(
              booking.tenantId._id,
              'booking_checkin_reminder',
              {
                propertyTitle: booking.propertyId.title,
                bookingId: booking._id,
                bookingNumber: booking.bookingNumber,
                checkInTime: booking.checkInTime || '2:00 PM'
              }
            );
            
            sentCount++;
          } catch (error) {
            logger.error(`Failed to send check-in reminder for booking ${booking._id}:`, error);
          }
        }

        logger.info(`Check-in reminder job completed. Sent ${sentCount} reminders.`);
      } catch (error) {
        logger.error('Check-in reminder job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Send check-out reminders (morning of check-out)
  sendCheckOutReminders() {
    const job = cron.schedule('30 8 * * *', async () => { // Run at 8:30 AM daily
      try {
        logger.info('Running check-out reminder job...');
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const bookings = await Booking.find({
          status: 'confirmed',
          checkOut: { $gte: today, $lt: tomorrow }
        }).populate('tenantId propertyId');

        let sentCount = 0;
        for (const booking of bookings) {
          try {
            await notificationService.createNotification(
              booking.tenantId._id,
              'booking_checkout_reminder',
              {
                propertyTitle: booking.propertyId.title,
                bookingId: booking._id,
                bookingNumber: booking.bookingNumber,
                checkOutTime: booking.checkOutTime || '11:00 AM'
              }
            );
            
            sentCount++;
          } catch (error) {
            logger.error(`Failed to send check-out reminder for booking ${booking._id}:`, error);
          }
        }

        logger.info(`Check-out reminder job completed. Sent ${sentCount} reminders.`);
      } catch (error) {
        logger.error('Check-out reminder job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Send booking reminders (48 hours before check-in)
  sendBookingReminders() {
    const job = cron.schedule('0 9 * * *', async () => { // Run at 9 AM daily
      try {
        logger.info('Running booking reminder job...');
        
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
        twoDaysFromNow.setHours(0, 0, 0, 0);
        
        const threeDaysFromNow = new Date(twoDaysFromNow);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 1);

        const bookings = await Booking.find({
          status: 'confirmed',
          checkIn: { $gte: twoDaysFromNow, $lt: threeDaysFromNow }
        }).populate('tenantId propertyId');

        let sentCount = 0;
        for (const booking of bookings) {
          try {
            await notificationService.createNotification(
              booking.tenantId._id,
              'booking_reminder',
              {
                propertyTitle: booking.propertyId.title,
                bookingId: booking._id,
                bookingNumber: booking.bookingNumber,
                checkIn: booking.checkIn.toLocaleDateString()
              }
            );
            
            sentCount++;
          } catch (error) {
            logger.error(`Failed to send booking reminder for booking ${booking._id}:`, error);
          }
        }

        logger.info(`Booking reminder job completed. Sent ${sentCount} reminders.`);
      } catch (error) {
        logger.error('Booking reminder job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Send viewing reminders (24 hours before)
  sendViewingReminders() {
    const job = cron.schedule('0 10 * * *', async () => { // Run at 10 AM daily
      try {
        logger.info('Running viewing reminder job...');
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

        const Inquiry = require('../models/Inquiry');
        const inquiries = await Inquiry.find({
          'viewingRequest.status': 'scheduled',
          'viewingRequest.scheduledDate': { $gte: tomorrow, $lt: dayAfterTomorrow }
        }).populate('tenantId propertyId landlordId');

        let sentCount = 0;
        for (const inquiry of inquiries) {
          try {
            // Send to tenant
            await notificationService.createNotification(
              inquiry.tenantId._id,
              'viewing_reminder',
              {
                propertyTitle: inquiry.propertyId.title,
                inquiryId: inquiry._id,
                date: inquiry.viewingRequest.scheduledDate.toLocaleDateString(),
                time: inquiry.viewingRequest.scheduledTime,
                address: inquiry.propertyId.location.address
              }
            );

            // Send to landlord
            await notificationService.createNotification(
              inquiry.landlordId._id,
              'viewing_reminder',
              {
                propertyTitle: inquiry.propertyId.title,
                inquiryId: inquiry._id,
                tenantName: inquiry.tenantId.name,
                date: inquiry.viewingRequest.scheduledDate.toLocaleDateString(),
                time: inquiry.viewingRequest.scheduledTime
              }
            );
            
            sentCount++;
          } catch (error) {
            logger.error(`Failed to send viewing reminder for inquiry ${inquiry._id}:`, error);
          }
        }

        logger.info(`Viewing reminder job completed. Sent ${sentCount} reminders.`);
      } catch (error) {
        logger.error('Viewing reminder job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Send reminders for unread inquiries (24 hours old)
  sendUnreadInquiryReminders() {
    const job = cron.schedule('0 11 * * *', async () => { // Run at 11 AM daily
      try {
        logger.info('Running unread inquiry reminder job...');
        
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const Inquiry = require('../models/Inquiry');
        const inquiries = await Inquiry.find({
          status: 'new',
          createdAt: { $lte: twentyFourHoursAgo }
        }).populate('landlordId propertyId');

        let sentCount = 0;
        for (const inquiry of inquiries) {
          try {
            await notificationService.createNotification(
              inquiry.landlordId._id,
              'inquiry_reminder',
              {
                propertyTitle: inquiry.propertyId.title,
                inquiryId: inquiry._id,
                inquiryNumber: inquiry.inquiryNumber,
                daysOld: Math.floor((Date.now() - inquiry.createdAt) / (1000 * 60 * 60 * 24))
              }
            );
            
            sentCount++;
          } catch (error) {
            logger.error(`Failed to send unread inquiry reminder for inquiry ${inquiry._id}:`, error);
          }
        }

        logger.info(`Unread inquiry reminder job completed. Sent ${sentCount} reminders.`);
      } catch (error) {
        logger.error('Unread inquiry reminder job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Send price drop alerts for favorited properties
  sendPriceDropAlerts() {
    const job = cron.schedule('0 12 * * *', async () => { // Run at 12 PM daily
      try {
        logger.info('Running price drop alert job...');
        
        const Favorite = require('../models/Favorite');
        const favorites = await Favorite.find({
          'priceTracking.enabled': true,
          'priceTracking.notifyOnChange': true
        }).populate('propertyId tenantId');

        let sentCount = 0;
        for (const favorite of favorites) {
          try {
            const priceChange = await favorite.checkPriceChange();
            
            if (priceChange.changed && priceChange.newPrice < priceChange.oldPrice) {
              await notificationService.createNotification(
                favorite.tenantId._id,
                'favorite_price_change',
                {
                  propertyTitle: favorite.propertyId.title,
                  propertyId: favorite.propertyId._id,
                  oldPrice: priceChange.oldPrice,
                  newPrice: priceChange.newPrice,
                  dropPercentage: Math.abs(priceChange.percentageChange).toFixed(1)
                }
              );
              
              sentCount++;
            }
          } catch (error) {
            logger.error(`Failed to check price change for favorite ${favorite._id}:`, error);
          }
        }

        logger.info(`Price drop alert job completed. Sent ${sentCount} alerts.`);
      } catch (error) {
        logger.error('Price drop alert job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Send property expiry warnings (7 days before)
  sendPropertyExpiryWarnings() {
    const job = cron.schedule('0 13 * * *', async () => { // Run at 1 PM daily
      try {
        logger.info('Running property expiry warning job...');
        
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        sevenDaysFromNow.setHours(0, 0, 0, 0);
        
        const eightDaysFromNow = new Date(sevenDaysFromNow);
        eightDaysFromNow.setDate(eightDaysFromNow.getDate() + 1);

        const properties = await Property.find({
          status: 'available',
          featured: true,
          featuredUntil: { $gte: sevenDaysFromNow, $lt: eightDaysFromNow }
        }).populate('landlordId');

        let sentCount = 0;
        for (const property of properties) {
          try {
            await notificationService.createNotification(
              property.landlordId._id,
              'property_expiring',
              {
                propertyTitle: property.title,
                propertyId: property._id,
                expiryDate: property.featuredUntil.toLocaleDateString()
              }
            );
            
            sentCount++;
          } catch (error) {
            logger.error(`Failed to send expiry warning for property ${property._id}:`, error);
          }
        }

        logger.info(`Property expiry warning job completed. Sent ${sentCount} warnings.`);
      } catch (error) {
        logger.error('Property expiry warning job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Cleanup old notifications
  cleanupOldNotifications() {
    const job = cron.schedule('0 3 * * *', async () => { // Run at 3 AM daily
      try {
        logger.info('Running notification cleanup job...');
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await Notification.deleteMany({
          createdAt: { $lt: thirtyDaysAgo },
          isRead: true
        });

        logger.info(`Notification cleanup completed. Deleted ${result.deletedCount} old notifications.`);
      } catch (error) {
        logger.error('Notification cleanup job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Stop all jobs
  stopAll() {
    this.jobs.forEach(job => job.stop());
    logger.info('All notification jobs stopped');
  }

  // Start all jobs
  startAll() {
    this.jobs.forEach(job => job.start());
    logger.info('All notification jobs started');
  }
}

module.exports = new NotificationJobs();