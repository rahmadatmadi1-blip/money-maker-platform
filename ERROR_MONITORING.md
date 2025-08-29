# Error Monitoring & Logging System

Sistem pemantauan kesalahan dan logging komprehensif untuk Money Maker Platform yang menyediakan monitoring real-time, alerting, dan analitik kesalahan.

## 🚀 Fitur Utama

### Server-Side Monitoring
- **Error Logging**: Logging kesalahan terstruktur dengan Winston
- **Health Monitoring**: Pemantauan kesehatan sistem real-time
- **Alert System**: Notifikasi otomatis via email, webhook, dan Slack
- **Performance Tracking**: Monitoring performa request dan response time
- **Database Monitoring**: Tracking query performance dan connection health

### Client-Side Monitoring
- **JavaScript Error Tracking**: Penangkapan kesalahan JavaScript dan Promise rejections
- **Performance Monitoring**: Core Web Vitals dan metrics performa
- **User Session Tracking**: Pelacakan sesi pengguna dan interaksi
- **Console Monitoring**: Penangkapan pesan konsol untuk debugging
- **Error Boundary**: React error boundaries untuk graceful error handling

### Admin Dashboard
- **Error Dashboard**: Interface admin untuk monitoring kesalahan
- **Real-time Statistics**: Statistik kesalahan dan performa real-time
- **Error Analytics**: Analisis trend dan pattern kesalahan
- **System Health**: Status kesehatan sistem dan layanan
- **Alert Management**: Konfigurasi dan management alert

## 📁 Struktur File

```
server/
├── utils/
│   └── errorLogger.js          # Winston logger dengan rotasi file
├── middleware/
│   └── errorHandler.js         # Express middleware untuk error handling
├── services/
│   ├── alertService.js         # Service untuk mengirim alert
│   └── healthMonitor.js        # Service monitoring kesehatan sistem
├── routes/
│   └── errors.js              # API endpoints untuk error reporting
└── config/
    └── monitoring.js          # Konfigurasi monitoring system

client/
├── src/
│   ├── utils/
│   │   └── errorMonitor.js     # Client-side error monitoring
│   └── components/
│       └── admin/
│           ├── ErrorDashboard.js    # Admin dashboard untuk errors
│           └── ErrorDashboard.css   # Styling untuk dashboard
```

## ⚙️ Konfigurasi

### Environment Variables

Tambahkan ke file `.env`:

```env
# Error Monitoring
ERROR_LOG_LEVEL=info
ERROR_LOG_MAX_SIZE=20m
ERROR_LOG_MAX_FILES=14d
ERROR_LOG_DIR=logs

# Alert Configuration
ALERT_EMAIL_FROM=noreply@moneymaker.com
ALERT_EMAIL_TO=admin@moneymaker.com
ALERT_WEBHOOK_URL=your_webhook_url
ALERT_SLACK_WEBHOOK_URL=your_slack_webhook

# External Services (Optional)
SENTRY_DSN=your_sentry_dsn
DATADOG_API_KEY=your_datadog_key
NEW_RELIC_LICENSE_KEY=your_newrelic_key

# Health Monitoring
HEALTH_CHECK_INTERVAL=30000
MEMORY_THRESHOLD=85
CPU_THRESHOLD=80
DISK_THRESHOLD=90
RESPONSE_TIME_THRESHOLD=5000
```

### Server Integration

Sistem sudah terintegrasi di `server/index.js`:

```javascript
// Import monitoring middleware
const {
  errorHandler,
  notFoundHandler,
  requestLogger,
  performanceMonitor
} = require('./middleware/errorHandler');

// Apply middleware
app.use(requestLogger);
app.use(performanceMonitor);

// Error handling (harus di akhir)
app.use(notFoundHandler);
app.use(errorHandler);
```

### Client Integration

```javascript
// Di App.js atau index.js
import { ErrorMonitorProvider, ErrorBoundary } from './utils/errorMonitor';

function App() {
  return (
    <ErrorMonitorProvider>
      <ErrorBoundary>
        {/* Your app components */}
      </ErrorBoundary>
    </ErrorMonitorProvider>
  );
}
```

## 🔧 Penggunaan

### Server-Side Logging

```javascript
const { logError, logInfo, logWarning } = require('./utils/errorLogger');

// Log error dengan context
logError(error, {
  userId: req.user?.id,
  endpoint: req.path,
  method: req.method,
  ip: req.ip
});

// Log info
logInfo('User logged in', { userId: user.id });

// Log warning
logWarning('High memory usage detected', { usage: memoryUsage });
```

### Client-Side Monitoring

```javascript
import { useErrorMonitor, useErrorReporting } from './utils/errorMonitor';

function MyComponent() {
  const { reportError } = useErrorReporting();
  const { trackPerformance } = useErrorMonitor();
  
  const handleError = (error) => {
    reportError(error, {
      component: 'MyComponent',
      action: 'button_click'
    });
  };
  
  useEffect(() => {
    trackPerformance('component_mount', Date.now());
  }, []);
}
```

### Manual Error Reporting

```javascript
// Client-side
fetch('/api/errors/client', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'javascript_error',
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    context: { component: 'PaymentForm' }
  })
});
```

## 📊 API Endpoints

### Error Reporting
- `POST /api/errors/client` - Report client-side errors
- `POST /api/errors/performance` - Report performance issues
- `POST /api/errors/console` - Report console messages

### Error Analytics
- `GET /api/errors/stats` - Get error statistics
- `GET /api/errors/search` - Search errors with filters
- `GET /api/errors/report` - Generate error reports
- `GET /api/errors/dashboard` - Get dashboard data

### Health Monitoring
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health status
- `GET /api/errors/health` - Error monitoring health

### Admin Actions
- `POST /api/errors/test` - Test error logging (dev only)
- `DELETE /api/errors/stats` - Clear error statistics (dev only)

## 🚨 Alert System

### Alert Types
- **Critical**: System failures, uncaught exceptions
- **High**: High error rates, service degradation
- **Medium**: Performance issues, warnings
- **Low**: Info messages, routine events

### Alert Channels
1. **Email**: SMTP notifications
2. **Webhook**: HTTP POST to external services
3. **Slack**: Slack channel notifications
4. **External Services**: Sentry, Datadog, New Relic

### Alert Rules
```javascript
// Contoh konfigurasi alert
const alertRules = {
  errorRate: {
    threshold: 5, // 5% error rate
    window: '5m',
    severity: 'high'
  },
  responseTime: {
    threshold: 5000, // 5 seconds
    window: '1m',
    severity: 'medium'
  },
  memoryUsage: {
    threshold: 85, // 85%
    window: '2m',
    severity: 'high'
  }
};
```

## 📈 Dashboard Features

### Error Overview
- Total errors (24h, 7d, 30d)
- Error rate trends
- Top error types
- Recent errors

### Performance Metrics
- Response time trends
- Core Web Vitals
- Resource loading times
- API performance

### System Health
- Memory usage
- CPU usage
- Disk usage
- Database health
- Service status

### Client Analytics
- Browser errors
- Performance issues
- User sessions
- Console messages

## 🔍 Troubleshooting

### Common Issues

1. **Logs tidak muncul**
   - Periksa permission direktori `logs/`
   - Pastikan `ERROR_LOG_DIR` sudah benar
   - Cek level logging di environment

2. **Alert tidak terkirim**
   - Verifikasi konfigurasi SMTP
   - Cek webhook URL
   - Pastikan rate limiting tidak memblokir

3. **Dashboard tidak menampilkan data**
   - Periksa koneksi ke API `/api/errors/dashboard`
   - Cek CORS settings
   - Verifikasi authentication

4. **Performance monitoring tidak akurat**
   - Pastikan sampling rate sudah benar
   - Cek browser compatibility
   - Verifikasi timing API support

### Debug Mode

```javascript
// Enable debug logging
process.env.ERROR_LOG_LEVEL = 'debug';

// Test error logging
fetch('/api/errors/test', { method: 'POST' });

// Check health status
fetch('/api/health/detailed');
```

## 🚀 Best Practices

### Error Handling
1. **Structured Logging**: Gunakan format JSON untuk logs
2. **Context Information**: Sertakan context yang relevan
3. **Error Classification**: Kategorikan errors berdasarkan severity
4. **Rate Limiting**: Batasi error reporting untuk mencegah spam
5. **Data Sanitization**: Jangan log data sensitif

### Performance Monitoring
1. **Sampling**: Gunakan sampling untuk mengurangi overhead
2. **Async Processing**: Process metrics secara asynchronous
3. **Batch Reporting**: Kirim metrics dalam batch
4. **Client-side Throttling**: Batasi frequency reporting

### Security
1. **Data Privacy**: Jangan log PII atau sensitive data
2. **Access Control**: Batasi akses ke error logs
3. **Encryption**: Encrypt logs saat transit dan at rest
4. **Retention Policy**: Implement data retention policies

## 📋 Maintenance

### Daily Tasks
- [ ] Monitor error rates dan trends
- [ ] Review critical alerts
- [ ] Check system health metrics
- [ ] Verify log rotation

### Weekly Tasks
- [ ] Analyze error patterns
- [ ] Review performance trends
- [ ] Update alert thresholds
- [ ] Clean up old logs

### Monthly Tasks
- [ ] Generate error reports
- [ ] Review monitoring configuration
- [ ] Update external service integrations
- [ ] Performance optimization review

## 🔗 Integration dengan Services Lain

### Sentry Integration
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

### Datadog Integration
```javascript
const tracer = require('dd-trace').init({
  service: 'money-maker-platform',
  env: process.env.NODE_ENV
});
```

### New Relic Integration
```javascript
require('newrelic');
```

## 📞 Support

Untuk bantuan teknis atau pertanyaan:
- Email: tech@moneymaker.com
- Documentation: `/docs/monitoring`
- Health Check: `/api/health`
- Error Dashboard: `/admin/errors`

---

**Error Monitoring System v1.0** - Memastikan stabilitas dan reliability Money Maker Platform 🚀