const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  // Create a notification
  async createNotification(userId, type, data = {}) {
    try {
      const notificationData = this.getNotificationContent(type, data);
      
      const notification = await Notification.create({
        userId,
        type,
        title: notificationData.title,
        message: notificationData.message,
        body: notificationData.body,
        data: notificationData.data || data,
        priority: notificationData.priority || 'medium',
        actions: notificationData.actions || [],
        category: notificationData.category
      });

      // Emit socket event if available
      try {
        const io = require('../app').get('io');
        if (io) {
          io.to(`user:${userId}`).emit('notification', notification);
        }
      } catch (socketError) {
        console.debug('Socket emission failed:', socketError.message);
      }

      // Send push notification if user has push enabled
      await this.sendPushNotification(userId, notification);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      // Don't throw - notifications should not break the main flow
      return null;
    }
  }

  // Create bulk notifications
  async createBulkNotifications(userIds, type, data = {}) {
    const notifications = [];
    for (const userId of userIds) {
      try {
        const notification = await this.createNotification(userId, type, data);
        if (notification) notifications.push(notification);
      } catch (error) {
        console.error(`Error creating notification for user ${userId}:`, error);
      }
    }
    return notifications;
  }

  // Send push notification (placeholder - implement with FCM or similar)
  async sendPushNotification(userId, notification) {
    try {
      const user = await User.findById(userId).select('preferences.notifications deviceTokens');
      
      if (!user || !user.preferences?.notifications?.push) {
        return;
      }

      // Implement push notification logic here
      // This would integrate with Firebase Cloud Messaging or similar
      
      console.debug(`Push notification would be sent to user ${userId}`);
    } catch (error) {
      console.error('Push notification error:', error);
    }
  }

  // Get notification content based on type
  getNotificationContent(type, data) {
    const templates = {
      // Account
      welcome: {
        title: 'Welcome to Kirada Guryaha! 🏠',
        message: `Welcome ${data.name || 'to Kirada Guryaha'}! Start exploring properties in Mogadishu.`,
        body: 'We\'re excited to have you join our community. Whether you\'re looking for a place to rent or listing your property, we\'re here to help.',
        category: 'account',
        priority: 'low',
        actions: [
          { label: 'Explore Properties', url: '/properties', type: 'primary' },
          { label: 'Complete Profile', url: '/profile', type: 'secondary' }
        ]
      },
      
      email_verified: {
        title: 'Email Verified Successfully ✅',
        message: 'Your email address has been verified.',
        body: 'Thank you for verifying your email. Your account is now more secure.',
        category: 'account',
        priority: 'low',
        actions: [
          { label: 'Go to Dashboard', url: '/dashboard', type: 'primary' }
        ]
      },
      
      account_suspended: {
        title: 'Account Suspended ⚠️',
        message: 'Your account has been suspended.',
        body: data.reason || 'Please contact support for more information.',
        category: 'account',
        priority: 'urgent',
        actions: [
          { label: 'Contact Support', url: '/support', type: 'primary' }
        ]
      },
      
      // Verification
      verification_approved: {
        title: 'Verification Approved! ✅',
        message: 'Your landlord verification has been approved.',
        body: 'You can now start listing properties on Kirada Guryaha.',
        category: 'account',
        priority: 'high',
        actions: [
          { label: 'List a Property', url: '/properties/new', type: 'primary' }
        ]
      },
      
      verification_rejected: {
        title: 'Verification Rejected ❌',
        message: 'Your verification documents were not approved.',
        body: data.reason || 'Please submit new documents for verification.',
        category: 'account',
        priority: 'high',
        actions: [
          { label: 'Resubmit Documents', url: '/verification', type: 'primary' }
        ]
      },
      
      // Properties
      property_approved: {
        title: 'Property Approved! 🎉',
        message: `Your property "${data.propertyTitle}" has been approved and is now live.`,
        body: 'Potential tenants can now see and book your property.',
        category: 'property',
        priority: 'high',
        actions: [
          { label: 'View Property', url: `/properties/${data.propertyId}`, type: 'primary' },
          { label: 'Manage Listings', url: '/landlord/properties', type: 'secondary' }
        ]
      },
      
      property_rejected: {
        title: 'Property Update',
        message: `Your property "${data.propertyTitle}" needs revisions.`,
        body: data.reason || 'Please update your property listing and resubmit.',
        category: 'property',
        priority: 'high',
        actions: [
          { label: 'Edit Property', url: `/properties/${data.propertyId}/edit`, type: 'primary' }
        ]
      },
      
      property_created: {
        title: 'Property Submitted',
        message: `Your property "${data.propertyTitle}" has been submitted for review.`,
        body: 'An admin will review your property shortly. You\'ll be notified once it\'s approved.',
        category: 'property',
        priority: 'medium',
        actions: [
          { label: 'View Property', url: `/properties/${data.propertyId}`, type: 'secondary' }
        ]
      },
      
      property_featured: {
        title: 'Property Featured! ⭐',
        message: `Your property "${data.propertyTitle}" is now featured.`,
        body: 'Featured properties get more visibility and bookings.',
        category: 'property',
        priority: 'high',
        actions: [
          { label: 'View Property', url: `/properties/${data.propertyId}`, type: 'primary' }
        ]
      },
      
      property_unfeatured: {
        title: 'Property Unfeatured',
        message: `Your property "${data.propertyTitle}" is no longer featured.`,
        body: 'The featured period has ended.',
        category: 'property',
        priority: 'low'
      },
      
      property_view_milestone: {
        title: 'Popular Property! 📈',
        message: `Your property "${data.propertyTitle}" has reached ${data.views} views.`,
        body: 'Consider featuring it to get even more exposure.',
        category: 'property',
        priority: 'low',
        actions: [
          { label: 'View Stats', url: `/landlord/properties/${data.propertyId}/analytics`, type: 'primary' }
        ]
      },
      
      // Bookings
      booking_request: {
        title: 'New Booking Request 📅',
        message: `You have a new booking request for ${data.propertyTitle}`,
        body: `${data.tenantName} wants to book from ${data.checkIn} to ${data.checkOut}.`,
        category: 'booking',
        priority: 'high',
        actions: [
          { label: 'View Request', url: `/landlord/bookings/${data.bookingId}`, type: 'primary' },
          { label: 'Confirm', url: `/landlord/bookings/${data.bookingId}/confirm`, type: 'secondary' }
        ]
      },
      
      booking_confirmed: {
        title: 'Booking Confirmed! ✅',
        message: `Your booking for ${data.propertyTitle} is confirmed.`,
        body: `Booking reference: ${data.bookingNumber}. Check-in: ${data.checkIn}`,
        category: 'booking',
        priority: 'high',
        actions: [
          { label: 'View Booking', url: `/bookings/${data.bookingId}`, type: 'primary' }
        ]
      },
      
      booking_cancelled: {
        title: 'Booking Cancelled',
        message: `Booking ${data.bookingNumber} has been cancelled.`,
        body: data.reason || 'The booking has been cancelled.',
        category: 'booking',
        priority: 'high',
        actions: [
          { label: 'View Details', url: `/bookings/${data.bookingId}`, type: 'secondary' }
        ]
      },
      
      booking_completed: {
        title: 'Stay Completed ✨',
        message: `Your stay at ${data.propertyTitle} is complete.`,
        body: 'We hope you had a wonderful experience. Please leave a review!',
        category: 'booking',
        priority: 'medium',
        actions: [
          { label: 'Write a Review', url: `/bookings/${data.bookingId}/review`, type: 'primary' }
        ]
      },
      
      booking_reminder: {
        title: 'Booking Reminder ⏰',
        message: `Your booking at ${data.propertyTitle} starts tomorrow!`,
        body: `Check-in: ${data.checkIn}. Please contact the landlord for check-in instructions.`,
        category: 'booking',
        priority: 'high',
        actions: [
          { label: 'View Booking', url: `/bookings/${data.bookingId}`, type: 'primary' },
          { label: 'Contact Landlord', url: `/inquiries/new?property=${data.propertyId}`, type: 'secondary' }
        ]
      },
      
      booking_checkin_reminder: {
        title: 'Check-in Today! 🏠',
        message: `You're checking into ${data.propertyTitle} today.`,
        body: `Check-in time: ${data.checkInTime || '2:00 PM'}. Have a great stay!`,
        category: 'booking',
        priority: 'high',
        actions: [
          { label: 'View Details', url: `/bookings/${data.bookingId}`, type: 'primary' }
        ]
      },
      
      booking_checkout_reminder: {
        title: 'Check-out Today',
        message: `You're checking out from ${data.propertyTitle} today.`,
        body: `Check-out time: ${data.checkOutTime || '11:00 AM'}. Thank you for staying with us!`,
        category: 'booking',
        priority: 'medium',
        actions: [
          { label: 'Leave a Review', url: `/bookings/${data.bookingId}/review`, type: 'primary' }
        ]
      },
      
      booking_no_show: {
        title: 'Booking No-Show',
        message: `Booking ${data.bookingNumber} has been marked as no-show.`,
        body: 'The tenant did not arrive for their stay.',
        category: 'booking',
        priority: 'medium'
      },
      
      booking_message: {
        title: 'New Message',
        message: `${data.senderName} sent you a message about booking ${data.bookingNumber}`,
        category: 'booking',
        priority: 'medium',
        actions: [
          { label: 'View Message', url: `/bookings/${data.bookingId}`, type: 'primary' }
        ]
      },
      
      // Inquiries
      inquiry_received: {
        title: 'New Inquiry 💬',
        message: `${data.tenantName} inquired about ${data.propertyTitle}`,
        body: data.message || 'You have a new inquiry about your property.',
        category: 'inquiry',
        priority: 'high',
        actions: [
          { label: 'Reply', url: `/landlord/inquiries/${data.inquiryId}`, type: 'primary' }
        ]
      },
      
      inquiry_replied: {
        title: 'Reply to Your Inquiry',
        message: `${data.senderName} replied to your inquiry about ${data.propertyTitle}`,
        body: data.reply || 'You have a new reply to your inquiry.',
        category: 'inquiry',
        priority: 'medium',
        actions: [
          { label: 'View Reply', url: `/inquiries/${data.inquiryId}`, type: 'primary' }
        ]
      },
      
      inquiry_closed: {
        title: 'Inquiry Closed',
        message: `Your inquiry about ${data.propertyTitle} has been closed.`,
        category: 'inquiry',
        priority: 'low',
        actions: [
          { label: 'View Details', url: `/inquiries/${data.inquiryId}`, type: 'secondary' }
        ]
      },
      
      inquiry_escalated: {
        title: 'Inquiry Escalated',
        message: `Inquiry #${data.inquiryNumber} has been escalated.`,
        body: data.reason || 'Please review this inquiry.',
        category: 'inquiry',
        priority: 'high'
      },
      
      viewing_scheduled: {
        title: 'Viewing Scheduled 📍',
        message: `Viewing scheduled for ${data.propertyTitle}`,
        body: `Date: ${data.date} at ${data.time}. Please be on time.`,
        category: 'inquiry',
        priority: 'high',
        actions: [
          { label: 'View Details', url: `/inquiries/${data.inquiryId}`, type: 'primary' }
        ]
      },
      
      viewing_confirmed: {
        title: 'Viewing Confirmed',
        message: `Your viewing for ${data.propertyTitle} has been confirmed.`,
        body: `Date: ${data.date} at ${data.time}`,
        category: 'inquiry',
        priority: 'high',
        actions: [
          { label: 'Add to Calendar', url: data.calendarUrl, type: 'primary' }
        ]
      },
      
      viewing_reminder: {
        title: 'Viewing Tomorrow',
        message: `Reminder: Your viewing for ${data.propertyTitle} is tomorrow.`,
        body: `Time: ${data.time}. Location: ${data.address}`,
        category: 'inquiry',
        priority: 'medium',
        actions: [
          { label: 'View Details', url: `/inquiries/${data.inquiryId}`, type: 'primary' }
        ]
      },
      
      viewing_cancelled: {
        title: 'Viewing Cancelled',
        message: `Your viewing for ${data.propertyTitle} has been cancelled.`,
        body: data.reason || 'The viewing was cancelled.',
        category: 'inquiry',
        priority: 'medium'
      },
      
      // Reviews
      review_received: {
        title: 'New Review ⭐',
        message: `You received a new review for ${data.propertyTitle}`,
        body: `Rating: ${data.rating}/5. "${data.comment}"`,
        category: 'review',
        priority: 'medium',
        actions: [
          { label: 'View Review', url: `/landlord/reviews/${data.reviewId}`, type: 'primary' },
          { label: 'Reply', url: `/landlord/reviews/${data.reviewId}/reply`, type: 'secondary' }
        ]
      },
      
      review_replied: {
        title: 'Landlord Replied to Review',
        message: `${data.landlordName} replied to your review.`,
        body: data.reply || 'A landlord has responded to your review.',
        category: 'review',
        priority: 'low',
        actions: [
          { label: 'View Reply', url: `/reviews/${data.reviewId}`, type: 'primary' }
        ]
      },
      
      review_approved: {
        title: 'Review Approved',
        message: 'Your review has been approved and is now live.',
        category: 'review',
        priority: 'low'
      },
      
      review_rejected: {
        title: 'Review Rejected',
        message: 'Your review was not approved.',
        body: data.reason || 'It did not meet our community guidelines.',
        category: 'review',
        priority: 'low'
      },
      
      review_flagged: {
        title: 'Review Flagged',
        message: 'A review has been flagged for moderation.',
        category: 'review',
        priority: 'medium'
      },
      
      review_helpful: {
        title: 'Review Marked Helpful',
        message: 'Someone found your review helpful!',
        body: 'Your review is helping other tenants make informed decisions.',
        category: 'review',
        priority: 'low'
      },
      
      // Favorites
      favorite_price_change: {
        title: 'Price Change Alert 💰',
        message: `Price changed for ${data.propertyTitle}`,
        body: `Old price: $${data.oldPrice}. New price: $${data.newPrice}. ${data.newPrice < data.oldPrice ? 'Price dropped!' : 'Price increased.'}`,
        category: 'favorite',
        priority: 'medium',
        actions: [
          { label: 'View Property', url: `/properties/${data.propertyId}`, type: 'primary' }
        ]
      },
      
      favorite_status_change: {
        title: 'Status Update',
        message: `${data.propertyTitle} is now ${data.status}`,
        body: 'The property status has changed. Check it out!',
        category: 'favorite',
        priority: 'medium',
        actions: [
          { label: 'View Property', url: `/properties/${data.propertyId}`, type: 'primary' }
        ]
      },
      
      favorite_reminder: {
        title: 'Favorite Reminder',
        message: `Don't forget about ${data.propertyTitle}`,
        body: data.note || 'You saved this property. Consider reaching out to the landlord.',
        category: 'favorite',
        priority: 'low',
        actions: [
          { label: 'View Property', url: `/properties/${data.propertyId}`, type: 'primary' },
          { label: 'Send Inquiry', url: `/inquiries/new?property=${data.propertyId}`, type: 'secondary' }
        ]
      },
      
      favorite_expiring: {
        title: 'Favorite Expiring',
        message: `Your favorite property "${data.propertyTitle}" may no longer be available soon.`,
        body: 'Properties in this area get booked quickly.',
        category: 'favorite',
        priority: 'medium',
        actions: [
          { label: 'Book Now', url: `/properties/${data.propertyId}/book`, type: 'primary' }
        ]
      },
      
      // System
      system_alert: {
        title: 'System Alert',
        message: data.message || 'Important system notification',
        body: data.body || 'Please review this system notification.',
        category: 'system',
        priority: 'urgent',
        actions: data.actions || []
      },
      
      maintenance: {
        title: 'Scheduled Maintenance',
        message: 'System maintenance scheduled',
        body: data.message || 'The platform may be unavailable during this time.',
        category: 'system',
        priority: 'medium'
      },
      
      feature_update: {
        title: 'New Feature Available! 🎉',
        message: data.message || 'Check out what\'s new on Kirada Guryaha',
        body: data.description || 'We\'ve added new features to improve your experience.',
        category: 'system',
        priority: 'low',
        actions: [
          { label: 'Learn More', url: '/updates', type: 'primary' }
        ]
      },
      
      security_alert: {
        title: 'Security Alert 🔒',
        message: data.message || 'Unusual activity detected on your account',
        body: data.body || 'If this was you, no action needed. Otherwise, secure your account immediately.',
        category: 'system',
        priority: 'urgent',
        actions: [
          { label: 'Secure Account', url: '/security', type: 'primary' },
          { label: 'Contact Support', url: '/support', type: 'secondary' }
        ]
      },
      
      login_alert: {
        title: 'New Login Detected',
        message: `New login from ${data.location || 'unknown location'}`,
        body: `Device: ${data.device || 'Unknown device'}. Time: ${data.time || 'Just now'}`,
        category: 'system',
        priority: 'medium',
        actions: [
          { label: 'Review Activity', url: '/security', type: 'primary' }
        ]
      },
      
      // Reports
      report_received: {
        title: 'Report Received',
        message: 'Your report has been received and is being reviewed.',
        body: `Report #${data.reportNumber}. We'll notify you of any updates.`,
        category: 'report',
        priority: 'medium',
        actions: [
          { label: 'View Report', url: `/reports/${data.reportId}`, type: 'secondary' }
        ]
      },
      
      report_resolved: {
        title: 'Report Resolved',
        message: `Your report #${data.reportNumber} has been resolved.`,
        body: data.resolution || 'Thank you for helping keep our community safe.',
        category: 'report',
        priority: 'medium',
        actions: [
          { label: 'View Resolution', url: `/reports/${data.reportId}`, type: 'primary' }
        ]
      },
      
      report_dismissed: {
        title: 'Report Dismissed',
        message: `Your report #${data.reportNumber} has been dismissed.`,
        body: data.reason || 'No action was taken.',
        category: 'report',
        priority: 'low'
      },
      
      report_assigned: {
        title: 'Report Assigned',
        message: `Report #${data.reportNumber} has been assigned to you.`,
        body: `Assigned by: ${data.assignedBy}`,
        category: 'report',
        priority: 'high',
        actions: [
          { label: 'View Report', url: `/admin/reports/${data.reportId}`, type: 'primary' }
        ]
      },
      
      report_escalated: {
        title: 'Report Escalated',
        message: `Report #${data.reportNumber} has been escalated.`,
        body: `Escalated by: ${data.escalatedBy}. Reason: ${data.reason}`,
        category: 'report',
        priority: 'urgent',
        actions: [
          { label: 'View Report', url: `/admin/reports/${data.reportId}`, type: 'primary' }
        ]
      },
      
      appeal_received: {
        title: 'Appeal Received',
        message: `An appeal has been submitted for report #${data.reportNumber}`,
        body: `Appellant: ${data.appellantName}`,
        category: 'report',
        priority: 'high'
      },
      
      appeal_decided: {
        title: 'Appeal Decision',
        message: `Your appeal for report #${data.reportNumber} has been ${data.decision}`,
        category: 'report',
        priority: 'medium'
      },
      
      // Payments
      payment_due: {
        title: 'Payment Due',
        message: `Payment of $${data.amount} is due for ${data.propertyTitle}`,
        body: `Due date: ${data.dueDate}. Please arrange payment with your landlord.`,
        category: 'payment',
        priority: 'high',
        actions: [
          { label: 'View Details', url: `/bookings/${data.bookingId}`, type: 'primary' }
        ]
      },
      
      payment_received: {
        title: 'Payment Received',
        message: `Payment of $${data.amount} received for ${data.propertyTitle}`,
        body: 'Thank you for your payment.',
        category: 'payment',
        priority: 'medium'
      },
      
      payment_overdue: {
        title: 'Payment Overdue ⚠️',
        message: `Payment of $${data.amount} is overdue for ${data.propertyTitle}`,
        body: `Original due date: ${data.dueDate}. Please contact your landlord.`,
        category: 'payment',
        priority: 'urgent',
        actions: [
          { label: 'Contact Landlord', url: `/inquiries/new?property=${data.propertyId}`, type: 'primary' }
        ]
      },
      
      payment_refunded: {
        title: 'Payment Refunded',
        message: `Payment of $${data.amount} has been refunded for ${data.propertyTitle}`,
        category: 'payment',
        priority: 'medium'
      },
      
      payment_failed: {
        title: 'Payment Failed',
        message: `Payment of $${data.amount} failed for ${data.propertyTitle}`,
        body: 'Please check your payment method and try again.',
        category: 'payment',
        priority: 'high'
      }
    };

    return templates[type] || {
      title: 'Notification',
      message: data.message || 'You have a new notification',
      body: data.body || '',
      category: 'system',
      priority: 'medium',
      actions: []
    };
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    return Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  // Get user notifications with pagination
  async getUserNotifications(userId, page = 1, limit = 20, type = null, isRead = null) {
    const query = { userId };
    if (type) query.type = type;
    if (isRead !== null) query.isRead = isRead;

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(query)
    ]);

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        unreadCount
      }
    };
  }

  // Delete old notifications
  async deleteOldNotifications(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true
    });
  }
}

module.exports = new NotificationService();