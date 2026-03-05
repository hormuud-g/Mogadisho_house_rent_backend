const Report = require('../models/Report');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

// @desc    Create report
// @route   POST /api/reports
// @access  Private
const createReport = async (req, res, next) => {
  try {
    const { reportedItemId, reportedItemType, reason, description } = req.body;

    // Validate reported item exists
    let reportedItem;
    const Model = require(`../models/${reportedItemType}`);
    reportedItem = await Model.findById(reportedItemId);

    if (!reportedItem) {
      return res.status(404).json({
        success: false,
        message: `${reportedItemType} not found`
      });
    }

    // Check if user has already reported this item
    const existingReport = await Report.findOne({
      reporterId: req.user.id,
      reportedItemId,
      reportedItemType,
      status: { $in: ['pending', 'reviewing'] }
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this item'
      });
    }

    // Create report
    const report = await Report.create({
      reporterId: req.user.id,
      reporterRole: req.user.role,
      reportedItemId,
      reportedItemType,
      reason,
      description,
      status: 'pending',
      priority: req.body.priority || 'medium',
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await notificationService.createNotification(admin._id, 'report_received', {
        reportNumber: report.reportNumber,
        reportId: report._id,
        itemType: reportedItemType,
        reason,
        reporterName: req.user.name,
        priority: report.priority
      });
    }

    // Send email to admins
    if (process.env.NODE_ENV === 'production') {
      for (const admin of admins) {
        await emailService.sendReportNotificationEmail(report, reportedItem, req.user, admin);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reports (admin only)
// @route   GET /api/reports
// @access  Private (Admin)
const getReports = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      priority, 
      type, 
      assignedTo 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (type) query.reportedItemType = type;
    if (assignedTo) query.assignedTo = assignedTo;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('reporterId', 'name email role')
        .populate('assignedTo', 'name email')
        .populate('actions.takenBy', 'name')
        .populate('resolution.resolvedBy', 'name')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Report.countDocuments(query)
    ]);

    // Get statistics
    const stats = await Report.getStats();

    res.status(200).json({
      success: true,
      count: reports.length,
      total,
      data: reports,
      stats,
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

// @desc    Get single report
// @route   GET /api/reports/:id
// @access  Private (Admin)
const getReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reporterId', 'name email role phone')
      .populate('assignedTo', 'name email')
      .populate('actions.takenBy', 'name')
      .populate('resolution.resolvedBy', 'name')
      .populate('notes.addedBy', 'name')
      .populate('appeal.requestedBy', 'name')
      .populate('appeal.decidedBy', 'name')
      .populate('meta.relatedReports');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Get reported item details
    let reportedItem = null;
    if (report.reportedItemId && report.reportedItemType) {
      const Model = require(`../models/${report.reportedItemType}`);
      reportedItem = await Model.findById(report.reportedItemId)
        .select('-passwordHash -verificationDocuments');
    }

    res.status(200).json({
      success: true,
      data: {
        report,
        reportedItem
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign report
// @route   PUT /api/reports/:id/assign
// @access  Private (Admin)
const assignReport = async (req, res, next) => {
  try {
    const { adminId } = req.body;

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    await report.assign(adminId || req.user.id);

    // Notify assigned admin
    if (adminId && adminId !== req.user.id) {
      await notificationService.createNotification(adminId, 'report_assigned', {
        reportNumber: report.reportNumber,
        reportId: report._id,
        assignedBy: req.user.name
      });
    }

    res.status(200).json({
      success: true,
      message: 'Report assigned successfully',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Take action on report
// @route   POST /api/reports/:id/actions
// @access  Private (Admin)
const takeAction = async (req, res, next) => {
  try {
    const { action, description, effectiveUntil } = req.body;

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    await report.addAction(action, description, req.user.id, effectiveUntil);

    // Get reported item
    const Model = require(`../models/${report.reportedItemType}`);
    const reportedItem = await Model.findById(report.reportedItemId);

    // Take action on reported item based on action type
    switch (action) {
      case 'content_removed':
        if (reportedItem) {
          if (report.reportedItemType === 'Property') {
            reportedItem.status = 'rejected';
            reportedItem.rejectionReason = description;
          } else if (report.reportedItemType === 'Review') {
            reportedItem.moderationStatus = 'rejected';
            reportedItem.rejectionReason = description;
          }
          await reportedItem.save();
        }
        break;

      case 'user_suspended':
        if (report.reportedItemType === 'User') {
          const user = await User.findById(report.reportedItemId);
          if (user) {
            user.status = 'suspended';
            user.suspensionReason = description;
            user.suspendedUntil = effectiveUntil;
            user.suspendedBy = req.user.id;
            await user.save();

            // Notify user
            await notificationService.createNotification(user._id, 'account_suspended', {
              reason: description,
              until: effectiveUntil
            });
          }
        }
        break;

      case 'user_banned':
        if (report.reportedItemType === 'User') {
          const user = await User.findById(report.reportedItemId);
          if (user) {
            user.status = 'banned';
            user.suspensionReason = description;
            user.suspendedBy = req.user.id;
            await user.save();

            // Notify user
            await notificationService.createNotification(user._id, 'account_suspended', {
              reason: description,
              permanent: true
            });
          }
        }
        break;
    }

    res.status(200).json({
      success: true,
      message: 'Action taken successfully',
      data: report.actions[report.actions.length - 1]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve report
// @route   PUT /api/reports/:id/resolve
// @access  Private (Admin)
const resolveReport = async (req, res, next) => {
  try {
    const { decision, summary } = req.body;

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    await report.resolve(decision, summary, req.user.id);

    // Notify reporter
    await notificationService.createNotification(report.reporterId, 'report_resolved', {
      reportNumber: report.reportNumber,
      reportId: report._id,
      decision,
      summary
    });

    res.status(200).json({
      success: true,
      message: 'Report resolved successfully',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dismiss report
// @route   PUT /api/reports/:id/dismiss
// @access  Private (Admin)
const dismissReport = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    await report.dismiss(reason, req.user.id);

    // Notify reporter
    await notificationService.createNotification(report.reporterId, 'report_dismissed', {
      reportNumber: report.reportNumber,
      reportId: report._id,
      reason
    });

    res.status(200).json({
      success: true,
      message: 'Report dismissed successfully',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Escalate report
// @route   PUT /api/reports/:id/escalate
// @access  Private (Admin)
const escalateReport = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    await report.escalate(reason, req.user.id);

    // Find super admin to notify
    const superAdmin = await User.findOne({ role: 'admin', 'meta.tags': 'super-admin' });

    if (superAdmin) {
      await notificationService.createNotification(superAdmin._id, 'report_escalated', {
        reportNumber: report.reportNumber,
        reportId: report._id,
        escalatedBy: req.user.name,
        reason
      });
    }

    res.status(200).json({
      success: true,
      message: 'Report escalated successfully',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add note to report
// @route   POST /api/reports/:id/notes
// @access  Private (Admin)
const addNote = async (req, res, next) => {
  try {
    const { note, isPrivate } = req.body;

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    await report.addNote(note, req.user.id, isPrivate);

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: report.notes[report.notes.length - 1]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Appeal report
// @route   POST /api/reports/:id/appeal
// @access  Private
const appealReport = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check if user is the reported user
    if (report.reportedItemType === 'User' && report.reportedItemId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only appeal reports about yourself'
      });
    }

    await report.appeal(reason, req.user.id);

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await notificationService.createNotification(admin._id, 'appeal_received', {
        reportNumber: report.reportNumber,
        reportId: report._id,
        appellantName: req.user.name
      });
    }

    res.status(200).json({
      success: true,
      message: 'Appeal submitted successfully',
      data: report.appeal
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Decide appeal
// @route   PUT /api/reports/:id/appeal/decide
// @access  Private (Admin)
const decideAppeal = async (req, res, next) => {
  try {
    const { decision } = req.body;

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    await report.decideAppeal(decision, req.user.id);

    // Notify appellant
    if (report.appeal && report.appeal.requestedBy) {
      await notificationService.createNotification(report.appeal.requestedBy, 'appeal_decided', {
        reportNumber: report.reportNumber,
        reportId: report._id,
        decision
      });
    }

    // If appeal granted, reverse the action
    if (decision === 'granted' && report.reportedItemType === 'User') {
      const user = await User.findById(report.reportedItemId);
      if (user) {
        user.status = 'active';
        user.suspensionReason = null;
        user.suspendedUntil = null;
        await user.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Appeal decision recorded',
      data: report.appeal
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get report statistics
// @route   GET /api/reports/stats
// @access  Private (Admin)
const getReportStats = async (req, res, next) => {
  try {
    const stats = await Report.getStats();
    const avgResolutionTime = await Report.getAverageResolutionTime();

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        avgResolutionTime
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReport,
  getReports,
  getReport,
  assignReport,
  takeAction,
  resolveReport,
  dismissReport,
  escalateReport,
  addNote,
  appealReport,
  decideAppeal,
  getReportStats
};