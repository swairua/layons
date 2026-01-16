import { useEffect, useRef, useState } from 'react';

interface FloatingItemPreviewProps {
  quantity: string | number;
  rate: string | number;
  label?: string;
  formatCurrency: (value: number) => string;
  showTax?: boolean;
  taxPercentage?: number;
  description?: string;
}

export function FloatingItemPreview({
  quantity,
  rate,
  label = 'Preview',
  formatCurrency,
  showTax = false,
  taxPercentage = 0,
  description = '',
}: FloatingItemPreviewProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const qty = typeof quantity === 'string' ? (quantity === '' ? 0 : parseFloat(quantity)) : quantity;
  const rateValue = typeof rate === 'string' ? (rate === '' ? 0 : parseFloat(rate)) : rate;
  
  const subtotal = qty * rateValue;
  const tax = showTax ? (subtotal * (taxPercentage || 0)) / 100 : 0;
  const total = subtotal + tax;

  useEffect(() => {
    const updatePosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPosition({
          x: rect.right + 10,
          y: rect.top - 40,
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, []);

  // Only show preview if there are values
  const hasValues = qty > 0 || rateValue > 0;

  if (!hasValues) {
    return <div ref={containerRef} />;
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <div
        className="fixed z-50 bg-slate-900 text-white px-3 py-2 rounded-md text-xs font-medium shadow-lg border border-slate-700 pointer-events-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          maxWidth: '300px',
        }}
      >
        <div className="font-semibold mb-1">{label}</div>
        {description && (
          <div className="mb-1 pb-1 border-b border-slate-600 text-slate-300 text-xs">
            {description}
          </div>
        )}
        <div className="space-y-0.5">
          <div className="flex gap-2">
            <span className="text-slate-400">Qty:</span>
            <span className="text-white">{qty}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-400">Rate:</span>
            <span className="text-white">{formatCurrency(rateValue)}</span>
          </div>
          <div className="border-t border-slate-600 pt-1 mt-1 flex gap-2">
            <span className="text-slate-400">Total:</span>
            <span className="text-green-400 font-bold">{formatCurrency(subtotal)}</span>
          </div>
          {showTax && taxPercentage > 0 && (
            <div className="flex gap-2">
              <span className="text-slate-400">Tax ({taxPercentage}%):</span>
              <span className="text-orange-400">{formatCurrency(tax)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
