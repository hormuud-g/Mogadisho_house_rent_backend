// errorHandler.js
const { logger } = require('./logger');
const multer = require('multer'); // Make sure to require multer

// Main error handler middleware
const errorHandler = (err, req, res, next) => {
  // ... your existing error handler code ...
};

// 404 handler for routes not found
const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Async handler wrapper to catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom AppError class
class AppError extends Error {
  constructor(message, statusCode, errors = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  AppError
};