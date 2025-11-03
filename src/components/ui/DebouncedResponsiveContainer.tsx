import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ResponsiveContainer } from 'recharts';

interface DebouncedResponsiveContainerProps {
  width?: string | number;
  height?: string | number;
  debounceMs?: number;
  children: React.ReactNode;
  [key: string]: any;
}

export const DebouncedResponsiveContainer: React.FC<DebouncedResponsiveContainerProps> = ({
  width = "100%",
  height = 300,
  debounceMs = 250,
  children,
  ...props
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [containerKey, setContainerKey] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const animationFrameRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const lastSizeRef = useRef({ width: 0, height: 0 });
  const isObservingRef = useRef(false);
  const loopCounterRef = useRef(0);
  const loopResetTimeRef = useRef(Date.now());

  // Prevent ResizeObserver loops by tracking rapid resize events
  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Track rapid resize events to detect loops
    const now = Date.now();
    if (now - loopResetTimeRef.current > 1000) {
      loopCounterRef.current = 0;
      loopResetTimeRef.current = now;
    }
    loopCounterRef.current++;

    // If too many resize events in a short time, stop observing to break the loop
    if (loopCounterRef.current > 10) {
      if (observerRef.current && isObservingRef.current && containerRef.current) {
        observerRef.current.unobserve(containerRef.current);
        isObservingRef.current = false;
      }
      return;
    }

    timeoutRef.current = setTimeout(() => {
      try {
        const entry = entries[0];
        if (entry) {
          const { width: newWidth, height: newHeight } = entry.contentRect;

          // Only update if size actually changed significantly
          const threshold = 2;
          const widthChanged = Math.abs(newWidth - lastSizeRef.current.width) > threshold;
          const heightChanged = Math.abs(newHeight - lastSizeRef.current.height) > threshold;

          if (widthChanged || heightChanged) {
            lastSizeRef.current = { width: newWidth, height: newHeight };
            setShouldRender(true);
          }
        }
      } catch (error) {
        console.debug('ResizeObserver error handled:', error);
      }
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    // Reset on mount
    setShouldRender(true);
    loopCounterRef.current = 0;
    loopResetTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!containerRef.current || isObservingRef.current) return;

    try {
      observerRef.current = new ResizeObserver((entries) => {
        animationFrameRef.current = requestAnimationFrame(() => {
          handleResize(entries);
        });
      });

      observerRef.current.observe(containerRef.current);
      isObservingRef.current = true;
    } catch (error) {
      console.debug('ResizeObserver creation failed, using fallback:', error);
      setShouldRender(true);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (observerRef.current) {
        try {
          if (isObservingRef.current && containerRef.current) {
            observerRef.current.unobserve(containerRef.current);
          }
          observerRef.current.disconnect();
        } catch (error) {
          console.debug('Error disconnecting ResizeObserver:', error);
        }
        observerRef.current = null;
        isObservingRef.current = false;
      }
    };
  }, [handleResize]);

  return (
    <div
      key={containerKey}
      ref={containerRef}
      style={{ width, height, minHeight: 0, minWidth: 0 }}
      className="relative overflow-hidden"
    >
      {shouldRender && (
        <ResponsiveContainer
          width="100%"
          height="100%"
          minHeight={0}
          {...props}
        >
          {children}
        </ResponsiveContainer>
      )}
    </div>
  );
};
