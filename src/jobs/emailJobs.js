const cron = require('node-cron');
const Booking = require('../models/Booking');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { logger } = require('../middleware/logger');

class EmailJobs {
  constructor() {
    this.jobs = [];
  }

  // Initialize all email jobs
  initialize() {
    this.scheduleBookingReminders();
    this.scheduleReviewReminders();
    this.scheduleWelcomeEmails();
    this.scheduleInactiveUserEmails();
    this.scheduleNewsletterEmails();
    
    logger.info('✅ Email jobs initialized');
  }

  // Send booking reminders 24 hours before check-in
  scheduleBookingReminders() {
    const job = cron.schedule('0 9 * * *', async () => { // Run at 9 AM daily
      try {
        logger.info('Running booking reminder job...');
        
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
            await emailService.sendBookingReminderEmail(
              booking,
              booking.propertyId,
              booking.tenantId
            );
            
            // Update booking with reminder sent flag
            booking.notifications.reminderSent = true;
            booking.notifications.reminderSentAt = new Date();
            await booking.save();
            
            sentCount++;
            
            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
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

  // Send review reminders after check-out
  scheduleReviewReminders() {
    const job = cron.schedule('30 9 * * *', async () => { // Run at 9:30 AM daily
      try {
        logger.info('Running review reminder job...');
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const bookings = await Booking.find({
          status: 'completed',
          checkOut: { $gte: yesterday, $lt: today },
          reviewSubmitted: false,
          'notifications.reviewReminderSent': { $ne: true }
        }).populate('tenantId propertyId');

        let sentCount = 0;
        for (const booking of bookings) {
          try {
            await emailService.sendReviewReminderEmail(
              booking,
              booking.propertyId,
              booking.tenantId
            );
            
            booking.notifications.reviewReminderSent = true;
            booking.notifications.reviewReminderSentAt = new Date();
            await booking.save();
            
            sentCount++;
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            logger.error(`Failed to send review reminder for booking ${booking._id}:`, error);
          }
        }

        logger.info(`Review reminder job completed. Sent ${sentCount} reminders.`);
      } catch (error) {
        logger.error('Review reminder job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Send welcome emails to new users (retry failed)
  scheduleWelcomeEmails() {
    const job = cron.schedule('0 10 * * *', async () => { // Run at 10 AM daily
      try {
        logger.info('Running welcome email retry job...');
        
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const users = await User.find({
          createdAt: { $gte: twentyFourHoursAgo },
          'meta.welcomeEmailSent': { $ne: true }
        });

        let sentCount = 0;
        for (const user of users) {
          try {
            if (user.role === 'landlord') {
              await emailService.sendWelcomeLandlordEmail(user);
            } else {
              await emailService.sendWelcomeEmail(user);
            }
            
            user.meta.welcomeEmailSent = true;
            user.meta.welcomeEmailSentAt = new Date();
            await user.save();
            
            sentCount++;
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            logger.error(`Failed to send welcome email to user ${user._id}:`, error);
          }
        }

        logger.info(`Welcome email job completed. Sent ${sentCount} emails.`);
      } catch (error) {
        logger.error('Welcome email job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Send re-engagement emails to inactive users
  scheduleInactiveUserEmails() {
    const job = cron.schedule('0 11 1 * *', async () => { // Run on 1st of each month at 11 AM
      try {
        logger.info('Running inactive user email job...');
        
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const users = await User.find({
          lastActive: { $lt: threeMonthsAgo },
          status: 'active',
          'preferences.notifications.marketing': true
        }).limit(100);

        let sentCount = 0;
        for (const user of users) {
          try {
            // Send re-engagement email
            await emailService.sendEmail({
              to: user.email,
              subject: 'We miss you at Kirada Guryaha!',
              template: 'reEngagement',
              context: {
                name: user.name,
                loginUrl: `${process.env.FRONTEND_URL}/login`,
                propertiesUrl: `${process.env.FRONTEND_URL}/properties`
              }
            });
            
            user.meta.reEngagementEmailSentAt = new Date();
            await user.save();
            
            sentCount++;
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            logger.error(`Failed to send re-engagement email to user ${user._id}:`, error);
          }
        }

        logger.info(`Inactive user email job completed. Sent ${sentCount} emails.`);
      } catch (error) {
        logger.error('Inactive user email job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Send newsletter emails (if implemented)
  scheduleNewsletterEmails() {
    const job = cron.schedule('0 12 15 * *', async () => { // Run on 15th of each month at 12 PM
      try {
        logger.info('Running newsletter email job...');
        
        // This would typically fetch newsletter subscribers and send monthly updates
        // For now, we'll just log that it ran
        
        logger.info('Newsletter email job completed (placeholder)');
      } catch (error) {
        logger.error('Newsletter email job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Stop all jobs
  stopAll() {
    this.jobs.forEach(job => job.stop());
    logger.info('All email jobs stopped');
  }

  // Start all jobs
  startAll() {
    this.jobs.forEach(job => job.start());
    logger.info('All email jobs started');
  }
}

module.exports = new EmailJobs();