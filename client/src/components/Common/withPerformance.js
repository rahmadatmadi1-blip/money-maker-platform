import React, { memo, forwardRef } from 'react';
import { usePerformanceMonitor } from '../../hooks/usePerformance';

// HOC for performance monitoring
export const withPerformanceMonitor = (WrappedComponent, componentName) => {
  const PerformanceMonitoredComponent = memo(forwardRef((props, ref) => {
    const { logPerformance } = usePerformanceMonitor(componentName || WrappedComponent.name);
    
    React.useEffect(() => {
      // Log performance on mount and updates
      logPerformance();
    });

    return <WrappedComponent {...props} ref={ref} />;
  }));

  PerformanceMonitoredComponent.displayName = `withPerformanceMonitor(${componentName || WrappedComponent.name})`;
  return PerformanceMonitoredComponent;
};

// HOC for memoization with custom comparison
export const withMemoization = (WrappedComponent, areEqual) => {
  const MemoizedComponent = memo(WrappedComponent, areEqual);
  MemoizedComponent.displayName = `withMemoization(${WrappedComponent.name})`;
  return MemoizedComponent;
};

// HOC for lazy loading with intersection observer
export const withLazyLoading = (WrappedComponent, options = {}) => {
  const LazyLoadedComponent = forwardRef((props, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const elementRef = React.useRef();

    React.useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        {
          threshold: 0.1,
          rootMargin: '100px',
          ...options
        }
      );

      if (elementRef.current) {
        observer.observe(elementRef.current);
      }

      return () => observer.disconnect();
    }, []);

    return (
      <div ref={elementRef}>
        {isVisible ? (
          <WrappedComponent {...props} ref={ref} />
        ) : (
          <div 
            style={{ 
              height: options.placeholderHeight || '200px',
              background: '#f8f9fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px'
            }}
          >
            <div>Loading...</div>
          </div>
        )}
      </div>
    );
  });

  LazyLoadedComponent.displayName = `withLazyLoading(${WrappedComponent.name})`;
  return LazyLoadedComponent;
};

// HOC for error boundary
export const withErrorBoundary = (WrappedComponent, fallbackComponent) => {
  class ErrorBoundaryHOC extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
      console.error(`Error in ${WrappedComponent.name}:`, error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        if (fallbackComponent) {
          return React.createElement(fallbackComponent, { error: this.state.error });
        }
        
        return (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#721c24',
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '8px'
          }}>
            <h3>Oops! Something went wrong</h3>
            <p>Component failed to render properly.</p>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: '8px 16px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        );
      }

      return <WrappedComponent {...this.props} />;
    }
  }

  ErrorBoundaryHOC.displayName = `withErrorBoundary(${WrappedComponent.name})`;
  return ErrorBoundaryHOC;
};

// HOC for combining multiple performance optimizations
export const withOptimizations = (WrappedComponent, options = {}) => {
  const {
    enableMemoization = true,
    enableLazyLoading = false,
    enableErrorBoundary = true,
    enablePerformanceMonitor = process.env.NODE_ENV === 'development',
    memoizationComparer,
    lazyLoadingOptions,
    errorFallback
  } = options;

  let OptimizedComponent = WrappedComponent;

  // Apply memoization
  if (enableMemoization) {
    OptimizedComponent = withMemoization(OptimizedComponent, memoizationComparer);
  }

  // Apply lazy loading
  if (enableLazyLoading) {
    OptimizedComponent = withLazyLoading(OptimizedComponent, lazyLoadingOptions);
  }

  // Apply error boundary
  if (enableErrorBoundary) {
    OptimizedComponent = withErrorBoundary(OptimizedComponent, errorFallback);
  }

  // Apply performance monitoring
  if (enablePerformanceMonitor) {
    OptimizedComponent = withPerformanceMonitor(OptimizedComponent);
  }

  OptimizedComponent.displayName = `withOptimizations(${WrappedComponent.name})`;
  return OptimizedComponent;
};

// Utility function for shallow comparison
export const shallowEqual = (prevProps, nextProps) => {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (let key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
};

// Utility function for deep comparison (use sparingly)
export const deepEqual = (prevProps, nextProps) => {
  return JSON.stringify(prevProps) === JSON.stringify(nextProps);
};