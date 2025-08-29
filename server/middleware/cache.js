/**
 * Cache Middleware untuk Money Maker Platform
 * 
 * Middleware ini menyediakan:
 * 1. API response caching
 * 2. Query result caching
 * 3. User data caching
 * 4. Cache invalidation
 * 5. Cache statistics
 */

const { redisManager, CACHE_TTL } = require('../config/redis');
const crypto = require('crypto');

/**
 * API Response Cache Middleware
 * Caches GET requests based on URL and query parameters
 */
const apiCache = (options = {}) => {
  const {
    ttl = CACHE_TTL.api,
    keyGenerator = null,
    condition = null,
    skipCache = false
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests or if explicitly disabled
    if (req.method !== 'GET' || skipCache) {
      return next();
    }

    // Check condition if provided
    if (condition && !condition(req)) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator ? 
        keyGenerator(req) : 
        generateApiCacheKey(req);

      // Try to get from cache
      const cachedResponse = await redisManager.getApiCache(cacheKey);
      
      if (cachedResponse) {
        // Add cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${ttl}`
        });
        
        return res.json(cachedResponse);
      }

      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data) {
        // Cache the response
        redisManager.setApiCache(cacheKey, {}, data, ttl)
          .catch(error => console.error('Cache set error:', error));
        
        // Add cache headers
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${ttl}`
        });
        
        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('API cache middleware error:', error);
      next();
    }
  };
};

/**
 * Query Cache Middleware
 * Caches database query results
 */
const queryCache = (options = {}) => {
  const {
    ttl = CACHE_TTL.query,
    keyPrefix = 'query',
    condition = null
  } = options;

  return async (req, res, next) => {
    // Add cache methods to request object
    req.cache = {
      get: async (query, params = {}) => {
        try {
          if (condition && !condition(req, query, params)) {
            return null;
          }
          return await redisManager.getQueryCache(query, params);
        } catch (error) {
          console.error('Query cache get error:', error);
          return null;
        }
      },
      
      set: async (query, params = {}, result) => {
        try {
          if (condition && !condition(req, query, params)) {
            return false;
          }
          return await redisManager.setQueryCache(query, params, result, ttl);
        } catch (error) {
          console.error('Query cache set error:', error);
          return false;
        }
      },
      
      invalidate: async (pattern) => {
        try {
          return await redisManager.invalidatePattern(pattern);
        } catch (error) {
          console.error('Query cache invalidate error:', error);
          return 0;
        }
      }
    };

    next();
  };
};

/**
 * User Cache Middleware
 * Caches user-specific data
 */
const userCache = (options = {}) => {
  const {
    ttl = CACHE_TTL.user,
    autoCache = true
  } = options;

  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return next();
    }

    const userId = req.user.id;

    // Add user cache methods to request object
    req.userCache = {
      get: async (key = 'profile') => {
        try {
          const cacheKey = `${userId}:${key}`;
          return await redisManager.getUserCache(cacheKey);
        } catch (error) {
          console.error('User cache get error:', error);
          return null;
        }
      },
      
      set: async (key = 'profile', data) => {
        try {
          const cacheKey = `${userId}:${key}`;
          return await redisManager.setUserCache(cacheKey, data, ttl);
        } catch (error) {
          console.error('User cache set error:', error);
          return false;
        }
      },
      
      invalidate: async (key = null) => {
        try {
          if (key) {
            const cacheKey = `${userId}:${key}`;
            return await redisManager.invalidateUserCache(cacheKey);
          } else {
            // Invalidate all user cache
            return await redisManager.invalidatePattern(`user:${userId}:*`);
          }
        } catch (error) {
          console.error('User cache invalidate error:', error);
          return false;
        }
      }
    };

    // Auto-cache user profile if enabled
    if (autoCache) {
      try {
        const cachedProfile = await req.userCache.get('profile');
        if (cachedProfile) {
          req.user.cached = cachedProfile;
        }
      } catch (error) {
        console.error('Auto user cache error:', error);
      }
    }

    next();
  };
};

/**
 * Cache Invalidation Middleware
 * Automatically invalidates cache on data modifications
 */
const cacheInvalidation = (options = {}) => {
  const {
    patterns = [],
    condition = null
  } = options;

  return async (req, res, next) => {
    // Skip for GET requests
    if (req.method === 'GET') {
      return next();
    }

    // Check condition
    if (condition && !condition(req)) {
      return next();
    }

    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override response methods to trigger cache invalidation
    const invalidateCache = async () => {
      try {
        for (const pattern of patterns) {
          const resolvedPattern = typeof pattern === 'function' ? 
            pattern(req) : pattern;
          
          if (resolvedPattern) {
            await redisManager.invalidatePattern(resolvedPattern);
            console.log(`Cache invalidated for pattern: ${resolvedPattern}`);
          }
        }
      } catch (error) {
        console.error('Cache invalidation error:', error);
      }
    };

    res.json = function(data) {
      invalidateCache();
      return originalJson.call(this, data);
    };

    res.send = function(data) {
      invalidateCache();
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Cache Statistics Middleware
 * Tracks cache hit/miss statistics
 */
const cacheStats = () => {
  const stats = {
    hits: 0,
    misses: 0,
    errors: 0,
    startTime: Date.now()
  };

  return async (req, res, next) => {
    // Add stats to request
    req.cacheStats = stats;

    // Track cache hits/misses
    const originalJson = res.json;
    res.json = function(data) {
      const cacheHeader = res.get('X-Cache');
      if (cacheHeader === 'HIT') {
        stats.hits++;
      } else if (cacheHeader === 'MISS') {
        stats.misses++;
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Cache Warming Middleware
 * Pre-populates cache with frequently accessed data
 */
const cacheWarming = (warmupFunctions = []) => {
  return async (req, res, next) => {
    // Add cache warming method to request
    req.warmCache = async () => {
      try {
        for (const warmupFn of warmupFunctions) {
          await warmupFn(req);
        }
      } catch (error) {
        console.error('Cache warming error:', error);
      }
    };

    next();
  };
};

/**
 * Conditional Cache Middleware
 * Applies caching based on conditions
 */
const conditionalCache = (conditions = {}) => {
  return async (req, res, next) => {
    let shouldCache = true;
    let ttl = CACHE_TTL.api;

    // Check conditions
    for (const [condition, config] of Object.entries(conditions)) {
      if (evaluateCondition(condition, req)) {
        shouldCache = config.enabled !== false;
        ttl = config.ttl || ttl;
        break;
      }
    }

    if (shouldCache) {
      return apiCache({ ttl })(req, res, next);
    } else {
      return next();
    }
  };
};

// Utility functions
function generateApiCacheKey(req) {
  const { method, originalUrl, query, user } = req;
  const userId = user ? user.id : 'anonymous';
  
  const keyData = {
    method,
    url: originalUrl,
    query: JSON.stringify(query),
    userId
  };
  
  return crypto
    .createHash('md5')
    .update(JSON.stringify(keyData))
    .digest('hex');
}

function evaluateCondition(condition, req) {
  if (typeof condition === 'function') {
    return condition(req);
  }
  
  if (typeof condition === 'string') {
    // Simple path matching
    return req.path.includes(condition);
  }
  
  if (condition instanceof RegExp) {
    return condition.test(req.path);
  }
  
  return false;
}

// Cache health check
const cacheHealthCheck = async () => {
  try {
    const stats = await redisManager.getStats();
    return {
      status: redisManager.isConnected ? 'healthy' : 'unhealthy',
      connected: redisManager.isConnected,
      stats: stats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = {
  apiCache,
  queryCache,
  userCache,
  cacheInvalidation,
  cacheStats,
  cacheWarming,
  conditionalCache,
  cacheHealthCheck,
  generateApiCacheKey
};