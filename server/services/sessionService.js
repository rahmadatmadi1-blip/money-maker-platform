/**
 * Session Service dengan Redis untuk Money Maker Platform
 * 
 * Service ini menangani:
 * 1. Session storage dengan Redis
 * 2. Session validation
 * 3. Session cleanup
 * 4. Multi-device session management
 * 5. Session analytics
 */

const { redisManager, CACHE_TTL } = require('../config/redis');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class SessionService {
  constructor() {
    this.sessionTTL = CACHE_TTL.session;
    this.maxSessionsPerUser = 5; // Maximum concurrent sessions per user
  }

  /**
   * Create new session
   */
  async createSession(userId, deviceInfo = {}) {
    try {
      const sessionId = this.generateSessionId();
      const sessionData = {
        userId,
        sessionId,
        deviceInfo: {
          userAgent: deviceInfo.userAgent || 'Unknown',
          ip: deviceInfo.ip || 'Unknown',
          platform: deviceInfo.platform || 'Unknown',
          browser: deviceInfo.browser || 'Unknown'
        },
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true
      };

      // Store session
      await redisManager.setSession(sessionId, sessionData);
      
      // Add to user's session list
      await this.addToUserSessions(userId, sessionId);
      
      // Cleanup old sessions if limit exceeded
      await this.cleanupUserSessions(userId);
      
      console.log(`Session created for user ${userId}: ${sessionId}`);
      return { sessionId, sessionData };
    } catch (error) {
      console.error('Create session error:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Get session data
   */
  async getSession(sessionId) {
    try {
      const sessionData = await redisManager.getSession(sessionId);
      
      if (!sessionData) {
        return null;
      }

      // Check if session is expired
      const lastActivity = new Date(sessionData.lastActivity);
      const now = new Date();
      const timeDiff = now - lastActivity;
      
      if (timeDiff > this.sessionTTL * 1000) {
        await this.destroySession(sessionId);
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId, additionalData = {}) {
    try {
      const sessionData = await this.getSession(sessionId);
      
      if (!sessionData) {
        return false;
      }

      // Update last activity and merge additional data
      const updatedSession = {
        ...sessionData,
        ...additionalData,
        lastActivity: new Date().toISOString()
      };

      await redisManager.setSession(sessionId, updatedSession);
      return true;
    } catch (error) {
      console.error('Update session activity error:', error);
      return false;
    }
  }

  /**
   * Destroy session
   */
  async destroySession(sessionId) {
    try {
      const sessionData = await redisManager.getSession(sessionId);
      
      if (sessionData) {
        // Remove from user's session list
        await this.removeFromUserSessions(sessionData.userId, sessionId);
      }
      
      // Delete session
      await redisManager.deleteSession(sessionId);
      
      console.log(`Session destroyed: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('Destroy session error:', error);
      return false;
    }
  }

  /**
   * Destroy all user sessions
   */
  async destroyAllUserSessions(userId) {
    try {
      const userSessions = await this.getUserSessions(userId);
      
      for (const sessionId of userSessions) {
        await redisManager.deleteSession(sessionId);
      }
      
      // Clear user sessions list
      await redisManager.del(`user_sessions:${userId}`);
      
      console.log(`All sessions destroyed for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Destroy all user sessions error:', error);
      return false;
    }
  }

  /**
   * Get all user sessions
   */
  async getUserSessions(userId) {
    try {
      const sessionIds = await redisManager.get(`user_sessions:${userId}`) || [];
      const sessions = [];
      
      for (const sessionId of sessionIds) {
        const sessionData = await redisManager.getSession(sessionId);
        if (sessionData) {
          sessions.push(sessionData);
        }
      }
      
      return sessions;
    } catch (error) {
      console.error('Get user sessions error:', error);
      return [];
    }
  }

  /**
   * Add session to user's session list
   */
  async addToUserSessions(userId, sessionId) {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      const currentSessions = await redisManager.get(userSessionsKey) || [];
      
      // Add new session
      currentSessions.push(sessionId);
      
      // Store updated list
      await redisManager.set(userSessionsKey, currentSessions, this.sessionTTL);
      
      return true;
    } catch (error) {
      console.error('Add to user sessions error:', error);
      return false;
    }
  }

  /**
   * Remove session from user's session list
   */
  async removeFromUserSessions(userId, sessionId) {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      const currentSessions = await redisManager.get(userSessionsKey) || [];
      
      // Remove session
      const updatedSessions = currentSessions.filter(id => id !== sessionId);
      
      // Store updated list
      if (updatedSessions.length > 0) {
        await redisManager.set(userSessionsKey, updatedSessions, this.sessionTTL);
      } else {
        await redisManager.del(userSessionsKey);
      }
      
      return true;
    } catch (error) {
      console.error('Remove from user sessions error:', error);
      return false;
    }
  }

  /**
   * Cleanup old sessions for user
   */
  async cleanupUserSessions(userId) {
    try {
      const sessions = await this.getUserSessions(userId);
      
      if (sessions.length <= this.maxSessionsPerUser) {
        return;
      }
      
      // Sort by last activity (oldest first)
      sessions.sort((a, b) => new Date(a.lastActivity) - new Date(b.lastActivity));
      
      // Remove oldest sessions
      const sessionsToRemove = sessions.slice(0, sessions.length - this.maxSessionsPerUser);
      
      for (const session of sessionsToRemove) {
        await this.destroySession(session.sessionId);
      }
      
      console.log(`Cleaned up ${sessionsToRemove.length} old sessions for user ${userId}`);
    } catch (error) {
      console.error('Cleanup user sessions error:', error);
    }
  }

  /**
   * Validate session and return user data
   */
  async validateSession(sessionId) {
    try {
      const sessionData = await this.getSession(sessionId);
      
      if (!sessionData || !sessionData.isActive) {
        return null;
      }
      
      // Update last activity
      await this.updateSessionActivity(sessionId);
      
      return {
        userId: sessionData.userId,
        sessionId: sessionData.sessionId,
        deviceInfo: sessionData.deviceInfo,
        createdAt: sessionData.createdAt,
        lastActivity: sessionData.lastActivity
      };
    } catch (error) {
      console.error('Validate session error:', error);
      return null;
    }
  }

  /**
   * Generate secure session ID
   */
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get session statistics
   */
  async getSessionStats() {
    try {
      // This is a simplified version - in production you might want more detailed stats
      const pattern = 'sess:*';
      const keys = await redisManager.client.keys(pattern);
      
      const stats = {
        totalSessions: keys.length,
        activeSessions: 0,
        expiredSessions: 0,
        timestamp: new Date().toISOString()
      };
      
      // Count active vs expired sessions
      for (const key of keys.slice(0, 100)) { // Limit to avoid performance issues
        const sessionId = key.replace('sess:', '');
        const session = await this.getSession(sessionId);
        
        if (session) {
          stats.activeSessions++;
        } else {
          stats.expiredSessions++;
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Get session stats error:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions() {
    try {
      const pattern = 'sess:*';
      const keys = await redisManager.client.keys(pattern);
      let cleanedCount = 0;
      
      for (const key of keys) {
        const sessionId = key.replace('sess:', '');
        const session = await this.getSession(sessionId);
        
        if (!session) {
          cleanedCount++;
        }
      }
      
      console.log(`Cleaned up ${cleanedCount} expired sessions`);
      return cleanedCount;
    } catch (error) {
      console.error('Cleanup expired sessions error:', error);
      return 0;
    }
  }

  /**
   * Create JWT token with session reference
   */
  async createJWTWithSession(userId, deviceInfo = {}) {
    try {
      const { sessionId } = await this.createSession(userId, deviceInfo);
      
      const token = jwt.sign(
        {
          userId,
          sessionId,
          type: 'access'
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRE || '7d'
        }
      );
      
      return { token, sessionId };
    } catch (error) {
      console.error('Create JWT with session error:', error);
      throw new Error('Failed to create JWT with session');
    }
  }

  /**
   * Validate JWT and session
   */
  async validateJWTWithSession(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (!decoded.sessionId) {
        return null;
      }
      
      const sessionData = await this.validateSession(decoded.sessionId);
      
      if (!sessionData || sessionData.userId !== decoded.userId) {
        return null;
      }
      
      return {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
        sessionData
      };
    } catch (error) {
      console.error('Validate JWT with session error:', error);
      return null;
    }
  }
}

// Create singleton instance
const sessionService = new SessionService();

module.exports = {
  sessionService,
  SessionService
};