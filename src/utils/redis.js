const { createClient } = require('redis');

let client;
let isRedisAvailable = false; // Track Redis availability
let redisInitAttempted = false; // Track if initialization was attempted

/**
 * Initialize Redis client
 */
const initRedis = async () => {
  // Prevent multiple initialization attempts
  if (redisInitAttempted) {
    return client;
  }
  
  redisInitAttempted = true;
  
  try {
    client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 2000, // Shorter timeout
        reconnectStrategy: (retries) => {
          // Stop retrying after 2 attempts to reduce noise
          if (retries >= 2) {
            return false;
          }
          // Quick retry: 500ms, 1000ms
          return Math.min(retries * 500, 1000);
        }
      }
    });

    // Temporarily suppress error logging during connection attempt
    let suppressErrors = true;
    
    client.on('error', (err) => {
      if (!suppressErrors && !isRedisAvailable) {
        console.debug('Redis Client Connection Error:', err.message);
      }
    });

    client.on('connect', () => {
      console.log('Connected to Redis successfully');
      isRedisAvailable = true;
      suppressErrors = false;
    });

    client.on('ready', () => {
      console.log('Redis client is ready');
      isRedisAvailable = true;
      suppressErrors = false;
    });

    client.on('reconnecting', () => {
      if (isRedisAvailable) { // Only show if we were previously connected
        console.debug('Reconnecting to Redis...');
      }
    });

    client.on('end', () => {
      console.debug('Redis client disconnected');
      isRedisAvailable = false;
    });

    // Attempt to connect but don't fail if Redis is unavailable
    try {
      await client.connect();
    } catch (connectionError) {
      console.warn('Warning: Could not connect to Redis. Continuing with degraded functionality. All cache operations will be skipped.');
      // Close the client to prevent further connection attempts
      if (client) {
        try {
          await client.quit();
        } catch (quitError) {
          // Ignore quit errors
        }
      }
      client = null;
      isRedisAvailable = false;
      redisInitAttempted = true; // Mark as attempted even if failed
      return null;
    }
    
    isRedisAvailable = true;
    return client;
  } catch (error) {
    console.error('Error initializing Redis:', error);
    isRedisAvailable = false;
    redisInitAttempted = true;
    return null;
  }
};

/**
 * Get Redis client instance
 */
const getRedisClient = () => {
  return client;
};

/**
 * Set a key-value pair with expiration
 * @param {string} key - Key to set
 * @param {string} value - Value to set
 * @param {number} expirySeconds - Expiration time in seconds
 */
const setWithExpiry = async (key, value, expirySeconds = 300) => {
  if (!client) return false;
  
  try {
    await client.setEx(key, expirySeconds, value);
    return true;
  } catch (error) {
    console.error('Error setting Redis key:', error);
    return false;
  }
};

/**
 * Get value by key
 * @param {string} key - Key to get
 */
const getValue = async (key) => {
  if (!client) return null;
  
  try {
    return await client.get(key);
  } catch (error) {
    console.error('Error getting Redis key:', error);
    return null;
  }
};

/**
 * Delete a key
 * @param {string} key - Key to delete
 */
const deleteKey = async (key) => {
  if (!client) return false;
  
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Error deleting Redis key:', error);
    return false;
  }
};

/**
 * Check if key exists
 * @param {string} key - Key to check
 */
const exists = async (key) => {
  if (!client) return false;
  
  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    console.error('Error checking Redis key existence:', error);
    return false;
  }
};

/**
 * Set multiple key-value pairs with expiry
 * @param {Array} keyValuePairs - Array of [key, value, expirySeconds] tuples
 */
const setMultipleWithExpiry = async (keyValuePairs) => {
  if (!client) return false;
  
  try {
    const multi = client.multi();
    
    keyValuePairs.forEach(([key, value, expirySeconds]) => {
      multi.setEx(key, expirySeconds, value);
    });
    
    await multi.exec();
    return true;
  } catch (error) {
    console.error('Error setting multiple Redis keys:', error);
    return false;
  }
};

/**
 * Get multiple values
 * @param {Array} keys - Array of keys to get
 */
const getMultipleValues = async (keys) => {
  if (!client) return [];
  
  try {
    return await client.mGet(keys);
  } catch (error) {
    console.error('Error getting multiple Redis keys:', error);
    return [];
  }
};

/**
 * Delete multiple keys
 * @param {Array} keys - Array of keys to delete
 */
const deleteMultipleKeys = async (keys) => {
  if (!client) return false;
  
  try {
    await client.del(keys);
    return true;
  } catch (error) {
    console.error('Error deleting multiple Redis keys:', error);
    return false;
  }
};

/**
 * Set a key with no expiry (persistent)
 * @param {string} key - Key to set
 * @param {string} value - Value to set
 */
const setPersistent = async (key, value) => {
  if (!client) return false;
  
  try {
    await client.set(key, value);
    return true;
  } catch (error) {
    console.error('Error setting persistent Redis key:', error);
    return false;
  }
};

/**
 * Increment a counter value
 * @param {string} key - Counter key
 * @param {number} increment - Amount to increment by (default: 1)
 */
const incrementCounter = async (key, increment = 1) => {
  if (!client) return null;
  
  try {
    return await client.incrBy(key, increment);
  } catch (error) {
    console.error('Error incrementing Redis counter:', error);
    return null;
  }
};

/**
 * Decrement a counter value
 * @param {string} key - Counter key
 * @param {number} decrement - Amount to decrement by (default: 1)
 */
const decrementCounter = async (key, decrement = 1) => {
  if (!client) return null;
  
  try {
    return await client.decrBy(key, decrement);
  } catch (error) {
    console.error('Error decrementing Redis counter:', error);
    return null;
  }
};

/**
 * Add members to a set
 * @param {string} key - Set key
 * @param {Array} members - Members to add
 */
const addToSet = async (key, members) => {
  if (!client) return false;
  
  try {
    await client.sAdd(key, members);
    return true;
  } catch (error) {
    console.error('Error adding to Redis set:', error);
    return false;
  }
};

/**
 * Remove members from a set
 * @param {string} key - Set key
 * @param {Array} members - Members to remove
 */
const removeFromSet = async (key, members) => {
  if (!client) return false;
  
  try {
    await client.sRem(key, members);
    return true;
  } catch (error) {
    console.error('Error removing from Redis set:', error);
    return false;
  }
};

/**
 * Get all members from a set
 * @param {string} key - Set key
 */
const getSetMembers = async (key) => {
  if (!client) return [];
  
  try {
    return await client.sMembers(key);
  } catch (error) {
    console.error('Error getting Redis set members:', error);
    return [];
  }
};

module.exports = {
  initRedis,
  getRedisClient,
  setWithExpiry,
  getValue,
  deleteKey,
  exists
};