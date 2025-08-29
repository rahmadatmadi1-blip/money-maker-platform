import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { Box, Skeleton, Alert } from '@mui/material';
import { useImageOptimization } from '../../hooks/useCDN';

// Optimized Image Component with CDN integration and lazy loading
const OptimizedImage = forwardRef(({
  src,
  alt = '',
  width,
  height,
  quality = 80,
  format = 'auto',
  fit = 'cover',
  priority = false,
  lazy = true,
  placeholder = 'blur',
  fallback,
  className,
  style,
  onClick,
  onLoad,
  onError,
  sizes = '100vw',
  ...props
}, ref) => {
  const [isInView, setIsInView] = useState(!lazy || priority);
  const [currentSrc, setCurrentSrc] = useState('');
  const imgRef = useRef(null);
  const observerRef = useRef(null);
  
  const { getImageProps, isLoaded, hasFailed, cdnEnabled } = useImageOptimization();

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Load images 100px before they come into view
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
      observerRef.current = observer;
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    });
  }, [lazy, priority, isInView]);

  // Update current src when in view
  useEffect(() => {
    if (isInView && src) {
      setCurrentSrc(src);
    }
  }, [isInView, src]);

  const handleLoad = (event) => {
    onLoad?.(event);
  };

  const handleError = (event) => {
    // Try fallback image
    if (fallback && currentSrc !== fallback) {
      setCurrentSrc(fallback);
      return;
    }
    
    onError?.(event);
  };

  // Get optimized image properties
  const imageProps = currentSrc ? getImageProps(currentSrc, {
    alt,
    width,
    height,
    sizes,
    priority,
    quality,
    format,
    fit
  }) : {};

  const imgProps = {
    ref: (node) => {
      imgRef.current = node;
      if (ref) {
        if (typeof ref === 'function') ref(node);
        else ref.current = node;
      }
    },
    ...imageProps,
    onLoad: (event) => {
      imageProps.onLoad?.(event);
      handleLoad(event);
    },
    onError: (event) => {
      imageProps.onError?.(event);
      handleError(event);
    },
    onClick,
    className,
    style: {
      transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
      opacity: isLoaded(currentSrc) ? 1 : 0,
      transform: isLoaded(currentSrc) ? 'scale(1)' : 'scale(1.02)',
      ...style
    },
    ...props
  };

  // Set dimensions if provided
  if (width) imgProps.width = width;
  if (height) imgProps.height = height;

  const containerStyle = {
    position: 'relative',
    display: 'inline-block',
    width: width || 'auto',
    height: height || 'auto',
    overflow: 'hidden',
    borderRadius: style?.borderRadius || 0
  };

  return (
    <Box sx={containerStyle}>
      {/* Placeholder/Skeleton */}
      {!isLoaded(currentSrc) && !hasFailed(currentSrc) && currentSrc && (
        <Skeleton
          variant="rectangular"
          width={width || '100%'}
          height={height || 200}
          animation="wave"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
            borderRadius: 'inherit'
          }}
        />
      )}

      {/* Low quality placeholder for blur effect */}
      {placeholder === 'blur' && currentSrc && !isLoaded(currentSrc) && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            filter: 'blur(2px)',
            opacity: 0.3,
            zIndex: 0
          }}
        />
      )}

      {/* Error state */}
      {hasFailed(currentSrc) && (
        <Alert
          severity="error"
          variant="outlined"
          sx={{
            width: width || '100%',
            height: height || 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'inherit'
          }}
        >
          Failed to load image
        </Alert>
      )}

      {/* Actual image */}
      {currentSrc && !hasFailed(currentSrc) && (
        <img {...imgProps} />
      )}

      {/* CDN indicator (development only) */}
      {process.env.NODE_ENV === 'development' && cdnEnabled && isLoaded(currentSrc) && (
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            backgroundColor: 'rgba(76, 175, 80, 0.8)',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            zIndex: 2
          }}
        >
          CDN
        </Box>
      )}
    </Box>
  );
};

// Higher-order component for automatic optimization
export const withImageOptimization = (WrappedComponent) => {
  return React.forwardRef((props, ref) => {
    const optimizedProps = {
      ...props,
      // Add default optimization settings
      quality: props.quality || 85,
      format: props.format || 'auto',
      lazy: props.lazy !== false,
      placeholder: props.placeholder || 'blur'
    };

    return <WrappedComponent ref={ref} {...optimizedProps} />;
  });
};

// Hook for image optimization utilities
export const useImageOptimization = () => {
  const getOptimizedUrl = (src, options = {}) => {
    if (typeof CDNHelpers !== 'undefined') {
      return CDNHelpers.getOptimizedImageUrl(src, options);
    }
    return src;
  };

  const generateSrcSet = (src, breakpoints) => {
    if (typeof CDNHelpers !== 'undefined') {
      return CDNHelpers.generateSrcSet(src, breakpoints);
    }
    return '';
  };

  const preloadImage = (src, options = {}) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = getOptimizedUrl(src, options);
    });
  };

  return {
    getOptimizedUrl,
    generateSrcSet,
    preloadImage
  };
};

export default OptimizedImage;