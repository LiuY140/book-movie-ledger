'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: '仪表盘',
    href: '/',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'books',
    label: '书籍库',
    href: '/books',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: 'movies',
    label: '影视库',
    href: '/movies',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5" />
      </svg>
    ),
  },
  {
    id: 'stats',
    label: '统计',
    href: '/stats',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-[18px] h-[18px]">
        <path d="M3 3v18h18" />
        <path d="M8 17v-6M13 17V7M18 17v-9" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="flex flex-col sticky top-0 h-screen"
      style={{
        width: 'var(--sidebar-w)',
        flex: '0 0 var(--sidebar-w)',
        background: 'linear-gradient(180deg, #23493C 0%, #1C3A2F 100%)',
        color: '#E8EFE9',
        padding: '22px 14px',
      }}
    >
      {/* 品牌 */}
      <div className="flex items-center gap-[10px] px-[8px] pb-[20px]">
        <div
          className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center"
          style={{ background: '#C07A2E', boxShadow: '0 4px 12px rgba(192,122,46,.35)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-6 6v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9a6 6 0 0 0-6-6z" />
            <path d="M12 3v6" />
          </svg>
        </div>
        <div>
          <div className="font-serif text-[17px] font-bold tracking-[.5px]">书影账本</div>
          <div className="text-[10px] tracking-[2px] mt-[-2px]" style={{ color: '#AFC0B6' }}>
            LAMP &amp; LEDGER
          </div>
        </div>
      </div>

      {/* 导航 */}
      <nav className="flex flex-col gap-[2px] flex-1 mt-[6px]">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center gap-[11px] px-[12px] py-[9px] rounded-[10px] text-[13.5px] transition-all no-underline ${
              isActive(item.href)
                ? 'bg-white/14 text-white font-semibold'
                : 'text-[#C7D6CD] hover:bg-white/7 hover:text-white'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* 底部 */}
      <div className="border-t border-white/10 pt-[12px] mt-[12px]">
        <Link
          href="/settings"
          className={`flex items-center gap-[11px] px-[12px] py-[9px] rounded-[10px] text-[12.5px] transition-all no-underline ${
            isActive('/settings')
              ? 'bg-white/14 text-white'
              : 'text-[#C7D6CD] hover:bg-white/7 hover:text-white'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-[18px] h-[18px]">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          设置
        </Link>
        <Link
          href="/settings#export"
          className="flex items-center gap-[11px] px-[12px] py-[9px] rounded-[10px] text-[12.5px] transition-all no-underline text-[#C7D6CD] hover:bg-white/7 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
          数据导出
        </Link>
      </div>
    </aside>
  );
}
