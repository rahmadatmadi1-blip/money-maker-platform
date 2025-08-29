# Payment Security Implementation Guide

## Overview
Implementasi keamanan komprehensif untuk sistem pembayaran Money Maker Platform, melindungi data sensitif pengguna dan transaksi keuangan.

## 🔐 Security Features Implemented

### 1. **Data Encryption**
- **AES-256-GCM Encryption**: Enkripsi data sensitif seperti nomor rekening, nomor telepon
- **Automatic Encryption/Decryption**: Middleware otomatis untuk enkripsi saat menyimpan dan dekripsi saat mengambil data
- **Secure Key Management**: Kunci enkripsi yang aman dengan validasi kekuatan
- **Salt-based Hashing**: Hash satu arah untuk data yang tidak perlu didekripsi

### 2. **Payment Data Protection**
```javascript
// Data yang dienkripsi otomatis:
- accountNumber (nomor rekening)
- routingNumber (kode bank)
- phoneNumber (nomor telepon e-wallet)
- proofImage (bukti pembayaran)
- userNotes (catatan pengguna)
```

### 3. **Security Middleware**
- **Payment Security Validation**: Validasi konfigurasi keamanan sebelum memproses pembayaran
- **Data Sanitization**: Pembersihan data untuk logging yang aman
- **Rate Limiting**: Pembatasan percobaan pembayaran (5 per 15 menit)
- **Audit Trail**: Pencatatan IP address, User Agent, dan token keamanan

### 4. **Secure Endpoints**
Endpoint yang dilindungi dengan middleware keamanan:
- `POST /api/payments/local-payment/create`
- `POST /api/payments/local-payment/confirm`
- `POST /api/payments/withdraw`

## 🛡️ Implementation Details

### Encryption Utility (`server/utils/encryption.js`)

#### Key Features:
```javascript
// Enkripsi data sensitif
PaymentEncryption.encrypt(data)

// Dekripsi data
PaymentEncryption.decrypt(encryptedData)

// Hash satu arah
PaymentEncryption.hash(data)

// Masking untuk display
PaymentEncryption.maskSensitiveData(data, visibleChars)

// Sanitasi untuk logging
PaymentEncryption.sanitizeForLogging(paymentData)

// Generate token keamanan
PaymentEncryption.generateSecureToken(length)
```

#### Automatic Middleware:
```javascript
// Pre-save: Enkripsi sebelum menyimpan
paymentSchema.pre('save', encryptionMiddleware.preSave);

// Post-find: Dekripsi setelah mengambil data
paymentSchema.post('find', encryptionMiddleware.postFind);
paymentSchema.post('findOne', encryptionMiddleware.postFind);
```

### Security Validation Middleware
```javascript
const validatePaymentSecurity = (req, res, next) => {
  // Validasi konfigurasi enkripsi
  if (!PaymentEncryption.validateEncryptionKey()) {
    return res.status(500).json({ error: 'Payment security not configured' });
  }
  
  // Sanitasi data untuk logging
  req.sanitizedBody = PaymentEncryption.sanitizeForLogging(req.body);
  
  next();
};
```

## 🔧 Configuration

### Environment Variables
Copy `.env.security.example` to `.env` dan set nilai yang aman:

```env
# Kunci enkripsi utama (WAJIB untuk produksi)
PAYMENT_ENCRYPTION_KEY=your-super-secure-64-character-key

# Konfigurasi rate limiting
PAYMENT_RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW_MS=900000

# Security headers
CSP_REPORT_ONLY=false
HSTS_MAX_AGE=31536000
```

### Key Generation
Generate kunci enkripsi yang aman:
```bash
# Menggunakan OpenSSL
openssl rand -base64 64

# Menggunakan Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

## 🔍 Security Audit Trail

### Payment Confirmation Audit
Setiap konfirmasi pembayaran mencatat:
- IP address pengguna
- User Agent browser
- Token keamanan unik
- Timestamp konfirmasi
- Data bukti pembayaran (terenkripsi)

### Withdrawal Security
Setiap permintaan penarikan mencatat:
- IP address dan User Agent
- Token keamanan unik
- Detail pembayaran (terenkripsi)
- Catatan pengguna (terenkripsi)

## 📊 Security Monitoring

### Logging
```javascript
// Data yang di-log sudah disanitasi
console.log('Payment created:', req.sanitizedBody);

// Contoh output:
{
  amount: 100000,
  method: 'bri_transfer',
  accountNumber: '****3502', // Masked
  phoneNumber: '****4463'    // Masked
}
```

### Error Handling
- Enkripsi/dekripsi error ditangani dengan graceful fallback
- Sensitive data tidak pernah muncul di error logs
- Security validation errors dicatat untuk monitoring

## 🚀 Best Practices Implemented

### 1. **Defense in Depth**
- Multiple layers of security (encryption, validation, rate limiting)
- Fail-safe defaults (secure by default)
- Comprehensive input validation

### 2. **Principle of Least Privilege**
- Minimal data exposure in logs
- Encrypted storage of sensitive data
- Secure token generation

### 3. **Security by Design**
- Automatic encryption/decryption
- Built-in security validation
- Comprehensive audit trails

### 4. **Data Protection**
- PCI DSS compliance considerations
- GDPR compliance for data handling
- Secure data retention policies

## 🔧 Maintenance

### Key Rotation
1. Generate new encryption key
2. Update `PAYMENT_ENCRYPTION_KEY` in environment
3. Restart application
4. Old encrypted data remains accessible

### Security Updates
1. Regular dependency updates
2. Security patch monitoring
3. Encryption algorithm updates
4. Key strength validation

### Monitoring Checklist
- [ ] Encryption key properly configured
- [ ] Rate limiting functioning
- [ ] Audit logs being generated
- [ ] No sensitive data in logs
- [ ] Security headers active
- [ ] SSL/TLS properly configured

## 🚨 Security Alerts

### Critical Issues
- Missing or weak encryption key
- Failed encryption/decryption operations
- Excessive payment attempts (potential attack)
- Unauthorized access attempts

### Monitoring Points
- Payment creation rate
- Failed authentication attempts
- Unusual IP patterns
- Large transaction amounts

## 📋 Compliance

### Standards Addressed
- **PCI DSS**: Payment card data protection
- **GDPR**: Personal data protection
- **OWASP Top 10**: Web application security
- **ISO 27001**: Information security management

### Audit Requirements
- Encryption key management
- Access control logs
- Data retention policies
- Security incident response

## 🔗 Related Documentation
- `SECURITY_HEADERS_IMPLEMENTATION.md`
- `SECURITY_OPTIMIZATION.md`
- `.env.security.example`
- `server/utils/encryption.js`

## 📞 Support
For security issues or questions:
1. Check this documentation
2. Review security logs
3. Validate environment configuration
4. Contact security team if needed

---

**⚠️ Important**: Never commit actual encryption keys to version control. Always use environment variables for sensitive configuration.