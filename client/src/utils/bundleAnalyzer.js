// Bundle Analyzer Utility
// This utility helps analyze bundle size and identify optimization opportunities

class BundleAnalyzer {
  constructor() {
    this.chunks = new Map();
    this.modules = new Map();
    this.dependencies = new Map();
    this.loadTimes = new Map();
    this.isAnalyzing = false;
  }

  // Start analyzing bundle performance
  startAnalysis() {
    if (this.isAnalyzing) return;
    
    this.isAnalyzing = true;
    console.log('🔍 Bundle Analysis Started');
    
    // Analyze initial bundle
    this.analyzeInitialBundle();
    
    // Monitor dynamic imports
    this.monitorDynamicImports();
    
    // Track resource loading
    this.trackResourceLoading();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
  }

  // Analyze initial bundle size and composition
  analyzeInitialBundle() {
    const scripts = document.querySelectorAll('script[src]');
    const styles = document.querySelectorAll('link[rel="stylesheet"]');
    
    let totalScriptSize = 0;
    let totalStyleSize = 0;
    
    scripts.forEach(script => {
      const src = script.src;
      if (src && src.includes('static/js/')) {
        this.fetchResourceSize(src, 'script')
          .then(size => {
            totalScriptSize += size;
            this.chunks.set(src, { type: 'script', size, url: src });
          });
      }
    });
    
    styles.forEach(style => {
      const href = style.href;
      if (href && href.includes('static/css/')) {
        this.fetchResourceSize(href, 'style')
          .then(size => {
            totalStyleSize += size;
            this.chunks.set(href, { type: 'style', size, url: href });
          });
      }
    });
    
    setTimeout(() => {
      console.log('📊 Bundle Analysis Results:');
      console.log(`Total Script Size: ${this.formatSize(totalScriptSize)}`);
      console.log(`Total Style Size: ${this.formatSize(totalStyleSize)}`);
      console.log(`Total Bundle Size: ${this.formatSize(totalScriptSize + totalStyleSize)}`);
    }, 2000);
  }

  // Monitor dynamic imports and code splitting
  monitorDynamicImports() {
    const originalImport = window.import || (() => {});
    
    window.import = async (specifier) => {
      const startTime = performance.now();
      
      try {
        const module = await originalImport(specifier);
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        this.loadTimes.set(specifier, loadTime);
        this.modules.set(specifier, {
          loadTime,
          timestamp: Date.now(),
          size: this.estimateModuleSize(module)
        });
        
        console.log(`📦 Dynamic import loaded: ${specifier} (${loadTime.toFixed(2)}ms)`);
        
        return module;
      } catch (error) {
        console.error(`❌ Dynamic import failed: ${specifier}`, error);
        throw error;
      }
    };
  }

  // Track resource loading performance
  trackResourceLoading() {
    if (!window.PerformanceObserver) return;
    
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.initiatorType === 'script' || entry.initiatorType === 'link') {
          const resourceInfo = {
            name: entry.name,
            type: entry.initiatorType,
            size: entry.transferSize || 0,
            loadTime: entry.responseEnd - entry.requestStart,
            cacheHit: entry.transferSize === 0 && entry.decodedBodySize > 0
          };
          
          this.dependencies.set(entry.name, resourceInfo);
          
          // Log slow loading resources
          if (resourceInfo.loadTime > 1000) {
            console.warn(`🐌 Slow resource: ${entry.name} (${resourceInfo.loadTime.toFixed(2)}ms)`);
          }
        }
      });
    });
    
    observer.observe({ entryTypes: ['resource'] });
  }

  // Monitor memory usage patterns
  monitorMemoryUsage() {
    if (!performance.memory) return;
    
    setInterval(() => {
      const memory = performance.memory;
      const memoryInfo = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };
      
      // Warn about high memory usage
      const usagePercent = (memoryInfo.used / memoryInfo.limit) * 100;
      if (usagePercent > 80) {
        console.warn(`🚨 High memory usage: ${usagePercent.toFixed(1)}% (${this.formatSize(memoryInfo.used)})`);
      }
    }, 5000);
  }

  // Fetch resource size
  async fetchResourceSize(url, type) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const size = parseInt(response.headers.get('content-length') || '0');
      return size;
    } catch (error) {
      console.warn(`Could not fetch size for ${type}: ${url}`);
      return 0;
    }
  }

  // Estimate module size (rough approximation)
  estimateModuleSize(module) {
    try {
      const moduleString = JSON.stringify(module);
      return new Blob([moduleString]).size;
    } catch {
      return 0;
    }
  }

  // Format bytes to human readable format
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Generate optimization recommendations
  generateRecommendations() {
    const recommendations = [];
    
    // Check for large chunks
    this.chunks.forEach((chunk, url) => {
      if (chunk.size > 500 * 1024) { // 500KB
        recommendations.push({
          type: 'large-chunk',
          message: `Large ${chunk.type} detected: ${url} (${this.formatSize(chunk.size)})`,
          suggestion: 'Consider code splitting or removing unused dependencies'
        });
      }
    });
    
    // Check for slow loading modules
    this.modules.forEach((module, specifier) => {
      if (module.loadTime > 2000) { // 2 seconds
        recommendations.push({
          type: 'slow-module',
          message: `Slow loading module: ${specifier} (${module.loadTime.toFixed(2)}ms)`,
          suggestion: 'Consider preloading or optimizing this module'
        });
      }
    });
    
    // Check for cache misses
    this.dependencies.forEach((dep, name) => {
      if (!dep.cacheHit && dep.size > 100 * 1024) { // 100KB
        recommendations.push({
          type: 'cache-miss',
          message: `Large uncached resource: ${name} (${this.formatSize(dep.size)})`,
          suggestion: 'Ensure proper caching headers are set'
        });
      }
    });
    
    return recommendations;
  }

  // Generate detailed report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      chunks: Array.from(this.chunks.entries()).map(([url, chunk]) => ({
        url,
        ...chunk
      })),
      modules: Array.from(this.modules.entries()).map(([specifier, module]) => ({
        specifier,
        ...module
      })),
      dependencies: Array.from(this.dependencies.entries()).map(([name, dep]) => ({
        name,
        ...dep
      })),
      recommendations: this.generateRecommendations(),
      summary: {
        totalChunks: this.chunks.size,
        totalModules: this.modules.size,
        totalDependencies: this.dependencies.size,
        averageLoadTime: this.calculateAverageLoadTime()
      }
    };
    
    return report;
  }

  // Calculate average load time
  calculateAverageLoadTime() {
    const loadTimes = Array.from(this.loadTimes.values());
    if (loadTimes.length === 0) return 0;
    
    const total = loadTimes.reduce((sum, time) => sum + time, 0);
    return total / loadTimes.length;
  }

  // Print report to console
  printReport() {
    const report = this.generateReport();
    
    console.group('📊 Bundle Analysis Report');
    console.log('Generated:', report.timestamp);
    
    console.group('📈 Summary');
    console.log(`Total Chunks: ${report.summary.totalChunks}`);
    console.log(`Total Modules: ${report.summary.totalModules}`);
    console.log(`Total Dependencies: ${report.summary.totalDependencies}`);
    console.log(`Average Load Time: ${report.summary.averageLoadTime.toFixed(2)}ms`);
    console.groupEnd();
    
    if (report.recommendations.length > 0) {
      console.group('💡 Recommendations');
      report.recommendations.forEach(rec => {
        console.warn(`${rec.type}: ${rec.message}`);
        console.log(`   💡 ${rec.suggestion}`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
    
    return report;
  }

  // Stop analysis
  stopAnalysis() {
    this.isAnalyzing = false;
    console.log('🔍 Bundle Analysis Stopped');
  }
}

// Create singleton instance
const bundleAnalyzer = new BundleAnalyzer();

// Auto-start in development mode
if (process.env.NODE_ENV === 'development') {
  // Start analysis after a short delay to allow initial load
  setTimeout(() => {
    bundleAnalyzer.startAnalysis();
    
    // Print report after 10 seconds
    setTimeout(() => {
      bundleAnalyzer.printReport();
    }, 10000);
  }, 1000);
  
  // Make available globally for manual analysis
  window.bundleAnalyzer = bundleAnalyzer;
}

export default bundleAnalyzer;

// Export utility functions
export const analyzeBundleSize = () => bundleAnalyzer.printReport();
export const getBundleRecommendations = () => bundleAnalyzer.generateRecommendations();
export const formatFileSize = (bytes) => bundleAnalyzer.formatSize(bytes);