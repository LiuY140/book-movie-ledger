'use client';

import { useState, useEffect, useRef } from 'react';
import { useModal } from './ModalProvider';

interface TopBarProps {
  title: string;
  subtitle?: string;
  showAddButton?: boolean;
  /** 在列表页可以预选 kind，但用户仍可切换 */
  addKind?: 'books' | 'movies';
}

export default function TopBar({ title, subtitle, showAddButton = true, addKind }: TopBarProps) {
  const { openModal } = useModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handlePick = (kind: 'books' | 'movies') => {
    setMenuOpen(false);
    openModal(kind);
  };

  return (
    <header
      className="flex items-center gap-4 px-8 py-5 pb-[14px] sticky top-0 z-20"
      style={{ background: 'var(--paper)', borderBottom: '1px solid transparent' }}
    >
      <div className="font-serif text-[22px] font-bold tracking-[.3px]">
        {title}
        {subtitle && (
          <small className="font-sans text-[12px] text-[#A39D90] font-normal ml-[10px]">
            {subtitle}
          </small>
        )}
      </div>
      <div className="flex-1" />
      {showAddButton && (
        <>
          <span className="text-[11px] text-[#A39D90] bg-[#FFFDF9] border border-[#E7E1D4] rounded-[6px] px-[8px] py-[3px]">
            快捷键 <b>N</b> 新增录入
          </span>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-[38px] h-[38px] rounded-full bg-[#C07A2E] text-white text-[20px] flex items-center justify-center transition-all hover:scale-105"
              style={{ boxShadow: '0 4px 14px rgba(192,122,46,.35)' }}
              title="新增录入 (N)"
            >
              +
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-[44px] bg-[#FFFDF9] rounded-[12px] shadow-[0_10px_30px_rgba(43,42,38,.18)] border border-[#EFEAE0] py-[6px] min-w-[140px] z-30 animate-fade-up"
              >
                <button
                  onClick={() => handlePick('books')}
                  className="flex items-center gap-[10px] w-full px-[14px] py-[9px] text-left text-[13.5px] text-[#2B2A26] hover:bg-[#F6F3EE] transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E5E4E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  录入书籍
                </button>
                <button
                  onClick={() => handlePick('movies')}
                  className="flex items-center gap-[10px] w-full px-[14px] py-[9px] text-left text-[13.5px] text-[#2B2A26] hover:bg-[#F6F3EE] transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C07A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5" />
                  </svg>
                  录入影视
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
}
