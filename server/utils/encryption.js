/**
 * Encryption Utility untuk Data Pembayaran Sensitif
 * 
 * Utility ini menyediakan:
 * 1. Enkripsi data sensitif (nomor rekening, kartu kredit)
 * 2. Dekripsi data untuk keperluan verifikasi
 * 3. Hashing untuk data yang tidak perlu didekripsi
 * 4. Secure key management
 */

const crypto = require('crypto');

// Configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
  saltLength: 32
};

// Get encryption key from environment or generate one
const getEncryptionKey = () => {
  const key = process.env.PAYMENT_ENCRYPTION_KEY;
  if (!key) {
    console.warn('PAYMENT_ENCRYPTION_KEY not set. Using default key for development only!');
    return crypto.scryptSync('default-dev-key-not-secure', 'salt', ENCRYPTION_CONFIG.keyLength);
  }
  return crypto.scryptSync(key, 'payment-salt', ENCRYPTION_CONFIG.keyLength);
};

const ENCRYPTION_KEY = getEncryptionKey();

class PaymentEncryption {
  /**
   * Encrypt sensitive payment data
   * @param {string} data - Data to encrypt
   * @returns {string} - Encrypted data with IV and tag
   */
  static encrypt(data) {
    if (!data || typeof data !== 'string') {
      throw new Error('Data must be a non-empty string');
    }

    try {
      const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
      const cipher = crypto.createCipher(ENCRYPTION_CONFIG.algorithm, ENCRYPTION_KEY, { iv });
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine IV, tag, and encrypted data
      const result = iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
      return result;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive payment data
   * @param {string} encryptedData - Encrypted data with IV and tag
   * @returns {string} - Decrypted data
   */
  static decrypt(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Encrypted data must be a non-empty string');
    }

    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipher(ENCRYPTION_CONFIG.algorithm, ENCRYPTION_KEY, { iv });
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash sensitive data (one-way, for verification only)
   * @param {string} data - Data to hash
   * @returns {string} - Hashed data
   */
  static hash(data) {
    if (!data || typeof data !== 'string') {
      throw new Error('Data must be a non-empty string');
    }

    const salt = crypto.randomBytes(ENCRYPTION_CONFIG.saltLength);
    const hash = crypto.scryptSync(data, salt, 64);
    return salt.toString('hex') + ':' + hash.toString('hex');
  }

  /**
   * Verify hashed data
   * @param {string} data - Original data
   * @param {string} hashedData - Hashed data to verify against
   * @returns {boolean} - True if data matches
   */
  static verifyHash(data, hashedData) {
    if (!data || !hashedData) {
      return false;
    }

    try {
      const parts = hashedData.split(':');
      if (parts.length !== 2) {
        return false;
      }

      const salt = Buffer.from(parts[0], 'hex');
      const originalHash = Buffer.from(parts[1], 'hex');
      const testHash = crypto.scryptSync(data, salt, 64);
      
      return crypto.timingSafeEqual(originalHash, testHash);
    } catch (error) {
      console.error('Hash verification error:', error);
      return false;
    }
  }

  /**
   * Mask sensitive data for display (e.g., credit card numbers)
   * @param {string} data - Data to mask
   * @param {number} visibleChars - Number of characters to show at end
   * @returns {string} - Masked data
   */
  static maskSensitiveData(data, visibleChars = 4) {
    if (!data || typeof data !== 'string') {
      return '';
    }

    if (data.length <= visibleChars) {
      return '*'.repeat(data.length);
    }

    const masked = '*'.repeat(data.length - visibleChars);
    const visible = data.slice(-visibleChars);
    return masked + visible;
  }

  /**
   * Sanitize payment data for logging
   * @param {object} paymentData - Payment data object
   * @returns {object} - Sanitized payment data
   */
  static sanitizeForLogging(paymentData) {
    if (!paymentData || typeof paymentData !== 'object') {
      return paymentData;
    }

    const sensitiveFields = [
      'accountNumber', 'routingNumber', 'cardNumber', 'cvv', 'pin',
      'phoneNumber', 'bankAccount', 'creditCard', 'debitCard'
    ];

    const sanitized = { ...paymentData };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = this.maskSensitiveData(sanitized[field]);
      }
    }

    // Handle nested objects
    if (sanitized.paymentDetails && typeof sanitized.paymentDetails === 'object') {
      for (const field of sensitiveFields) {
        if (sanitized.paymentDetails[field]) {
          sanitized.paymentDetails[field] = this.maskSensitiveData(sanitized.paymentDetails[field]);
        }
      }
    }

    return sanitized;
  }

  /**
   * Generate secure random token for payment references
   * @param {number} length - Token length
   * @returns {string} - Secure random token
   */
  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Validate encryption key strength
   * @returns {boolean} - True if key is strong enough
   */
  static validateEncryptionKey() {
    const key = process.env.PAYMENT_ENCRYPTION_KEY;
    
    // In development mode or when NODE_ENV is undefined, allow default key for testing
    if ((!process.env.NODE_ENV || process.env.NODE_ENV === 'development') && !key) {
      console.warn('⚠️  Using default encryption key for development. Not suitable for production!');
      return true;
    }
    
    if (!key) {
      return false;
    }

    // Check minimum length
    if (key.length < 32) {
      return false;
    }

    // Check for complexity (letters, numbers, special chars)
    const hasLower = /[a-z]/.test(key);
    const hasUpper = /[A-Z]/.test(key);
    const hasNumber = /\d/.test(key);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(key);

    return hasLower && hasUpper && hasNumber && hasSpecial;
  }
}

// Middleware untuk enkripsi otomatis pada model
const encryptionMiddleware = {
  /**
   * Pre-save middleware untuk enkripsi data sensitif
   */
  preSave: function(next) {
    // Encrypt sensitive fields before saving
    const sensitiveFields = ['accountNumber', 'routingNumber', 'phoneNumber'];
    
    for (const field of sensitiveFields) {
      if (this[field] && !this[field].includes(':')) { // Not already encrypted
        this[field] = PaymentEncryption.encrypt(this[field]);
      }
    }

    // Handle nested paymentDetails
    if (this.paymentDetails) {
      for (const field of sensitiveFields) {
        if (this.paymentDetails[field] && !this.paymentDetails[field].includes(':')) {
          this.paymentDetails[field] = PaymentEncryption.encrypt(this.paymentDetails[field]);
        }
      }
    }

    next();
  },

  /**
   * Post-find middleware untuk dekripsi data sensitif
   */
  postFind: function(docs) {
    if (!docs) return;
    
    const documents = Array.isArray(docs) ? docs : [docs];
    const sensitiveFields = ['accountNumber', 'routingNumber', 'phoneNumber'];
    
    documents.forEach(doc => {
      if (!doc) return;
      
      for (const field of sensitiveFields) {
        if (doc[field] && doc[field].includes(':')) { // Is encrypted
          try {
            doc[field] = PaymentEncryption.decrypt(doc[field]);
          } catch (error) {
            console.error(`Failed to decrypt ${field}:`, error);
            doc[field] = '[ENCRYPTED]';
          }
        }
      }

      // Handle nested paymentDetails
      if (doc.paymentDetails) {
        for (const field of sensitiveFields) {
          if (doc.paymentDetails[field] && doc.paymentDetails[field].includes(':')) {
            try {
              doc.paymentDetails[field] = PaymentEncryption.decrypt(doc.paymentDetails[field]);
            } catch (error) {
              console.error(`Failed to decrypt paymentDetails.${field}:`, error);
              doc.paymentDetails[field] = '[ENCRYPTED]';
            }
          }
        }
      }
    });
  }
};

module.exports = {
  PaymentEncryption,
  encryptionMiddleware
};