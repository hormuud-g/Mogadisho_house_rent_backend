const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
const User = require('../src/models/User');
const Property = require('../src/models/Property');
const Booking = require('../src/models/Booking');
const Inquiry = require('../src/models/Inquiry');
const Review = require('../src/models/Review');
const Favorite = require('../src/models/Favorite');

// Mogadishu districts
const MOGADISHU_DISTRICTS = [
  { id: 'hodan', name: 'Hodan', somali: 'Hodan' },
  { id: 'waberi', name: 'Waberi', somali: 'Waberi' },
  { id: 'hawle-wadag', name: 'Hawle Wadag', somali: 'Hawle Wadag' },
  { id: 'karaan', name: 'Karaan', somali: 'Karaan' },
  { id: 'shangani', name: 'Shangani', somali: 'Shangaani' },
  { id: 'warta-nabada', name: 'Warta Nabada', somali: 'Warta Nabada' },
  { id: 'dharkenley', name: 'Dharkenley', somali: 'Dharkenley' },
  { id: 'kahda', name: 'Kahda', somali: 'Kahda' },
  { id: 'heliwa', name: 'Heliwa', somali: 'Heliwa' },
  { id: 'yaaqshiid', name: 'Yaaqshiid', somali: 'Yaaqshiid' }
];

// Property types
const PROPERTY_TYPES = ['apartment', 'house', 'room', 'office', 'shop', 'land'];

// Amenities
const AMENITIES = ['wifi', 'parking', 'security', 'generator', 'water_tank', 'ac', 'furnished', 'kitchen', 'balcony'];

class DatabaseSeeder {
  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kirada_guryaha');
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      process.exit(1);
    }
  }

  async clearDatabase() {
    console.log('\n🗑️  Clearing existing data...');
    
    await User.deleteMany({});
    await Property.deleteMany({});
    await Booking.deleteMany({});
    await Inquiry.deleteMany({});
    await Review.deleteMany({});
    await Favorite.deleteMany({});
    
    console.log('✅ Database cleared');
  }

  async seedUsers() {
    console.log('\n👥 Creating users...');

    // Create admin
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@kirada.com',
      phone: '+252611111111',
      password: 'Admin123!',
      role: 'admin',
      isVerified: true
    });
    console.log('   ✅ Admin created');

    // Create landlords
    const landlords = [];
    const landlordNames = ['Ahmed Hassan', 'Fatima Ali', 'Mohamed Omar', 'Aisha Abdi', 'Omar Farah'];
    
    for (let i = 0; i < landlordNames.length; i++) {
      const landlord = await User.create({
        name: landlordNames[i],
        email: `landlord${i+1}@kirada.com`,
        phone: `+25261234567${i}`,
        password: 'Landlord123!',
        role: 'landlord',
        isVerified: true,
        bio: `Landlord with ${i+2} years of experience in Mogadishu real estate.`
      });
      landlords.push(landlord);
      console.log(`   ✅ Landlord created: ${landlord.name}`);
    }

    // Create tenants
    const tenants = [];
    const tenantNames = ['Ali Yusuf', 'Safia Mohamud', 'Khadar Abdi', 'Hawa Ibrahim', 'Jama Ali'];
    
    for (let i = 0; i < tenantNames.length; i++) {
      const tenant = await User.create({
        name: tenantNames[i],
        email: `tenant${i+1}@kirada.com`,
        phone: `+25261345678${i}`,
        password: 'Tenant123!',
        role: 'tenant',
        isVerified: true
      });
      tenants.push(tenant);
      console.log(`   ✅ Tenant created: ${tenant.name}`);
    }

    return { admin, landlords, tenants };
  }

  async seedProperties(landlords) {
    console.log('\n🏠 Creating properties...');

    const properties = [];
    const propertyTitles = [
      'Spacious Apartment in Hodan',
      'Modern House in Karaan',
      'Cozy Room in Waberi',
      'Office Space in Hawle Wadag',
      'Shop in Bakara Market',
      'Beautiful Villa in Shangani',
      'Apartment with Sea View',
      'Family House in Yaaqshiid',
      'Studio Apartment in Heliwa',
      'Commercial Building in Warta Nabada'
    ];

    for (let i = 0; i < propertyTitles.length; i++) {
      const landlord = landlords[i % landlords.length];
      const district = MOGADISHU_DISTRICTS[i % MOGADISHU_DISTRICTS.length];
      const type = PROPERTY_TYPES[i % PROPERTY_TYPES.length];
      const bedrooms = Math.floor(Math.random() * 4) + 1;
      const bathrooms = Math.floor(Math.random() * 3) + 1;
      const price = (Math.floor(Math.random() * 400) + 150) * 10; // $1500 - $5500
      
      // Select random amenities
      const amenityCount = Math.floor(Math.random() * 5) + 3;
      const propertyAmenities = [];
      for (let j = 0; j < amenityCount; j++) {
        const amenity = AMENITIES[Math.floor(Math.random() * AMENITIES.length)];
        if (!propertyAmenities.includes(amenity)) {
          propertyAmenities.push(amenity);
        }
      }

      const property = await Property.create({
        title: propertyTitles[i],
        description: `Beautiful ${type} located in ${district.name}. This property features ${bedrooms} bedrooms, ${bathrooms} bathrooms, and modern amenities. Perfect for families or professionals.`,
        price: price,
        type: type,
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        size: Math.floor(Math.random() * 150) + 50,
        location: {
          district: district.id,
          address: `Street ${Math.floor(Math.random() * 50)}, ${district.name} District`
        },
        images: [
          { url: `https://picsum.photos/400/300?random=${i}1`, isPrimary: true },
          { url: `https://picsum.photos/400/300?random=${i}2`, isPrimary: false },
          { url: `https://picsum.photos/400/300?random=${i}3`, isPrimary: false }
        ],
        amenities: propertyAmenities,
        landlordId: landlord._id,
        status: Math.random() > 0.2 ? 'available' : 'rented',
        views: Math.floor(Math.random() * 500)
      });

      properties.push(property);
      console.log(`   ✅ Property created: ${property.title}`);
    }

    return properties;
  }

  async seedBookings(properties, tenants) {
    console.log('\n📅 Creating bookings...');

    const bookings = [];
    const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];

    for (let i = 0; i < 15; i++) {
      const property = properties[i % properties.length];
      const tenant = tenants[i % tenants.length];
      const landlord = await User.findById(property.landlordId);
      
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + Math.floor(Math.random() * 20) + 5);
      
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + Math.floor(Math.random() * 7) + 2);
      
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      const totalPrice = nights * property.price;

      const booking = await Booking.create({
        bookingNumber: `BOK${String(i+1).padStart(4, '0')}`,
        propertyId: property._id,
        tenantId: tenant._id,
        landlordId: landlord._id,
        checkIn: checkIn,
        checkOut: checkOut,
        guests: {
          adults: Math.floor(Math.random() * 3) + 1,
          children: Math.random() > 0.5 ? Math.floor(Math.random() * 2) : 0
        },
        totalPrice: totalPrice,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        specialRequests: Math.random() > 0.7 ? 'Need extra bed and parking' : ''
      });

      bookings.push(booking);
      console.log(`   ✅ Booking created: ${booking.bookingNumber}`);
    }

    return bookings;
  }

  async seedInquiries(properties, tenants, landlords) {
    console.log('\n💬 Creating inquiries...');

    const inquiries = [];
    const subjects = [
      'Question about availability',
      'Price negotiation',
      'Viewing request',
      'Details about amenities',
      'Contract questions'
    ];

    for (let i = 0; i < 10; i++) {
      const property = properties[i % properties.length];
      const tenant = tenants[i % tenants.length];
      const landlord = landlords[i % landlords.length];
      
      const inquiry = await Inquiry.create({
        inquiryNumber: `INQ${String(i+1).padStart(4, '0')}`,
        propertyId: property._id,
        tenantId: tenant._id,
        landlordId: landlord._id,
        message: `Hello, I'm interested in this property. ${subjects[i % subjects.length]}. Can you please provide more information?`,
        status: Math.random() > 0.5 ? 'new' : 'read'
      });

      inquiries.push(inquiry);
      console.log(`   ✅ Inquiry created: ${inquiry.inquiryNumber}`);
    }

    return inquiries;
  }

  async seedReviews(bookings, properties, tenants) {
    console.log('\n⭐ Creating reviews...');

    const reviews = [];
    const completedBookings = bookings.filter(b => b.status === 'completed');

    for (let i = 0; i < Math.min(5, completedBookings.length); i++) {
      const booking = completedBookings[i];
      const property = await Property.findById(booking.propertyId);
      const tenant = await User.findById(booking.tenantId);
      
      const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars
      
      const review = await Review.create({
        propertyId: property._id,
        tenantId: tenant._id,
        bookingId: booking._id,
        rating: rating,
        comment: rating === 5 
          ? 'Excellent property! Very clean and the landlord was very helpful.'
          : 'Good property overall. Would recommend.'
      });

      reviews.push(review);
      console.log(`   ✅ Review created for property: ${property.title}`);
    }

    return reviews;
  }

  async seedFavorites(properties, tenants) {
    console.log('\n❤️ Creating favorites...');

    const favorites = [];

    for (let i = 0; i < 8; i++) {
      const property = properties[i % properties.length];
      const tenant = tenants[i % tenants.length];
      
      try {
        const favorite = await Favorite.create({
          tenantId: tenant._id,
          propertyId: property._id,
          notes: 'I really like this property!'
        });
        favorites.push(favorite);
        console.log(`   ✅ Favorite added for tenant: ${tenant.name}`);
      } catch (error) {
        // Skip if already exists
      }
    }

    return favorites;
  }

  async run() {
    try {
      console.log('\n🚀 Starting database seeding...\n');
      
      await this.connect();
      await this.clearDatabase();
      
      const { admin, landlords, tenants } = await this.seedUsers();
      const properties = await this.seedProperties(landlords);
      const bookings = await this.seedBookings(properties, tenants);
      const inquiries = await this.seedInquiries(properties, tenants, landlords);
      const reviews = await this.seedReviews(bookings, properties, tenants);
      const favorites = await this.seedFavorites(properties, tenants);
      
      console.log('\n📊 Database Statistics:');
      console.log(`   Users: ${await User.countDocuments()} (Admin: 1, Landlords: ${landlords.length}, Tenants: ${tenants.length})`);
      console.log(`   Properties: ${await Property.countDocuments()}`);
      console.log(`   Bookings: ${await Booking.countDocuments()}`);
      console.log(`   Inquiries: ${await Inquiry.countDocuments()}`);
      console.log(`   Reviews: ${await Review.countDocuments()}`);
      console.log(`   Favorites: ${await Favorite.countDocuments()}`);
      
      console.log('\n✅ Database seeding completed successfully!\n');
      
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    }
  }
}

// Run seeder
const seeder = new DatabaseSeeder();
seeder.run();