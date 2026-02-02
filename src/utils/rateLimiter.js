const { setWithExpiry, getValue, deleteKey } = require('./redis');

/**
 * Generate a rate limit key for OTP requests
 * @param {string} phone - Phone number
 * @param {string} type - Type of request ('send-otp', 'verify-otp', etc.)
 * @returns {string} Rate limit key
 */
const generateRateLimitKey = (phone, type) => {
  return `ratelimit:${type}:${phone}`;
};

/**
 * Check if OTP request is allowed based on rate limiting
 * @param {string} phone - Phone number
 * @param {string} type - Type of request ('send-otp', 'verify-otp')
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowSeconds - Time window in seconds
 * @returns {Promise<Object>} { allowed: boolean, remaining: number, resetTime: number }
 */
const checkRateLimit = async (phone, type = 'send-otp', maxAttempts = 5, windowSeconds = 300) => {
  try {
    const rateLimitKey = generateRateLimitKey(phone, type);
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Get current count and expiry time from Redis
    const storedValue = await getValue(rateLimitKey);
    
    let currentCount = 0;
    let expiryTime = currentTime + windowSeconds;
    
    if (storedValue) {
      const parsed = JSON.parse(storedValue);
      currentCount = parsed.count || 0;
      expiryTime = parsed.expiry || (currentTime + windowSeconds);
    }
    
    // Increment the count
    currentCount++;
    
    // Calculate remaining attempts
    const remaining = Math.max(0, maxAttempts - currentCount);
    const resetTime = expiryTime;
    
    // Store updated count with TTL
    const rateLimitData = {
      count: currentCount,
      expiry: expiryTime,
      resetTime: expiryTime
    };
    
    await setWithExpiry(rateLimitKey, JSON.stringify(rateLimitData), windowSeconds);
    
    const allowed = currentCount <= maxAttempts;
    
    return {
      allowed,
      remaining,
      resetTime,
      currentCount,
      maxAttempts
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // If there's an error with Redis, allow the request to proceed
    return {
      allowed: true,
      remaining: maxAttempts,
      resetTime: Math.floor(Date.now() / 1000) + 300,
      currentCount: 0,
      maxAttempts
    };
  }
};

/**
 * Reset rate limit for a specific phone and type
 * @param {string} phone - Phone number
 * @param {string} type - Type of request
 * @returns {Promise<boolean>} Success status
 */
const resetRateLimit = async (phone, type = 'send-otp') => {
  try {
    const rateLimitKey = generateRateLimitKey(phone, type);
    return await deleteKey(rateLimitKey);
  } catch (error) {
    console.error('Error resetting rate limit:', error);
    return false;
  }
};

/**
 * Check if phone is temporarily blocked due to too many failed attempts
 * @param {string} phone - Phone number
 * @returns {Promise<boolean>} Is phone blocked
 */
const isPhoneBlocked = async (phone) => {
  try {
    const blockKey = `block:${phone}`;
    const blocked = await getValue(blockKey);
    return blocked !== null;
  } catch (error) {
    console.error('Error checking phone block status:', error);
    return false;
  }
};

/**
 * Block a phone number temporarily
 * @param {string} phone - Phone number
 * @param {number} blockDuration - Block duration in seconds (default: 1 hour)
 * @returns {Promise<boolean>} Success status
 */
const blockPhone = async (phone, blockDuration = 3600) => {
  try {
    const blockKey = `block:${phone}`;
    return await setWithExpiry(blockKey, 'blocked', blockDuration);
  } catch (error) {
    console.error('Error blocking phone:', error);
    return false;
  }
};

/**
 * Unblock a phone number
 * @param {string} phone - Phone number
 * @returns {Promise<boolean>} Success status
 */
const unblockPhone = async (phone) => {
  try {
    const blockKey = `block:${phone}`;
    return await deleteKey(blockKey);
  } catch (error) {
    console.error('Error unblocking phone:', error);
    return false;
  }
};

module.exports = {
  checkRateLimit,
  resetRateLimit,
  isPhoneBlocked,
  blockPhone,
  unblockPhone,
};