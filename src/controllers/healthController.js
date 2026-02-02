const { PrismaClient } = require('@prisma/client');
const { getRedisClient } = require('../utils/redis');

const prisma = new PrismaClient();

/**
 * Health check endpoint
 * GET /health
 */
const healthCheck = async (req, res) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis connectivity
    const redisClient = getRedisClient();
    let redisStatus = 'unavailable';
    
    if (redisClient) {
      try {
        await redisClient.ping();
        redisStatus = 'connected';
      } catch (error) {
        redisStatus = 'error';
      }
    }
    
    res.json({
      status: 'success',
      message: 'Server is healthy',
      checks: {
        database: 'connected',
        redis: redisStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
    });
  }
};

/**
 * Detailed health check
 * GET /health/detail
 */
const detailedHealthCheck = async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check database
    let dbCheck = { status: 'ok', responseTime: 0 };
    try {
      const dbStartTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbCheck.responseTime = Date.now() - dbStartTime;
    } catch (error) {
      dbCheck = { status: 'error', error: error.message };
    }
    
    // Check Redis
    let redisCheck = { status: 'unavailable', responseTime: 0 };
    const redisClient = getRedisClient();
    
    if (redisClient) {
      try {
        const redisStartTime = Date.now();
        await redisClient.ping();
        redisCheck = { status: 'connected', responseTime: Date.now() - redisStartTime };
      } catch (error) {
        redisCheck = { status: 'error', error: error.message };
      }
    }
    
    // Overall status
    const overallStatus = 
      dbCheck.status === 'ok' && 
      (redisClient ? redisCheck.status === 'connected' : true) 
        ? 'healthy' 
        : 'unhealthy';
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        database: dbCheck,
        redis: redisCheck,
      },
      uptime: `${Math.round(process.uptime())}s`,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Detailed health check failed',
      error: error.message,
    });
  }
};

module.exports = {
  healthCheck,
  detailedHealthCheck,
};