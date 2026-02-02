const { setWithExpiry, getValue, deleteKey } = require('./redis');

/**
 * Generate a unique session key
 * @param {string} userId - User ID
 * @returns {string} Session key
 */
const generateSessionKey = (userId) => {
  return `session:${userId}`;
};

/**
 * Generate a unique active users key
 * @returns {string} Active users key
 */
const getActiveUsersKey = () => {
  return 'active:users';
};

/**
 * Create a user session in Redis
 * @param {string} userId - User ID
 * @param {Object} userData - User data to store in session
 * @param {number} expirySeconds - Session expiry in seconds (default: 24 hours)
 * @returns {Promise<boolean>} Success status
 */
const createSession = async (userId, userData, expirySeconds = 86400) => {
  try {
    const sessionKey = generateSessionKey(userId);
    const sessionData = JSON.stringify(userData);
    
    // Store session data
    const success = await setWithExpiry(sessionKey, sessionData, expirySeconds);
    
    if (success) {
      // Add user to active users set
      const activeUsersKey = getActiveUsersKey();
      await setWithExpiry(`${activeUsersKey}:${userId}`, '1', expirySeconds);
    }
    
    return success;
  } catch (error) {
    console.error('Error creating session:', error);
    return false;
  }
};

/**
 * Get user session from Redis
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User session data or null
 */
const getSession = async (userId) => {
  try {
    const sessionKey = generateSessionKey(userId);
    const sessionData = await getValue(sessionKey);
    
    if (sessionData) {
      return JSON.parse(sessionData);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

/**
 * Delete user session from Redis
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
const deleteSession = async (userId) => {
  try {
    const sessionKey = generateSessionKey(userId);
    const activeUsersKey = getActiveUsersKey();
    
    // Delete session data
    const sessionDeleted = await deleteKey(sessionKey);
    
    // Remove user from active users set
    const activeUserDeleted = await deleteKey(`${activeUsersKey}:${userId}`);
    
    return sessionDeleted || activeUserDeleted;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
};

/**
 * Get list of active users
 * @returns {Promise<Array>} Array of active user IDs
 */
const getActiveUsers = async () => {
  try {
    // This would require scanning keys in Redis which isn't efficient
    // For now, we'll return a placeholder
    // In a real implementation, we'd use Redis Sets or Sorted Sets to track active users
    return [];
  } catch (error) {
    console.error('Error getting active users:', error);
    return [];
  }
};

/**
 * Update user session data
 * @param {string} userId - User ID
 * @param {Object} userData - Updated user data
 * @param {number} expirySeconds - Session expiry in seconds (default: 24 hours)
 * @returns {Promise<boolean>} Success status
 */
const updateSession = async (userId, userData, expirySeconds = 86400) => {
  try {
    const sessionKey = generateSessionKey(userId);
    const sessionData = JSON.stringify(userData);
    
    // Update session data with new expiry
    const success = await setWithExpiry(sessionKey, sessionData, expirySeconds);
    
    if (success) {
      // Refresh active user status
      const activeUsersKey = getActiveUsersKey();
      await setWithExpiry(`${activeUsersKey}:${userId}`, '1', expirySeconds);
    }
    
    return success;
  } catch (error) {
    console.error('Error updating session:', error);
    return false;
  }
};

/**
 * Check if user session exists
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Session existence status
 */
const hasSession = async (userId) => {
  try {
    const sessionKey = generateSessionKey(userId);
    const sessionData = await getValue(sessionKey);
    
    return sessionData !== null;
  } catch (error) {
    console.error('Error checking session:', error);
    return false;
  }
};

module.exports = {
  createSession,
  getSession,
  deleteSession,
  getActiveUsers,
  updateSession,
  hasSession,
};