# Database Implementation Guide

## Overview
This document outlines the comprehensive MongoDB database implementation for the Facebook Clone platform, including schema design, optimization strategies, and seeding procedures.

## Database Architecture

### Core Models

#### 1. User Model (`server/models/User.js`)
- **Purpose**: Central user management with affiliate and payment integration
- **Key Features**:
  - Authentication and authorization
  - Premium membership tracking
  - Affiliate system integration
  - Revenue and balance management
  - Payment method storage
  - User preferences and settings

#### 2. Affiliate Models (`server/models/Affiliate.js`)
- **AffiliateProgram**: Merchant affiliate programs
- **AffiliateLink**: Trackable affiliate links
- **Commission**: Commission tracking and payments
- **ClickTracking**: Detailed click analytics

#### 3. Analytics Models (`server/models/Analytics.js`)
- **UserAnalytics**: Individual user performance metrics
- **PlatformAnalytics**: Platform-wide statistics
- **RealtimeAnalytics**: Real-time dashboard data
- **EventTracking**: User behavior tracking

### Existing Route Models
- **Payment Models**: Payment transactions and withdrawals
- **Order Models**: E-commerce and marketplace orders
- **Content Models**: Digital content and purchases
- **Service Models**: Marketplace services
- **Notification Models**: Email templates and campaigns

## Database Optimization

### Index Strategy (`server/utils/databaseOptimization.js`)

The `DatabaseOptimizer` class implements comprehensive indexing for optimal query performance:

#### User Indexes
```javascript
// Authentication and lookup
{ email: 1 } // Unique index for login
{ affiliateId: 1 } // Affiliate system queries
{ referralCode: 1 } // Referral tracking

// Performance queries
{ role: 1, isPremium: 1 } // User segmentation
{ totalEarnings: -1 } // Top earners
{ createdAt: -1 } // Recent users
```

#### Payment Indexes
```javascript
// Transaction queries
{ userId: 1, status: 1, createdAt: -1 } // User payment history
{ status: 1, createdAt: -1 } // Payment processing
{ stripePaymentIntentId: 1 } // Stripe integration

// Analytics
{ method: 1, createdAt: -1 } // Payment method analysis
{ amount: -1, currency: 1 } // Revenue analysis
```

#### Affiliate Indexes
```javascript
// Program management
{ merchantId: 1, status: 1 } // Merchant programs
{ category: 1, status: 1 } // Program discovery
{ 'stats.conversionRate': -1 } // Performance ranking

// Link tracking
{ shortCode: 1 } // Link resolution (unique)
{ trackingId: 1 } // Analytics tracking (unique)
{ affiliateId: 1, isActive: 1 } // User link management

// Commission processing
{ affiliateId: 1, status: 1, createdAt: -1 } // User earnings
{ status: 1, transactionDate: -1 } // Payment processing
```

#### Analytics Indexes
```javascript
// User analytics
{ userId: 1, date: -1, period: 1 } // User performance over time
{ date: -1, period: 1 } // Platform trends

// Event tracking
{ userId: 1, timestamp: -1 } // User behavior
{ event: 1, category: 1, timestamp: -1 } // Event analysis
{ sessionId: 1, timestamp: -1 } // Session tracking
```

### Query Optimization Features

#### Optimized Query Methods
- `findActiveUsers()`: Efficient active user queries
- `findByEmail()`: Fast email-based lookups
- `getUserEarnings()`: Revenue calculations
- `getPremiumUsers()`: Premium user segmentation
- `searchUsers()`: Text-based user search
- `getUserAnalytics()`: Performance metrics
- `getTopEarners()`: Leaderboard queries

#### Performance Monitoring
- Slow query detection (>100ms)
- Query performance logging
- Index efficiency analysis
- Database statistics collection

## Database Configuration

### Connection Management (`server/config/database.js`)

#### Features
- **Connection Pooling**: Optimized for high concurrency
- **Retry Logic**: Automatic reconnection with exponential backoff
- **Environment-Specific Settings**: Different configs for dev/prod
- **In-Memory Fallback**: Development mode fallback
- **Health Monitoring**: Connection status tracking

#### Connection Options
```javascript
// Production Settings
{
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0,
  bufferCommands: false
}

// Development Settings
{
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 10000,
  serverSelectionTimeoutMS: 3000
}
```

### Automatic Optimization
The database automatically:
1. Creates all necessary indexes on startup
2. Starts query monitoring in production
3. Runs seeding in development mode
4. Provides health check endpoints

## Database Seeding

### Seeder Features (`server/config/databaseSeed.js`)

#### Automatic Seeding
- **Smart Detection**: Only seeds when database is empty
- **Environment Aware**: Runs in development or when explicitly enabled
- **Dependency Management**: Seeds in correct order

#### Seeded Data

1. **Admin User**
   - Email: `admin@facebook-clone.com`
   - Password: `admin123!@#`
   - Role: `admin`
   - Full permissions and premium access

2. **Demo Users**
   - John Doe (Premium User)
   - Jane Smith (Seller)
   - Mike Johnson (Creator)
   - All with demo earnings and balances

3. **Affiliate Programs**
   - Tech Products (15% commission)
   - Education & Courses (Tiered: 20-30%)
   - Health & Wellness (12% commission)

4. **Notification Templates**
   - Welcome email
   - Commission earned notifications
   - Payment processed confirmations
   - Order confirmations

### Seeding Control
```bash
# Enable seeding in production
ENABLE_SEEDING=true

# Disable seeding (default in production)
ENABLE_SEEDING=false
```

## Performance Features

### Index Optimization
- **Background Creation**: Non-blocking index creation
- **Compound Indexes**: Multi-field query optimization
- **Unique Constraints**: Data integrity enforcement
- **TTL Indexes**: Automatic data cleanup

### Query Performance
- **Aggregation Pipelines**: Complex analytics queries
- **Projection Optimization**: Minimal data transfer
- **Pagination Support**: Efficient large dataset handling
- **Caching Strategy**: Query result caching

### Monitoring & Maintenance
- **Slow Query Logging**: Performance bottleneck detection
- **Database Statistics**: Real-time metrics
- **Automated Cleanup**: Old token removal
- **Performance Reports**: Regular optimization reports

## Usage Examples

### Database Connection
```javascript
const DatabaseConfig = require('./config/database');

const dbConfig = new DatabaseConfig();
await dbConfig.connect();
```

### Manual Seeding
```javascript
const DatabaseSeeder = require('./config/databaseSeed');

const seeder = new DatabaseSeeder();
await seeder.seedDatabase();
```

### Performance Monitoring
```javascript
const { DatabaseOptimizer } = require('./utils/databaseOptimization');

const optimizer = new DatabaseOptimizer();
const stats = await optimizer.getDatabaseStats();
const report = await optimizer.generatePerformanceReport();
```

## Environment Variables

```env
# Database Connection
MONGODB_URI=mongodb://localhost:27017/facebook-clone
MONGODB_URI_PROD=mongodb+srv://user:pass@cluster.mongodb.net/facebook-clone

# Seeding Control
ENABLE_SEEDING=true

# Performance
NODE_ENV=development
```

## Best Practices

### Schema Design
1. **Denormalization**: Strategic data duplication for performance
2. **Embedded Documents**: Related data in single documents
3. **Reference Patterns**: Normalized relationships where needed
4. **Index Strategy**: Compound indexes for common query patterns

### Performance
1. **Query Optimization**: Use indexes for all frequent queries
2. **Projection**: Only fetch required fields
3. **Pagination**: Implement cursor-based pagination
4. **Aggregation**: Use MongoDB aggregation for complex operations

### Security
1. **Input Validation**: Mongoose schema validation
2. **Sanitization**: Prevent NoSQL injection
3. **Authentication**: Secure database connections
4. **Encryption**: Sensitive data encryption at rest

## Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Check MongoDB server status
   - Verify connection string
   - Review firewall settings

2. **Slow Queries**
   - Check query execution plans
   - Verify index usage
   - Review query patterns

3. **Memory Issues**
   - Monitor connection pool size
   - Check for memory leaks
   - Optimize query projections

### Monitoring Commands

```javascript
// Check database health
const health = await dbConfig.getConnectionHealth();

// Get performance statistics
const stats = await optimizer.getDatabaseStats();

// Generate optimization report
const report = await optimizer.generatePerformanceReport();
```

## Future Enhancements

1. **Sharding Strategy**: Horizontal scaling preparation
2. **Read Replicas**: Read performance optimization
3. **Caching Layer**: Redis integration for frequently accessed data
4. **Data Archiving**: Historical data management
5. **Real-time Analytics**: Stream processing integration

---

**Note**: This implementation provides a robust, scalable database foundation for the Facebook Clone platform with comprehensive optimization, monitoring, and seeding capabilities.