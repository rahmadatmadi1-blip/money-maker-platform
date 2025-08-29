import React, { useState, useRef, useEffect } from 'react';
import './LazyImage.css';

const LazyImage = ({ 
  src, 
  alt, 
  placeholder, 
  className = '', 
  width, 
  height,
  onLoad,
  onError,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef();
  const observerRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
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
    };
  }, []);

  const handleLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    setHasError(true);
    if (onError) onError(e);
  };

  const defaultPlaceholder = (
    <div className="lazy-image-placeholder">
      <svg 
        width="40" 
        height="40" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
        <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
        <polyline points="21,15 16,10 5,21" stroke="currentColor" strokeWidth="2"/>
      </svg>
    </div>
  );

  const errorPlaceholder = (
    <div className="lazy-image-error">
      <svg 
        width="40" 
        height="40" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
      </svg>
      <span>Gagal memuat gambar</span>
    </div>
  );

  return (
    <div 
      ref={imgRef}
      className={`lazy-image-container ${className}`}
      style={{ width, height }}
      {...props}
    >
      {hasError ? (
        errorPlaceholder
      ) : (
        <>
          {!isLoaded && (placeholder || defaultPlaceholder)}
          {isInView && (
            <img
              src={src}
              alt={alt}
              className={`lazy-image ${isLoaded ? 'loaded' : 'loading'}`}
              onLoad={handleLoad}
              onError={handleError}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default LazyImage;