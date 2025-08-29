import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Custom hook for debouncing values
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Custom hook for throttling function calls
export const useThrottle = (callback, delay) => {
  const lastRun = useRef(Date.now());

  return useCallback(
    (...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    },
    [callback, delay]
  );
};

// Custom hook for memoizing expensive calculations
export const useMemoizedValue = (factory, deps) => {
  return useMemo(factory, deps);
};

// Custom hook for optimized API calls with caching
export const useApiCache = () => {
  const cache = useRef(new Map());

  const getCachedData = useCallback((key) => {
    const cached = cache.current.get(key);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
      return cached.data;
    }
    return null;
  }, []);

  const setCachedData = useCallback((key, data) => {
    cache.current.set(key, {
      data,
      timestamp: Date.now()
    });
  }, []);

  const clearCache = useCallback(() => {
    cache.current.clear();
  }, []);

  return { getCachedData, setCachedData, clearCache };
};

// Custom hook for intersection observer (lazy loading)
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef();

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting;
        setIsIntersecting(isElementIntersecting);
        
        if (isElementIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasIntersected, options]);

  return { elementRef, isIntersecting, hasIntersected };
};

// Custom hook for performance monitoring
export const usePerformanceMonitor = (componentName) => {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
  });

  const logPerformance = useCallback(() => {
    const endTime = Date.now();
    const renderTime = endTime - startTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} Performance:`, {
        renderCount: renderCount.current,
        totalTime: renderTime,
        averageRenderTime: renderTime / renderCount.current
      });
    }
  }, [componentName]);

  return { renderCount: renderCount.current, logPerformance };
};

// Custom hook for optimized state updates
export const useOptimizedState = (initialState) => {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);

  const optimizedSetState = useCallback((newState) => {
    // Only update if the state actually changed
    if (typeof newState === 'function') {
      setState(prevState => {
        const nextState = newState(prevState);
        if (JSON.stringify(nextState) !== JSON.stringify(prevState)) {
          stateRef.current = nextState;
          return nextState;
        }
        return prevState;
      });
    } else {
      if (JSON.stringify(newState) !== JSON.stringify(stateRef.current)) {
        stateRef.current = newState;
        setState(newState);
      }
    }
  }, []);

  return [state, optimizedSetState];
};

// Custom hook for window size optimization
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const handleResize = useThrottle(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, 100);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return windowSize;
};

// Custom hook for local storage with performance optimization
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      if (typeof window === 'undefined') return initialValue;
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};