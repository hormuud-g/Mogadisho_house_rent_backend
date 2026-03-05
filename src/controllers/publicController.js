const { MOGADISHU_DISTRICTS } = require('../constants/districts');
const { PROPERTY_TYPES, AMENITIES } = require('../constants/property');
const Property = require('../models/Property');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

// @desc    Get Mogadishu districts
// @route   GET /api/public/districts
// @access  Public
const getDistricts = async (req, res) => {
  // Add market stats to districts
  const districtsWithStats = await Promise.all(
    MOGADISHU_DISTRICTS.map(async (district) => {
      const stats = await Property.aggregate([
        { $match: { 'location.district': district.id, status: 'available' } },
        { $group: {
          _id: null,
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          count: { $sum: 1 },
          avgSize: { $avg: '$size' }
        }}
      ]);

      return {
        ...district,
        marketStats: stats[0] || {
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          count: 0,
          avgSize: 0
        }
      };
    })
  );

  res.status(200).json({
    success: true,
    data: districtsWithStats
  });
};

// @desc    Get district details
// @route   GET /api/public/districts/:id
// @access  Public
const getDistrictDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const district = MOGADISHU_DISTRICTS.find(d => d.id === id);
    
    if (!district) {
      return res.status(404).json({
        success: false,
        message: 'District not found'
      });
    }

    // Get market statistics
    const marketStats = await Property.aggregate([
      { $match: { 'location.district': id, status: 'available' } },
      { $group: {
        _id: null,
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        count: { $sum: 1 },
        totalViews: { $sum: '$metrics.views' },
        avgBedrooms: { $avg: '$bedrooms' },
        avgBathrooms: { $avg: '$bathrooms' },
        avgSize: { $avg: '$size' }
      }}
    ]);

    // Get property types distribution
    const typeDistribution = await Property.aggregate([
      { $match: { 'location.district': id, status: 'available' } },
      { $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' }
      }},
      { $sort: { count: -1 } }
    ]);

    // Get price trends by bedroom count
    const priceByBedrooms = await Property.aggregate([
      { $match: { 'location.district': id, status: 'available', bedrooms: { $gt: 0 } } },
      { $group: {
        _id: '$bedrooms',
        avgPrice: { $avg: '$price' },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Get popular amenities
    const popularAmenities = await Property.aggregate([
      { $match: { 'location.district': id, status: 'available' } },
      { $unwind: '$amenities' },
      { $group: {
        _id: '$amenities',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get nearby landmarks (would typically come from a separate service)
    const landmarks = [
      { name: 'Central Market', type: 'shopping', distance: 2.5 },
      { name: 'City Hospital', type: 'healthcare', distance: 3.1 },
      { name: 'University', type: 'education', distance: 4.2 },
      { name: 'Beach', type: 'recreation', distance: 5.0 }
    ];

    res.status(200).json({
      success: true,
      data: {
        ...district,
        marketStats: marketStats[0] || {
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          count: 0,
          totalViews: 0
        },
        typeDistribution,
        priceByBedrooms,
        popularAmenities: popularAmenities.map(a => ({
          amenity: a._id,
          count: a.count,
          percentage: Math.round((a.count / (marketStats[0]?.count || 1)) * 100)
        })),
        landmarks,
        transportation: {
          bus: true,
          taxi: true,
          bodaBoda: district.zone !== 'Coastal'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get property types
// @route   GET /api/public/property-types
// @access  Public
const getPropertyTypes = async (req, res) => {
  const typesWithStats = await Promise.all(
    PROPERTY_TYPES.map(async (type) => {
      const stats = await Property.aggregate([
        { $match: { type, status: 'available' } },
        { $group: {
          _id: null,
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }}
      ]);

      return {
        type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
        count: stats[0]?.count || 0,
        avgPrice: stats[0]?.avgPrice || 0,
        minPrice: stats[0]?.minPrice || 0,
        maxPrice: stats[0]?.maxPrice || 0
      };
    })
  );

  res.status(200).json({
    success: true,
    data: typesWithStats
  });
};

// @desc    Get amenities list
// @route   GET /api/public/amenities
// @access  Public
const getAmenities = async (req, res) => {
  const amenitiesWithStats = await Promise.all(
    AMENITIES.map(async (amenity) => {
      const count = await Property.countDocuments({
        amenities: amenity,
        status: 'available'
      });

      const totalProperties = await Property.countDocuments({ status: 'available' });

      return {
        id: amenity,
        name: amenity.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        category: getAmenityCategory(amenity),
        count,
        percentage: totalProperties > 0 ? Math.round((count / totalProperties) * 100) : 0
      };
    })
  );

  // Group by category
  const grouped = amenitiesWithStats.reduce((acc, amenity) => {
    if (!acc[amenity.category]) {
      acc[amenity.category] = [];
    }
    acc[amenity.category].push(amenity);
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    data: {
      list: amenitiesWithStats,
      grouped
    }
  });
};

// Helper function to categorize amenities
const getAmenityCategory = (amenity) => {
  const categories = {
    basic: ['wifi', 'water_tank', 'security'],
    comfort: ['ac', 'furnished', 'kitchen', 'balcony', 'terrace'],
    luxury: ['swimming_pool', 'gym', 'garden', 'playground'],
    safety: ['cctv', 'guard', 'fire_extinguisher', 'emergency_exit'],
    convenience: ['parking', 'elevator', 'laundry', 'storage', 'generator']
  };

  for (const [category, items] of Object.entries(categories)) {
    if (items.includes(amenity)) {
      return category;
    }
  }
  return 'other';
};

// @desc    Get FAQs
// @route   GET /api/public/faqs
// @access  Public
const getFaqs = async (req, res) => {
  const faqs = [
    {
      category: 'General',
      questions: [
        {
          question: 'What is Kirada Guryaha?',
          answer: 'Kirada Guryaha is a rental property platform specifically designed for Mogadishu, connecting landlords with tenants. It allows users to list, search, and book properties across all districts of Mogadishu.'
        },
        {
          question: 'Is Kirada Guryaha free to use?',
          answer: 'Yes, Kirada Guryaha is completely free for both tenants and landlords. We do not charge any fees for listing properties, making inquiries, or booking properties.'
        },
        {
          question: 'How do I register?',
          answer: 'Click on the "Sign Up" button and fill in your details including name, email, phone number, and password. You can register as either a tenant or landlord.'
        }
      ]
    },
    {
      category: 'For Tenants',
      questions: [
        {
          question: 'How do I search for properties?',
          answer: 'You can search for properties using filters like district, price range, property type, number of bedrooms, and amenities. You can also view properties on a map or search by keyword.'
        },
        {
          question: 'How do I book a property?',
          answer: 'Once you find a property you like, click on it to view details. Then click the "Book Now" button, select your dates, and submit a booking request. The landlord will confirm your request.'
        },
        {
          question: 'Can I contact the landlord before booking?',
          answer: 'Yes, you can send an inquiry to the landlord through the platform. Click on "Contact Landlord" and send your questions directly.'
        },
        {
          question: 'How do I leave a review?',
          answer: 'After your stay is completed, you can leave a review on the property page. Your review will help other tenants make informed decisions.'
        }
      ]
    },
    {
      category: 'For Landlords',
      questions: [
        {
          question: 'How do I list my property?',
          answer: 'After registering as a landlord and getting verified, go to your dashboard and click "Add Property". Fill in all the details about your property, upload photos, and submit for approval.'
        },
        {
          question: 'How does verification work?',
          answer: 'Landlords need to submit verification documents (ID, proof of ownership) to ensure the authenticity of listings. An admin will review and verify your account.'
        },
        {
          question: 'How do I manage bookings?',
          answer: 'When a tenant sends a booking request, you\'ll receive a notification. You can view, confirm, or cancel bookings from your dashboard.'
        },
        {
          question: 'Can I respond to inquiries?',
          answer: 'Yes, you can reply to tenant inquiries directly through the platform. Quick responses help build trust with potential tenants.'
        }
      ]
    },
    {
      category: 'Safety & Security',
      questions: [
        {
          question: 'How do you prevent scams?',
          answer: 'We verify all landlords and their properties before they can be listed. We also monitor all communications and have a reporting system for suspicious activity.'
        },
        {
          question: 'What should I do if I encounter a suspicious listing?',
          answer: 'Use the "Report" button on the property page to report any suspicious listings. Our admin team will review and take appropriate action.'
        },
        {
          question: 'Is my personal information safe?',
          answer: 'Yes, we use industry-standard encryption and security measures to protect your personal information. We never share your data with third parties without your consent.'
        }
      ]
    },
    {
      category: 'Payments',
      questions: [
        {
          question: 'How do payments work?',
          answer: 'Kirada Guryaha does not handle any payments. All payments are arranged directly between tenants and landlords. We recommend using secure payment methods and getting receipts.'
        },
        {
          question: 'Do you charge any fees?',
          answer: 'No, Kirada Guryaha is completely free to use. There are no listing fees, booking fees, or service charges.'
        }
      ]
    },
    {
      category: 'Technical Support',
      questions: [
        {
          question: 'I forgot my password. What should I do?',
          answer: 'Click on "Forgot Password" on the login page and enter your email address. You\'ll receive a link to reset your password.'
        },
        {
          question: 'How do I update my profile information?',
          answer: 'Go to your profile settings where you can update your name, phone number, bio, and preferences.'
        },
        {
          question: 'I\'m having technical issues. Who do I contact?',
          answer: 'Please email our support team at cabdirahmanjmaxamad@gmail.com or call +252 61 9655335. We\'re here to help!'
        }
      ]
    }
  ];

  res.status(200).json({
    success: true,
    data: faqs
  });
};

// @desc    Get market overview
// @route   GET /api/public/market-overview
// @access  Public
const getMarketOverview = async (req, res, next) => {
  try {
    const [
      totalProperties,
      totalLandlords,
      averagePrice,
      priceRange,
      districtBreakdown,
      recentListings
    ] = await Promise.all([
      Property.countDocuments({ status: 'available' }),
      User.countDocuments({ role: 'landlord', status: 'active' }),
      Property.aggregate([
        { $match: { status: 'available' } },
        { $group: { _id: null, avg: { $avg: '$price' } } }
      ]),
      Property.aggregate([
        { $match: { status: 'available' } },
        { $group: {
          _id: null,
          min: { $min: '$price' },
          max: { $max: '$price' }
        }}
      ]),
      Property.aggregate([
        { $match: { status: 'available' } },
        { $group: {
          _id: '$location.district',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        } },
        { $sort: { count: -1 } }
      ]),
      Property.find({ status: 'available' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title price type location.district images')
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalProperties,
        totalLandlords,
        averagePrice: averagePrice[0]?.avg || 0,
        priceRange: {
          min: priceRange[0]?.min || 0,
          max: priceRange[0]?.max || 0
        },
        districtBreakdown,
        recentListings
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform stats
// @route   GET /api/public/stats
// @access  Public
const getPlatformStats = async (req, res, next) => {
  try {
    const stats = {
      users: {
        total: await User.countDocuments({ status: 'active' }),
        tenants: await User.countDocuments({ role: 'tenant', status: 'active' }),
        landlords: await User.countDocuments({ role: 'landlord', status: 'active' })
      },
      properties: {
        total: await Property.countDocuments({ status: 'available' }),
        byType: await Property.aggregate([
          { $match: { status: 'available' } },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ])
      },
      bookings: {
        total: await Booking.countDocuments(),
        completed: await Booking.countDocuments({ status: 'completed' })
      },
      reviews: {
        total: await Review.countDocuments({ moderationStatus: 'approved' }),
        averageRating: await Review.aggregate([
          { $match: { moderationStatus: 'approved' } },
          { $group: { _id: null, avg: { $avg: '$ratings.overall' } } }
        ])
      }
    };

    // Get average rating value
    const avgRating = stats.reviews.averageRating[0]?.avg || 0;
    stats.reviews.averageRating = avgRating;

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get contact information
// @route   GET /api/public/contact
// @access  Public
const getContactInfo = async (req, res) => {
  const contact = {
    email: 'cabdirahmanjmaxamad@gmail.com',
    phone: '+252 61 9655335',
    address: 'Karaan District, Mogadishu, Somalia',
    hours: '9 AM - 5 PM (Sat-Thu)',
    socialMedia: {
      facebook: 'https://facebook.com/kiradaguryaha',
      twitter: 'https://twitter.com/kiradaguryaha',
      instagram: 'https://instagram.com/kiradaguryaha'
    }
  };

  res.status(200).json({
    success: true,
    data: contact
  });
};

// @desc    Get about information
// @route   GET /api/public/about
// @access  Public
const getAboutInfo = async (req, res) => {
  const about = {
    name: 'Kirada Guryaha',
    description: 'Mogadishu\'s Premier Rental Property Platform',
    mission: 'To digitize the rental property market in Mogadishu, provide verified landlord system to prevent scams, enable price comparison across different districts, and create a trusted platform for tenants.',
    vision: 'To become the most trusted and widely used rental platform in Somalia, connecting landlords with tenants seamlessly and securely.',
    values: [
      'Trust - We verify all landlords and properties',
      'Transparency - Clear information and no hidden fees',
      'Community - Supporting local landlords and tenants',
      'Innovation - Modern solutions for traditional markets'
    ],
    founded: 2024,
    team: [
      {
        name: 'Cabdirahman Maxamad',
        role: 'Founder & Lead Developer',
        email: 'cabdirahmanjmaxamad@gmail.com'
      }
    ]
  };

  res.status(200).json({
    success: true,
    data: about
  });
};

// @desc    Health check
// @route   GET /api/public/health
// @access  Public
const healthCheck = async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    database: await checkDatabaseHealth(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };

  res.status(200).json({
    success: true,
    data: health
  });
};

// Helper function to check database health
const checkDatabaseHealth = async () => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      return 'connected';
    }
    return 'disconnected';
  } catch (error) {
    return 'error';
  }
};

// @desc    Get version info
// @route   GET /api/public/version
// @access  Public
const getVersion = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      version: process.env.npm_package_version || '1.0.0',
      apiVersion: 'v1',
      name: 'Kirada Guryaha API',
      description: 'Rental Property Platform API - Mogadishu District'
    }
  });
};

// @desc    Search across platform
// @route   GET /api/public/search
// @access  Public
const globalSearch = async (req, res, next) => {
  try {
    const { q, type = 'all', limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const results = {};

    if (type === 'all' || type === 'properties') {
      results.properties = await Property.find(
        { 
          $text: { $search: q },
          status: 'available'
        },
        { score: { $meta: 'textScore' } }
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(parseInt(limit))
      .select('title description price type location.district images');
    }

    if (type === 'all' || type === 'landlords') {
      results.landlords = await User.find(
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } }
          ],
          role: 'landlord',
          status: 'active'
        }
      )
      .limit(parseInt(limit))
      .select('name email profileImage bio stats');
    }

    if (type === 'all' || type === 'districts') {
      results.districts = MOGADISHU_DISTRICTS.filter(d => 
        d.name.toLowerCase().includes(q.toLowerCase()) ||
        d.somali.toLowerCase().includes(q.toLowerCase())
      );
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDistricts,
  getDistrictDetails,
  getPropertyTypes,
  getAmenities,
  getFaqs,
  getMarketOverview,
  getPlatformStats,
  getContactInfo,
  getAboutInfo,
  healthCheck,
  getVersion,
  globalSearch
};