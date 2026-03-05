const nodemailer = require('nodemailer');

const createTransporter = () => {
  // For development/testing - use ethereal
  if (process.env.NODE_ENV === 'development') {
    return nodemailer.createTestAccount().then((testAccount) => {
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    });
  }

  // Production email transporter
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const emailConfig = {
  from: process.env.EMAIL_FROM || 'noreply@kiradaguryaha.com',
  createTransporter,
};

module.exports = emailConfig;