const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, isRead } = req.query;
    
    const result = await Notification.getUserNotifications(
      req.user.id,
      page,
      limit,
      type,
      isRead
    );

    res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);

    res.status(200).json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.markAllAsRead(req.user.id);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user.id}`).emit('notifications-read-all');
    }

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dismiss notification
// @route   PUT /api/notifications/:id/dismiss
// @access  Private
const dismissNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.dismiss();

    res.status(200).json({
      success: true,
      message: 'Notification dismissed'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Archive notification
// @route   PUT /api/notifications/:id/archive
// @access  Private
const archiveNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.archive();

    res.status(200).json({
      success: true,
      message: 'Notification archived'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
const getPreferences = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user.preferences.notifications
  });
};

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
const updatePreferences = async (req, res, next) => {
  try {
    const { email, sms, push, marketing } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        'preferences.notifications': {
          email: email !== undefined ? email : req.user.preferences.notifications.email,
          sms: sms !== undefined ? sms : req.user.preferences.notifications.sms,
          push: push !== undefined ? push : req.user.preferences.notifications.push,
          marketing: marketing !== undefined ? marketing : req.user.preferences.notifications.marketing
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated',
      data: user.preferences.notifications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notification settings (types to receive)
// @route   GET /api/notifications/settings
// @access  Private
const getSettings = async (req, res) => {
  // This would typically come from a UserNotificationSettings model
  // For now, return default settings
  const settings = {
    account: true,
    property: true,
    booking: true,
    inquiry: true,
    review: true,
    favorite: true,
    payment: true,
    report: true,
    system: true,
    marketing: false
  };

  res.status(200).json({
    success: true,
    data: settings
  });
};

// @desc    Update notification settings
// @route   PUT /api/notifications/settings
// @access  Private
const updateSettings = async (req, res, next) => {
  try {
    const settings = req.body;
    
    // This would save to a UserNotificationSettings model
    // For now, just return success

    res.status(200).json({
      success: true,
      message: 'Notification settings updated',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Test notification
// @route   POST /api/notifications/test
// @access  Private
const testNotification = async (req, res, next) => {
  try {
    await notificationService.createNotification(req.user.id, 'system', {
      title: 'Test Notification',
      message: 'This is a test notification from Kirada Guryaha',
      priority: 'low'
    });

    res.status(200).json({
      success: true,
      message: 'Test notification sent'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  archiveNotification,
  deleteNotification,
  getPreferences,
  updatePreferences,
  getSettings,
  updateSettings,
  testNotification
};