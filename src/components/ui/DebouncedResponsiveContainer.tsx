import React, { useState, useEffect, useRef } from 'react';
import { ResponsiveContainer } from 'recharts';
import { SafeResizeObserver } from '@/utils/safeResizeObserver';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<SafeResizeObserver | null>(null);
  const lastSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    setShouldRender(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      if (entry) {
        const { width: newWidth, height: newHeight } = entry.contentRect;

        const threshold = 2;
        const widthChanged = Math.abs(newWidth - lastSizeRef.current.width) > threshold;
        const heightChanged = Math.abs(newHeight - lastSizeRef.current.height) > threshold;

        if (widthChanged || heightChanged) {
          lastSizeRef.current = { width: newWidth, height: newHeight };
          setShouldRender(true);
        }
      }
    };

    try {
      observerRef.current = new SafeResizeObserver(handleResize, debounceMs);
      observerRef.current.observe(containerRef.current);
    } catch (error) {
      console.debug('SafeResizeObserver creation failed, using fallback:', error);
      setShouldRender(true);
    }

    return () => {
      if (observerRef.current && containerRef.current) {
        try {
          observerRef.current.unobserve(containerRef.current);
          observerRef.current.disconnect();
        } catch (error) {
          console.debug('Error disconnecting SafeResizeObserver:', error);
        }
        observerRef.current = null;
      }
    };
  }, [debounceMs]);

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
