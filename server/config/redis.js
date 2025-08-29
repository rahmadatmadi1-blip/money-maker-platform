/**
 * Redis Configuration untuk Money Maker Platform
 * 
 * Konfigurasi Redis untuk:
 * 1. Session storage
 * 2. API response caching
 * 3. Query result caching
 * 4. Rate limiting
 * 5. Real-time data caching
 */

const redis = require('redis');
const { promisify } = require('util');

// Redis Configuration
const REDIS_CONFIG = {
  development: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: 0,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000
  },
  production: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: 0,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined
  }
};

// Cache TTL Configuration (in seconds)
const CACHE_TTL = {
  session: 24 * 60 * 60,        // 24 hours
  api: 5 * 60,                  // 5 minutes
  query: 10 * 60,               // 10 minutes
  user: 30 * 60,                // 30 minutes
  product: 60 * 60,             // 1 hour
  analytics: 2 * 60,            // 2 minutes
  rateLimit: 60,                // 1 minute
  temporary: 5 * 60             // 5 minutes
};

// Cache Key Prefixes
const CACHE_KEYS = {
  session: 'sess:',
  api: 'api:',
  query: 'query:',
  user: 'user:',
  product: 'product:',
  analytics: 'analytics:',
  rateLimit: 'rate:',
  lock: 'lock:',
  notification: 'notif:'
};

class RedisManager {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.isConnected = false;
  }

  // Initialize Redis connections
  async initialize() {
    try {
      const config = REDIS_CONFIG[process.env.NODE_ENV] || REDIS_CONFIG.development;
      
      // Main Redis client
      this.client = redis.createClient(config);
      
      // Pub/Sub clients
      this.subscriber = redis.createClient(config);
      this.publisher = redis.createClient(config);

      // Event handlers
      this.setupEventHandlers();

      // Connect to Redis
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect()
      ]);

      this.isConnected = true;
      console.log('✅ Redis connected successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Setup event handlers
  setupEventHandlers() {
    const clients = [this.client, this.subscriber, this.publisher];
    
    clients.forEach(client => {
      client.on('error', (error) => {
        console.error('Redis error:', error);
        this.isConnected = false;
      });

      client.on('connect', () => {
        console.log('Redis client connected');
      });

      client.on('ready', () => {
        console.log('Redis client ready');
        this.isConnected = true;
      });

      client.on('end', () => {
        console.log('Redis client disconnected');
        this.isConnected = false;
      });
    });
  }

  // Generic cache operations
  async get(key) {
    try {
      if (!this.isConnected) return null;
      const result = await this.client.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key, value, ttl = CACHE_TTL.temporary) {
    try {
      if (!this.isConnected) return false;
      const serialized = JSON.stringify(value);
      await this.client.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) return false;
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.isConnected) return false;
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  // Session management
  async getSession(sessionId) {
    return await this.get(CACHE_KEYS.session + sessionId);
  }

  async setSession(sessionId, sessionData) {
    return await this.set(CACHE_KEYS.session + sessionId, sessionData, CACHE_TTL.session);
  }

  async deleteSession(sessionId) {
    return await this.del(CACHE_KEYS.session + sessionId);
  }

  // API response caching
  async getApiCache(endpoint, params = {}) {
    const key = CACHE_KEYS.api + this.generateCacheKey(endpoint, params);
    return await this.get(key);
  }

  async setApiCache(endpoint, params = {}, data, ttl = CACHE_TTL.api) {
    const key = CACHE_KEYS.api + this.generateCacheKey(endpoint, params);
    return await this.set(key, data, ttl);
  }

  // Query result caching
  async getQueryCache(query, params = {}) {
    const key = CACHE_KEYS.query + this.generateCacheKey(query, params);
    return await this.get(key);
  }

  async setQueryCache(query, params = {}, result, ttl = CACHE_TTL.query) {
    const key = CACHE_KEYS.query + this.generateCacheKey(query, params);
    return await this.set(key, result, ttl);
  }

  // User data caching
  async getUserCache(userId) {
    return await this.get(CACHE_KEYS.user + userId);
  }

  async setUserCache(userId, userData, ttl = CACHE_TTL.user) {
    return await this.set(CACHE_KEYS.user + userId, userData, ttl);
  }

  async invalidateUserCache(userId) {
    return await this.del(CACHE_KEYS.user + userId);
  }

  // Product caching
  async getProductCache(productId) {
    return await this.get(CACHE_KEYS.product + productId);
  }

  async setProductCache(productId, productData, ttl = CACHE_TTL.product) {
    return await this.set(CACHE_KEYS.product + productId, productData, ttl);
  }

  // Rate limiting
  async checkRateLimit(identifier, limit, window = 60) {
    try {
      const key = CACHE_KEYS.rateLimit + identifier;
      const current = await this.client.incr(key);
      
      if (current === 1) {
        await this.client.expire(key, window);
      }
      
      return {
        count: current,
        remaining: Math.max(0, limit - current),
        resetTime: Date.now() + (window * 1000),
        allowed: current <= limit
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true, count: 0, remaining: limit };
    }
  }

  // Distributed locking
  async acquireLock(resource, ttl = 30) {
    try {
      const key = CACHE_KEYS.lock + resource;
      const lockId = Date.now() + Math.random();
      const result = await this.client.set(key, lockId, {
        EX: ttl,
        NX: true
      });
      return result === 'OK' ? lockId : null;
    } catch (error) {
      console.error('Lock acquisition error:', error);
      return null;
    }
  }

  async releaseLock(resource, lockId) {
    try {
      const key = CACHE_KEYS.lock + resource;
      const script = `
        if redis.call('GET', KEYS[1]) == ARGV[1] then
          return redis.call('DEL', KEYS[1])
        else
          return 0
        end
      `;
      const result = await this.client.eval(script, {
        keys: [key],
        arguments: [lockId.toString()]
      });
      return result === 1;
    } catch (error) {
      console.error('Lock release error:', error);
      return false;
    }
  }

  // Pub/Sub operations
  async publish(channel, message) {
    try {
      if (!this.isConnected) return false;
      await this.publisher.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Redis PUBLISH error:', error);
      return false;
    }
  }

  async subscribe(channel, callback) {
    try {
      if (!this.isConnected) return false;
      await this.subscriber.subscribe(channel, (message) => {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch (error) {
          console.error('Message parsing error:', error);
          callback(message);
        }
      });
      return true;
    } catch (error) {
      console.error('Redis SUBSCRIBE error:', error);
      return false;
    }
  }

  // Analytics caching
  async getAnalyticsCache(metric, timeframe) {
    const key = CACHE_KEYS.analytics + `${metric}:${timeframe}`;
    return await this.get(key);
  }

  async setAnalyticsCache(metric, timeframe, data) {
    const key = CACHE_KEYS.analytics + `${metric}:${timeframe}`;
    return await this.set(key, data, CACHE_TTL.analytics);
  }

  // Cache invalidation
  async invalidatePattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Pattern invalidation error:', error);
      return 0;
    }
  }

  // Utility methods
  generateCacheKey(base, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${base}:${Buffer.from(sortedParams).toString('base64')}`;
  }

  getHealthStatus() {
    return {
      connected: this.isConnected,
      status: this.isConnected ? 'healthy' : 'disconnected',
      timestamp: new Date().toISOString()
    };
  }

  async getStats() {
    try {
      if (!this.isConnected) return null;
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      return {
        connected: this.isConnected,
        memory: info,
        keyspace: keyspace,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Redis stats error:', error);
      return null;
    }
  }

  // Graceful shutdown
  async disconnect() {
    try {
      if (this.client) await this.client.quit();
      if (this.subscriber) await this.subscriber.quit();
      if (this.publisher) await this.publisher.quit();
      this.isConnected = false;
      console.log('Redis disconnected gracefully');
    } catch (error) {
      console.error('Redis disconnect error:', error);
    }
  }
}

// Create singleton instance
const redisManager = new RedisManager();

module.exports = {
  redisManager,
  CACHE_TTL,
  CACHE_KEYS,
  REDIS_CONFIG
};