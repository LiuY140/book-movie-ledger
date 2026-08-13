'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import TopBar from '@/components/TopBar';
import StatusBadge from '@/components/StatusBadge';
import StarRating from '@/components/StarRating';
import { useModal } from '@/components/ModalProvider';
import { getBookById, updateBook, deleteBook, updateBookStatus } from '@/lib/books';
import { getMovieById, updateMovie, deleteMovie, updateMovieStatus } from '@/lib/movies';
import { BOOK_STATUS_META, MOVIE_STATUS_META } from '@/types';
import { proxyCover } from '@/lib/cover';
import type { Book, Movie, BookStatus, MovieStatus } from '@/types';

export default function DetailPage() {
  const params = useParams<{ type: string; id: string }>();
  const { type, id } = params;
  const router = useRouter();
  const { openModal } = useModal();
  const isBook = type === 'book';

  const [item, setItem] = useState<Book | Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isBook) {
        const data = await getBookById(id);
        if (!data) { setError('未找到该条目'); return; }
        setItem(data);
        setNotes(data.notes || '');
      } else {
        const data = await getMovieById(id);
        if (!data) { setError('未找到该条目'); return; }
        setItem(data);
        setNotes(data.notes || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id, isBook]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  useEffect(() => {
    const handler = () => fetchItem();
    window.addEventListener('item-saved', handler);
    return () => window.removeEventListener('item-saved', handler);
  }, [fetchItem]);

  const handleStatusChange = async (newStatus: BookStatus | MovieStatus) => {
    if (!item) return;
    try {
      if (isBook) {
        await updateBookStatus(id, newStatus as BookStatus);
      } else {
        await updateMovieStatus(id, newStatus as MovieStatus);
      }
      setItem({ ...item, status: newStatus as any });
    } catch {
      setError('状态更新失败');
    }
  };

  const handleNotesSave = async () => {
    if (!item) return;
    setNotesSaving(true);
    try {
      if (isBook) {
        await updateBook(id, { notes });
      } else {
        await updateMovie(id, { notes });
      }
      setItem({ ...item, notes } as any);
    } catch {
      setError('笔记保存失败');
    } finally {
      setNotesSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (!confirm(`确认删除「${item.title}」？此操作不可撤销。`)) return;
    try {
      if (isBook) await deleteBook(id);
      else await deleteMovie(id);
      router.push(isBook ? '/books' : '/movies');
    } catch {
      setError('删除失败');
    }
  };

  if (loading) {
    return (
      <>
        <TopBar title="条目详情" showAddButton={false} />
        <div className="px-8 py-[22px]"><div className="card py-[60px] text-center text-[#A39D90]">加载中…</div></div>
      </>
    );
  }

  if (error && !item) {
    return (
      <>
        <TopBar title="条目详情" showAddButton={false} />
        <div className="px-8 py-[22px]">
          <div className="card py-[40px] px-5 text-center text-[#B05656]">
            <p>{error}</p>
            <Link href={isBook ? '/books' : '/movies'} className="btn btn-ghost mt-3 inline-flex">返回列表</Link>
          </div>
        </div>
      </>
    );
  }

  if (!item) return null;

  const statusMeta = isBook ? BOOK_STATUS_META : MOVIE_STATUS_META;
  const status = item.status as BookStatus | MovieStatus;
  const meta = (statusMeta as Record<string, { label: string }>)[status];
  const category = isBook ? (item as Book).category : (item as Movie).genre;

  // 元信息行
  const metaRows: { label: string; value: string | null }[] = isBook
    ? [
        { label: '作者', value: (item as Book).author },
        { label: '出版社', value: (item as Book).publisher },
        { label: '出版日期', value: (item as Book).pub_date },
        { label: '类型', value: (item as Book).category },
      ]
    : [
        { label: '导演', value: (item as Movie).director },
        { label: '主演', value: (item as Movie).actors },
        { label: '年份', value: (item as Movie).year ? String((item as Movie).year) : null },
        { label: '地区', value: (item as Movie).region },
        { label: '时长', value: (item as Movie).duration ? `${(item as Movie).duration} 分钟` : null },
        { label: '类型', value: (item as Movie).genre },
      ];

  // 时间线
  const timeline: { label: string; value: string | null }[] = isBook
    ? [
        { label: '添加时间', value: item.created_at },
        { label: '开始阅读', value: (item as Book).started_at },
        { label: '读完时间', value: (item as Book).finished_at },
      ]
    : [
        { label: '添加时间', value: item.created_at },
        { label: '观看时间', value: (item as Movie).watched_at },
      ];

  return (
    <>
      <TopBar title="条目详情" showAddButton={false} />
      <div className="px-8 py-[22px] pb-[60px]">
        {/* 返回 + 操作 */}
        <div className="flex items-center justify-between mb-[18px]">
          <Link
            href={isBook ? '/books' : '/movies'}
            className="inline-flex items-center gap-[6px] text-[#6F6A5E] text-[13px] px-[10px] py-[6px] rounded-[8px] transition-all hover:bg-[#E7EEE9] hover:text-[#2E5E4E]"
          >
            ← 返回{isBook ? '书籍库' : '影视库'}
          </Link>
          <div className="flex gap-[8px]">
            <button
              onClick={() => openModal(isBook ? 'books' : 'movies', item)}
              className="btn btn-ghost"
            >
              编辑
            </button>
            <button onClick={handleDelete} className="btn btn-danger-ghost">删除</button>
          </div>
        </div>

        <div className="grid grid-cols-[300px_1fr] gap-9 max-w-[980px]">
          {/* 封面区 */}
          <div>
            <div className="rounded-[18px] overflow-hidden sticky top-[100px]" style={{ boxShadow: 'var(--shadow-lift)' }}>
              {item.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={proxyCover(item.cover_url)} alt={item.title} className="w-full" style={{ aspectRatio: '2/3', objectFit: 'cover' }} />
              ) : (
                <div className="w-full flex items-center justify-center" style={{ aspectRatio: '2/3', background: 'var(--green)' }}>
                  <span className="font-serif text-[88px] font-bold text-white opacity-30">{isBook ? '书' : '影'}</span>
                </div>
              )}
            </div>
          </div>

          {/* 详情区 */}
          <div>
            {/* 标题 + 状态 */}
            <div className="flex items-start gap-[12px] mb-[6px]">
              <h1 className="font-serif text-[30px] font-bold tracking-[.5px] leading-[1.3] flex-1">
                {item.title}
              </h1>
            </div>
            <div className="flex items-center gap-[10px] mb-[18px]">
              <StatusBadge status={status} kind={isBook ? 'book' : 'movie'} onChange={handleStatusChange} size="md" />
              <span className="tag tag-type">{category}</span>
              {item.tags && item.tags.length > 0 && (
                item.tags.map((t) => <span key={t} className="tag" style={{ background: '#F6F3EE', color: 'var(--ink2)' }}>{t}</span>)
              )}
            </div>

            {/* 元信息 */}
            <div className="grid grid-cols-2 gap-x-[20px] gap-y-[10px] mb-[18px]">
              {metaRows.filter((r) => r.value).map((row) => (
                <div key={row.label} className="flex items-baseline gap-[8px]">
                  <span className="text-[12px] text-[#A39D90] flex-shrink-0">{row.label}</span>
                  <span className="text-[14px] text-[#2B2A26]">{row.value}</span>
                </div>
              ))}
            </div>

            {/* 评分区 */}
            <div className="flex gap-4 my-5 p-[18px] bg-[#FFFDF9] border border-[#EFEAE0] rounded-[18px]">
              <div className="flex-1">
                <div className="text-[12px] text-[#6F6A5E] mb-[8px]">我的评分</div>
                <StarRating value={item.rating} readOnly size="md" />
              </div>
              <div className="flex-1">
                <div className="text-[12px] text-[#6F6A5E] mb-[8px]">豆瓣参考</div>
                {item.douban_rating != null ? (
                  <div className="flex items-baseline gap-2">
                    <b className="font-serif text-[26px] font-bold" style={{ color: 'var(--green)' }}>
                      {item.douban_rating}
                    </b>
                    <span className="text-[12px] text-[#A39D90]">/ 10</span>
                  </div>
                ) : (
                  <span className="text-[#A39D90]" style={{ fontSize: '14px' }}>— 未记录</span>
                )}
              </div>
            </div>

            {/* 短评 */}
            {item.comment && (
              <div className="p-[16px] my-4 bg-[#F7EDE0] border-l-4 border-[#C07A2E] rounded-r-[12px]">
                <div className="text-[12px] text-[#9C5F22] font-semibold mb-[4px]">短评</div>
                <p className="text-[13.5px] leading-[1.8] text-[#2B2A26]">{item.comment}</p>
              </div>
            )}

            {/* 笔记 */}
            <div className="p-[18px] my-4 bg-[#FFFDF9] border-l-4 border-[#C07A2E] rounded-r-[18px]">
              <div className="flex items-center justify-between mb-[6px]">
                <b className="font-serif text-[14px]">我的笔记</b>
                <button
                  onClick={handleNotesSave}
                  disabled={notesSaving}
                  className="text-[12px] text-[#2E5E4E] hover:underline disabled:opacity-50"
                >
                  {notesSaving ? '保存中…' : '保存'}
                </button>
              </div>
              <textarea
                className="w-full border-none bg-transparent resize-vertical min-h-[90px] text-[13.5px] leading-[1.8] outline-none"
                placeholder="写点什么，让这本账本会生长…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* 时间线 */}
            <div className="p-[16px] my-4 bg-[#F6F3EE] rounded-[12px]">
              <div className="text-[12px] text-[#6F6A5E] font-semibold mb-[8px]">时间线</div>
              <div className="space-y-[4px]">
                {timeline.map((t) => (
                  <div key={t.label} className="flex items-center gap-[10px] text-[12.5px]">
                    <span className="text-[#A39D90] w-[70px]">{t.label}</span>
                    <span className="text-[#2B2A26]">{t.value ? new Date(t.value).toLocaleString('zh-CN') : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
