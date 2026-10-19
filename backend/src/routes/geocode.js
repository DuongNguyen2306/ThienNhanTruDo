const express = require('express');
const axios = require('axios');

const router = express.Router();

// Nominatim rate limiting: 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

// Simple in-memory cache
const geocodeCache = new Map();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days for search results

/**
 * Clean expired cache entries
 */
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of geocodeCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      geocodeCache.delete(key);
    }
  }
}

// Clean cache every hour
setInterval(cleanCache, 60 * 60 * 1000);

/**
 * Rate-limited request to Nominatim
 */
async function nominatimRequest(params, retries = 3) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          format: 'json',
          addressdetails: 1,
          'accept-language': 'vi',
          ...params,
        },
        headers: {
          'User-Agent': 'ThienNhanTruDo/1.0 (Vietnam Real Estate Platform)',
        },
        timeout: 15000,
      });
      
      return response.data;
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

/**
 * Validate if coordinates are within our service area
 * Now accepts ALL locations - service area validation removed
 */
function isInServiceArea(lat, lng) {
  // Accept all locations - no geographic restrictions
  return { valid: true, area: 'Thành phố Hồ Chí Minh', historical: null };
}

/**
 * Extract building/tower name from Vietnamese address
 */
function extractBuildingInfo(address) {
  const patterns = [
    /tòa\s*([^\s,]+)/gi,
    /block\s*([^\s,]+)/gi,
    /tower\s*([a-z]\d+(?:\.\d+)?)/gi,
  ];
  
  let building = null;
  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) {
      building = match[0];
      break;
    }
  }
  
  // Check for residential projects
  const projectPatterns = [
    /vinhomes\s*([^\s,]+)/gi,
    /grand\s*park/gi,
    /gamuda\s*([^\s,]+)/gi,
  ];
  
  let project = null;
  for (const pattern of projectPatterns) {
    const match = address.match(pattern);
    if (match) {
      project = match[0];
      break;
    }
  }
  
  return { building, project };
}

/**
 * Process a single Nominatim result
 */
function processResult(r) {
  const lat = parseFloat(r.lat);
  const lng = parseFloat(r.lon);
  const serviceArea = isInServiceArea(lat, lng);
  const buildingInfo = extractBuildingInfo(r.display_name || '');
  
  return {
    lat,
    lng,
    displayName: r.display_name,
    type: r.type,
    class: r.class,
    importance: parseFloat(r.importance) || 0,
    address: r.address,
    serviceArea,
    building: buildingInfo.building,
    project: buildingInfo.project,
  };
}

/**
 * Score and rank results
 */
function rankResults(results, searchQuery) {
  const normalizedQuery = searchQuery.toLowerCase().replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
  
  return results.map(r => {
    const normalizedDisplay = (r.displayName || '').toLowerCase()
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd')
      .replace(/\s+/g, ' ');
    
    let score = r.importance * 100;
    
    // Exact match
    if (normalizedDisplay.includes(normalizedQuery)) {
      score += 50;
    }
    
    // Starts with query
    if (normalizedDisplay.startsWith(normalizedQuery)) {
      score += 30;
    }
    
    // Query words found
    const queryWords = normalizedQuery.split(' ').filter(w => w.length >= 2);
    const displayWords = normalizedDisplay.split(' ');
    const matchedWords = queryWords.filter(qw => 
      displayWords.some(dw => dw.includes(qw) || qw.includes(dw))
    );
    score += matchedWords.length * 10;
    
    // Building exact match bonus
    if (r.building && normalizedQuery.includes(r.building.toLowerCase().replace(/\s/g, ''))) {
      score += 40;
    }
    
    // Project match bonus
    if (r.project && normalizedQuery.includes(r.project.toLowerCase().replace(/\s/g, ''))) {
      score += 30;
    }
    
    // Service area bonus
    if (r.serviceArea.valid) {
      score += 20;
    }
    
    // Higher zoom level = more specific location
    if (r.address && r.address.house_number) {
      score += 15;
    }
    
    return { ...r, score };
  }).sort((a, b) => b.score - a.score);
}

// ============================================
// POST /api/geocode/search - Search for addresses
// ============================================
router.post('/search', async (req, res, next) => {
  try {
    const { 
      query,  // Free-form search query (new param)
      houseNumber, 
      street, 
      ward, 
      district, 
      city = 'TP. Hồ Chí Minh',
      limit = 8
    } = req.body;

    // Build search query
    let searchQuery;
    
    if (query) {
      // Free-form search - user is typing an address
      searchQuery = query;
    } else {
      // Structured search - build from components
      const parts = [];
      if (houseNumber) parts.push(houseNumber);
      if (street) parts.push(street);
      if (ward) parts.push(ward);
      if (district) parts.push(district);
      parts.push(city);
      searchQuery = parts.join(', ');
    }
    
    if (!searchQuery || searchQuery.trim().length < 3) {
      return res.json({ results: [], message: null });
    }

    // Check cache
    const cacheKey = `search:${searchQuery.toLowerCase().replace(/\s+/g, ' ').trim()}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ results: cached.data, cached: true });
    }

    // Primary search: direct query
    let results = await nominatimRequest({
      q: searchQuery,
      limit: limit * 2, // Get more to filter
    });

    // If no results and we have street/ward, try broader search
    if ((!results || results.length === 0) && street) {
      // Try just street + city
      const broaderQuery = `${street}, ${district || city}`;
      results = await nominatimRequest({
        q: broaderQuery,
        limit: limit * 2,
      });
    }
    
    // If still no results and we have a project name, try that
    if ((!results || results.length === 0) && query) {
      // Try with project name only
      const projectMatch = query.match(/(vinhomes\s*[^\s,]+|grand\s*park)/gi);
      if (projectMatch) {
        results = await nominatimRequest({
          q: `${projectMatch[0]}, ${city}`,
          limit: limit * 2,
        });
      }
    }

    if (!results || results.length === 0) {
      return res.json({ 
        results: [], 
        message: 'Không tìm thấy địa chỉ phù hợp. Thử nhập địa chỉ khác hoặc tìm khu đô thị và kéo ghim đến vị trí chính xác.',
        searchQuery 
      });
    }

    // Process and rank results
    let processedResults = results
      .slice(0, limit)
      .map(processResult);
    
    // Rank by relevance
    processedResults = rankResults(processedResults, searchQuery);
    
    // Filter to service area if we have specific district context
    if (district) {
      const districtName = district.toLowerCase();
      // Prioritize results in service area, but show others too
      processedResults = processedResults.sort((a, b) => {
        const aInArea = a.serviceArea.valid;
        const bInArea = b.serviceArea.valid;
        if (aInArea && !bInArea) return -1;
        if (!aInArea && bInArea) return 1;
        return b.score - a.score;
      });
    }

    // Cache results
    geocodeCache.set(cacheKey, { data: processedResults, timestamp: Date.now() });

    res.json({ 
      results: processedResults, 
      searchQuery,
      message: processedResults.length === 0 
        ? 'Không tìm thấy địa chỉ trong khu vực dịch vụ. Bạn có thể tìm khu đô thị và kéo ghim đến vị trí chính xác.' 
        : null 
    });
  } catch (error) {
    console.error('Geocode search error:', error.message);
    
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Quá nhiều yêu cầu. Vui lòng chờ vài giây.' });
    }
    
    next(error);
  }
});

// ============================================
// POST /api/geocode/reverse - Reverse geocode (click on map)
// ============================================
router.post('/reverse', async (req, res, next) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Thiếu tọa độ' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // Validate service area
    const serviceArea = isInServiceArea(latitude, longitude);

    // Check cache
    const cacheKey = `reverse:${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ ...cached.data, cached: true });
    }

    // Reverse geocode with multiple zoom levels
    let result = null;
    const zoomLevels = [18, 17, 16, 14]; // From specific to broader
    
    for (const zoom of zoomLevels) {
      try {
        const results = await axios.get('https://nominatim.openstreetmap.org/reverse', {
          params: {
            lat: latitude,
            lon: longitude,
            format: 'json',
            addressdetails: 1,
            zoom: zoom,
            'accept-language': 'vi',
          },
          headers: {
            'User-Agent': 'ThienNhanTruDo/1.0 (Vietnam Real Estate Platform)',
          },
          timeout: 10000,
        });
        
        if (results.data && results.data.lat) {
          result = results.data;
          break;
        }
      } catch (e) {
        // Continue to next zoom level
      }
    }

    if (!result) {
      return res.json({
        lat: latitude,
        lng: longitude,
        displayName: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        serviceArea,
        note: 'Không thể xác định địa chỉ từ vị trí này',
      });
    }

    const processed = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      address: result.address,
      serviceArea,
      building: extractBuildingInfo(result.display_name || '').building,
    };

    // Cache result
    geocodeCache.set(cacheKey, { data: processed, timestamp: Date.now() });

    res.json(processed);
  } catch (error) {
    console.error('Reverse geocode error:', error.message);
    
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Quá nhiều yêu cầu. Vui lòng chờ vài giây.' });
    }
    
    next(error);
  }
});

// ============================================
// GET /api/geocode/validate - Validate coordinates
// ============================================
router.get('/validate', async (req, res) => {
  const { lat, lng } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ valid: false, error: 'Thiếu tọa độ' });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const serviceArea = isInServiceArea(latitude, longitude);

  res.json({
    valid: serviceArea.valid,
    area: serviceArea.area,
    historical: serviceArea.historical,
    lat: latitude,
    lng: longitude,
  });
});

module.exports = router;
