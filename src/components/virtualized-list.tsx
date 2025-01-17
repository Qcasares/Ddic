import React, { forwardRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  className?: string;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  offsetY: number;
}

export const VirtualizedList = forwardRef<HTMLDivElement, VirtualizedListProps<any>>(
  function VirtualizedList(
    {
      items,
      renderItem,
      itemHeight,
      containerHeight,
      className,
      onScroll,
      startIndex,
      endIndex,
      totalHeight,
      offsetY
    },
    ref
  ) {
    return (
      <ScrollArea
        ref={ref}
        className={className}
        style={{ height: containerHeight }}
        onScroll={onScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${offsetY}px)`,
            }}
          >
            {items.slice(startIndex, endIndex).map((item, index) => (
              <div
                key={startIndex + index}
                style={{ height: itemHeight }}
              >
                {renderItem(item, startIndex + index)}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    );
  }
);