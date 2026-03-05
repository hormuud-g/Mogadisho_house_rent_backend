module.exports = {
  // Complete list of Mogadishu districts
  MOGADISHU_DISTRICTS: [
    {
      id: 'hodan',
      name: 'Hodan',
      somali: 'Hodan',
      arabic: 'هودان',
      zone: 'South',
      population: 450000,
      area: 15, // km²
      description: 'Commercial and residential district in southern Mogadishu'
    },
    {
      id: 'waberi',
      name: 'Waberi',
      somali: 'Waberi',
      arabic: 'وابيري',
      zone: 'South',
      population: 350000,
      area: 12,
      description: 'Mixed-use district with residential and commercial areas'
    },
    {
      id: 'hawle-wadag',
      name: 'Hawle Wadag',
      somali: 'Hawle Wadag',
      arabic: 'هول وادغ',
      zone: 'Central',
      population: 400000,
      area: 10,
      description: 'Central business district with government offices'
    },
    {
      id: 'karaan',
      name: 'Karaan',
      somali: 'Karaan',
      arabic: 'كاران',
      zone: 'North',
      population: 380000,
      area: 18,
      description: 'Residential district popular with families'
    },
    {
      id: 'shangani',
      name: 'Shangani',
      somali: 'Shangaani',
      arabic: 'شنغاني',
      zone: 'Coastal',
      population: 120000,
      area: 5,
      description: 'Historic coastal district with traditional architecture'
    },
    {
      id: 'warta-nabada',
      name: 'Warta Nabada',
      somali: 'Warta Nabada',
      arabic: 'وارتا نابادا',
      zone: 'South',
      population: 280000,
      area: 14,
      description: 'Developing residential area'
    },
    {
      id: 'dharkenley',
      name: 'Dharkenley',
      somali: 'Dharkenley',
      arabic: 'دركنلي',
      zone: 'West',
      population: 420000,
      area: 22,
      description: 'Large residential district with affordable housing'
    },
    {
      id: 'kahda',
      name: 'Kahda',
      somali: 'Kahda',
      arabic: 'كاهدا',
      zone: 'West',
      population: 180000,
      area: 25,
      description: 'Suburban district with newer developments'
    },
    {
      id: 'heliwa',
      name: 'Heliwa',
      somali: 'Heliwa',
      arabic: 'هليوا',
      zone: 'North',
      population: 320000,
      area: 16,
      description: 'Northern residential and commercial district'
    },
    {
      id: 'yaaqshiid',
      name: 'Yaaqshiid',
      somali: 'Yaaqshiid',
      arabic: 'ياقشيد',
      zone: 'North',
      population: 350000,
      area: 17,
      description: 'Mixed residential and commercial area'
    },
    {
      id: 'bondhere',
      name: 'Bondhere',
      somali: 'Bondhere',
      arabic: 'بوندهيري',
      zone: 'Coastal',
      population: 110000,
      area: 4,
      description: 'Coastal district with beach access'
    },
    {
      id: 'abdiaziz',
      name: 'Abdiaziz',
      somali: 'Cabdi Casiis',
      arabic: 'عبد العزيز',
      zone: 'Central',
      population: 250000,
      area: 8,
      description: 'Central district with markets and businesses'
    },
    {
      id: 'hamar-jajab',
      name: 'Hamar Jajab',
      somali: 'Xamar Jajab',
      arabic: 'حمر ججب',
      zone: 'Coastal',
      population: 90000,
      area: 3,
      description: 'Historic district in old Mogadishu'
    },
    {
      id: 'hamar-weyne',
      name: 'Hamar Weyne',
      somali: 'Xamar Weyne',
      arabic: 'حمر وين',
      zone: 'Coastal',
      population: 80000,
      area: 2,
      description: 'Oldest district with historic architecture'
    }
  ],
  
  // District coordinates
  DISTRICT_COORDINATES: {
    hodan: { lat: 2.0333, lng: 45.3333 },
    waberi: { lat: 2.0333, lng: 45.3500 },
    hawle_wadag: { lat: 2.0333, lng: 45.3333 },
    karaan: { lat: 2.0667, lng: 45.3500 },
    shangani: { lat: 2.0333, lng: 45.3333 },
    warta_nabada: { lat: 2.0333, lng: 45.3167 },
    dharkenley: { lat: 2.0167, lng: 45.3000 },
    kahda: { lat: 2.0000, lng: 45.2833 },
    heliwa: { lat: 2.0667, lng: 45.3667 },
    yaaqshiid: { lat: 2.0500, lng: 45.3500 },
    bondhere: { lat: 2.0500, lng: 45.3500 },
    abdiaziz: { lat: 2.0333, lng: 45.3333 },
    hamar_jajab: { lat: 2.0333, lng: 45.3333 },
    hamar_weyne: { lat: 2.0333, lng: 45.3333 }
  },
  
  // District statistics
  DISTRICT_STATS: {
    hodan: { 
      avgRent1BR: 350, 
      avgRent2BR: 450, 
      avgRent3BR: 600, 
      propertyCount: 1200, 
      area: 15,
      pricePerSqm: 5.2,
      occupancyRate: 85
    },
    waberi: { 
      avgRent1BR: 320, 
      avgRent2BR: 420, 
      avgRent3BR: 550, 
      propertyCount: 950, 
      area: 12,
      pricePerSqm: 4.8,
      occupancyRate: 82
    },
    hawle_wadag: { 
      avgRent1BR: 380, 
      avgRent2BR: 500, 
      avgRent3BR: 680, 
      propertyCount: 1100, 
      area: 10,
      pricePerSqm: 6.5,
      occupancyRate: 88
    },
    karaan: { 
      avgRent1BR: 280, 
      avgRent2BR: 380, 
      avgRent3BR: 500, 
      propertyCount: 850, 
      area: 18,
      pricePerSqm: 3.9,
      occupancyRate: 79
    },
    shangani: { 
      avgRent1BR: 450, 
      avgRent2BR: 600, 
      avgRent3BR: 800, 
      propertyCount: 320, 
      area: 5,
      pricePerSqm: 8.5,
      occupancyRate: 92
    },
    warta_nabada: { 
      avgRent1BR: 300, 
      avgRent2BR: 400, 
      avgRent3BR: 530, 
      propertyCount: 720, 
      area: 14,
      pricePerSqm: 4.2,
      occupancyRate: 76
    },
    dharkenley: { 
      avgRent1BR: 260, 
      avgRent2BR: 350, 
      avgRent3BR: 470, 
      propertyCount: 980, 
      area: 22,
      pricePerSqm: 3.2,
      occupancyRate: 73
    },
    kahda: { 
      avgRent1BR: 220, 
      avgRent2BR: 300, 
      avgRent3BR: 400, 
      propertyCount: 450, 
      area: 25,
      pricePerSqm: 2.8,
      occupancyRate: 65
    },
    heliwa: { 
      avgRent1BR: 290, 
      avgRent2BR: 390, 
      avgRent3BR: 520, 
      propertyCount: 780, 
      area: 16,
      pricePerSqm: 4.0,
      occupancyRate: 78
    },
    yaaqshiid: { 
      avgRent1BR: 270, 
      avgRent2BR: 370, 
      avgRent3BR: 490, 
      propertyCount: 820, 
      area: 17,
      pricePerSqm: 3.7,
      occupancyRate: 75
    }
  },
  
  // District zones
  ZONES: {
    NORTH: ['karaan', 'heliwa', 'yaaqshiid'],
    SOUTH: ['hodan', 'waberi', 'warta-nabada'],
    CENTRAL: ['hawle-wadag', 'abdiaziz'],
    WEST: ['dharkenley', 'kahda'],
    COASTAL: ['shangani', 'bondhere', 'hamar-jajab', 'hamar-weyne']
  },
  
  // Popular districts for different purposes
  POPULAR_DISTRICTS: {
    business: ['hawle-wadag', 'shangani', 'abdiaziz'],
    family: ['karaan', 'hodan', 'dharkenley'],
    budget: ['kahda', 'dharkenley', 'warta-nabada'],
    luxury: ['shangani', 'hawle-wadag', 'bondhere'],
    students: ['heliwa', 'yaaqshiid', 'karaan']
  },
  
  // District transportation links
  DISTRICT_TRANSPORT: {
    hodan: ['bus', 'taxi'],
    waberi: ['bus', 'taxi'],
    hawle_wadag: ['bus', 'taxi', 'boda-boda'],
    karaan: ['bus', 'taxi'],
    shangani: ['taxi', 'boat'],
    warta_nabada: ['bus'],
    dharkenley: ['bus'],
    kahda: ['bus'],
    heliwa: ['bus', 'taxi'],
    yaaqshiid: ['bus', 'taxi'],
    bondhere: ['taxi', 'boat'],
    abdiaziz: ['bus', 'taxi'],
    hamar_jajab: ['taxi'],
    hamar_weyne: ['taxi', 'boat']
  },
  
  // Get district by id
  getDistrictById: (id) => {
    return module.exports.MOGADISHU_DISTRICTS.find(d => d.id === id);
  },
  
  // Get district by name
  getDistrictByName: (name) => {
    const districts = module.exports.MOGADISHU_DISTRICTS;
    return districts.find(d => 
      d.name.toLowerCase() === name.toLowerCase() || 
      d.somali.toLowerCase() === name.toLowerCase()
    );
  },
  
  // Get districts by zone
  getDistrictsByZone: (zone) => {
    return module.exports.MOGADISHU_DISTRICTS.filter(d => d.zone === zone);
  },
  
  // Validate district
  isValidDistrict: (districtId) => {
    return module.exports.MOGADISHU_DISTRICTS.some(d => d.id === districtId);
  }
};