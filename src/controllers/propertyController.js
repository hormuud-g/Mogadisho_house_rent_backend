const Property = require('../models/Property');
const User = require('../models/User');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');
const { MOGADISHU_DISTRICTS } = require('../constants/districts');

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public
const getProperties = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      district,
      minPrice,
      maxPrice,
      type,
      bedrooms,
      bathrooms,
      amenities,
      furnished,
      sort = 'newest',
      lat,
      lng,
      radius
    } = req.query;

    const query = { status: 'available' };

    // Text search
    if (req.query.q) {
      query.$text = { $search: req.query.q };
    }

    // Filters
    if (district) query['location.district'] = district;
    if (type) query.type = type;
    if (bedrooms) query.bedrooms = parseInt(bedrooms);
    if (bathrooms) query.bathrooms = parseInt(bathrooms);
    if (furnished) query.furnishing = furnished;
    
    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }

    // Amenities
    if (amenities) {
      const amenitiesList = amenities.split(',');
      query.amenities = { $all: amenitiesList };
    }

    // Location-based search
    if (lat && lng && radius) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius)
        }
      };
    }

    // Sorting
    let sortOption = {};
    switch (sort) {
      case 'price_asc':
        sortOption = { price: 1 };
        break;
      case 'price_desc':
        sortOption = { price: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'most_viewed':
        sortOption = { 'metrics.views': -1 };
        break;
      case 'highest_rated':
        sortOption = { 'metrics.averageRating': -1 };
        break;
      case 'newest':
      default:
        sortOption = { createdAt: -1, featured: -1 };
        break;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get featured properties first if on first page
    if (parseInt(page) === 1 && sort === 'newest') {
      sortOption = { featured: -1, createdAt: -1 };
    }

    const [properties, total] = await Promise.all([
      Property.find(query)
        .populate('landlordId', 'name email phone profileImage isVerified stats.averageRating')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit)),
      Property.countDocuments(query)
    ]);

    // Get district stats for comparison
    const districtStats = {};
    if (district) {
      const districtData = MOGADISHU_DISTRICTS.find(d => d.id === district);
      if (districtData) {
        const avgPrice = await Property.aggregate([
          { $match: { 'location.district': district, status: 'available' } },
          { $group: { _id: null, avgPrice: { $avg: '$price' } } }
        ]);
        districtStats.avgPrice = avgPrice[0]?.avgPrice || 0;
        districtStats.totalProperties = await Property.countDocuments({ 'location.district': district, status: 'available' });
      }
    }

    res.status(200).json({
      success: true,
      count: properties.length,
      total,
      data: properties,
      districtStats,
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

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
const getProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('landlordId', 'name email phone profileImage bio isVerified stats createdAt');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if property is available or user is owner/admin
    if (property.status !== 'available' && 
        (!req.user || (req.user.id !== property.landlordId._id.toString() && req.user.role !== 'admin'))) {
      return res.status(403).json({
        success: false,
        message: 'This property is not available'
      });
    }

    // Increment views
    await property.incrementViews(req.user?.id);

    // Check if user has favorited this property
    let isFavorite = false;
    if (req.user) {
      const favorite = await Favorite.findOne({
        tenantId: req.user.id,
        propertyId: property._id
      });
      isFavorite = !!favorite;
    }

    // Get similar properties
    const similarProperties = await Property.find({
      _id: { $ne: property._id },
      'location.district': property.location.district,
      type: property.type,
      status: 'available',
      price: { $gte: property.price * 0.7, $lte: property.price * 1.3 }
    })
    .limit(5)
    .select('title price images type location.district metrics.averageRating');

    res.status(200).json({
      success: true,
      data: property,
      isFavorite,
      similar: similarProperties
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create property
// @route   POST /api/properties
// @access  Private (Landlord)
const createProperty = async (req, res, next) => {
  try {
    const propertyData = {
      ...req.body,
      landlordId: req.user.id,
      status: 'pending',
      'location.coordinates': {
        lat: parseFloat(req.body.lat) || 2.0333,
        lng: parseFloat(req.body.lng) || 45.3333
      }
    };

    // Parse amenities if provided as string
    if (req.body.amenities && typeof req.body.amenities === 'string') {
      propertyData.amenities = req.body.amenities.split(',').map(a => a.trim());
    }

    // Parse rules if provided
    if (req.body.rules && typeof req.body.rules === 'string') {
      propertyData.rules = JSON.parse(req.body.rules);
    }

    // Handle images
    if (req.files && req.files.length > 0) {
      propertyData.images = req.files.map((file, index) => ({
        url: `/uploads/properties/${file.filename}`,
        thumbnail: `/uploads/properties/${file.filename}`,
        isPrimary: index === 0,
        order: index
      }));
    }

    const property = await Property.create(propertyData);

    // Update user property count
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.propertyCount': 1, 'stats.activeListings': 1 }
    });

    // Create notification for admin
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await notificationService.createNotification(admin._id, 'property_created', {
        propertyTitle: property.title,
        propertyId: property._id,
        landlordName: req.user.name
      });
    }

    // Create notification for landlord
    await notificationService.createNotification(req.user.id, 'property_created', {
      propertyTitle: property.title,
      propertyId: property._id
    });

    res.status(201).json({
      success: true,
      message: 'Property created successfully and pending approval',
      data: property
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (Landlord/Admin)
const updateProperty = async (req, res, next) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check ownership
    if (property.landlordId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property'
      });
    }

    const updateData = { ...req.body };

    // Handle coordinates
    if (req.body.lat && req.body.lng) {
      updateData['location.coordinates'] = {
        lat: parseFloat(req.body.lat),
        lng: parseFloat(req.body.lng)
      };
    }

    // Handle amenities
    if (req.body.amenities && typeof req.body.amenities === 'string') {
      updateData.amenities = req.body.amenities.split(',').map(a => a.trim());
    }

    // Handle new images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file, index) => ({
        url: `/uploads/properties/${file.filename}`,
        thumbnail: `/uploads/properties/${file.filename}`,
        isPrimary: property.images.length === 0 && index === 0,
        order: property.images.length + index
      }));
      
      updateData.images = [...property.images, ...newImages];
    }

    // If status changes to pending (for admin edits)
    if (req.user.role === 'admin' && updateData.status === 'pending') {
      updateData.verifiedAt = null;
      updateData.verifiedBy = null;
    }

    property = await Property.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Create notification for landlord if status changed
    if (updateData.status && updateData.status !== property.status) {
      await notificationService.createNotification(property.landlordId, `property_${updateData.status}`, {
        propertyTitle: property.title,
        propertyId: property._id,
        reason: updateData.rejectionReason
      });
    }

    res.status(200).json({
      success: true,
      message: 'Property updated successfully',
      data: property
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (Landlord/Admin)
const deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check ownership
    if (property.landlordId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this property'
      });
    }

    await property.deleteOne();

    // Update user property count
    await User.findByIdAndUpdate(property.landlordId, {
      $inc: { 'stats.propertyCount': -1, 'stats.activeListings': -1 }
    });

    res.status(200).json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search properties
// @route   GET /api/properties/search
// @access  Public
const searchProperties = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [properties, total] = await Promise.all([
      Property.find(
        { $text: { $search: q }, status: 'available' },
        { score: { $meta: 'textScore' } }
      )
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('landlordId', 'name email phone profileImage'),
      Property.countDocuments({ $text: { $search: q }, status: 'available' })
    ]);

    res.status(200).json({
      success: true,
      count: properties.length,
      total,
      data: properties,
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

// @desc    Get landlord properties
// @route   GET /api/properties/landlord/:id
// @access  Public
const getLandlordProperties = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { landlordId: req.params.id };
    
    // Only show available properties to public
    if (!req.user || (req.user.id !== req.params.id && req.user.role !== 'admin')) {
      query.status = 'available';
    }

    const [properties, total] = await Promise.all([
      Property.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Property.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: properties.length,
      total,
      data: properties,
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

// @desc    Price comparison
// @route   GET /api/properties/price-comparison
// @access  Public
const getPriceComparison = async (req, res, next) => {
  try {
    const { district, type } = req.query;

    const matchStage = { status: 'available' };
    if (district) matchStage['location.district'] = district;
    if (type) matchStage.type = type;

    const comparison = await Property.aggregate([
      { $match: matchStage },
      { $group: {
        _id: {
          district: '$location.district',
          type: '$type',
          bedrooms: '$bedrooms'
        },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        count: { $sum: 1 }
      }},
      { $sort: { '_id.district': 1, '_id.type': 1, '_id.bedrooms': 1 } }
    ]);

    // Get overall district averages
    const districtAverages = await Property.aggregate([
      { $match: { status: 'available' } },
      { $group: {
        _id: '$location.district',
        avgPrice: { $avg: '$price' },
        count: { $sum: 1 }
      }},
      { $sort: { avgPrice: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        breakdown: comparison,
        districtAverages,
        cheapestDistrict: districtAverages[0],
        mostExpensiveDistrict: districtAverages[districtAverages.length - 1]
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get nearby properties
// @route   GET /api/properties/nearby
// @access  Public
const getNearbyProperties = async (req, res, next) => {
  try {
    const { lat, lng, radius = 5000, limit = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const properties = await Property.find({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius)
        }
      },
      status: 'available'
    })
    .limit(parseInt(limit))
    .populate('landlordId', 'name profileImage');

    res.status(200).json({
      success: true,
      count: properties.length,
      data: properties
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle favorite
// @route   POST /api/properties/:id/favorite
// @access  Private
const toggleFavorite = async (req, res, next) => {
  try {
    const propertyId = req.params.id;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    let favorite = await Favorite.findOne({
      tenantId: req.user.id,
      propertyId
    });

    if (favorite) {
      // Remove from favorites
      await favorite.deleteOne();
      
      // Update property metrics
      property.metrics.favorites -= 1;
      await property.save();

      res.status(200).json({
        success: true,
        message: 'Property removed from favorites',
        isFavorite: false
      });
    } else {
      // Add to favorites
      favorite = await Favorite.create({
        tenantId: req.user.id,
        propertyId
      });

      // Update property metrics
      property.metrics.favorites += 1;
      await property.save();

      res.status(200).json({
        success: true,
        message: 'Property added to favorites',
        isFavorite: true,
        data: favorite
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get property analytics
// @route   GET /api/properties/:id/analytics
// @access  Private (Landlord/Admin)
const getPropertyAnalytics = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check ownership
    if (property.landlordId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view analytics'
      });
    }

    const Booking = require('../models/Booking');
    const Inquiry = require('../models/Inquiry');
    const Review = require('../models/Review');

    // Get bookings statistics
    const bookings = await Booking.aggregate([
      { $match: { propertyId: property._id } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        revenue: { $sum: '$totalPrice' }
      }}
    ]);

    // Get monthly views
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyViews = await Booking.aggregate([
      { $match: { 
        propertyId: property._id,
        createdAt: { $gte: thirtyDaysAgo }
      }},
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        views: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Get inquiry statistics
    const inquiries = await Inquiry.countDocuments({ propertyId: property._id });

    // Get review statistics
    const reviews = await Review.find({ propertyId: property._id })
      .select('ratings createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        metrics: property.metrics,
        bookings: {
          total: bookings.reduce((acc, curr) => acc + curr.count, 0),
          byStatus: bookings,
          revenue: bookings.reduce((acc, curr) => acc + (curr.revenue || 0), 0)
        },
        dailyViews,
        inquiries,
        recentReviews: reviews.slice(0, 5)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  searchProperties,
  getLandlordProperties,
  getPriceComparison,
  getNearbyProperties,
  toggleFavorite,
  getPropertyAnalytics
};