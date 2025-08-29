# Database Optimization Guide

## Overview

Sistem optimasi database yang komprehensif untuk Money Maker Platform, dirancang untuk meningkatkan performa, mengurangi waktu query, dan memastikan skalabilitas aplikasi.

## 🚀 Fitur Utama

### 1. Database Configuration (`server/config/database.js`)
- **Connection Pooling**: Optimasi koneksi database dengan pool size yang dapat dikonfigurasi
- **Retry Logic**: Automatic reconnection dengan exponential backoff
- **Environment-specific Settings**: Konfigurasi berbeda untuk development dan production
- **Health Monitoring**: Real-time monitoring status koneksi database

### 2. Database Optimizer (`server/utils/databaseOptimization.js`)
- **Index Management**: Pembuatan dan pengelolaan index yang dioptimalkan
- **Query Optimization**: Metode query yang dioptimalkan untuk operasi umum
- **Performance Monitoring**: Pelacakan query lambat dan statistik performa
- **Data Cleanup**: Pembersihan data lama secara otomatis

### 3. Query Monitor (`server/middleware/queryMonitor.js`)
- **Real-time Monitoring**: Pemantauan query secara real-time
- **Slow Query Detection**: Deteksi dan logging query yang lambat
- **Statistics Collection**: Pengumpulan statistik performa query
- **API Endpoints**: Endpoint untuk melihat statistik dan mengekspor data

### 4. Scheduled Optimization (`server/scripts/scheduledOptimization.js`)
- **Automated Tasks**: Tugas optimasi otomatis menggunakan cron jobs
- **Daily Maintenance**: Pemeliharaan harian database
- **Weekly Optimization**: Optimasi mingguan yang komprehensif
- **Monthly Cleanup**: Pembersihan data bulanan

## 📊 Indexes yang Dioptimalkan

### User Collection
```javascript
// Compound indexes untuk query yang sering digunakan
{ email: 1, status: 1 }           // Login dan user lookup
{ referralCode: 1 }               // Affiliate system
{ "earnings.total": -1 }          // Leaderboard dan ranking
{ membershipStatus: 1, createdAt: -1 } // Premium users
{ lastLogin: -1 }                 // Active users tracking
{ "address.country": 1 }          // Geographic analytics
```

### Payment Collection
```javascript
// Indexes untuk transaksi dan reporting
{ userId: 1, status: 1, createdAt: -1 } // User payment history
{ status: 1, type: 1 }                  // Payment analytics
{ createdAt: -1 }                       // Recent transactions
{ "gateway.stripePaymentIntentId": 1 }  // Stripe integration
```

## 🛠️ Penggunaan

### Manual Optimization
```bash
# Menjalankan optimasi database lengkap
npm run db:optimize

# Membuat indexes saja
npm run db:indexes

# Membersihkan data lama
npm run db:cleanup

# Generate performance report
npm run db:report
```

### Scheduled Optimization
```bash
# Menjalankan optimasi terjadwal
npm run db:schedule
```

### API Endpoints

#### Admin Endpoints (Requires Admin Role)
```
GET  /api/admin/db/stats          # Database statistics
POST /api/admin/db/maintenance    # Run maintenance
POST /api/admin/db/indexes        # Create indexes
GET  /api/admin/db/performance    # Performance report
POST /api/admin/db/cleanup        # Clean old data
POST /api/admin/db/test-queries   # Test optimized queries
GET  /api/admin/system/info       # System information
GET  /api/admin/users/stats       # User statistics
```

#### Query Monitor Endpoints
```
GET /api/db-monitor/stats         # Query statistics
GET /api/db-monitor/export        # Export monitoring data
POST /api/db-monitor/reset        # Reset statistics
```

## 📅 Scheduled Tasks

### Daily (2:00 AM)
- Generate performance report
- Check for slow queries
- Monitor index usage
- Log performance metrics

### Weekly (Sunday 3:00 AM)
- Create/update optimized indexes
- Test query performance
- Clean data older than 90 days
- Generate comprehensive report

### Hourly
- Monitor database health
- Check query performance
- Monitor memory usage
- Alert on performance issues

### Monthly (1st day 4:00 AM)
- Deep data cleanup (180+ days)
- Compact database collections
- Generate monthly analytics
- Archive old reports

## 🔧 Configuration

### Environment Variables
```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/moneymaker
DB_MAX_POOL_SIZE=20
DB_SERVER_SELECTION_TIMEOUT=5000
DB_SOCKET_TIMEOUT=45000

# Optimization Settings
SLOW_QUERY_THRESHOLD=1000
CLEANUP_DAYS_OLD=90
TIMEZONE=UTC

# Monitoring
ENABLE_QUERY_MONITORING=true
MONITOR_SLOW_QUERIES=true
```

### Production Settings
```javascript
// Optimized for production workloads
{
  maxPoolSize: 20,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 5000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
  readPreference: 'secondaryPreferred',
  writeConcern: { w: 'majority', j: true, wtimeout: 5000 },
  readConcern: { level: 'majority' }
}
```

## 📈 Performance Metrics

### Key Metrics Tracked
- **Query Execution Time**: Average dan maksimum waktu eksekusi
- **Index Hit Ratio**: Persentase query yang menggunakan index
- **Connection Pool Usage**: Utilisasi connection pool
- **Memory Usage**: Penggunaan memory aplikasi
- **Slow Query Count**: Jumlah query yang lambat
- **Database Size**: Ukuran database dan koleksi

### Performance Targets
- Average query time: < 100ms
- Index hit ratio: > 95%
- Connection pool utilization: < 80%
- Slow queries: < 1% of total queries

## 🚨 Monitoring & Alerts

### Automatic Alerts
- Query time > 1000ms
- Database connection issues
- Memory usage > 500MB
- Index hit ratio < 90%
- Connection pool exhaustion

### Health Check
```javascript
// Health check endpoint includes database metrics
GET /api/health
{
  "status": "OK",
  "database": {
    "connected": true,
    "readyState": 1,
    "stats": {
      "avgQueryTime": 45,
      "totalQueries": 1250,
      "slowQueries": 2,
      "indexHitRatio": 0.98
    }
  }
}
```

## 🔍 Troubleshooting

### Common Issues

#### Slow Queries
```bash
# Check slow query log
npm run db:report

# Analyze specific queries
node server/scripts/optimizeDatabase.js --analyze-slow
```

#### Index Issues
```bash
# Recreate indexes
npm run db:indexes

# Check index usage
node server/scripts/optimizeDatabase.js --index-stats
```

#### Connection Problems
```bash
# Test database connection
node server/scripts/optimizeDatabase.js --test-connection

# Check connection pool status
curl http://localhost:5000/api/health
```

### Performance Debugging
```javascript
// Enable detailed logging
process.env.DEBUG_QUERIES = 'true';
process.env.LOG_LEVEL = 'debug';
```

## 📚 Best Practices

### Query Optimization
1. **Use Indexes**: Pastikan semua query menggunakan index yang tepat
2. **Limit Results**: Selalu gunakan limit untuk query yang mengembalikan banyak data
3. **Project Fields**: Hanya select field yang diperlukan
4. **Avoid N+1**: Gunakan populate atau aggregation untuk menghindari multiple queries

### Index Management
1. **Monitor Usage**: Regularly check index usage statistics
2. **Remove Unused**: Hapus index yang tidak digunakan
3. **Compound Indexes**: Gunakan compound index untuk query multi-field
4. **Index Order**: Perhatikan urutan field dalam compound index

### Data Management
1. **Regular Cleanup**: Bersihkan data lama secara berkala
2. **Archive Strategy**: Implementasi strategi archiving untuk data historis
3. **Data Validation**: Validasi data sebelum insert/update
4. **Backup Strategy**: Regular backup dan testing restore

## 🔄 Maintenance Schedule

### Daily Tasks
- [x] Performance monitoring
- [x] Slow query analysis
- [x] Health check validation
- [x] Error log review

### Weekly Tasks
- [x] Index optimization
- [x] Data cleanup (90 days)
- [x] Performance report generation
- [x] Query performance testing

### Monthly Tasks
- [x] Deep data cleanup (180 days)
- [x] Database compaction
- [x] Comprehensive analytics
- [x] Capacity planning review

## 📞 Support

Untuk pertanyaan atau masalah terkait database optimization:

1. **Check Logs**: Review application dan database logs
2. **Run Diagnostics**: Gunakan built-in diagnostic tools
3. **Performance Report**: Generate dan review performance report
4. **Health Check**: Monitor endpoint `/api/health` untuk status real-time

---

**Note**: Sistem optimasi database ini dirancang untuk berjalan secara otomatis. Monitoring regular dan maintenance berkala akan memastikan performa optimal aplikasi Money Maker Platform.