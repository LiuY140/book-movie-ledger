'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/TopBar';
import ItemCard from '@/components/ItemCard';
import { getAllMovies, getMovieGenres, updateMovieStatus, deleteMovie } from '@/lib/movies';
import type { Movie, MovieStatus, BookStatus } from '@/types';

const STATUS_FILTERS: { value: MovieStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'want', label: '想看' },
  { value: 'watching', label: '在看' },
  { value: 'done', label: '看完' },
  { value: 'dropped', label: '放弃' },
];

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<MovieStatus | 'all'>('all');
  const [genreFilter, setGenreFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'added' | 'rating' | 'title' | 'watched'>('added');
  const [genres, setGenres] = useState<string[]>([]);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllMovies({
        status: statusFilter,
        genre: genreFilter,
        search,
        sort,
      });
      setMovies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, genreFilter, search, sort]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  useEffect(() => {
    const handler = () => fetchMovies();
    window.addEventListener('item-saved', handler);
    return () => window.removeEventListener('item-saved', handler);
  }, [fetchMovies]);

  useEffect(() => {
    async function loadGenres() {
      try {
        const gs = await getMovieGenres();
        setGenres(gs);
      } catch { /* ignore */ }
    }
    loadGenres();
  }, [movies]);

  const handleStatusChange = async (id: string, status: BookStatus | MovieStatus) => {
    try {
      await updateMovieStatus(id, status as MovieStatus);
      setMovies((prev) => prev.map((m) => m.id === id ? { ...m, status: status as MovieStatus } : m));
    } catch {
      setError('状态更新失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMovie(id);
      setMovies((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setError('删除失败');
    }
  };

  return (
    <>
      <TopBar title="影视库" subtitle={`共 ${movies.length} 部`} addKind="movies" />
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
            <select className="input" style={{ width: '112px' }} value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)}>
              <option value="all">全部类型</option>
              {genres.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <input
              className="input"
              style={{ width: '210px' }}
              placeholder="搜索标题 / 导演…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="input" style={{ width: '116px' }} value={sort} onChange={(e) => setSort(e.target.value as any)}>
              <option value="added">最近添加</option>
              <option value="rating">评分最高</option>
              <option value="title">标题排序</option>
              <option value="watched">最近看完</option>
            </select>
          </div>
        </div>

        {/* 内容区 */}
        {loading ? (
          <div className="card py-[60px] text-center text-[#A39D90]">加载中…</div>
        ) : error ? (
          <div className="card py-[40px] px-5 text-center text-[#B05656]">
            <p>{error}</p>
            <button onClick={fetchMovies} className="btn btn-ghost mt-3">重试</button>
          </div>
        ) : movies.length === 0 ? (
          <div className="card py-[60px] px-5 text-center text-[#A39D90]">
            <div className="text-[34px] mb-[10px]">📭</div>
            <h3 className="font-serif text-[#6F6A5E] text-[16px] mb-1">这里空空如也</h3>
            <p className="text-[13px]">还没有录入任何影视，点击右上角 + 开始吧。</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-fade-up">
            {movies.map((movie) => (
              <ItemCard
                key={movie.id}
                item={movie}
                kind="movie"
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
