module.exports = {
  // Property types
  PROPERTY_TYPES: [
    'apartment',
    'house',
    'room',
    'office',
    'shop',
    'land',
    'villa',
    'commercial',
    'warehouse',
    'studio'
  ],
  
  // Property type descriptions
  PROPERTY_TYPE_DESCRIPTIONS: {
    apartment: 'Multi-unit residential building',
    house: 'Single-family home',
    room: 'Single room for rent',
    office: 'Commercial office space',
    shop: 'Retail space',
    land: 'Vacant land',
    villa: 'Luxury standalone home',
    commercial: 'Commercial property',
    warehouse: 'Storage/industrial space',
    studio: 'Small apartment with combined living/sleeping area'
  },
  
  // Property statuses
  PROPERTY_STATUS: {
    AVAILABLE: 'available',
    RENTED: 'rented',
    PENDING: 'pending',
    REJECTED: 'rejected',
    ARCHIVED: 'archived',
    UNDER_MAINTENANCE: 'under_maintenance'
  },
  
  // Property status colors (for UI)
  PROPERTY_STATUS_COLORS: {
    available: '#10b981', // green
    rented: '#6b7280', // gray
    pending: '#f59e0b', // orange
    rejected: '#ef4444', // red
    archived: '#9ca3af', // light gray
    under_maintenance: '#3b82f6' // blue
  },
  
  // Amenities list
  AMENITIES: [
    'wifi',
    'parking',
    'security',
    'generator',
    'water_tank',
    'ac',
    'furnished',
    'kitchen',
    'balcony',
    'elevator',
    'guard',
    'cctv',
    'swimming_pool',
    'gym',
    'playground',
    'garden',
    'terrace',
    'storage',
    'laundry',
    'internet',
    'satellite_tv',
    'intercom',
    'emergency_exit',
    'fire_extinguisher'
  ],
  
  // Amenity categories
  AMENITY_CATEGORIES: {
    basic: ['wifi', 'water_tank', 'security'],
    comfort: ['ac', 'furnished', 'kitchen'],
    luxury: ['swimming_pool', 'gym', 'garden'],
    safety: ['cctv', 'guard', 'fire_extinguisher', 'emergency_exit'],
    convenience: ['parking', 'elevator', 'laundry', 'storage']
  },
  
  // Furnishing options
  FURNISHING: [
    'unfurnished',
    'semi-furnished',
    'fully-furnished'
  ],
  
  // Size units
  SIZE_UNITS: ['sqft', 'sqm'],
  
  // Property rules
  RULES: {
    SMOKING: ['allowed', 'not-allowed', 'outdoor-only'],
    PETS: ['allowed', 'not-allowed', 'small-only'],
    PARTIES: ['allowed', 'not-allowed', 'quiet-only']
  },
  
  // Rule descriptions
  RULE_DESCRIPTIONS: {
    smoking: {
      allowed: 'Smoking allowed indoors',
      'not-allowed': 'No smoking allowed',
      'outdoor-only': 'Smoking allowed only outdoors'
    },
    pets: {
      allowed: 'Pets allowed',
      'not-allowed': 'No pets allowed',
      'small-only': 'Only small pets allowed'
    },
    parties: {
      allowed: 'Parties allowed',
      'not-allowed': 'No parties allowed',
      'quiet-only': 'Only quiet gatherings allowed'
    }
  },
  
  // Sort options
  SORT_OPTIONS: {
    PRICE_ASC: 'price_asc',
    PRICE_DESC: 'price_desc',
    NEWEST: 'newest',
    OLDEST: 'oldest',
    MOST_VIEWED: 'most_viewed',
    MOST_BOOKED: 'most_booked',
    HIGHEST_RATED: 'highest_rated'
  },
  
  // Sort option labels
  SORT_LABELS: {
    price_asc: 'Price: Low to High',
    price_desc: 'Price: High to Low',
    newest: 'Newest First',
    oldest: 'Oldest First',
    most_viewed: 'Most Viewed',
    most_booked: 'Most Booked',
    highest_rated: 'Highest Rated'
  },
  
  // Default property values
  DEFAULTS: {
    status: 'pending',
    bedrooms: 1,
    bathrooms: 1,
    sizeUnit: 'sqm',
    featured: false
  },
  
  // Property limits
  LIMITS: {
    MIN_TITLE_LENGTH: 5,
    MAX_TITLE_LENGTH: 100,
    MIN_DESCRIPTION_LENGTH: 20,
    MAX_DESCRIPTION_LENGTH: 2000,
    MIN_PRICE: 1,
    MAX_PRICE: 1000000,
    MIN_BEDROOMS: 0,
    MAX_BEDROOMS: 10,
    MIN_BATHROOMS: 0,
    MAX_BATHROOMS: 10,
    MIN_SIZE: 1,
    MAX_SIZE: 10000,
    MAX_IMAGES: 20,
    MAX_AMENITIES: 30
  },
  
  // Required fields
  REQUIRED_FIELDS: [
    'title',
    'description',
    'price',
    'type',
    'bedrooms',
    'bathrooms',
    'size',
    'location.district',
    'location.address'
  ],
  
  // Searchable fields
  SEARCHABLE_FIELDS: [
    'title',
    'description',
    'location.district',
    'location.address'
  ],
  
  // Filterable fields
  FILTERABLE_FIELDS: [
    'type',
    'status',
    'bedrooms',
    'bathrooms',
    'price',
    'location.district',
    'amenities',
    'featured'
  ],
  
  // Property view increments
  VIEW_INCREMENT: 1,
  
  // Featured property boost factor
  FEATURED_BOOST: 1.5,
  
  // Get property type label
  getPropertyTypeLabel: (type) => {
    const labels = {
      apartment: 'Apartment',
      house: 'House',
      room: 'Room',
      office: 'Office',
      shop: 'Shop',
      land: 'Land',
      villa: 'Villa',
      commercial: 'Commercial',
      warehouse: 'Warehouse',
      studio: 'Studio'
    };
    return labels[type] || type;
  },
  
  // Get status label
  getStatusLabel: (status) => {
    const labels = {
      available: 'Available',
      rented: 'Rented',
      pending: 'Pending Approval',
      rejected: 'Rejected',
      archived: 'Archived',
      under_maintenance: 'Under Maintenance'
    };
    return labels[status] || status;
  }
};