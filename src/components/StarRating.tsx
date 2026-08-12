'use client';

import { useState } from 'react';

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
}

export default function StarRating({ value, onChange, size = 'sm', readOnly = false }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;

  const sizes = { sm: '13px', md: '20px', lg: '26px' };
  const starSize = sizes[size];
  const numSize = { sm: '12px', md: '14px', lg: '18px' }[size];

  if (readOnly) {
    // 详情/卡片展示用：渲染 10 颗星（每颗对应 1 分），不再显示数字
    if (value == null || value === 0) {
      return (
        <span className="inline-flex items-center gap-[6px] text-[#A39D90]" style={{ fontSize: numSize }}>
          <span style={{ fontSize: starSize, color: '#E7E1D4', letterSpacing: '1px' }}>★★★★★★★★★★</span>
          <span>未评分</span>
        </span>
      );
    }
    const filled = Math.max(0, Math.min(10, Math.round(value)));
    return (
      <span className="inline-flex items-center" style={{ fontSize: starSize, letterSpacing: '1px', lineHeight: 1 }}>
        {Array.from({ length: 10 }, (_, i) => {
          const isOn = i < filled;
          return (
            <span
              key={i}
              style={{
                color: isOn ? 'var(--star)' : '#E7E1D4',
                transition: 'none',
              }}
            >
              ★
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-[4px]">
      <div className="inline-flex" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: 10 }, (_, i) => {
          const n = i + 1;
          const active = n <= display;
          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onClick={() => onChange?.(n)}
              className="transition-transform hover:scale-125"
              style={{
                fontSize: starSize,
                color: active ? 'var(--star)' : '#E7E1D4',
                lineHeight: 1,
                padding: '0 1px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ★
            </button>
          );
        })}
      </div>
      {value != null && value > 0 && (
        <span style={{ fontSize: numSize, color: 'var(--amber)', fontWeight: 600 }}>
          {value}<span className="text-[#A39D90] font-normal">/10</span>
        </span>
      )}
    </div>
  );
}
