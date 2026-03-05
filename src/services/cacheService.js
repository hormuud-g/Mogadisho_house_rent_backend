const redis = require('redis');
const { promisify } = require('util');

class CacheService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.defaultTTL = 3600; // 1 hour default
    this.prefix = 'cache:';
  }

  // Initialize Redis connection
  async initialize() {
    if (this.connected) return;

    try {
      if (process.env.REDIS_ENABLED !== 'true') {
        console.log('⚠️ Redis cache is disabled');
        return;
      }

      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis max retries reached');
              return new Error('Redis max retries reached');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.connected = true;
      });

      this.client.on('end', () => {
        console.log('Redis connection ended');
        this.connected = false;
      });

      await this.client.connect();

      // Promisify commands
      this.getAsync = async (key) => this.client.get(key);
      this.setAsync = async (key, value, ttl) => {
        if (ttl) {
          return this.client.setEx(key, ttl, value);
        }
        return this.client.set(key, value);
      };
      this.delAsync = async (key) => this.client.del(key);
      this.keysAsync = async (pattern) => this.client.keys(pattern);

    } catch (error) {
      console.error('❌ Redis initialization failed:', error);
      this.connected = false;
    }
  }

  // Get cache key with prefix
  getKey(key) {
    return `${this.prefix}${key}`;
  }

  // Set cache data
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.connected) {
      return false;
    }

    try {
      const cacheKey = this.getKey(key);
      const serialized = JSON.stringify(value);
      await this.setAsync(cacheKey, serialized, ttl);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Get cache data
  async get(key) {
    if (!this.connected) {
      return null;
    }

    try {
      const cacheKey = this.getKey(key);
      const data = await this.getAsync(cacheKey);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Delete cache data
  async del(key) {
    if (!this.connected) {
      return false;
    }

    try {
      const cacheKey = this.getKey(key);
      await this.delAsync(cacheKey);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Delete multiple keys by pattern
  async delPattern(pattern) {
    if (!this.connected) {
      return false;
    }

    try {
      const cachePattern = this.getKey(pattern);
      const keys = await this.keysAsync(cachePattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      
      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return false;
    }
  }

  // Check if key exists
  async exists(key) {
    if (!this.connected) {
      return false;
    }

    try {
      const cacheKey = this.getKey(key);
      const exists = await this.client.exists(cacheKey);
      return exists === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  // Get TTL of key
  async ttl(key) {
    if (!this.connected) {
      return -2;
    }

    try {
      const cacheKey = this.getKey(key);
      return await this.client.ttl(cacheKey);
    } catch (error) {
      console.error('Cache TTL error:', error);
      return -2;
    }
  }

  // Increment value
  async incr(key) {
    if (!this.connected) {
      return null;
    }

    try {
      const cacheKey = this.getKey(key);
      return await this.client.incr(cacheKey);
    } catch (error) {
      console.error('Cache increment error:', error);
      return null;
    }
  }

  // Set hash field
  async hset(key, field, value) {
    if (!this.connected) {
      return false;
    }

    try {
      const cacheKey = this.getKey(key);
      const serialized = JSON.stringify(value);
      await this.client.hSet(cacheKey, field, serialized);
      return true;
    } catch (error) {
      console.error('Cache hset error:', error);
      return false;
    }
  }

  // Get hash field
  async hget(key, field) {
    if (!this.connected) {
      return null;
    }

    try {
      const cacheKey = this.getKey(key);
      const data = await this.client.hGet(cacheKey, field);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('Cache hget error:', error);
      return null;
    }
  }

  // Get all hash fields
  async hgetall(key) {
    if (!this.connected) {
      return null;
    }

    try {
      const cacheKey = this.getKey(key);
      const data = await this.client.hGetAll(cacheKey);
      
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      // Parse JSON values
      const parsed = {};
      for (const [field, value] of Object.entries(data)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }

      return parsed;
    } catch (error) {
      console.error('Cache hgetall error:', error);
      return null;
    }
  }

  // Add to set
  async sadd(key, value) {
    if (!this.connected) {
      return false;
    }

    try {
      const cacheKey = this.getKey(key);
      const serialized = JSON.stringify(value);
      await this.client.sAdd(cacheKey, serialized);
      return true;
    } catch (error) {
      console.error('Cache sadd error:', error);
      return false;
    }
  }

  // Get set members
  async smembers(key) {
    if (!this.connected) {
      return [];
    }

    try {
      const cacheKey = this.getKey(key);
      const members = await this.client.sMembers(cacheKey);
      
      return members.map(member => {
        try {
          return JSON.parse(member);
        } catch {
          return member;
        }
      });
    } catch (error) {
      console.error('Cache smembers error:', error);
      return [];
    }
  }

  // Remove from set
  async srem(key, value) {
    if (!this.connected) {
      return false;
    }

    try {
      const cacheKey = this.getKey(key);
      const serialized = JSON.stringify(value);
      await this.client.sRem(cacheKey, serialized);
      return true;
    } catch (error) {
      console.error('Cache srem error:', error);
      return false;
    }
  }

  // Add to list (right push)
  async rpush(key, value) {
    if (!this.connected) {
      return false;
    }

    try {
      const cacheKey = this.getKey(key);
      const serialized = JSON.stringify(value);
      await this.client.rPush(cacheKey, serialized);
      return true;
    } catch (error) {
      console.error('Cache rpush error:', error);
      return false;
    }
  }

  // Get list range
  async lrange(key, start, stop) {
    if (!this.connected) {
      return [];
    }

    try {
      const cacheKey = this.getKey(key);
      const items = await this.client.lRange(cacheKey, start, stop);
      
      return items.map(item => {
        try {
          return JSON.parse(item);
        } catch {
          return item;
        }
      });
    } catch (error) {
      console.error('Cache lrange error:', error);
      return [];
    }
  }

  // Cache wrapper for functions
  async remember(key, ttl, callback) {
    // Try to get from cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute callback
    const result = await callback();

    // Store in cache
    await this.set(key, result, ttl);

    return result;
  }

  // Clear all cache with prefix
  async flush() {
    if (!this.connected) {
      return false;
    }

    try {
      const keys = await this.keysAsync(`${this.prefix}*`);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  // Get cache stats
  async getStats() {
    if (!this.connected) {
      return null;
    }

    try {
      const info = await this.client.info();
      const keys = await this.keysAsync(`${this.prefix}*`);
      
      return {
        connected: this.connected,
        totalKeys: keys.length,
        info: info.split('\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  }

  // Close connection
  async close() {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
      console.log('Redis connection closed');
    }
  }
}

module.exports = new CacheService();