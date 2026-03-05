const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');
const htmlToText = require('html-to-text');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = {};
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Create transporter
      if (process.env.NODE_ENV === 'development') {
        // Use Ethereal for development
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        console.log('📧 Ethereal Email configured. Preview URLs will be available.');
      } else {
        // Production transporter
        this.transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          secure: process.env.EMAIL_PORT === '465',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
      }

      // Load templates
      await this.loadTemplates();
      
      this.initialized = true;
      console.log('✅ Email service initialized');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
      throw error;
    }
  }

  async loadTemplates() {
    try {
      const templateDir = path.join(__dirname, '../templates/emails');
      const files = await fs.readdir(templateDir);
      
      for (const file of files) {
        if (file.endsWith('.html')) {
          const templateName = path.basename(file, '.html');
          const content = await fs.readFile(path.join(templateDir, file), 'utf-8');
          this.templates[templateName] = handlebars.compile(content);
        }
      }
      console.log(`📧 Loaded ${Object.keys(this.templates).length} email templates`);
    } catch (error) {
      console.error('Error loading email templates:', error);
      // Create basic templates if directory doesn't exist
      this.createBasicTemplates();
    }
  }

  createBasicTemplates() {
    // Basic template for welcome email
    this.templates.welcome = handlebars.compile(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .button { background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Kirada Guryaha!</h1>
          </div>
          <div class="content">
            <h2>Hello {{name}},</h2>
            <p>Thank you for joining Kirada Guryaha, Mogadishu's premier rental property platform!</p>
            <p>We're excited to help you with your property journey.</p>
            <a href="{{loginUrl}}" class="button">Get Started</a>
          </div>
        </div>
      </body>
      </html>
    `);

    // Basic template for verification
    this.templates.verification = handlebars.compile(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #48bb78; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .button { background: #48bb78; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <h2>Hello {{name}},</h2>
            <p>Please verify your email address by clicking the button below:</p>
            <a href="{{verificationUrl}}" class="button">Verify Email</a>
            <p>This link will expire in 24 hours.</p>
          </div>
        </div>
      </body>
      </html>
    `);

    // Basic template for password reset
    this.templates.passwordReset = handlebars.compile(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ed8936; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .button { background: #ed8936; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <h2>Hello {{name}},</h2>
            <p>You requested to reset your password. Click the button below to proceed:</p>
            <a href="{{resetUrl}}" class="button">Reset Password</a>
            <p>This link will expire in 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  async sendEmail({ to, subject, template, context, attachments = [] }) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Get template
      const templateFn = this.templates[template];
      if (!templateFn) {
        throw new Error(`Template ${template} not found`);
      }

      // Compile HTML
      const html = templateFn(context);

      // Convert to plain text
      const text = htmlToText.convert(html, {
        wordwrap: 130,
        ignoreImage: true
      });

      // Send email
      const mailOptions = {
        from: `"Kirada Guryaha" <${process.env.EMAIL_FROM || 'noreply@kiradaguryaha.com'}>`,
        to,
        subject,
        html,
        text,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);

      // Log preview URL for development
      if (process.env.NODE_ENV === 'development') {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log('📧 Email preview URL:', previewUrl);
        }
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(info) : null
      };
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  // Welcome email
  async sendWelcomeEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to Kirada Guryaha! 🏠',
      template: 'welcome',
      context: {
        name: user.name,
        role: user.role,
        loginUrl: `${process.env.FRONTEND_URL}/login`
      }
    });
  }

  // Email verification
  async sendVerificationEmail(user, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    
    return this.sendEmail({
      to: user.email,
      subject: 'Verify Your Email - Kirada Guryaha',
      template: 'verification',
      context: {
        name: user.name,
        verificationUrl
      }
    });
  }

  // Password reset
  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    
    return this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request - Kirada Guryaha',
      template: 'passwordReset',
      context: {
        name: user.name,
        resetUrl
      }
    });
  }

  // Password reset confirmation
  async sendPasswordResetConfirmation(user) {
    return this.sendEmail({
      to: user.email,
      subject: 'Your Password Has Been Reset - Kirada Guryaha',
      template: 'passwordResetConfirmation',
      context: {
        name: user.name,
        loginUrl: `${process.env.FRONTEND_URL}/login`
      }
    });
  }

  // Booking request to landlord
  async sendBookingRequestEmail(booking, property, tenant, landlord) {
    return this.sendEmail({
      to: landlord.email,
      subject: `New Booking Request for ${property.title}`,
      template: 'bookingRequest',
      context: {
        landlordName: landlord.name,
        tenantName: tenant.name,
        propertyTitle: property.title,
        bookingNumber: booking.bookingNumber,
        checkIn: booking.checkIn.toLocaleDateString(),
        checkOut: booking.checkOut.toLocaleDateString(),
        guests: booking.guests,
        totalPrice: booking.priceDetails.totalPrice,
        specialRequests: booking.specialRequests,
        dashboardUrl: `${process.env.FRONTEND_URL}/landlord/bookings/${booking._id}`
      }
    });
  }

  // Booking confirmed to tenant
  async sendBookingConfirmedEmail(booking, property, tenant) {
    return this.sendEmail({
      to: tenant.email,
      subject: `Booking Confirmed! - ${property.title}`,
      template: 'bookingConfirmed',
      context: {
        tenantName: tenant.name,
        propertyTitle: property.title,
        bookingNumber: booking.bookingNumber,
        checkIn: booking.checkIn.toLocaleDateString(),
        checkOut: booking.checkOut.toLocaleDateString(),
        totalPrice: booking.priceDetails.totalPrice,
        propertyUrl: `${process.env.FRONTEND_URL}/properties/${property._id}`
      }
    });
  }

  // Booking cancelled notification
  async sendBookingCancelledEmail(booking, property, user, cancelledBy) {
    return this.sendEmail({
      to: user.email,
      subject: `Booking Cancelled - ${property.title}`,
      template: 'bookingCancelled',
      context: {
        name: user.name,
        propertyTitle: property.title,
        bookingNumber: booking.bookingNumber,
        reason: booking.cancellationReason,
        cancelledBy: cancelledBy.name
      }
    });
  }

  // New inquiry to landlord
  async sendInquiryReceivedEmail(inquiry, property, tenant, landlord) {
    return this.sendEmail({
      to: landlord.email,
      subject: `New Inquiry for ${property.title}`,
      template: 'inquiryReceived',
      context: {
        landlordName: landlord.name,
        tenantName: tenant.name,
        propertyTitle: property.title,
        inquiryNumber: inquiry.inquiryNumber,
        message: inquiry.message,
        dashboardUrl: `${process.env.FRONTEND_URL}/landlord/inquiries/${inquiry._id}`
      }
    });
  }

  // Inquiry reply to tenant
  async sendInquiryReplyEmail(inquiry, property, sender, recipient, reply) {
    return this.sendEmail({
      to: recipient.email,
      subject: `Reply to Your Inquiry - ${property.title}`,
      template: 'inquiryReply',
      context: {
        recipientName: recipient.name,
        senderName: sender.name,
        propertyTitle: property.title,
        replyMessage: reply,
        inquiryUrl: `${process.env.FRONTEND_URL}/inquiries/${inquiry._id}`
      }
    });
  }

  // Viewing request email
  async sendViewingRequestEmail(inquiry, property, tenant, landlord, viewingDetails) {
    return this.sendEmail({
      to: landlord.email,
      subject: `Viewing Request for ${property.title}`,
      template: 'viewingRequest',
      context: {
        landlordName: landlord.name,
        tenantName: tenant.name,
        propertyTitle: property.title,
        date: viewingDetails.date,
        time: viewingDetails.time,
        notes: viewingDetails.notes,
        dashboardUrl: `${process.env.FRONTEND_URL}/landlord/inquiries/${inquiry._id}`
      }
    });
  }

  // Property approved to landlord
  async sendPropertyApprovedEmail(property, landlord) {
    return this.sendEmail({
      to: landlord.email,
      subject: `Your Property "${property.title}" is Approved!`,
      template: 'propertyApproved',
      context: {
        landlordName: landlord.name,
        propertyTitle: property.title,
        propertyUrl: `${process.env.FRONTEND_URL}/properties/${property._id}`,
        dashboardUrl: `${process.env.FRONTEND_URL}/landlord/properties`
      }
    });
  }

  // Property rejected to landlord
  async sendPropertyRejectedEmail(property, landlord, reason) {
    return this.sendEmail({
      to: landlord.email,
      subject: `Property Listing Update - ${property.title}`,
      template: 'propertyRejected',
      context: {
        landlordName: landlord.name,
        propertyTitle: property.title,
        reason: reason || property.rejectionReason,
        dashboardUrl: `${process.env.FRONTEND_URL}/landlord/properties`
      }
    });
  }

  // Review received to landlord
  async sendReviewReceivedEmail(review, property, landlord, tenant) {
    return this.sendEmail({
      to: landlord.email,
      subject: `New Review for ${property.title}`,
      template: 'reviewReceived',
      context: {
        landlordName: landlord.name,
        tenantName: tenant.name,
        propertyTitle: property.title,
        rating: review.ratings.overall,
        comment: review.comment,
        reviewUrl: `${process.env.FRONTEND_URL}/properties/${property._id}#reviews`
      }
    });
  }

  // Review reply to tenant
  async sendReviewReplyEmail(review, property, landlord, tenant, reply) {
    return this.sendEmail({
      to: tenant.email,
      subject: `Landlord Replied to Your Review - ${property.title}`,
      template: 'reviewReply',
      context: {
        tenantName: tenant.name,
        landlordName: landlord.name,
        propertyTitle: property.title,
        reply,
        propertyUrl: `${process.env.FRONTEND_URL}/properties/${property._id}`
      }
    });
  }

  // Verification approved
  async sendVerificationApprovedEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: 'Your Landlord Account is Verified!',
      template: 'verificationApproved',
      context: {
        name: user.name,
        dashboardUrl: `${process.env.FRONTEND_URL}/landlord/dashboard`
      }
    });
  }

  // Verification rejected
  async sendVerificationRejectedEmail(user, reason) {
    return this.sendEmail({
      to: user.email,
      subject: 'Verification Update - Kirada Guryaha',
      template: 'verificationRejected',
      context: {
        name: user.name,
        reason: reason || 'Documents did not meet our verification criteria',
        resubmitUrl: `${process.env.FRONTEND_URL}/verification`
      }
    });
  }

  // Report notification to admin
  async sendReportNotificationEmail(report, reportedItem, reporter, admin) {
    return this.sendEmail({
      to: admin.email,
      subject: `New Report Submitted - ${report.reportNumber}`,
      template: 'reportNotification',
      context: {
        adminName: admin.name,
        reportNumber: report.reportNumber,
        reporterName: reporter.name,
        itemType: report.reportedItemType,
        reason: report.reason,
        description: report.description,
        priority: report.priority,
        dashboardUrl: `${process.env.FRONTEND_URL}/admin/reports/${report._id}`
      }
    });
  }

  // Welcome email for landlords
  async sendWelcomeLandlordEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to Kirada Guryaha - Start Listing Your Properties!',
      template: 'welcomeLandlord',
      context: {
        name: user.name,
        verificationUrl: `${process.env.FRONTEND_URL}/verification`,
        guideUrl: `${process.env.FRONTEND_URL}/guides/landlord`
      }
    });
  }

  // Booking reminder
  async sendBookingReminderEmail(booking, property, user) {
    return this.sendEmail({
      to: user.email,
      subject: `Reminder: Your Booking at ${property.title} Starts Tomorrow`,
      template: 'bookingReminder',
      context: {
        name: user.name,
        propertyTitle: property.title,
        bookingNumber: booking.bookingNumber,
        checkIn: booking.checkIn.toLocaleDateString(),
        checkOut: booking.checkOut.toLocaleDateString(),
        bookingUrl: `${process.env.FRONTEND_URL}/bookings/${booking._id}`
      }
    });
  }

  // Review reminder
  async sendReviewReminderEmail(booking, property, tenant) {
    return this.sendEmail({
      to: tenant.email,
      subject: `How was your stay at ${property.title}?`,
      template: 'reviewReminder',
      context: {
        tenantName: tenant.name,
        propertyTitle: property.title,
        reviewUrl: `${process.env.FRONTEND_URL}/bookings/${booking._id}/review`
      }
    });
  }
}

module.exports = new EmailService();