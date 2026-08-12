import { supabase } from './supabase';
import type { BookStatus, MovieStatus } from '@/types';

// ---- 仪表盘摘要 ----
export interface DashboardSummary {
  totalBooks: number;
  totalMovies: number;
  booksByStatus: Record<string, number>;
  moviesByStatus: Record<string, number>;
  yearDoneBooks: number;
  yearDoneMovies: number;
  booksGoal: number;
  moviesGoal: number;
  recentItems: { id: string; title: string; kind: 'book' | 'movie'; status: string; cover_url: string | null; created_at: string }[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01T00:00:00+08:00`;
  const yearEnd = `${currentYear}-12-31T23:59:59+08:00`;

  // 并行查询
  const [booksRes, moviesRes, yearBooksRes, yearMoviesRes, goalsRes, recentBooksRes, recentMoviesRes] = await Promise.all([
    supabase.from('books').select('status'),
    supabase.from('movies').select('status'),
    supabase.from('books').select('id').eq('status', 'done').gte('finished_at', yearStart).lte('finished_at', yearEnd),
    supabase.from('movies').select('id').eq('status', 'done').gte('watched_at', yearStart).lte('watched_at', yearEnd),
    supabase.from('yearly_goals').select('*').eq('year', currentYear).single(),
    supabase.from('books').select('id,title,status,cover_url,created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('movies').select('id,title,status,cover_url,created_at').order('created_at', { ascending: false }).limit(5),
  ]);

  // 统计状态分布
  const booksByStatus: Record<string, number> = { want: 0, reading: 0, done: 0, dropped: 0 };
  (booksRes.data || []).forEach((b: { status: BookStatus }) => { booksByStatus[b.status] = (booksByStatus[b.status] || 0) + 1; });

  const moviesByStatus: Record<string, number> = { want: 0, watching: 0, done: 0, dropped: 0 };
  (moviesRes.data || []).forEach((m: { status: MovieStatus }) => { moviesByStatus[m.status] = (moviesByStatus[m.status] || 0) + 1; });

  // 合并最近添加
  const recentItems = [
    ...(recentBooksRes.data || []).map((b: any) => ({ ...b, kind: 'book' as const })),
    ...(recentMoviesRes.data || []).map((m: any) => ({ ...m, kind: 'movie' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);

  return {
    totalBooks: booksRes.data?.length || 0,
    totalMovies: moviesRes.data?.length || 0,
    booksByStatus,
    moviesByStatus,
    yearDoneBooks: yearBooksRes.data?.length || 0,
    yearDoneMovies: yearMoviesRes.data?.length || 0,
    booksGoal: goalsRes.data?.books_goal || 0,
    moviesGoal: goalsRes.data?.movies_goal || 0,
    recentItems,
  };
}

// ---- 统计页详细数据 ----
export interface StatsDetail {
  ratingDist: number[];          // [0-10] 长度 11
  categoryDist: Record<string, number>;
  monthlyTrend: { month: string; books: number; movies: number }[];
  topRated: { id: string; title: string; rating: number; kind: 'book' | 'movie' }[];
  totalBooks: number;
  totalMovies: number;
  yearDoneBooks: number;
  yearDoneMovies: number;
  booksGoal: number;
  moviesGoal: number;
  // 原始数据，供客户端按视角过滤
  booksRaw: { id: string; title: string; rating: number | null; category: string | null; finished_at: string | null; status: string; kind: 'book' }[];
  moviesRaw: { id: string; title: string; rating: number | null; genre: string | null; watched_at: string | null; status: string; kind: 'movie' }[];
}

export async function getStatsDetail(): Promise<StatsDetail> {
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01T00:00:00+08:00`;
  const yearEnd = `${currentYear}-12-31T23:59:59+08:00`;

  const [booksRes, moviesRes, goalsRes] = await Promise.all([
    supabase.from('books').select('id,title,rating,category,finished_at,status'),
    supabase.from('movies').select('id,title,rating,genre,watched_at,status'),
    supabase.from('yearly_goals').select('*').eq('year', currentYear).single(),
  ]);

  const books = booksRes.data || [];
  const movies = moviesRes.data || [];

  // 评分分布
  const ratingDist = new Array(11).fill(0);
  [...books, ...movies].forEach((item: any) => {
    if (item.rating != null && item.rating >= 0 && item.rating <= 10) {
      ratingDist[item.rating]++;
    }
  });

  // 类型分布
  const categoryDist: Record<string, number> = {};
  books.forEach((b: any) => { categoryDist[b.category] = (categoryDist[b.category] || 0) + 1; });
  movies.forEach((m: any) => { categoryDist[m.genre] = (categoryDist[m.genre] || 0) + 1; });

  // 月度趋势（近12个月）
  const monthlyTrend: { month: string; books: number; movies: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${d.getMonth() + 1}月`;
    monthlyTrend.push({ month: label, books: 0, movies: 0 });
  }
  const monthIndex = (dateStr: string | null) => {
    if (!dateStr) return -1;
    const d = new Date(dateStr);
    const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    return 11 - diff;
  };
  books.forEach((b: any) => {
    if (b.status === 'done' && b.finished_at) {
      const idx = monthIndex(b.finished_at);
      if (idx >= 0 && idx < 12) monthlyTrend[idx].books++;
    }
  });
  movies.forEach((m: any) => {
    if (m.status === 'done' && m.watched_at) {
      const idx = monthIndex(m.watched_at);
      if (idx >= 0 && idx < 12) monthlyTrend[idx].movies++;
    }
  });

  // 最高评分
  const topRated = [
    ...books.map((b: any) => ({ id: b.id, title: b.title, rating: b.rating, kind: 'book' as const })),
    ...movies.map((m: any) => ({ id: m.id, title: m.title, rating: m.rating, kind: 'movie' as const })),
  ]
    .filter((x) => x.rating != null && x.rating > 0)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 10);

  // 年度完成
  const yearDoneBooks = books.filter((b: any) =>
    b.status === 'done' && b.finished_at &&
    new Date(b.finished_at) >= new Date(yearStart) && new Date(b.finished_at) <= new Date(yearEnd)
  ).length;
  const yearDoneMovies = movies.filter((m: any) =>
    m.status === 'done' && m.watched_at &&
    new Date(m.watched_at) >= new Date(yearStart) && new Date(m.watched_at) <= new Date(yearEnd)
  ).length;

  return {
    ratingDist,
    categoryDist,
    monthlyTrend,
    topRated,
    totalBooks: books.length,
    totalMovies: movies.length,
    yearDoneBooks,
    yearDoneMovies,
    booksGoal: goalsRes.data?.books_goal || 0,
    moviesGoal: goalsRes.data?.movies_goal || 0,
    booksRaw: books.map((b: any) => ({ ...b, kind: 'book' as const })),
    moviesRaw: movies.map((m: any) => ({ ...m, kind: 'movie' as const })),
  };
}
