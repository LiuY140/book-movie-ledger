'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/TopBar';
import ItemCard from '@/components/ItemCard';
import { getAllBooks, getBookCategories, updateBookStatus, deleteBook } from '@/lib/books';
import type { Book, BookStatus, MovieStatus } from '@/types';

const STATUS_FILTERS: { value: BookStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'want', label: '想读' },
  { value: 'reading', label: '在读' },
  { value: 'done', label: '读完' },
  { value: 'dropped', label: '放弃' },
];

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'added' | 'rating' | 'title' | 'finished'>('added');
  const [categories, setCategories] = useState<string[]>([]);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllBooks({
        status: statusFilter,
        category: categoryFilter,
        search,
        sort,
      });
      setBooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, search, sort]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // 监听录入弹窗保存事件
  useEffect(() => {
    const handler = () => fetchBooks();
    window.addEventListener('item-saved', handler);
    return () => window.removeEventListener('item-saved', handler);
  }, [fetchBooks]);

  // 加载分类
  useEffect(() => {
    async function loadCats() {
      try {
        const cats = await getBookCategories();
        setCategories(cats);
      } catch { /* ignore */ }
    }
    loadCats();
  }, [books]);

  const handleStatusChange = async (id: string, status: BookStatus | MovieStatus) => {
    try {
      await updateBookStatus(id, status as BookStatus);
      setBooks((prev) => prev.map((b) => b.id === id ? { ...b, status: status as BookStatus } : b));
    } catch (err) {
      setError('状态更新失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBook(id);
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError('删除失败');
    }
  };

  return (
    <>
      <TopBar title="书籍库" subtitle={`共 ${books.length} 本`} addKind="books" />
      <div className="px-8 py-[22px] pb-[60px]">
        {/* 筛选栏 */}
        <div className="flex flex-wrap gap-[10px] items-center mb-5">
          <div className="flex gap-[6px] flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`pill ${statusFilter === f.value ? 'active' : ''}`}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-[10px] items-center">
            <select className="input" style={{ width: '112px' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">全部类型</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              className="input"
              style={{ width: '210px' }}
              placeholder="搜索标题 / 作者…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="input" style={{ width: '116px' }} value={sort} onChange={(e) => setSort(e.target.value as any)}>
              <option value="added">最近添加</option>
              <option value="rating">评分最高</option>
              <option value="title">标题排序</option>
              <option value="finished">最近读完</option>
            </select>
          </div>
        </div>

        {/* 内容区 */}
        {loading ? (
          <div className="card py-[60px] text-center text-[#A39D90]">加载中…</div>
        ) : error ? (
          <div className="card py-[40px] px-5 text-center text-[#B05656]">
            <p>{error}</p>
            <button onClick={fetchBooks} className="btn btn-ghost mt-3">重试</button>
          </div>
        ) : books.length === 0 ? (
          <div className="card py-[60px] px-5 text-center text-[#A39D90]">
            <div className="text-[34px] mb-[10px]">📭</div>
            <h3 className="font-serif text-[#6F6A5E] text-[16px] mb-1">这里空空如也</h3>
            <p className="text-[13px]">还没有录入任何书籍，点击右上角 + 开始吧。</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-fade-up">
            {books.map((book) => (
              <ItemCard
                key={book.id}
                item={book}
                kind="book"
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
