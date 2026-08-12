'use client';

import { useState, useRef, useEffect } from 'react';
import { BOOK_STATUS_META, MOVIE_STATUS_META } from '@/types';
import type { BookStatus, MovieStatus } from '@/types';

interface StatusBadgeProps {
  status: BookStatus | MovieStatus;
  kind: 'book' | 'movie';
  onChange?: (status: BookStatus | MovieStatus) => void;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, kind, onChange, size = 'sm' }: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const meta = kind === 'book' ? BOOK_STATUS_META : MOVIE_STATUS_META;
  const statuses = kind === 'book'
    ? (['want', 'reading', 'done', 'dropped'] as BookStatus[])
    : (['want', 'watching', 'done', 'dropped'] as MovieStatus[]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = (meta as Record<string, { label: string; tagClass: string }>)[status];
  const fontSize = size === 'md' ? '13px' : '11px';

  if (!onChange) {
    return <span className={`tag ${current.tagClass}`} style={{ fontSize }}>{current.label}</span>;
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(!open); }}
        className={`tag ${current.tagClass} cursor-pointer transition-all hover:opacity-80`}
        style={{ fontSize }}
      >
        {current.label}
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.6 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute z-50 top-[calc(100%+4px)] left-0 bg-white border border-[#E7E1D4] rounded-[10px] shadow-[0_8px_24px_rgba(43,42,38,.14)] py-[4px] min-w-[92px] animate-fade-up"
          onClick={(e) => e.stopPropagation()}
        >
          {statuses.map((s) => {
            const m = (meta as Record<string, { label: string; tagClass: string }>)[s];
            return (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onChange(s);
                  setOpen(false);
                }}
                className="flex items-center gap-[8px] w-full px-[12px] py-[7px] text-left transition-all hover:bg-[#F6F3EE]"
                style={{ fontSize: '12.5px', color: s === status ? 'var(--ink)' : 'var(--ink2)' }}
              >
                <span className={`tag ${m.tagClass}`} style={{ fontSize: '10px' }}>{m.label}</span>
                {s === status && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
