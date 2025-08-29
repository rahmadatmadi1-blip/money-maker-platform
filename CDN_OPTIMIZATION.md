# CDN & Performance Optimization Guide

Komprehensif panduan untuk sistem CDN dan optimasi performa yang telah diimplementasikan di Money Maker Platform.

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Fitur Utama](#fitur-utama)
3. [Konfigurasi](#konfigurasi)
4. [Komponen](#komponen)
5. [Service Worker](#service-worker)
6. [Image Optimization](#image-optimization)
7. [Performance Monitoring](#performance-monitoring)
8. [CDN Management](#cdn-management)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

## 🎯 Overview

Sistem CDN dan optimasi performa ini menyediakan:
- **Service Worker** untuk caching offline dan advanced caching strategies
- **Image Optimization** dengan lazy loading dan responsive images
- **Performance Monitoring** dengan Core Web Vitals tracking
- **CDN Integration** dengan Vercel Image Optimization dan external CDNs
- **Admin Dashboard** untuk monitoring dan management

## ⚡ Fitur Utama

### 1. Advanced Caching
- **Cache-First Strategy**: Untuk static assets (CSS, JS, images)
- **Network-First Strategy**: Untuk API calls dan dynamic content
- **Stale-While-Revalidate**: Untuk balanced performance dan freshness
- **Background Sync**: Untuk offline request retry

### 2. Image Optimization
- **Automatic Format Selection**: WebP, AVIF fallbacks
- **Responsive Images**: Multiple sizes dengan srcSet
- **Lazy Loading**: Intersection Observer API
- **Blur Placeholder**: Smooth loading experience
- **CDN Integration**: Vercel Image Optimization

### 3. Performance Monitoring
- **Core Web Vitals**: FCP, LCP, FID, CLS tracking
- **Real-time Metrics**: Performance score calculation
- **Cache Analytics**: Hit rate, size monitoring
- **Error Tracking**: Failed requests dan cache misses

### 4. CDN Management
- **Cache Warmup**: Automated critical resource preloading
- **Purge Control**: Selective cache clearing
- **Statistics Dashboard**: Usage analytics dan performance metrics
- **Admin Controls**: Manual cache management

## ⚙️ Konfigurasi

### Environment Variables

```bash
# CDN Configuration
REACT_APP_CDN_ENABLED=true
REACT_APP_CDN_DOMAIN=https://your-cdn-domain.com
REACT_APP_IMAGE_OPTIMIZATION=true
REACT_APP_VERCEL_URL=https://your-app.vercel.app

# Performance Monitoring
REACT_APP_PERFORMANCE_MONITORING=true
REACT_APP_ANALYTICS_ENABLED=true
```

### Vercel Configuration

```json
{
  "images": {
    "domains": ["your-domain.com"],
    "deviceSizes": [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    "imageSizes": [16, 32, 48, 64, 96, 128, 256, 384],
    "formats": ["image/webp", "image/avif"],
    "minimumCacheTTL": 31536000,
    "dangerouslyAllowSVG": true,
    "contentSecurityPolicy": "default-src 'self'; script-src 'none'; sandbox;"
  },
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        },
        {
          "key": "cdn-cache-control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## 🧩 Komponen

### 1. OptimizedImage Component

```jsx
import { OptimizedImage } from './components/common/OptimizedImage';

// Basic usage
<OptimizedImage
  src="/images/hero.jpg"
  alt="Hero image"
  width={800}
  height={400}
  priority={true}
/>

// Responsive image
<OptimizedImage
  src="/images/gallery.jpg"
  alt="Gallery image"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  lazy={true}
  placeholder="blur"
/>

// With fallback
<OptimizedImage
  src="/images/profile.jpg"
  alt="Profile"
  fallback="/images/default-avatar.png"
  width={150}
  height={150}
/>
```

### 2. CDN Hooks

```jsx
import { useCDN, useImageOptimization, usePerformanceMonitoring } from './hooks/useCDN';

function MyComponent() {
  const {
    isServiceWorkerReady,
    cacheSize,
    isOnline,
    clearCache,
    preloadUrls,
    warmupCache
  } = useCDN();

  const { getImageProps, isLoaded, hasFailed } = useImageOptimization();

  const { metrics, performanceScore, isGoodPerformance } = usePerformanceMonitoring();

  // Component logic
}
```

### 3. CDN Manager (Admin)

```jsx
import CDNManager from './components/admin/CDNManager';

// In admin dashboard
<CDNManager />
```

## 🔧 Service Worker

### Features
- **Multi-Cache Strategy**: Separate caches for static, dynamic, images, dan API
- **Intelligent Caching**: Different strategies berdasarkan resource type
- **Offline Support**: Fallback responses untuk offline scenarios
- **Background Sync**: Retry failed requests ketika online
- **Push Notifications**: Support untuk web push notifications

### Cache Strategies

```javascript
// API Cache Strategies
const API_CACHE_STRATEGIES = {
  '/api/auth/me': { strategy: 'staleWhileRevalidate', maxAge: 300 },
  '/api/users/profile': { strategy: 'staleWhileRevalidate', maxAge: 600 },
  '/api/analytics': { strategy: 'networkFirst', maxAge: 60 },
  '/api/content': { strategy: 'cacheFirst', maxAge: 3600 }
};
```

### Manual Cache Control

```javascript
// Clear specific cache
navigator.serviceWorker.controller?.postMessage({
  type: 'CLEAR_CACHE',
  payload: { cacheName: 'api-v1.0.0' }
});

// Preload URLs
navigator.serviceWorker.controller?.postMessage({
  type: 'CACHE_URLS',
  payload: { urls: ['/api/users', '/api/products'] }
});
```

## 🖼️ Image Optimization

### Automatic Optimization
- **Format Selection**: WebP/AVIF dengan fallback ke JPEG/PNG
- **Size Optimization**: Multiple breakpoints untuk responsive design
- **Quality Adjustment**: Adaptive quality berdasarkan device dan connection
- **Lazy Loading**: Intersection Observer dengan configurable margins

### Usage Examples

```jsx
// Hero image dengan priority loading
<OptimizedImage
  src="/images/hero.jpg"
  alt="Hero"
  width={1920}
  height={1080}
  priority={true}
  quality={90}
/>

// Gallery dengan lazy loading
<OptimizedImage
  src="/images/gallery-1.jpg"
  alt="Gallery item"
  sizes="(max-width: 768px) 100vw, 50vw"
  lazy={true}
  placeholder="blur"
/>

// Avatar dengan fallback
<OptimizedImage
  src={user.avatar}
  alt={user.name}
  width={64}
  height={64}
  fallback="/images/default-avatar.png"
  style={{ borderRadius: '50%' }}
/>
```

## 📊 Performance Monitoring

### Core Web Vitals
- **First Contentful Paint (FCP)**: < 1.8s (Good), < 3.0s (Needs Improvement)
- **Largest Contentful Paint (LCP)**: < 2.5s (Good), < 4.0s (Needs Improvement)
- **First Input Delay (FID)**: < 100ms (Good), < 300ms (Needs Improvement)
- **Cumulative Layout Shift (CLS)**: < 0.1 (Good), < 0.25 (Needs Improvement)

### Performance Score Calculation

```javascript
const calculatePerformanceScore = (metrics) => {
  let score = 100;
  
  // LCP scoring
  if (metrics.lcp > 4000) score -= 30;
  else if (metrics.lcp > 2500) score -= 15;
  
  // FID scoring
  if (metrics.fid > 300) score -= 25;
  else if (metrics.fid > 100) score -= 10;
  
  // CLS scoring
  if (metrics.cls > 0.25) score -= 25;
  else if (metrics.cls > 0.1) score -= 10;
  
  // FCP scoring
  if (metrics.fcp > 3000) score -= 20;
  else if (metrics.fcp > 1800) score -= 10;
  
  return Math.max(0, score);
};
```

## 🎛️ CDN Management

### Admin Dashboard Features
- **Real-time Statistics**: Cache hit rate, bandwidth usage, request counts
- **Cache Management**: View, clear, dan preload cache entries
- **Performance Metrics**: Core Web Vitals monitoring
- **Configuration**: CDN settings dan optimization controls

### API Endpoints

```bash
# Get CDN statistics
GET /api/admin/cdn/stats

# Clear cache
DELETE /api/admin/cdn/cache
DELETE /api/admin/cdn/cache/:cacheName

# Preload URLs
POST /api/admin/cdn/preload
{
  "urls": ["/api/users", "/api/products"]
}

# Warmup cache
POST /api/admin/cdn/warmup

# Get performance metrics
GET /api/admin/performance/metrics
```

## 🚀 Deployment

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env.production

# Update CDN configuration
REACT_APP_CDN_ENABLED=true
REACT_APP_IMAGE_OPTIMIZATION=true
```

### 3. Build dan Deploy

```bash
# Build optimized version
npm run build

# Deploy to Vercel
vercel --prod

# Or deploy to other platforms
npm run deploy
```

### 4. Verify Deployment

```bash
# Run CDN warmup
node scripts/cdn-warmup.js --baseUrl https://your-domain.com

# Test performance
npm run test:performance
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Service Worker Not Registering
```javascript
// Check browser support
if ('serviceWorker' in navigator) {
  console.log('Service Worker supported');
} else {
  console.log('Service Worker not supported');
}

// Check registration errors
navigator.serviceWorker.register('/sw.js')
  .then(registration => console.log('SW registered:', registration))
  .catch(error => console.log('SW registration failed:', error));
```

#### 2. Images Not Loading
```javascript
// Check CDN configuration
console.log('CDN Enabled:', process.env.REACT_APP_CDN_ENABLED);
console.log('CDN Domain:', process.env.REACT_APP_CDN_DOMAIN);

// Check image optimization
console.log('Image Optimization:', process.env.REACT_APP_IMAGE_OPTIMIZATION);
```

#### 3. Cache Issues
```javascript
// Clear all caches
caches.keys().then(cacheNames => {
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
});

// Check cache contents
caches.open('static-v1.0.0').then(cache => {
  return cache.keys();
}).then(requests => {
  console.log('Cached requests:', requests);
});
```

### Performance Issues

#### 1. Slow Image Loading
- Verify image optimization is enabled
- Check CDN configuration
- Ensure proper image sizes dan formats
- Use priority loading untuk above-the-fold images

#### 2. Poor Cache Hit Rate
- Review cache strategies
- Check cache headers
- Verify CDN configuration
- Monitor cache invalidation patterns

#### 3. High Bundle Size
- Implement code splitting
- Use dynamic imports
- Optimize dependencies
- Enable tree shaking

## 📋 Best Practices

### 1. Image Optimization
- **Use WebP/AVIF formats** untuk modern browsers
- **Implement lazy loading** untuk images below the fold
- **Set proper dimensions** untuk prevent layout shift
- **Use blur placeholders** untuk smooth loading experience
- **Optimize image sizes** berdasarkan actual usage

### 2. Caching Strategy
- **Cache static assets aggressively** (1 year+)
- **Use stale-while-revalidate** untuk dynamic content
- **Implement proper cache invalidation** untuk updates
- **Monitor cache hit rates** dan optimize accordingly
- **Use service worker** untuk advanced caching control

### 3. Performance Monitoring
- **Track Core Web Vitals** regularly
- **Set performance budgets** dan alerts
- **Monitor real user metrics** (RUM)
- **Optimize critical rendering path**
- **Implement performance regression testing**

### 4. CDN Configuration
- **Use multiple CDN endpoints** untuk redundancy
- **Configure proper cache headers**
- **Implement cache warming** untuk critical resources
- **Monitor CDN performance** dan costs
- **Use edge computing** untuk dynamic content

### 5. Security Considerations
- **Validate image sources** untuk prevent XSS
- **Use Content Security Policy** (CSP)
- **Implement proper CORS headers**
- **Sanitize user-uploaded images**
- **Monitor untuk malicious content**

## 📈 Monitoring & Analytics

### Key Metrics to Track
- **Cache Hit Rate**: Target > 85%
- **Page Load Time**: Target < 3s
- **Core Web Vitals**: All metrics in "Good" range
- **Image Load Time**: Target < 2s
- **Service Worker Coverage**: Target > 95%

### Monitoring Tools
- **Google PageSpeed Insights**: Core Web Vitals analysis
- **Lighthouse**: Comprehensive performance audit
- **WebPageTest**: Detailed performance testing
- **CDN Analytics**: Provider-specific metrics
- **Custom Analytics**: Application-specific tracking

### Alerting
- **Performance degradation**: > 20% increase in load time
- **Cache hit rate drop**: < 80% hit rate
- **Service worker errors**: Registration atau runtime failures
- **Image optimization failures**: Fallback usage > 10%
- **CDN availability**: Uptime < 99.9%

## 🔄 Maintenance

### Regular Tasks
- **Weekly**: Review performance metrics dan cache statistics
- **Monthly**: Update CDN configuration dan optimize cache strategies
- **Quarterly**: Audit image optimization dan update formats
- **Annually**: Review CDN provider dan evaluate alternatives

### Updates
- **Service Worker**: Update caching strategies dan add new features
- **Image Optimization**: Support new formats dan optimization techniques
- **Performance Monitoring**: Add new metrics dan improve tracking
- **CDN Configuration**: Optimize based on usage patterns

## 📞 Support

Untuk bantuan teknis atau pertanyaan:
- **Documentation**: Lihat file README dan inline comments
- **Issues**: Create GitHub issue dengan detailed description
- **Performance**: Gunakan browser dev tools untuk debugging
- **Monitoring**: Check admin dashboard untuk real-time metrics

---

**Note**: Sistem CDN dan optimasi performa ini dirancang untuk memberikan pengalaman pengguna yang optimal sambil mempertahankan fleksibilitas dan kemudahan maintenance. Selalu test perubahan di staging environment sebelum deploy ke production.