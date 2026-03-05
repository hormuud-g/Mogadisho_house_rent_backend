const { ROLES, ROLE_HIERARCHY, PERMISSIONS } = require('../constants/roles');

// Check if user has required role(s)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this resource`
      });
    }

    next();
  };
};

// Check if user has specific permission
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const userPermissions = PERMISSIONS[req.user.role];
    
    if (!userPermissions || !userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user owns the resource or is admin
const checkOwnership = (model) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const Model = require(`../models/${model}`);
      
      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: `${model} not found`
        });
      }

      // Admin can access anything
      if (req.user.role === ROLES.ADMIN) {
        req.resource = resource;
        return next();
      }

      // Determine owner field based on model
      let ownerField = 'userId';
      if (model === 'Property') ownerField = 'landlordId';
      if (model === 'Booking') ownerField = 'tenantId';
      if (model === 'Inquiry') ownerField = 'tenantId';
      if (model === 'Review') ownerField = 'tenantId';

      // Check ownership
      if (resource[ownerField] && resource[ownerField].toString() === req.user.id) {
        req.resource = resource;
        return next();
      }

      // For bookings, landlord can also access
      if (model === 'Booking' && resource.landlordId && resource.landlordId.toString() === req.user.id) {
        req.resource = resource;
        return next();
      }

      // For inquiries, landlord can also access
      if (model === 'Inquiry' && resource.landlordId && resource.landlordId.toString() === req.user.id) {
        req.resource = resource;
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'You do not own this resource'
      });
    } catch (error) {
      next(error);
    }
  };
};

// Check if user is the landlord of a property
const isLandlordOfProperty = async (req, res, next) => {
  try {
    const propertyId = req.params.propertyId || req.body.propertyId;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    const Property = require('../models/Property');
    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    if (property.landlordId.toString() !== req.user.id && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'You are not the landlord of this property'
      });
    }

    req.property = property;
    next();
  } catch (error) {
    next(error);
  }
};

// Check if user is the tenant of a booking
const isTenantOfBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    
    const Booking = require('../models/Booking');
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.tenantId.toString() !== req.user.id && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'You are not the tenant of this booking'
      });
    }

    req.booking = booking;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authorize,
  hasPermission,
  checkOwnership,
  isLandlordOfProperty,
  isTenantOfBooking
};