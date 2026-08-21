import React, { useRef, useState, useEffect, useCallback, UIEvent } from 'react';

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  emptyState?: React.ReactNode;
}

/**
 * High-performance virtualized list container.
 * Only mounts and renders DOM nodes for visible elements in the scroll window,
 * keeping memory, layout thrashing, and DOM nodes minimal for long lists.
 */
export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  className = '',
  overscan = 4,
  emptyState = null,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  // ResizeObserver to track container height
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setContainerHeight(entry.contentRect.height);
        }
      }
    });

    ro.observe(el);
    setContainerHeight(el.clientHeight || 400);

    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  if (items.length === 0) {
    return <div ref={containerRef} className={`h-full overflow-y-auto ${className}`}>{emptyState}</div>;
  }

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push({
      item: items[i],
      index: i,
      top: i * itemHeight,
    });
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`h-full overflow-y-auto relative ${className}`}
    >
      <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
