import React, { useRef } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      style={{ width, height, minHeight: 0, minWidth: 0 }}
      className="relative overflow-hidden"
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minHeight={0}
        debounceMs={debounceMs}
        {...props}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
};
