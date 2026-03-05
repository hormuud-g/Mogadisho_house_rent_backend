const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Report = require('../models/Report');
const { logger } = require('../middleware/logger');

class CleanupJobs {
  constructor() {
    this.jobs = [];
  }

  // Initialize all cleanup jobs
  initialize() {
    this.cleanupExpiredBookings();
    this.cleanupOldNotifications();
    this.cleanupResolvedReports();
    this.cleanupTempFiles();
    this.cleanupExpiredTokens();
    this.cleanupOrphanedData();
    
    logger.info('✅ Cleanup jobs initialized');
  }

  // Cleanup expired pending bookings (older than 48 hours)
  cleanupExpiredBookings() {
    const job = cron.schedule('0 */6 * * *', async () => { // Run every 6 hours
      try {
        logger.info('Running expired bookings cleanup job...');
        
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() - 48);

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

        logger.info(`Expired bookings cleanup completed. Marked ${result.modifiedCount} bookings as expired.`);
      } catch (error) {
        logger.error('Expired bookings cleanup job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Cleanup old notifications (older than 90 days)
  cleanupOldNotifications() {
    const job = cron.schedule('0 2 * * *', async () => { // Run at 2 AM daily
      try {
        logger.info('Running old notifications cleanup job...');
        
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const result = await Notification.deleteMany({
          createdAt: { $lt: ninetyDaysAgo },
          isRead: true,
          isArchived: true
        });

        logger.info(`Old notifications cleanup completed. Deleted ${result.deletedCount} notifications.`);
      } catch (error) {
        logger.error('Old notifications cleanup job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Cleanup resolved reports (older than 30 days)
  cleanupResolvedReports() {
    const job = cron.schedule('0 3 * * *', async () => { // Run at 3 AM daily
      try {
        logger.info('Running resolved reports cleanup job...');
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await Report.deleteMany({
          status: 'resolved',
          'resolution.resolvedAt': { $lt: thirtyDaysAgo }
        });

        logger.info(`Resolved reports cleanup completed. Deleted ${result.deletedCount} reports.`);
      } catch (error) {
        logger.error('Resolved reports cleanup job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Cleanup temporary uploaded files
  cleanupTempFiles() {
    const job = cron.schedule('0 4 * * *', async () => { // Run at 4 AM daily
      try {
        logger.info('Running temp files cleanup job...');
        
        const tempDir = path.join(__dirname, '../../uploads/temp');
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        try {
          const files = await fs.readdir(tempDir);
          let deletedCount = 0;

          for (const file of files) {
            const filePath = path.join(tempDir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime < twentyFourHoursAgo) {
              await fs.unlink(filePath);
              deletedCount++;
            }
          }

          logger.info(`Temp files cleanup completed. Deleted ${deletedCount} files.`);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
          logger.info('Temp directory does not exist, skipping cleanup');
        }
      } catch (error) {
        logger.error('Temp files cleanup job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Cleanup expired tokens (password reset, email verification, etc.)
  cleanupExpiredTokens() {
    const job = cron.schedule('0 5 * * *', async () => { // Run at 5 AM daily
      try {
        logger.info('Running expired tokens cleanup job...');
        
        const now = new Date();

        // Clear expired password reset tokens
        const passwordResetResult = await User.updateMany(
          {
            passwordResetExpires: { $lt: now },
            passwordResetToken: { $ne: null }
          },
          {
            $unset: { passwordResetToken: 1, passwordResetExpires: 1 }
          }
        );

        // Clear expired email verification tokens
        const emailVerificationResult = await User.updateMany(
          {
            emailVerificationExpires: { $lt: now },
            emailVerificationToken: { $ne: null }
          },
          {
            $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 }
          }
        );

        // Clear expired phone verification tokens
        const phoneVerificationResult = await User.updateMany(
          {
            phoneVerificationExpires: { $lt: now },
            phoneVerificationToken: { $ne: null }
          },
          {
            $unset: { phoneVerificationToken: 1, phoneVerificationExpires: 1 }
          }
        );

        logger.info(`Expired tokens cleanup completed. Reset tokens: ${passwordResetResult.modifiedCount}, Email tokens: ${emailVerificationResult.modifiedCount}, Phone tokens: ${phoneVerificationResult.modifiedCount}`);
      } catch (error) {
        logger.error('Expired tokens cleanup job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Cleanup orphaned data
  cleanupOrphanedData() {
    const job = cron.schedule('0 6 * * 0', async () => { // Run at 6 AM every Sunday
      try {
        logger.info('Running orphaned data cleanup job...');
        
        // Find properties with non-existent landlords
        const properties = await Property.aggregate([
          {
            $lookup: {
              from: 'users',
              localField: 'landlordId',
              foreignField: '_id',
              as: 'landlord'
            }
          },
          {
            $match: { landlord: { $size: 0 } }
          }
        ]);

        if (properties.length > 0) {
          const propertyIds = properties.map(p => p._id);
          await Property.deleteMany({ _id: { $in: propertyIds } });
          logger.info(`Deleted ${properties.length} orphaned properties`);
        }

        // Find bookings with non-existent properties
        const bookings = await Booking.aggregate([
          {
            $lookup: {
              from: 'properties',
              localField: 'propertyId',
              foreignField: '_id',
              as: 'property'
            }
          },
          {
            $match: { property: { $size: 0 } }
          }
        ]);

        if (bookings.length > 0) {
          const bookingIds = bookings.map(b => b._id);
          await Booking.deleteMany({ _id: { $in: bookingIds } });
          logger.info(`Deleted ${bookings.length} orphaned bookings`);
        }

        // Find reviews with non-existent properties
        const reviews = await Review.aggregate([
          {
            $lookup: {
              from: 'properties',
              localField: 'propertyId',
              foreignField: '_id',
              as: 'property'
            }
          },
          {
            $match: { property: { $size: 0 } }
          }
        ]);

        if (reviews.length > 0) {
          const reviewIds = reviews.map(r => r._id);
          await Review.deleteMany({ _id: { $in: reviewIds } });
          logger.info(`Deleted ${reviews.length} orphaned reviews`);
        }

        // Find inquiries with non-existent properties
        const inquiries = await Inquiry.aggregate([
          {
            $lookup: {
              from: 'properties',
              localField: 'propertyId',
              foreignField: '_id',
              as: 'property'
            }
          },
          {
            $match: { property: { $size: 0 } }
          }
        ]);

        if (inquiries.length > 0) {
          const inquiryIds = inquiries.map(i => i._id);
          await Inquiry.deleteMany({ _id: { $in: inquiryIds } });
          logger.info(`Deleted ${inquiries.length} orphaned inquiries`);
        }

        logger.info('Orphaned data cleanup completed');
      } catch (error) {
        logger.error('Orphaned data cleanup job failed:', error);
      }
    });

    this.jobs.push(job);
    return job;
  }

  // Stop all jobs
  stopAll() {
    this.jobs.forEach(job => job.stop());
    logger.info('All cleanup jobs stopped');
  }

  // Start all jobs
  startAll() {
    this.jobs.forEach(job => job.start());
    logger.info('All cleanup jobs started');
  }
}

module.exports = new CleanupJobs();