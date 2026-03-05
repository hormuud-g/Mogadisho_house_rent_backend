// src/middleware/logger.js - Simplified version
const morgan = require('morgan');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configure Winston logger (without daily rotate)
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Morgan middleware for HTTP logging
const httpLogger = morgan((tokens, req, res) => {
  const log = {
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: parseInt(tokens.status(req, res) || '0'),
    responseTime: tokens['response-time'](req, res),
    contentLength: tokens.res(req, res, 'content-length'),
    userId: req.user ? req.user.id : 'anonymous',
    ip: req.ip,
    userAgent: tokens['user-agent'](req, res)
  };

  if (log.status >= 500) {
    logger.error('HTTP Server Error', log);
  } else if (log.status >= 400) {
    logger.warn('HTTP Client Error', log);
  } else {
    logger.http('HTTP Request', log);
  }

  return `${log.method} ${log.url} ${log.status} ${log.responseTime}ms`;
}, {
  stream: {
    write: (message) => {
      logger.debug(message.trim());
    }
  }
});

// Request logger middleware
const requestLogger = (req, res, next) => {
  req._startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - req._startTime;
    logger.info({
      type: 'response',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.id
    });
  });

  next();
};

// Error logger
const errorLogger = (err, req, res, next) => {
  logger.error({
    type: 'error',
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id
  });
  
  next(err);
};

module.exports = {
  logger,
  httpLogger,
  requestLogger,
  errorLogger
};