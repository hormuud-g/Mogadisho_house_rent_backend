const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token (excluding password)
      req.user = await User.findById(decoded.id).select(
        '-passwordHash -refreshToken -emailVerificationToken -passwordResetToken -twoFactorSecret -loginAttempts -lockUntil -__v'
      );

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user account is active
      if (req.user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: `Your account is ${req.user.status}. Please contact support.`
        });
      }

      next();
    } catch (error) {
      console.error('Auth error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

// Optional authentication - doesn't require token but will attach user if present
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select(
        '-passwordHash -refreshToken -emailVerificationToken -passwordResetToken -twoFactorSecret'
      );
    } catch (error) {
      // Silent fail for optional auth
      console.debug('Optional auth failed:', error.message);
    }
  }
  next();
};

// Check if user is verified (email and identity)
const requireVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email first'
    });
  }

  if (req.user.role === 'landlord' && !req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Your landlord account is not verified yet'
    });
  }

  next();
};

module.exports = { protect, optionalAuth, requireVerification };