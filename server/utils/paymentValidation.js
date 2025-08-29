const { body, validationResult } = require('express-validator');
const PaymentEncryption = require('./encryption');

/**
 * Payment Validation Utilities
 * Comprehensive validation and error handling for payment operations
 */
class PaymentValidator {
  /**
   * Validate Indonesian phone number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} - True if valid
   */
  static validateIndonesianPhone(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') return false;
    
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Indonesian phone number patterns
    const patterns = [
      /^(\+62|62|0)8[1-9][0-9]{6,10}$/, // Mobile numbers
      /^(\+62|62|0)2[1-9][0-9]{6,8}$/,  // Jakarta area
      /^(\+62|62|0)[3-9][1-9][0-9]{6,8}$/ // Other areas
    ];
    
    return patterns.some(pattern => pattern.test(cleaned));
  }

  /**
   * Validate Indonesian bank account number
   * @param {string} accountNumber - Account number to validate
   * @param {string} bankCode - Bank code (bri, jago, etc.)
   * @returns {object} - Validation result
   */
  static validateBankAccount(accountNumber, bankCode) {
    if (!accountNumber || typeof accountNumber !== 'string') {
      return { valid: false, error: 'Account number is required' };
    }

    const cleaned = accountNumber.replace(/\D/g, '');
    
    const bankRules = {
      bri: {
        minLength: 10,
        maxLength: 18,
        pattern: /^[0-9]{10,18}$/,
        name: 'Bank BRI'
      },
      jago: {
        minLength: 12,
        maxLength: 12,
        pattern: /^[0-9]{12}$/,
        name: 'Bank Jago'
      },
      bca: {
        minLength: 10,
        maxLength: 10,
        pattern: /^[0-9]{10}$/,
        name: 'Bank BCA'
      },
      mandiri: {
        minLength: 13,
        maxLength: 13,
        pattern: /^[0-9]{13}$/,
        name: 'Bank Mandiri'
      }
    };

    const rule = bankRules[bankCode?.toLowerCase()];
    if (!rule) {
      return { valid: false, error: 'Unsupported bank code' };
    }

    if (cleaned.length < rule.minLength || cleaned.length > rule.maxLength) {
      return { 
        valid: false, 
        error: `${rule.name} account number must be ${rule.minLength}-${rule.maxLength} digits` 
      };
    }

    if (!rule.pattern.test(cleaned)) {
      return { 
        valid: false, 
        error: `Invalid ${rule.name} account number format` 
      };
    }

    return { valid: true, cleaned };
  }

  /**
   * Validate payment amount
   * @param {number} amount - Amount to validate
   * @param {string} method - Payment method
   * @returns {object} - Validation result
   */
  static validateAmount(amount, method) {
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return { valid: false, error: 'Amount must be a positive number' };
    }

    const limits = {
      bri_transfer: { min: 50000, max: 50000000 }, // Rp 50K - 50M
      jago_transfer: { min: 50000, max: 25000000 }, // Rp 50K - 25M
      dana: { min: 10000, max: 10000000 }, // Rp 10K - 10M
      ovo: { min: 10000, max: 10000000 }, // Rp 10K - 10M
      credit_card: { min: 50000, max: 100000000 }, // Rp 50K - 100M
      default: { min: 10000, max: 50000000 }
    };

    const limit = limits[method] || limits.default;

    if (amount < limit.min) {
      return { 
        valid: false, 
        error: `Minimum amount for ${method} is Rp ${limit.min.toLocaleString('id-ID')}` 
      };
    }

    if (amount > limit.max) {
      return { 
        valid: false, 
        error: `Maximum amount for ${method} is Rp ${limit.max.toLocaleString('id-ID')}` 
      };
    }

    return { valid: true };
  }

  /**
   * Validate payment method and details
   * @param {string} method - Payment method
   * @param {object} paymentDetails - Payment details
   * @returns {object} - Validation result
   */
  static validatePaymentMethod(method, paymentDetails) {
    const supportedMethods = ['bri_transfer', 'jago_transfer', 'dana', 'ovo', 'credit_card', 'jago_credit_card'];
    
    if (!supportedMethods.includes(method)) {
      return { 
        valid: false, 
        error: `Unsupported payment method. Supported: ${supportedMethods.join(', ')}` 
      };
    }

    if (!paymentDetails || typeof paymentDetails !== 'object') {
      return { valid: false, error: 'Payment details are required' };
    }

    // Validate based on payment method
    switch (method) {
      case 'bri_transfer':
      case 'jago_transfer':
        if (!paymentDetails.accountNumber) {
          return { valid: false, error: 'Account number is required for bank transfer' };
        }
        
        const bankCode = method.split('_')[0];
        const accountValidation = this.validateBankAccount(paymentDetails.accountNumber, bankCode);
        if (!accountValidation.valid) {
          return accountValidation;
        }
        break;

      case 'dana':
      case 'ovo':
        if (!paymentDetails.phoneNumber) {
          return { valid: false, error: 'Phone number is required for e-wallet' };
        }
        
        if (!this.validateIndonesianPhone(paymentDetails.phoneNumber)) {
          return { valid: false, error: 'Invalid Indonesian phone number format' };
        }
        break;

      case 'credit_card':
        const requiredFields = ['cardNumber', 'expiryMonth', 'expiryYear', 'cvv', 'cardholderName'];
        for (const field of requiredFields) {
          if (!paymentDetails[field]) {
            return { valid: false, error: `${field} is required for credit card payment` };
          }
        }
        
        // Basic credit card validation
        const cardValidation = this.validateCreditCard(paymentDetails);
        if (!cardValidation.valid) {
          return cardValidation;
        }
        break;
      
      case 'jago_credit_card':
        const jagoRequiredFields = ['cardNumber', 'expiryMonth', 'expiryYear', 'cvv', 'cardholderName'];
        for (const field of jagoRequiredFields) {
          if (!paymentDetails[field]) {
            return { valid: false, error: `${field} is required for Jago credit card payment` };
          }
        }
        
        // Validate Jago credit card specifics
        const jagoCardValidation = this.validateCreditCard(paymentDetails);
        if (!jagoCardValidation.valid) {
          return jagoCardValidation;
        }
        
        // Additional Jago-specific validation
        const cardNumber = paymentDetails.cardNumber.replace(/\D/g, '');
        if (!cardNumber.startsWith('4532')) {
          return { valid: false, error: 'Invalid Jago card number format' };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Validate credit card details
   * @param {object} cardDetails - Credit card details
   * @returns {object} - Validation result
   */
  static validateCreditCard(cardDetails) {
    const { cardNumber, expiryMonth, expiryYear, cvv, cardholderName } = cardDetails;

    // Card number validation (Luhn algorithm)
    const cleanCardNumber = cardNumber.replace(/\D/g, '');
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      return { valid: false, error: 'Invalid card number length' };
    }

    if (!this.luhnCheck(cleanCardNumber)) {
      return { valid: false, error: 'Invalid card number' };
    }

    // Expiry validation
    const month = parseInt(expiryMonth);
    const year = parseInt(expiryYear);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (month < 1 || month > 12) {
      return { valid: false, error: 'Invalid expiry month' };
    }

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return { valid: false, error: 'Card has expired' };
    }

    // CVV validation
    const cleanCvv = cvv.replace(/\D/g, '');
    if (cleanCvv.length < 3 || cleanCvv.length > 4) {
      return { valid: false, error: 'Invalid CVV' };
    }

    // Cardholder name validation
    if (!cardholderName || cardholderName.trim().length < 2) {
      return { valid: false, error: 'Invalid cardholder name' };
    }

    return { valid: true };
  }

  /**
   * Luhn algorithm for credit card validation
   * @param {string} cardNumber - Card number
   * @returns {boolean} - True if valid
   */
  static luhnCheck(cardNumber) {
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  /**
   * Validate file upload (proof of payment)
   * @param {object} file - Uploaded file
   * @returns {object} - Validation result
   */
  static validateProofFile(file) {
    if (!file) {
      return { valid: false, error: 'Proof of payment file is required' };
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      return { 
        valid: false, 
        error: 'Invalid file type. Allowed: JPEG, PNG, GIF, PDF' 
      };
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }

    return { valid: true };
  }

  /**
   * Sanitize and validate user notes
   * @param {string} notes - User notes
   * @returns {object} - Validation result
   */
  static validateUserNotes(notes) {
    if (!notes) {
      return { valid: true, sanitized: '' };
    }

    if (typeof notes !== 'string') {
      return { valid: false, error: 'Notes must be a string' };
    }

    if (notes.length > 500) {
      return { valid: false, error: 'Notes must be less than 500 characters' };
    }

    // Basic XSS protection
    const sanitized = notes
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();

    return { valid: true, sanitized };
  }

  /**
   * Express validator middleware for payment creation
   */
  static getPaymentCreationValidators() {
    return [
      body('amount')
        .isNumeric()
        .withMessage('Amount must be a number')
        .custom((value, { req }) => {
          const validation = PaymentValidator.validateAmount(parseFloat(value), req.body.method);
          if (!validation.valid) {
            throw new Error(validation.error);
          }
          return true;
        }),
      
      body('method')
        .isIn(['bri_transfer', 'jago_transfer', 'dana', 'ovo', 'credit_card', 'jago_credit_card'])
        .withMessage('Invalid payment method'),
      
      body('paymentDetails')
        .isObject()
        .withMessage('Payment details must be an object')
        .custom((value, { req }) => {
          const validation = PaymentValidator.validatePaymentMethod(req.body.method, value);
          if (!validation.valid) {
            throw new Error(validation.error);
          }
          return true;
        }),
      
      body('userNotes')
        .optional()
        .custom((value) => {
          const validation = PaymentValidator.validateUserNotes(value);
          if (!validation.valid) {
            throw new Error(validation.error);
          }
          return true;
        })
    ];
  }

  /**
   * Express validator middleware for payment confirmation
   */
  static getPaymentConfirmationValidators() {
    return [
      body('paymentId')
        .isMongoId()
        .withMessage('Invalid payment ID'),
      
      body('userNotes')
        .optional()
        .custom((value) => {
          const validation = PaymentValidator.validateUserNotes(value);
          if (!validation.valid) {
            throw new Error(validation.error);
          }
          return true;
        })
    ];
  }

  /**
   * Handle validation errors
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Next middleware
   */
  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errorMessages
      });
    }
    next();
  }

  /**
   * Advanced security validation
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Next middleware
   */
  static advancedSecurityValidation(req, res, next) {
    try {
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /\$\(.*\)/,
        /eval\s*\(/i
      ];

      const requestString = JSON.stringify(req.body);
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestString)) {
          console.warn('Suspicious pattern detected:', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            pattern: pattern.toString(),
            timestamp: new Date().toISOString()
          });
          
          return res.status(400).json({
            success: false,
            error: 'Invalid request format'
          });
        }
      }

      // Rate limiting check (additional layer)
      const userKey = `payment_attempts_${req.user?._id || req.ip}`;
      // This would integrate with Redis or memory store for production
      
      next();
    } catch (error) {
      console.error('Security validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Security validation failed'
      });
    }
  }
}

module.exports = PaymentValidator;