import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useIntersectionObserver } from '../../hooks/usePerformance';
import './VirtualizedList.css';

const VirtualizedList = ({
  items = [],
  itemHeight = 60,
  containerHeight = 400,
  renderItem,
  overscan = 5,
  onLoadMore,
  hasNextPage = false,
  loading = false,
  className = '',
  ...props
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState(null);
  const scrollElementRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const visibleHeight = containerHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + visibleHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length]);

  // Get visible items
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      ...item,
      index: startIndex + index,
      originalIndex: startIndex + index
    }));
  }, [items, visibleRange]);

  // Handle scroll
  const handleScroll = useCallback((e) => {
    const scrollTop = e.target.scrollTop;
    setScrollTop(scrollTop);
  }, []);

  // Intersection observer for infinite loading
  const [loadMoreEntry] = useIntersectionObserver(loadMoreRef, {
    threshold: 0.1,
    rootMargin: '100px'
  });

  // Load more when intersection is detected
  useEffect(() => {
    if (loadMoreEntry?.isIntersecting && hasNextPage && !loading && onLoadMore) {
      onLoadMore();
    }
  }, [loadMoreEntry?.isIntersecting, hasNextPage, loading, onLoadMore]);

  // Calculate total height and offset
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return (
    <div 
      className={`virtualized-list ${className}`}
      style={{ height: containerHeight }}
      {...props}
    >
      <div
        ref={scrollElementRef}
        className="virtualized-list-container"
        style={{ height: containerHeight, overflow: 'auto' }}
        onScroll={handleScroll}
      >
        <div 
          className="virtualized-list-content"
          style={{ height: totalHeight, position: 'relative' }}
        >
          <div
            className="virtualized-list-items"
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0
            }}
          >
            {visibleItems.map((item, index) => (
              <div
                key={item.id || item.originalIndex}
                className="virtualized-list-item"
                style={{ height: itemHeight }}
              >
                {renderItem(item, item.originalIndex)}
              </div>
            ))}
          </div>
          
          {/* Load more trigger */}
          {hasNextPage && (
            <div
              ref={loadMoreRef}
              className="virtualized-list-load-more"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {loading ? (
                <div className="loading-spinner">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Loading more...</span>
                </div>
              ) : (
                <div className="load-more-placeholder">
                  <span>Scroll to load more</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Memoized version for better performance
const MemoizedVirtualizedList = React.memo(VirtualizedList, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.items.length === nextProps.items.length &&
    prevProps.itemHeight === nextProps.itemHeight &&
    prevProps.containerHeight === nextProps.containerHeight &&
    prevProps.loading === nextProps.loading &&
    prevProps.hasNextPage === nextProps.hasNextPage &&
    prevProps.className === nextProps.className
  );
});

export default MemoizedVirtualizedList;

// Export hook for virtualized list state management
export const useVirtualizedList = ({
  initialItems = [],
  itemsPerPage = 20,
  fetchItems
}) => {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [page, setPage] = useState(1);

  const loadMore = useCallback(async () => {
    if (loading || !hasNextPage) return;

    setLoading(true);
    try {
      const newItems = await fetchItems(page, itemsPerPage);
      
      if (newItems.length < itemsPerPage) {
        setHasNextPage(false);
      }
      
      setItems(prev => [...prev, ...newItems]);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Error loading more items:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasNextPage, page, itemsPerPage, fetchItems]);

  const reset = useCallback(() => {
    setItems(initialItems);
    setPage(1);
    setHasNextPage(true);
    setLoading(false);
  }, [initialItems]);

  return {
    items,
    loading,
    hasNextPage,
    loadMore,
    reset,
    setItems
  };
};