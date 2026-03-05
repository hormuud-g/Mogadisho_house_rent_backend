const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

class IndexCreator {
  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kirada_guryaha');
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      process.exit(1);
    }
  }

  async createIndexes() {
    console.log('\n🔨 Creating database indexes...\n');

    // User indexes
    console.log('👤 Creating User indexes...');
    const User = mongoose.model('User', require('../src/models/User').schema);
    
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ phone: 1 }, { unique: true });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ status: 1 });
    await User.collection.createIndex({ createdAt: -1 });
    await User.collection.createIndex({ 'location.district': 1 });
    console.log('   ✅ User indexes created');

    // Property indexes
    console.log('\n🏠 Creating Property indexes...');
    const Property = mongoose.model('Property', require('../src/models/Property').schema);
    
    await Property.collection.createIndex({ title: 'text', description: 'text', 'location.address': 'text' });
    await Property.collection.createIndex({ 'location.district': 1 });
    await Property.collection.createIndex({ price: 1 });
    await Property.collection.createIndex({ type: 1 });
    await Property.collection.createIndex({ bedrooms: 1 });
    await Property.collection.createIndex({ bathrooms: 1 });
    await Property.collection.createIndex({ status: 1 });
    await Property.collection.createIndex({ landlordId: 1 });
    await Property.collection.createIndex({ featured: -1, createdAt: -1 });
    await Property.collection.createIndex({ 'metrics.views': -1 });
    await Property.collection.createIndex({ 'metrics.averageRating': -1 });
    await Property.collection.createIndex({ 'location.coordinates': '2dsphere' });
    console.log('   ✅ Property indexes created');

    // Booking indexes
    console.log('\n📅 Creating Booking indexes...');
    const Booking = mongoose.model('Booking', require('../src/models/Booking').schema);
    
    await Booking.collection.createIndex({ bookingNumber: 1 }, { unique: true });
    await Booking.collection.createIndex({ propertyId: 1 });
    await Booking.collection.createIndex({ tenantId: 1 });
    await Booking.collection.createIndex({ landlordId: 1 });
    await Booking.collection.createIndex({ status: 1 });
    await Booking.collection.createIndex({ checkIn: 1, checkOut: 1 });
    await Booking.collection.createIndex({ createdAt: -1 });
    console.log('   ✅ Booking indexes created');

    // Inquiry indexes
    console.log('\n💬 Creating Inquiry indexes...');
    const Inquiry = mongoose.model('Inquiry', require('../src/models/Inquiry').schema);
    
    await Inquiry.collection.createIndex({ inquiryNumber: 1 }, { unique: true });
    await Inquiry.collection.createIndex({ propertyId: 1 });
    await Inquiry.collection.createIndex({ tenantId: 1 });
    await Inquiry.collection.createIndex({ landlordId: 1 });
    await Inquiry.collection.createIndex({ status: 1 });
    await Inquiry.collection.createIndex({ createdAt: -1 });
    await Inquiry.collection.createIndex({ lastRepliedAt: -1 });
    console.log('   ✅ Inquiry indexes created');

    // Review indexes
    console.log('\n⭐ Creating Review indexes...');
    const Review = mongoose.model('Review', require('../src/models/Review').schema);
    
    await Review.collection.createIndex({ reviewNumber: 1 }, { unique: true });
    await Review.collection.createIndex({ propertyId: 1 });
    await Review.collection.createIndex({ tenantId: 1 });
    await Review.collection.createIndex({ bookingId: 1 }, { unique: true });
    await Review.collection.createIndex({ landlordId: 1 });
    await Review.collection.createIndex({ moderationStatus: 1 });
    await Review.collection.createIndex({ createdAt: -1 });
    await Review.collection.createIndex({ 'ratings.overall': -1 });
    console.log('   ✅ Review indexes created');

    // Favorite indexes
    console.log('\n❤️ Creating Favorite indexes...');
    const Favorite = mongoose.model('Favorite', require('../src/models/Favorite').schema);
    
    await Favorite.collection.createIndex({ tenantId: 1, propertyId: 1 }, { unique: true });
    await Favorite.collection.createIndex({ tenantId: 1, createdAt: -1 });
    await Favorite.collection.createIndex({ 'reminder.date': 1 });
    console.log('   ✅ Favorite indexes created');

    // Report indexes
    console.log('\n📋 Creating Report indexes...');
    const Report = mongoose.model('Report', require('../src/models/Report').schema);
    
    await Report.collection.createIndex({ reportNumber: 1 }, { unique: true });
    await Report.collection.createIndex({ reporterId: 1 });
    await Report.collection.createIndex({ reportedItemId: 1, reportedItemType: 1 });
    await Report.collection.createIndex({ status: 1 });
    await Report.collection.createIndex({ priority: -1, createdAt: 1 });
    console.log('   ✅ Report indexes created');

    // Notification indexes
    console.log('\n🔔 Creating Notification indexes...');
    const Notification = mongoose.model('Notification', require('../src/models/Notification').schema);
    
    await Notification.collection.createIndex({ userId: 1, createdAt: -1 });
    await Notification.collection.createIndex({ userId: 1, isRead: 1 });
    await Notification.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('   ✅ Notification indexes created');

    console.log('\n✅ All indexes created successfully!\n');
  }

  async listIndexes() {
    console.log('\n📋 Current indexes:\n');

    const collections = [
      'users',
      'properties',
      'bookings',
      'inquiries',
      'reviews',
      'favorites',
      'reports',
      'notifications'
    ];

    for (const collectionName of collections) {
      console.log(`\n${collectionName}:`);
      const indexes = await mongoose.connection.db.collection(collectionName).indexes();
      
      indexes.forEach(index => {
        const fields = Object.keys(index.key).join(', ');
        console.log(`   - ${index.name}: ${fields} (${Object.values(index.key).join(', ')})`);
        if (index.unique) console.log('     [unique]');
        if (index.sparse) console.log('     [sparse]');
        if (index.expireAfterSeconds) console.log(`     [TTL: ${index.expireAfterSeconds}s]`);
      });
    }
  }

  async dropIndexes() {
    console.log('\n⚠️  Dropping all indexes (except _id)...\n');

    const collections = [
      'users',
      'properties',
      'bookings',
      'inquiries',
      'reviews',
      'favorites',
      'reports',
      'notifications'
    ];

    for (const collectionName of collections) {
      try {
        await mongoose.connection.db.collection(collectionName).dropIndexes();
        console.log(`   ✅ Dropped indexes for ${collectionName}`);
      } catch (error) {
        console.error(`   ❌ Failed to drop indexes for ${collectionName}:`, error.message);
      }
    }

    console.log('\n✅ All indexes dropped\n');
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'create';

    await this.connect();

    switch (command) {
      case 'create':
        await this.createIndexes();
        break;
      case 'list':
        await this.listIndexes();
        break;
      case 'drop':
        await this.dropIndexes();
        break;
      case 'recreate':
        await this.dropIndexes();
        await this.createIndexes();
        break;
      default:
        console.log('Usage: node createIndexes.js [create|list|drop|recreate]');
        process.exit(1);
    }

    await mongoose.connection.close();
    process.exit(0);
  }
}

const indexCreator = new IndexCreator();
indexCreator.run();