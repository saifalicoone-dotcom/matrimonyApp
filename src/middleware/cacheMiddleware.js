const crypto = require('crypto');
const { 
  getCachedUserProfile,
  cacheUserProfile,
  getCachedProfileList,
  cacheProfileList,
  getCachedRecommendations,
  cacheRecommendations,
  getProfileVisibility,
  setProfileVisibility
} = require('../utils/cache');

/**
 * Generate a hash of parameters for cache key
 * @param {Object} params - Parameters to hash
 * @returns {string} Hash string
 */
const generateParamsHash = (params) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return crypto.createHash('md5').update(sortedParams).digest('hex');
};

/**
 * Cache user profile middleware
 * @param {number} ttl - TTL in seconds (default: 300)
 */
const cacheUserProfileMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    try {
      const userId = req.params.userId || req.user?.id; // assuming req.user is populated by auth middleware
      
      if (!userId) {
        return next();
      }

      // Try to get from cache first
      const cachedProfile = await getCachedUserProfile(userId);
      
      if (cachedProfile) {
        return res.json({
          status: 'success',
          message: 'Profile retrieved from cache',
          data: cachedProfile,
          fromCache: true
        });
      }

      // If not in cache, continue to controller
      // Store the TTL for later use when caching the result
      req.cacheTtl = ttl;
      next();
    } catch (error) {
      console.error('Error in cache user profile middleware:', error);
      next();
    }
  };
};

/**
 * Cache profile listing middleware
 * @param {number} ttl - TTL in seconds (default: 180)
 */
const cacheProfileListMiddleware = (ttl = 180) => {
  return async (req, res, next) => {
    try {
      const queryParams = {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        ...req.query // include other query parameters
      };

      const paramsHash = generateParamsHash(queryParams);
      const cachedProfiles = await getCachedProfileList(paramsHash);
      
      if (cachedProfiles) {
        return res.json({
          status: 'success',
          message: 'Profiles retrieved from cache',
          data: cachedProfiles,
          fromCache: true
        });
      }

      // If not in cache, continue to controller
      req.cacheParamsHash = paramsHash;
      req.cacheTtl = ttl;
      next();
    } catch (error) {
      console.error('Error in cache profile list middleware:', error);
      next();
    }
  };
};

/**
 * Cache recommendations middleware
 * @param {number} ttl - TTL in seconds (default: 300)
 */
const cacheRecommendationsMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id; // assuming req.user is populated by auth middleware
      
      if (!userId) {
        return next();
      }

      const cachedRecs = await getCachedRecommendations(userId);
      
      if (cachedRecs) {
        return res.json({
          status: 'success',
          message: 'Recommendations retrieved from cache',
          data: cachedRecs,
          fromCache: true
        });
      }

      // If not in cache, continue to controller
      req.cacheUserId = userId;
      req.cacheTtl = ttl;
      next();
    } catch (error) {
      console.error('Error in cache recommendations middleware:', error);
      next();
    }
  };
};

/**
 * Middleware to add profile to cache after successful response
 */
const cacheProfileAfterResponse = () => {
  return (req, res, next) => {
    // Capture the original send method
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        const userId = req.params.userId || req.user?.id;
        
        if (userId && req.cacheTtl && data) {
          // Parse the response data if it's a string
          let parsedData = typeof data === 'string' ? JSON.parse(data) : data;
          
          // Extract profile data from response
          let profileData = parsedData.data;
          if (!profileData && parsedData.user) {
            profileData = parsedData.user;
          }
          
          if (profileData) {
            // Cache the profile asynchronously (don't wait for it)
            cacheUserProfile(userId, profileData, req.cacheTtl)
              .catch(err => console.error('Error caching profile after response:', err));
          }
        }
      } catch (error) {
        console.error('Error in cache profile after response middleware:', error);
      }
      
      // Call the original send method
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Middleware to add profile list to cache after successful response
 */
const cacheProfileListAfterResponse = () => {
  return (req, res, next) => {
    // Capture the original send method
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        if (req.cacheParamsHash && req.cacheTtl && data) {
          // Parse the response data if it's a string
          let parsedData = typeof data === 'string' ? JSON.parse(data) : data;
          
          // Extract profile list from response
          let profilesData = parsedData.data;
          if (Array.isArray(profilesData)) {
            // Cache the profile list asynchronously (don't wait for it)
            cacheProfileList(req.cacheParamsHash, profilesData, req.cacheTtl)
              .catch(err => console.error('Error caching profile list after response:', err));
          }
        }
      } catch (error) {
        console.error('Error in cache profile list after response middleware:', error);
      }
      
      // Call the original send method
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Middleware to add recommendations to cache after successful response
 */
const cacheRecommendationsAfterResponse = () => {
  return (req, res, next) => {
    // Capture the original send method
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        if (req.cacheUserId && req.cacheTtl && data) {
          // Parse the response data if it's a string
          let parsedData = typeof data === 'string' ? JSON.parse(data) : data;
          
          // Extract recommendations from response
          let recsData = parsedData.data;
          if (Array.isArray(recsData)) {
            // Cache the recommendations asynchronously (don't wait for it)
            cacheRecommendations(req.cacheUserId, recsData, req.cacheTtl)
              .catch(err => console.error('Error caching recommendations after response:', err));
          }
        }
      } catch (error) {
        console.error('Error in cache recommendations after response middleware:', error);
      }
      
      // Call the original send method
      return originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  cacheUserProfileMiddleware,
  cacheProfileListMiddleware,
  cacheRecommendationsMiddleware,
  cacheProfileAfterResponse,
  cacheProfileListAfterResponse,
  cacheRecommendationsAfterResponse,
  generateParamsHash
};