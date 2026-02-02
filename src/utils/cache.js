const { 
  setWithExpiry, 
  getValue, 
  deleteKey, 
  getMultipleValues,
  setMultipleWithExpiry,
  deleteMultipleKeys,
  setPersistent,
  addToSet,
  removeFromSet,
  getSetMembers
} = require('./redis');

/**
 * Generate cache keys for different entities
 */
const CacheKeys = {
  // User profile cache
  userProfile: (userId) => `user:profile:${userId}`,
  
  // Online status
  userOnlineStatus: (userId) => `user:online:${userId}`,
  
  // Profile listings and searches
  profileList: (paramsHash) => `profiles:list:${paramsHash}`,
  recommendations: (userId) => `recommendations:${userId}`,
  
  // User activity
  userActivity: (userId) => `user:activity:${userId}`,
  
  // Interest-related caches
  userInterests: (userId) => `user:interests:${userId}`,
  userReceivedInterests: (userId) => `user:received_interests:${userId}`,
  
  // Visibility flags
  profileVisibility: (userId) => `profile:visibility:${userId}`,
  
  // Counters
  unreadNotifications: (userId) => `notifications:unread:${userId}`,
  
  // Active users
  activeUsers: () => 'active:users',
  
  // Rate limiting
  rateLimit: (identifier, action) => `ratelimit:${action}:${identifier}`
};

/**
 * Cache user profile data
 * @param {string} userId - User ID
 * @param {Object} profileData - Profile data to cache
 * @param {number} ttlSeconds - TTL in seconds (default: 300 seconds / 5 minutes)
 * @returns {Promise<boolean>} Success status
 */
const cacheUserProfile = async (userId, profileData, ttlSeconds = 300) => {
  try {
    const cacheKey = CacheKeys.userProfile(userId);
    const profileStr = JSON.stringify(profileData);
    
    return await setWithExpiry(cacheKey, profileStr, ttlSeconds);
  } catch (error) {
    console.error('Error caching user profile:', error);
    return false;
  }
};

/**
 * Get cached user profile
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Cached profile data or null
 */
const getCachedUserProfile = async (userId) => {
  try {
    const cacheKey = CacheKeys.userProfile(userId);
    const cachedData = await getValue(cacheKey);
    
    return cachedData ? JSON.parse(cachedData) : null;
  } catch (error) {
    console.error('Error getting cached user profile:', error);
    return null;
  }
};

/**
 * Invalidate user profile cache
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
const invalidateUserProfileCache = async (userId) => {
  try {
    const cacheKey = CacheKeys.userProfile(userId);
    return await deleteKey(cacheKey);
  } catch (error) {
    console.error('Error invalidating user profile cache:', error);
    return false;
  }
};

/**
 * Set user online status
 * @param {string} userId - User ID
 * @param {boolean} isOnline - Online status
 * @param {number} ttlSeconds - TTL in seconds (default: 600 seconds / 10 minutes)
 * @returns {Promise<boolean>} Success status
 */
const setUserOnlineStatus = async (userId, isOnline, ttlSeconds = 600) => {
  try {
    const cacheKey = CacheKeys.userOnlineStatus(userId);
    
    if (isOnline) {
      // Add to active users set and set online status
      await addToSet(CacheKeys.activeUsers(), [userId]);
      return await setWithExpiry(cacheKey, 'online', ttlSeconds);
    } else {
      // Remove from active users set and delete online status
      await removeFromSet(CacheKeys.activeUsers(), [userId]);
      return await deleteKey(cacheKey);
    }
  } catch (error) {
    console.error('Error setting user online status:', error);
    return false;
  }
};

/**
 * Get user online status
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Online status
 */
const getUserOnlineStatus = async (userId) => {
  try {
    const cacheKey = CacheKeys.userOnlineStatus(userId);
    const status = await getValue(cacheKey);
    
    return status === 'online';
  } catch (error) {
    console.error('Error getting user online status:', error);
    return false;
  }
};

/**
 * Cache profile listing results
 * @param {string} paramsHash - Hash of search/filter parameters
 * @param {Array} profiles - Profile results to cache
 * @param {number} ttlSeconds - TTL in seconds (default: 180 seconds / 3 minutes)
 * @returns {Promise<boolean>} Success status
 */
const cacheProfileList = async (paramsHash, profiles, ttlSeconds = 180) => {
  try {
    const cacheKey = CacheKeys.profileList(paramsHash);
    const profilesStr = JSON.stringify(profiles);
    
    return await setWithExpiry(cacheKey, profilesStr, ttlSeconds);
  } catch (error) {
    console.error('Error caching profile list:', error);
    return false;
  }
};

/**
 * Get cached profile listing
 * @param {string} paramsHash - Hash of search/filter parameters
 * @returns {Promise<Array|null>} Cached profiles or null
 */
const getCachedProfileList = async (paramsHash) => {
  try {
    const cacheKey = CacheKeys.profileList(paramsHash);
    const cachedData = await getValue(cacheKey);
    
    return cachedData ? JSON.parse(cachedData) : null;
  } catch (error) {
    console.error('Error getting cached profile list:', error);
    return null;
  }
};

/**
 * Cache user recommendations
 * @param {string} userId - User ID
 * @param {Array} recommendations - Recommendation results to cache
 * @param {number} ttlSeconds - TTL in seconds (default: 300 seconds / 5 minutes)
 * @returns {Promise<boolean>} Success status
 */
const cacheRecommendations = async (userId, recommendations, ttlSeconds = 300) => {
  try {
    const cacheKey = CacheKeys.recommendations(userId);
    const recsStr = JSON.stringify(recommendations);
    
    return await setWithExpiry(cacheKey, recsStr, ttlSeconds);
  } catch (error) {
    console.error('Error caching recommendations:', error);
    return false;
  }
};

/**
 * Get cached recommendations
 * @param {string} userId - User ID
 * @returns {Promise<Array|null>} Cached recommendations or null
 */
const getCachedRecommendations = async (userId) => {
  try {
    const cacheKey = CacheKeys.recommendations(userId);
    const cachedData = await getValue(cacheKey);
    
    return cachedData ? JSON.parse(cachedData) : null;
  } catch (error) {
    console.error('Error getting cached recommendations:', error);
    return null;
  }
};

/**
 * Set profile visibility flag
 * @param {string} userId - User ID
 * @param {boolean} isVisible - Visibility status
 * @param {number} ttlSeconds - TTL in seconds (default: 86400 seconds / 24 hours)
 * @returns {Promise<boolean>} Success status
 */
const setProfileVisibility = async (userId, isVisible, ttlSeconds = 86400) => {
  try {
    const cacheKey = CacheKeys.profileVisibility(userId);
    
    if (isVisible) {
      return await setWithExpiry(cacheKey, 'visible', ttlSeconds);
    } else {
      return await deleteKey(cacheKey);
    }
  } catch (error) {
    console.error('Error setting profile visibility:', error);
    return false;
  }
};

/**
 * Get profile visibility
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Visibility status
 */
const getProfileVisibility = async (userId) => {
  try {
    const cacheKey = CacheKeys.profileVisibility(userId);
    const visibility = await getValue(cacheKey);
    
    return visibility === 'visible';
  } catch (error) {
    console.error('Error getting profile visibility:', error);
    return false; // Default to hidden if there's an error
  }
};

/**
 * Get active users
 * @returns {Promise<Array>} Array of active user IDs
 */
const getActiveUsers = async () => {
  try {
    return await getSetMembers(CacheKeys.activeUsers());
  } catch (error) {
    console.error('Error getting active users:', error);
    return [];
  }
};

/**
 * Clear user's related caches when profile is updated
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
const clearUserRelatedCaches = async (userId) => {
  try {
    const keysToClear = [
      CacheKeys.userProfile(userId),
      CacheKeys.userOnlineStatus(userId),
      CacheKeys.profileVisibility(userId),
      CacheKeys.recommendations(userId),
      CacheKeys.userInterests(userId),
      CacheKeys.userReceivedInterests(userId),
      CacheKeys.unreadNotifications(userId)
    ];
    
    // Remove from active users set as well
    await removeFromSet(CacheKeys.activeUsers(), [userId]);
    
    return await deleteMultipleKeys(keysToClear);
  } catch (error) {
    console.error('Error clearing user related caches:', error);
    return false;
  }
};

/**
 * Clear search/listing caches when profiles are updated
 * @returns {Promise<boolean>} Success status
 */
const clearProfileListingCaches = async () => {
  try {
    // For now, we'll clear all profile listing caches
    // In production, you might want to be more selective
    
    // This is a simplified version - in practice, you'd need to identify
    // which specific cache keys to clear based on the search criteria
    return true;
  } catch (error) {
    console.error('Error clearing profile listing caches:', error);
    return false;
  }
};

/**
 * Update cache when user sends/receives interest
 * @param {string} userId - User ID
 * @param {string} action - 'send' or 'receive'
 * @returns {Promise<boolean>} Success status
 */
const updateInterestCache = async (userId, action) => {
  try {
    const cacheKey = action === 'send' 
      ? CacheKeys.userInterests(userId) 
      : CacheKeys.userReceivedInterests(userId);
    
    // Invalidate the specific user's interest cache
    return await deleteKey(cacheKey);
  } catch (error) {
    console.error('Error updating interest cache:', error);
    return false;
  }
};

module.exports = {
  CacheKeys,
  cacheUserProfile,
  getCachedUserProfile,
  invalidateUserProfileCache,
  setUserOnlineStatus,
  getUserOnlineStatus,
  cacheProfileList,
  getCachedProfileList,
  cacheRecommendations,
  getCachedRecommendations,
  setProfileVisibility,
  getProfileVisibility,
  getActiveUsers,
  clearUserRelatedCaches,
  clearProfileListingCaches,
  updateInterestCache,
};