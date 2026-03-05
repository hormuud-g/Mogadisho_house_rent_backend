const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { MOGADISHU_DISTRICTS } = require('../constants/districts');

class PropertyService {
  // Calculate property statistics
  async calculatePropertyStats(propertyId) {
    try {
      const [bookings, reviews, averageRating] = await Promise.all([
        Booking.countDocuments({ propertyId }),
        Review.countDocuments({ propertyId, moderationStatus: 'approved' }),
        Review.aggregate([
          { $match: { propertyId: mongoose.Types.ObjectId(propertyId), moderationStatus: 'approved' } },
          { $group: { _id: null, avg: { $avg: '$ratings.overall' } } }
        ])
      ]);

      return {
        totalBookings: bookings,
        totalReviews: reviews,
        averageRating: averageRating[0]?.avg || 0
      };
    } catch (error) {
      console.error('Error calculating property stats:', error);
      throw error;
    }
  }

  // Check property availability for dates
  async checkAvailability(propertyId, checkIn, checkOut) {
    try {
      const conflictingBooking = await Booking.findOne({
        propertyId,
        status: { $in: ['confirmed', 'pending'] },
        $or: [
          { checkIn: { $lt: checkOut, $gte: checkIn } },
          { checkOut: { $gt: checkIn, $lte: checkOut } },
          { checkIn: { $lte: checkIn }, checkOut: { $gte: checkOut } }
        ]
      });

      return !conflictingBooking;
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }

  // Get price comparison across districts
  async getPriceComparison(district = null, type = null) {
    try {
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
          count: { $sum: 1 },
          avgSize: { $avg: '$size' }
        }},
        { $sort: { '_id.district': 1, '_id.type': 1, '_id.bedrooms': 1 } }
      ]);

      // Get overall district averages
      const districtAverages = await Property.aggregate([
        { $match: { status: 'available' } },
        { $group: {
          _id: '$location.district',
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          count: { $sum: 1 },
          totalValue: { $sum: '$price' }
        }},
        { $addFields: {
          marketShare: { $multiply: [{ $divide: ['$count', { $sum: '$count' }] }, 100] }
        }},
        { $sort: { avgPrice: 1 } }
      ]);

      // Calculate market trends
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentPrices = await Property.aggregate([
        { $match: { status: 'available', createdAt: { $gte: thirtyDaysAgo } } },
        { $group: {
          _id: null,
          avgPrice: { $avg: '$price' }
        }}
      ]);

      const allTimeAvg = await Property.aggregate([
        { $match: { status: 'available' } },
        { $group: { _id: null, avgPrice: { $avg: '$price' } } }
      ]);

      const trend = recentPrices[0]?.avgPrice > allTimeAvg[0]?.avgPrice ? 'up' : 'down';
      const percentageChange = allTimeAvg[0]?.avgPrice 
        ? ((recentPrices[0]?.avgPrice - allTimeAvg[0]?.avgPrice) / allTimeAvg[0]?.avgPrice) * 100 
        : 0;

      return {
        breakdown: comparison,
        districtAverages,
        marketTrends: {
          trend,
          percentageChange: Math.abs(percentageChange).toFixed(1),
          recentAverage: recentPrices[0]?.avgPrice || 0,
          overallAverage: allTimeAvg[0]?.avgPrice || 0
        },
        cheapestDistrict: districtAverages[0],
        mostExpensiveDistrict: districtAverages[districtAverages.length - 1],
        totalListings: districtAverages.reduce((acc, curr) => acc + curr.count, 0),
        totalValue: districtAverages.reduce((acc, curr) => acc + curr.totalValue, 0)
      };
    } catch (error) {
      console.error('Error getting price comparison:', error);
      throw error;
    }
  }

  // Get similar properties
  async getSimilarProperties(propertyId, limit = 5) {
    try {
      const property = await Property.findById(propertyId);
      if (!property) return [];

      const similar = await Property.find({
        _id: { $ne: propertyId },
        status: 'available',
        type: property.type,
        'location.district': property.location.district,
        price: { $gte: property.price * 0.7, $lte: property.price * 1.3 },
        bedrooms: { $gte: Math.max(0, property.bedrooms - 1), $lte: property.bedrooms + 1 }
      })
      .populate('landlordId', 'name profileImage')
      .limit(limit)
      .select('title price images type location.district bedrooms bathrooms metrics.averageRating');

      return similar;
    } catch (error) {
      console.error('Error getting similar properties:', error);
      throw error;
    }
  }

  // Get featured properties
  async getFeaturedProperties(limit = 10) {
    try {
      return await Property.find({
        featured: true,
        status: 'available'
      })
      .populate('landlordId', 'name profileImage')
      .sort({ featuredUntil: -1, 'metrics.views': -1 })
      .limit(limit)
      .select('title price images type location.district bedrooms bathrooms metrics.averageRating featuredUntil');
    } catch (error) {
      console.error('Error getting featured properties:', error);
      throw error;
    }
  }

  // Get properties by district with statistics
  async getPropertiesByDistrict(district, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const [properties, total, stats] = await Promise.all([
        Property.find({
          'location.district': district,
          status: 'available'
        })
        .populate('landlordId', 'name profileImage')
        .sort({ featured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
        Property.countDocuments({ 'location.district': district, status: 'available' }),
        Property.aggregate([
          { $match: { 'location.district': district, status: 'available' } },
          { $group: {
            _id: null,
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            totalListings: { $sum: 1 },
            avgBedrooms: { $avg: '$bedrooms' },
            avgBathrooms: { $avg: '$bathrooms' },
            avgSize: { $avg: '$size' }
          }}
        ])
      ]);

      return {
        properties,
        stats: stats[0] || {
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          totalListings: 0,
          avgBedrooms: 0,
          avgBathrooms: 0,
          avgSize: 0
        },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting properties by district:', error);
      throw error;
    }
  }

  // Get property recommendations for user
  async getRecommendationsForUser(userId, limit = 10) {
    try {
      // Get user's search history and favorites
      const Favorite = require('../models/Favorite');
      const favorites = await Favorite.find({ tenantId: userId }).populate('propertyId');
      
      // Extract preferred districts and types from favorites
      const preferredDistricts = favorites.map(f => f.propertyId?.location?.district).filter(Boolean);
      const preferredTypes = favorites.map(f => f.propertyId?.type).filter(Boolean);

      // Build recommendation query
      const query = { status: 'available' };
      
      if (preferredDistricts.length > 0) {
        query['location.district'] = { $in: preferredDistricts };
      }
      
      if (preferredTypes.length > 0) {
        query.type = { $in: preferredTypes };
      }

      // Get recommendations
      const recommendations = await Property.find(query)
        .populate('landlordId', 'name profileImage')
        .sort({ 'metrics.views': -1, 'metrics.averageRating': -1 })
        .limit(limit)
        .select('title price images type location.district bedrooms bathrooms metrics.averageRating');

      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw error;
    }
  }

  // Validate property data
  validatePropertyData(data) {
    const errors = [];

    // Required fields
    const required = ['title', 'description', 'price', 'type', 'bedrooms', 'bathrooms', 'size', 'location'];
    required.forEach(field => {
      if (!data[field]) {
        errors.push(`${field} is required`);
      }
    });

    // Price validation
    if (data.price && (data.price < 1 || data.price > 1000000)) {
      errors.push('Price must be between 1 and 1,000,000');
    }

    // Bedrooms validation
    if (data.bedrooms && (data.bedrooms < 0 || data.bedrooms > 20)) {
      errors.push('Bedrooms must be between 0 and 20');
    }

    // Bathrooms validation
    if (data.bathrooms && (data.bathrooms < 0 || data.bathrooms > 20)) {
      errors.push('Bathrooms must be between 0 and 20');
    }

    // Size validation
    if (data.size && data.size < 1) {
      errors.push('Size must be greater than 0');
    }

    // District validation
    if (data.location?.district) {
      const validDistricts = MOGADISHU_DISTRICTS.map(d => d.id);
      if (!validDistricts.includes(data.location.district)) {
        errors.push('Invalid district');
      }
    }

    // Type validation
    const validTypes = ['apartment', 'house', 'room', 'office', 'shop', 'land', 'villa', 'commercial', 'warehouse', 'studio'];
    if (data.type && !validTypes.includes(data.type)) {
      errors.push('Invalid property type');
    }

    return errors;
  }

  // Calculate estimated rental income
  calculateEstimatedIncome(property) {
    const occupancyRate = 0.7; // 70% occupancy
    const monthlyRevenue = property.price * occupancyRate;
    const yearlyRevenue = monthlyRevenue * 12;
    
    // Simple ROI calculation (assuming property value = 200 * monthly rent)
    const estimatedValue = property.price * 200;
    const roi = (yearlyRevenue / estimatedValue) * 100;

    return {
      monthlyRevenue: Math.round(monthlyRevenue),
      yearlyRevenue: Math.round(yearlyRevenue),
      estimatedValue: Math.round(estimatedValue),
      roi: Math.round(roi * 10) / 10,
      occupancyRate: occupancyRate * 100
    };
  }

  // Get market insights for a property
  async getMarketInsights(property) {
    try {
      // Get comparable properties in the same district
      const comparables = await Property.find({
        'location.district': property.location.district,
        type: property.type,
        status: 'available',
        price: { $gte: property.price * 0.8, $lte: property.price * 1.2 }
      }).limit(10);

      const avgComparablePrice = comparables.reduce((sum, p) => sum + p.price, 0) / comparables.length;

      return {
        pricePosition: property.price > avgComparablePrice ? 'above' : (property.price < avgComparablePrice ? 'below' : 'average'),
        priceDifference: Math.abs(((property.price - avgComparablePrice) / avgComparablePrice) * 100).toFixed(1),
        avgComparablePrice: Math.round(avgComparablePrice),
        comparableCount: comparables.length,
        districtRank: await this.getDistrictPriceRank(property),
        demandScore: await this.calculateDemandScore(property)
      };
    } catch (error) {
      console.error('Error getting market insights:', error);
      throw error;
    }
  }

  // Get district price rank
  async getDistrictPriceRank(property) {
    try {
      const districtPrices = await Property.aggregate([
        { $match: { 'location.district': property.location.district, status: 'available' } },
        { $group: {
          _id: null,
          avgPrice: { $avg: '$price' }
        }}
      ]);

      const allDistricts = await Property.aggregate([
        { $match: { status: 'available' } },
        { $group: {
          _id: '$location.district',
          avgPrice: { $avg: '$price' }
        }},
        { $sort: { avgPrice: -1 } }
      ]);

      const rank = allDistricts.findIndex(d => d._id === property.location.district) + 1;
      const total = allDistricts.length;

      return {
        rank,
        total,
        percentile: ((total - rank) / total * 100).toFixed(0)
      };
    } catch (error) {
      console.error('Error getting district price rank:', error);
      throw error;
    }
  }

  // Calculate demand score for property
  async calculateDemandScore(property) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [views, inquiries, favorites] = await Promise.all([
        property.metrics?.views || 0,
        property.metrics?.inquiries || 0,
        property.metrics?.favorites || 0
      ]);

      // Calculate score based on recent activity
      const viewScore = Math.min(views / 100, 10) * 3;
      const inquiryScore = Math.min(inquiries, 20) * 2;
      const favoriteScore = Math.min(favorites, 30) * 1.5;

      const totalScore = viewScore + inquiryScore + favoriteScore;
      
      // Normalize to 0-100
      const normalizedScore = Math.min(Math.round(totalScore), 100);

      let level = 'Low';
      if (normalizedScore >= 70) level = 'High';
      else if (normalizedScore >= 40) level = 'Medium';

      return {
        score: normalizedScore,
        level,
        components: {
          views: viewScore,
          inquiries: inquiryScore,
          favorites: favoriteScore
        }
      };
    } catch (error) {
      console.error('Error calculating demand score:', error);
      throw error;
    }
  }
}

module.exports = new PropertyService();