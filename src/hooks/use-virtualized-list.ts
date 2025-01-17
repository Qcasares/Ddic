import { useState, useCallback, useRef, useEffect } from 'react';

interface VirtualizedListOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export function useVirtualizedList<T>(
  items: T[],
  options: VirtualizedListOptions
) {
  const {
    itemHeight,
    containerHeight,
    overscan = 3,
    onEndReached,
    endReachedThreshold = 0.8
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastEndReachedRef = useRef(false);

  // Calculate visible items
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  // Handle scroll events
  const onScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    setScrollTop(scrollTop);

    // Check if we've reached the end
    if (onEndReached) {
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
      const hasReachedEnd = scrollPercentage >= endReachedThreshold;
      
      if (hasReachedEnd && !lastEndReachedRef.current) {
        onEndReached();
      }
      lastEndReachedRef.current = hasReachedEnd;
    }
  }, [onEndReached, endReachedThreshold]);

  // Reset scroll position when items change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [items.length]);

  return {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    onScroll,
    startIndex,
    endIndex
  };
}