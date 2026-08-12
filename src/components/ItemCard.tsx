'use client';

import Link from 'next/link';
import { useState } from 'react';
import StatusBadge from './StatusBadge';
import { BOOK_STATUS_META, MOVIE_STATUS_META } from '@/types';
import type { Book, Movie, BookStatus, MovieStatus } from '@/types';
import { proxyCover } from '@/lib/cover';

interface ItemCardProps {
  item: Book | Movie;
  kind: 'book' | 'movie';
  onStatusChange?: (id: string, status: BookStatus | MovieStatus) => void;
  onDelete?: (id: string) => void;
}

export default function ItemCard({ item, kind, onStatusChange, onDelete }: ItemCardProps) {
  const [imgError, setImgError] = useState(false);
  const isBook = kind === 'book';
  const book = isBook ? (item as Book) : null;
  const movie = !isBook ? (item as Movie) : null;

  const statusMeta = isBook ? BOOK_STATUS_META : MOVIE_STATUS_META;
  const status = item.status as BookStatus | MovieStatus;
  const meta = (statusMeta as Record<string, { label: string }>)[status];
  const category = isBook ? book!.category : movie!.genre;
  const subText = isBook
    ? [book!.author, book!.publisher].filter(Boolean).join(' · ')
    : [movie!.director, movie!.year ? `${movie!.year}` : ''].filter(Boolean).join(' · ');

  const detailHref = `/detail/${kind}/${item.id}`;

  return (
    <div className="card group relative overflow-hidden transition-all duration-200 hover:shadow-[0_2px_6px_rgba(43,42,38,.06),0_18px_44px_-16px_rgba(43,42,38,.22)]">
      {/* 封面 */}
      <Link href={detailHref} className="block relative" style={{ aspectRatio: '2/3', background: 'var(--green-soft)' }}>
        {item.cover_url && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxyCover(item.cover_url)}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--green-soft) 0%, #DCE5DE 100%)' }}>
            <div className="font-serif text-[36px] font-bold" style={{ color: 'var(--green)', opacity: 0.3 }}>
              {isBook ? '书' : '影'}
            </div>
          </div>
        )}
        {/* 状态浮层 */}
        <div className="absolute top-[8px] left-[8px]">
          {onStatusChange ? (
            <StatusBadge status={status} kind={kind} onChange={(s) => onStatusChange(item.id, s)} />
          ) : (
            <span className={`tag ${isBook ? BOOK_STATUS_META[status as BookStatus].tagClass : MOVIE_STATUS_META[status as MovieStatus].tagClass}`}>
              {meta.label}
            </span>
          )}
        </div>
        {/* 删除按钮（垃圾桶图标） */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm(`确认删除「${item.title}」？此操作不可撤销。`)) onDelete(item.id);
            }}
            className="absolute top-[8px] right-[8px] w-[28px] h-[28px] rounded-full bg-white/90 text-[#B05656] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110"
            title="删除"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        )}
      </Link>

      {/* 信息区 */}
      <div className="p-[12px]">
        <Link href={detailHref} className="block">
          <h4 className="font-medium text-[14px] text-[#2B2A26] truncate transition-colors hover:text-[#2E5E4E]" title={item.title}>
            {item.title}
          </h4>
        </Link>
        {subText && (
          <p className="text-[11.5px] text-[#A39D90] mt-[3px] truncate">{subText}</p>
        )}
        <div className="flex items-center justify-between mt-[8px]">
          <span className="tag tag-type" style={{ fontSize: '10px' }}>{category}</span>
          {item.douban_rating != null ? (
            <span className="inline-flex items-baseline gap-[2px] text-[12px]">
              <span style={{ color: 'var(--star)' }}>★</span>
              <b style={{ color: 'var(--ink)' }}>{Number(item.douban_rating).toFixed(1)}</b>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
