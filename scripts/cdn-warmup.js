#!/usr/bin/env node

/**
 * CDN Warmup Script
 * Automatically warms up CDN cache by requesting critical resources
 * Can be run manually or scheduled via cron jobs
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  baseUrl: process.env.REACT_APP_BASE_URL || 'https://your-domain.com',
  cdnDomain: process.env.REACT_APP_CDN_DOMAIN,
  timeout: 30000,
  maxConcurrent: 10,
  retries: 3,
  userAgent: 'CDN-Warmup-Bot/1.0',
  logFile: path.join(__dirname, '../logs/cdn-warmup.log')
};

// Critical resources to warm up
const criticalResources = [
  // Core application files
  '/',
  '/static/css/main.css',
  '/static/js/bundle.js',
  '/manifest.json',
  '/favicon.ico',
  
  // Important pages
  '/login',
  '/register',
  '/dashboard',
  '/marketplace',
  '/profile',
  
  // API endpoints (HEAD requests)
  '/api/auth/me',
  '/api/users/profile',
  '/api/marketplace/featured',
  '/api/analytics/overview',
  
  // Common assets
  '/static/media/logo.svg',
  '/static/media/hero-bg.jpg',
  '/static/media/default-avatar.png'
];

// Image optimization sizes to warm up
const imageSizes = [480, 768, 1024, 1280, 1920];

// Images to optimize and warm up
const criticalImages = [
  '/static/media/hero-bg.jpg',
  '/static/media/logo.svg',
  '/static/media/default-avatar.png',
  '/static/media/marketplace-banner.jpg'
];

class CDNWarmup {
  constructor() {
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      cached: 0,
      startTime: Date.now()
    };
    this.queue = [];
    this.running = 0;
  }

  async log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    console.log(logMessage);
    
    try {
      await fs.mkdir(path.dirname(config.logFile), { recursive: true });
      await fs.appendFile(config.logFile, logMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': config.userAgent,
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          ...options.headers
        },
        timeout: config.timeout
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data,
            cached: res.headers['x-cache'] === 'HIT' || 
                   res.headers['cf-cache-status'] === 'HIT' ||
                   res.headers['x-vercel-cache'] === 'HIT'
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  async warmupUrl(url, retries = config.retries) {
    try {
      const fullUrl = url.startsWith('http') ? url : `${config.baseUrl}${url}`;
      const cdnUrl = config.cdnDomain && !url.startsWith('http') ? 
        `${config.cdnDomain}${url}` : fullUrl;
      
      const response = await this.makeRequest(cdnUrl, {
        method: url.startsWith('/api/') ? 'HEAD' : 'GET'
      });
      
      if (response.statusCode >= 200 && response.statusCode < 400) {
        this.stats.success++;
        if (response.cached) {
          this.stats.cached++;
        }
        await this.log(`✓ ${url} (${response.statusCode}) ${response.cached ? '[CACHED]' : '[MISS]'}`);
      } else {
        throw new Error(`HTTP ${response.statusCode}`);
      }
    } catch (error) {
      if (retries > 0) {
        await this.log(`⚠ Retrying ${url} (${error.message})`, 'warn');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.warmupUrl(url, retries - 1);
      } else {
        this.stats.failed++;
        await this.log(`✗ ${url} failed: ${error.message}`, 'error');
      }
    }
  }

  async processQueue() {
    while (this.queue.length > 0 && this.running < config.maxConcurrent) {
      const url = this.queue.shift();
      this.running++;
      
      this.warmupUrl(url).finally(() => {
        this.running--;
        this.processQueue();
      });
    }
  }

  async warmupImages() {
    await this.log('Warming up optimized images...');
    
    for (const image of criticalImages) {
      // Original image
      this.queue.push(image);
      
      // Different sizes for responsive images
      for (const size of imageSizes) {
        if (config.cdnDomain) {
          // Vercel Image Optimization format
          const optimizedUrl = `/_next/image?url=${encodeURIComponent(image)}&w=${size}&q=80`;
          this.queue.push(optimizedUrl);
        }
      }
    }
  }

  async warmupCriticalResources() {
    await this.log('Warming up critical resources...');
    
    for (const resource of criticalResources) {
      this.queue.push(resource);
    }
  }

  async warmupSitemap() {
    try {
      await this.log('Fetching sitemap for additional URLs...');
      
      const sitemapUrl = `${config.baseUrl}/sitemap.xml`;
      const response = await this.makeRequest(sitemapUrl);
      
      if (response.statusCode === 200) {
        // Parse sitemap XML and extract URLs
        const urls = this.parseSitemap(response.data);
        await this.log(`Found ${urls.length} URLs in sitemap`);
        
        // Add high-priority URLs to queue
        for (const url of urls.slice(0, 20)) { // Limit to top 20
          this.queue.push(url);
        }
      }
    } catch (error) {
      await this.log(`Failed to fetch sitemap: ${error.message}`, 'warn');
    }
  }

  parseSitemap(xml) {
    const urls = [];
    const urlRegex = /<loc>(.*?)<\/loc>/g;
    let match;
    
    while ((match = urlRegex.exec(xml)) !== null) {
      const url = match[1];
      if (url.startsWith(config.baseUrl)) {
        urls.push(url.replace(config.baseUrl, ''));
      }
    }
    
    return urls;
  }

  async generateReport() {
    const duration = Date.now() - this.stats.startTime;
    const hitRate = this.stats.success > 0 ? 
      ((this.stats.cached / this.stats.success) * 100).toFixed(1) : 0;
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${(duration / 1000).toFixed(1)}s`,
      total: this.stats.total,
      success: this.stats.success,
      failed: this.stats.failed,
      cached: this.stats.cached,
      hitRate: `${hitRate}%`,
      successRate: `${((this.stats.success / this.stats.total) * 100).toFixed(1)}%`
    };
    
    await this.log('\n=== CDN Warmup Report ===');
    await this.log(`Duration: ${report.duration}`);
    await this.log(`Total URLs: ${report.total}`);
    await this.log(`Successful: ${report.success}`);
    await this.log(`Failed: ${report.failed}`);
    await this.log(`Cache Hit Rate: ${report.hitRate}`);
    await this.log(`Success Rate: ${report.successRate}`);
    await this.log('========================\n');
    
    // Save report to file
    try {
      const reportFile = path.join(__dirname, '../logs/cdn-warmup-report.json');
      await fs.mkdir(path.dirname(reportFile), { recursive: true });
      
      let reports = [];
      try {
        const existingReports = await fs.readFile(reportFile, 'utf8');
        reports = JSON.parse(existingReports);
      } catch (error) {
        // File doesn't exist or is invalid, start fresh
      }
      
      reports.push(report);
      
      // Keep only last 100 reports
      if (reports.length > 100) {
        reports = reports.slice(-100);
      }
      
      await fs.writeFile(reportFile, JSON.stringify(reports, null, 2));
    } catch (error) {
      await this.log(`Failed to save report: ${error.message}`, 'error');
    }
    
    return report;
  }

  async run() {
    await this.log('Starting CDN warmup...');
    
    // Build queue
    await this.warmupCriticalResources();
    await this.warmupImages();
    await this.warmupSitemap();
    
    this.stats.total = this.queue.length;
    await this.log(`Queued ${this.stats.total} URLs for warmup`);
    
    // Process queue
    await this.processQueue();
    
    // Wait for all requests to complete
    while (this.running > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Generate report
    const report = await this.generateReport();
    
    return report;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    options[key] = value;
  }
  
  // Override config with CLI options
  if (options.baseUrl) config.baseUrl = options.baseUrl;
  if (options.cdnDomain) config.cdnDomain = options.cdnDomain;
  if (options.concurrent) config.maxConcurrent = parseInt(options.concurrent);
  if (options.timeout) config.timeout = parseInt(options.timeout);
  
  const warmup = new CDNWarmup();
  
  warmup.run()
    .then((report) => {
      console.log('\nCDN warmup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('CDN warmup failed:', error);
      process.exit(1);
    });
}

module.exports = CDNWarmup;