/**
 * CDN Configuration for Money Maker Platform
 * Optimizes static asset delivery and loading speed
 */

const CDNConfig = {
  // Vercel CDN Configuration
  vercel: {
    // Static assets optimization
    staticAssets: {
      images: {
        formats: ['webp', 'avif', 'jpeg', 'png'],
        sizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        quality: 85,
        optimization: true,
        lazy: true
      },
      fonts: {
        preload: ['Inter-Regular.woff2', 'Inter-Medium.woff2', 'Inter-Bold.woff2'],
        display: 'swap',
        optimization: true
      },
      css: {
        minify: true,
        purge: true,
        critical: true,
        inline: false
      },
      javascript: {
        minify: true,
        compress: true,
        treeshake: true,
        splitting: true
      }
    },
    
    // Cache configuration
    caching: {
      static: {
        maxAge: 31536000, // 1 year
        staleWhileRevalidate: 86400 // 1 day
      },
      api: {
        maxAge: 0,
        staleWhileRevalidate: 60 // 1 minute
      },
      html: {
        maxAge: 0,
        staleWhileRevalidate: 86400 // 1 day
      }
    },
    
    // Edge functions
    edge: {
      regions: ['iad1', 'sfo1', 'fra1', 'sin1'], // US East, US West, Europe, Asia
      runtime: 'edge',
      memory: 128
    }
  },
  
  // External CDN providers
  external: {
    // Cloudflare CDN for additional assets
    cloudflare: {
      enabled: process.env.CLOUDFLARE_CDN_ENABLED === 'true',
      zone: process.env.CLOUDFLARE_ZONE_ID,
      baseUrl: process.env.CLOUDFLARE_CDN_URL,
      purgeOnDeploy: true
    },
    
    // AWS CloudFront (optional)
    cloudfront: {
      enabled: process.env.CLOUDFRONT_ENABLED === 'true',
      distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
      baseUrl: process.env.CLOUDFRONT_URL
    }
  },
  
  // Asset optimization rules
  optimization: {
    images: {
      // Automatic format selection
      autoFormat: true,
      // Progressive JPEG
      progressive: true,
      // Lossless optimization
      lossless: false,
      // Quality settings by type
      quality: {
        jpeg: 85,
        webp: 85,
        avif: 80,
        png: 90
      },
      // Responsive breakpoints
      breakpoints: {
        mobile: 640,
        tablet: 1024,
        desktop: 1920,
        '4k': 3840
      }
    },
    
    fonts: {
      // Font loading strategy
      strategy: 'swap',
      // Preload critical fonts
      preload: true,
      // Subset fonts
      subset: true,
      // Font display
      display: 'swap'
    },
    
    scripts: {
      // Code splitting
      splitting: true,
      // Tree shaking
      treeshake: true,
      // Minification
      minify: true,
      // Compression
      compress: 'gzip'
    }
  },
  
  // Performance budgets
  budgets: {
    // Bundle size limits
    bundles: {
      main: '250kb',
      vendor: '500kb',
      chunk: '100kb'
    },
    
    // Asset size limits
    assets: {
      image: '500kb',
      font: '100kb',
      css: '50kb',
      js: '200kb'
    },
    
    // Performance metrics
    metrics: {
      fcp: 1500, // First Contentful Paint
      lcp: 2500, // Largest Contentful Paint
      fid: 100,  // First Input Delay
      cls: 0.1   // Cumulative Layout Shift
    }
  },
  
  // Monitoring and analytics
  monitoring: {
    // Web Vitals tracking
    webVitals: true,
    // Performance monitoring
    performance: true,
    // Error tracking
    errors: true,
    // User analytics
    analytics: process.env.GOOGLE_ANALYTICS_ID ? true : false
  }
};

// Helper functions for CDN operations
const CDNHelpers = {
  /**
   * Generate optimized image URL
   */
  getOptimizedImageUrl(src, options = {}) {
    const {
      width,
      height,
      quality = 85,
      format = 'auto'
    } = options;
    
    if (process.env.NODE_ENV === 'production') {
      const params = new URLSearchParams();
      if (width) params.set('w', width);
      if (height) params.set('h', height);
      params.set('q', quality);
      params.set('f', format);
      
      return `${src}?${params.toString()}`;
    }
    
    return src;
  },
  
  /**
   * Generate responsive image srcset
   */
  generateSrcSet(src, breakpoints = CDNConfig.optimization.images.breakpoints) {
    return Object.entries(breakpoints)
      .map(([name, width]) => {
        const url = this.getOptimizedImageUrl(src, { width });
        return `${url} ${width}w`;
      })
      .join(', ');
  },
  
  /**
   * Get CDN URL for asset
   */
  getCDNUrl(path, type = 'static') {
    const baseUrl = process.env.CDN_BASE_URL || '';
    
    if (baseUrl && process.env.NODE_ENV === 'production') {
      return `${baseUrl}${path}`;
    }
    
    return path;
  },
  
  /**
   * Preload critical resources
   */
  getPreloadLinks() {
    const preloads = [];
    
    // Preload critical fonts
    CDNConfig.vercel.staticAssets.fonts.preload.forEach(font => {
      preloads.push({
        rel: 'preload',
        href: this.getCDNUrl(`/fonts/${font}`),
        as: 'font',
        type: 'font/woff2',
        crossorigin: 'anonymous'
      });
    });
    
    return preloads;
  },
  
  /**
   * Generate cache headers
   */
  getCacheHeaders(type = 'static') {
    const config = CDNConfig.vercel.caching[type] || CDNConfig.vercel.caching.static;
    
    return {
      'Cache-Control': `public, max-age=${config.maxAge}, stale-while-revalidate=${config.staleWhileRevalidate}`,
      'CDN-Cache-Control': `public, max-age=${config.maxAge}`,
      'Vercel-CDN-Cache-Control': `public, max-age=${config.maxAge}`
    };
  },
  
  /**
   * Check if asset should be served from CDN
   */
  shouldUseCDN(path) {
    const cdnExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg', '.css', '.js', '.woff', '.woff2', '.ttf', '.eot'];
    return cdnExtensions.some(ext => path.toLowerCase().endsWith(ext));
  },
  
  /**
   * Purge CDN cache
   */
  async purgeCDNCache(paths = []) {
    const results = [];
    
    // Purge Cloudflare cache
    if (CDNConfig.external.cloudflare.enabled) {
      try {
        const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${CDNConfig.external.cloudflare.zone}/purge_cache`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            files: paths.length > 0 ? paths : undefined,
            purge_everything: paths.length === 0
          })
        });
        
        results.push({
          provider: 'cloudflare',
          success: response.ok,
          data: await response.json()
        });
      } catch (error) {
        results.push({
          provider: 'cloudflare',
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
};

// Export configuration and helpers
module.exports = {
  CDNConfig,
  CDNHelpers
};

// Environment-specific exports
if (typeof window !== 'undefined') {
  // Browser environment
  window.CDNConfig = CDNConfig;
  window.CDNHelpers = CDNHelpers;
}