import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Client-side Error Monitoring System
 * Captures and reports frontend errors, performance issues, and user interactions
 */
class ClientErrorMonitor {
  constructor() {
    this.errors = [];
    this.performanceMetrics = {};
    this.userSessions = {};
    this.isInitialized = false;
    this.config = {
      maxErrors: 100,
      reportingEndpoint: '/api/errors/report',
      enableConsoleCapture: true,
      enablePerformanceMonitoring: true,
      enableUserTracking: true,
      sampleRate: 1.0, // Report 100% of errors in development
      batchSize: 10,
      flushInterval: 30000 // 30 seconds
    };
    this.errorQueue = [];
    this.sessionId = this.generateSessionId();
  }

  /**
   * Initialize error monitoring
   */
  initialize(config = {}) {
    if (this.isInitialized) return;

    this.config = { ...this.config, ...config };
    this.isInitialized = true;

    // Set up global error handlers
    this.setupGlobalErrorHandlers();
    
    // Set up performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      this.setupPerformanceMonitoring();
    }

    // Set up user session tracking
    if (this.config.enableUserTracking) {
      this.setupUserTracking();
    }

    // Set up periodic reporting
    this.setupPeriodicReporting();

    // Set up console capture
    if (this.config.enableConsoleCapture) {
      this.setupConsoleCapture();
    }

    console.log('Client Error Monitor initialized');
  }

  /**
   * Set up global error handlers
   */
  setupGlobalErrorHandlers() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError({
        type: 'JAVASCRIPT_ERROR',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        type: 'UNHANDLED_PROMISE_REJECTION',
        message: event.reason?.message || event.reason,
        stack: event.reason?.stack,
        promise: event.promise.toString(),
        timestamp: new Date().toISOString()
      });
    });

    // React error boundary integration
    window.__REACT_ERROR_MONITOR__ = this;
  }

  /**
   * Set up performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor Core Web Vitals
    this.observeWebVitals();

    // Monitor resource loading
    this.observeResourceTiming();

    // Monitor navigation timing
    this.observeNavigationTiming();

    // Monitor long tasks
    this.observeLongTasks();
  }

  /**
   * Observe Core Web Vitals
   */
  observeWebVitals() {
    // First Contentful Paint (FCP)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('FCP', entry.startTime);
        }
      }
    }).observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('LCP', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('FID', entry.processingStart - entry.startTime);
      }
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.recordMetric('CLS', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  /**
   * Observe resource timing
   */
  observeResourceTiming() {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Log slow resources
        if (entry.duration > 3000) {
          this.capturePerformanceIssue({
            type: 'SLOW_RESOURCE',
            resource: entry.name,
            duration: entry.duration,
            size: entry.transferSize,
            timestamp: new Date().toISOString()
          });
        }

        // Log failed resources
        if (entry.transferSize === 0 && entry.duration > 0) {
          this.captureError({
            type: 'RESOURCE_LOAD_ERROR',
            resource: entry.name,
            duration: entry.duration,
            timestamp: new Date().toISOString()
          });
        }
      }
    }).observe({ entryTypes: ['resource'] });
  }

  /**
   * Observe navigation timing
   */
  observeNavigationTiming() {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('NAVIGATION_TIMING', {
          domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
          loadComplete: entry.loadEventEnd - entry.loadEventStart,
          domInteractive: entry.domInteractive - entry.fetchStart,
          totalTime: entry.loadEventEnd - entry.fetchStart
        });
      }
    }).observe({ entryTypes: ['navigation'] });
  }

  /**
   * Observe long tasks
   */
  observeLongTasks() {
    if ('PerformanceObserver' in window) {
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.capturePerformanceIssue({
              type: 'LONG_TASK',
              duration: entry.duration,
              startTime: entry.startTime,
              timestamp: new Date().toISOString()
            });
          }
        }).observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Long task observer not supported
      }
    }
  }

  /**
   * Set up user session tracking
   */
  setupUserTracking() {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.recordUserAction({
        type: 'VISIBILITY_CHANGE',
        visible: !document.hidden,
        timestamp: new Date().toISOString()
      });
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.flushErrors(true); // Force flush on page unload
    });

    // Track user interactions
    ['click', 'keydown', 'scroll'].forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        this.recordUserAction({
          type: eventType.toUpperCase(),
          target: event.target.tagName,
          timestamp: new Date().toISOString()
        }, true); // Throttled
      });
    });
  }

  /**
   * Set up console capture
   */
  setupConsoleCapture() {
    const originalConsole = { ...console };

    ['error', 'warn'].forEach(level => {
      console[level] = (...args) => {
        // Call original console method
        originalConsole[level](...args);

        // Capture console message
        this.captureConsoleMessage({
          level,
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' '),
          timestamp: new Date().toISOString()
        });
      };
    });
  }

  /**
   * Set up periodic reporting
   */
  setupPeriodicReporting() {
    setInterval(() => {
      this.flushErrors();
    }, this.config.flushInterval);
  }

  /**
   * Capture error
   */
  captureError(errorData) {
    if (!this.shouldReport()) return;

    const enrichedError = this.enrichErrorData(errorData);
    
    this.errors.push(enrichedError);
    this.errorQueue.push(enrichedError);

    // Maintain max errors limit
    if (this.errors.length > this.config.maxErrors) {
      this.errors = this.errors.slice(-this.config.maxErrors);
    }

    // Auto-flush if queue is full
    if (this.errorQueue.length >= this.config.batchSize) {
      this.flushErrors();
    }

    console.warn('Error captured:', enrichedError);
  }

  /**
   * Capture performance issue
   */
  capturePerformanceIssue(performanceData) {
    if (!this.shouldReport()) return;

    const enrichedData = this.enrichErrorData({
      ...performanceData,
      category: 'PERFORMANCE'
    });

    this.errorQueue.push(enrichedData);
  }

  /**
   * Capture console message
   */
  captureConsoleMessage(consoleData) {
    if (!this.shouldReport()) return;

    const enrichedData = this.enrichErrorData({
      ...consoleData,
      type: 'CONSOLE_MESSAGE',
      category: 'CONSOLE'
    });

    this.errorQueue.push(enrichedData);
  }

  /**
   * Record performance metric
   */
  recordMetric(name, value) {
    this.performanceMetrics[name] = {
      value,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Record user action (with throttling)
   */
  recordUserAction(actionData, throttled = false) {
    if (throttled && this.lastUserAction && 
        Date.now() - this.lastUserAction < 1000) {
      return; // Throttle user actions to max 1 per second
    }

    this.lastUserAction = Date.now();
    
    if (!this.userSessions[this.sessionId]) {
      this.userSessions[this.sessionId] = {
        startTime: new Date().toISOString(),
        actions: []
      };
    }

    this.userSessions[this.sessionId].actions.push(actionData);
  }

  /**
   * Enrich error data with context
   */
  enrichErrorData(errorData) {
    return {
      ...errorData,
      errorId: this.generateErrorId(),
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: errorData.timestamp || new Date().toISOString(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: window.screen.width,
        height: window.screen.height
      },
      connection: this.getConnectionInfo(),
      performance: this.getPerformanceSnapshot(),
      user: this.getUserContext(),
      breadcrumbs: this.getBreadcrumbs()
    };
  }

  /**
   * Get connection information
   */
  getConnectionInfo() {
    if ('connection' in navigator) {
      return {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      };
    }
    return null;
  }

  /**
   * Get performance snapshot
   */
  getPerformanceSnapshot() {
    return {
      memory: performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      } : null,
      timing: performance.timing ? {
        loadEventEnd: performance.timing.loadEventEnd,
        navigationStart: performance.timing.navigationStart
      } : null,
      metrics: this.performanceMetrics
    };
  }

  /**
   * Get user context
   */
  getUserContext() {
    // This would typically get user info from your auth system
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      // Don't include sensitive information
    };
  }

  /**
   * Get breadcrumbs (recent user actions)
   */
  getBreadcrumbs() {
    const session = this.userSessions[this.sessionId];
    if (!session) return [];

    return session.actions.slice(-10); // Last 10 actions
  }

  /**
   * Check if error should be reported
   */
  shouldReport() {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Flush errors to server
   */
  async flushErrors(force = false) {
    if (this.errorQueue.length === 0) return;
    if (!force && this.errorQueue.length < this.config.batchSize) return;

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    try {
      const response = await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errors: errorsToSend,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`Sent ${errorsToSend.length} errors to server`);
    } catch (error) {
      console.error('Failed to send errors to server:', error);
      // Re-queue errors for retry
      this.errorQueue.unshift(...errorsToSend);
    }
  }

  /**
   * Manual error reporting
   */
  reportError(error, context = {}) {
    this.captureError({
      type: 'MANUAL_ERROR',
      message: error.message || error,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Report custom event
   */
  reportEvent(eventName, data = {}) {
    this.captureError({
      type: 'CUSTOM_EVENT',
      eventName,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const errorsByType = {};
    this.errors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    });

    return {
      totalErrors: this.errors.length,
      errorsByType,
      sessionId: this.sessionId,
      performanceMetrics: this.performanceMetrics,
      queuedErrors: this.errorQueue.length
    };
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `client_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errors = [];
    this.errorQueue = [];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create singleton instance
const clientErrorMonitor = new ClientErrorMonitor();

// React Context for error monitoring
const ErrorMonitorContext = createContext(clientErrorMonitor);

// React Hook for using error monitor
export const useErrorMonitor = () => {
  return useContext(ErrorMonitorContext);
};

// React Error Boundary Component
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Report error to monitoring system
    if (window.__REACT_ERROR_MONITOR__) {
      window.__REACT_ERROR_MONITOR__.captureError({
        type: 'REACT_ERROR_BOUNDARY',
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>We've been notified about this error and will fix it soon.</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// React Provider Component
export const ErrorMonitorProvider = ({ children, config = {} }) => {
  useEffect(() => {
    clientErrorMonitor.initialize(config);
  }, [config]);

  return (
    <ErrorMonitorContext.Provider value={clientErrorMonitor}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </ErrorMonitorContext.Provider>
  );
};

// Performance monitoring hook
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({});
  const errorMonitor = useErrorMonitor();

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(errorMonitor.performanceMetrics);
    };

    const interval = setInterval(updateMetrics, 5000);
    updateMetrics();

    return () => clearInterval(interval);
  }, [errorMonitor]);

  return metrics;
};

// Error reporting hook
export const useErrorReporting = () => {
  const errorMonitor = useErrorMonitor();

  return {
    reportError: (error, context) => errorMonitor.reportError(error, context),
    reportEvent: (eventName, data) => errorMonitor.reportEvent(eventName, data),
    getStats: () => errorMonitor.getErrorStats()
  };
};

export default clientErrorMonitor;