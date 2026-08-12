import { supabase } from './supabase';
import { pinyin } from 'pinyin-pro';
import type { Movie, MovieInput, MovieStatus } from '@/types';

// ---- 中文拼音排序辅助 ----
function pinyinSortKey(str: string): string {
  return pinyin(str, { toneType: 'none', type: 'array' })
    .map((s: string) => s.toLowerCase())
    .join('');
}

// ---- 查询参数 ----
export interface MovieQuery {
  status?: MovieStatus | 'all';
  genre?: string;
  search?: string;
  sort?: 'added' | 'rating' | 'title' | 'watched';
}

// ---- 获取所有影视 ----
export async function getAllMovies(query: MovieQuery = {}): Promise<Movie[]> {
  let q = supabase.from('movies').select('*');

  if (query.status && query.status !== 'all') {
    q = q.eq('status', query.status);
  }

  if (query.genre && query.genre !== 'all') {
    q = q.eq('genre', query.genre);
  }

  if (query.search && query.search.trim()) {
    q = q.or(`title.ilike.%${query.search.trim()}%,director.ilike.%${query.search.trim()}%`);
  }

  // 排序（title 走客户端拼音排序，其余走数据库 ORDER BY）
  const needPinyinSort = query.sort === 'title';
  if (!needPinyinSort) {
    switch (query.sort) {
      case 'rating':
        q = q.order('rating', { ascending: false, nullsFirst: false });
        break;
      case 'watched':
        q = q.order('watched_at', { ascending: false, nullsFirst: false });
        break;
      default:
        q = q.order('created_at', { ascending: false });
    }
  }

  const { data, error } = await q;
  if (error) throw error;
  const result = (data || []) as Movie[];

  // 客户端拼音排序
  if (needPinyinSort) {
    result.sort((a, b) => {
      const ka = pinyinSortKey(a.title);
      const kb = pinyinSortKey(b.title);
      return ka.localeCompare(kb);
    });
  }

  return result;
}

// ---- 获取单部影视 ----
export async function getMovieById(id: string): Promise<Movie | null> {
  const { data, error } = await supabase.from('movies').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Movie;
}

// ---- 创建影视 ----
export async function createMovie(input: MovieInput): Promise<Movie> {
  const { data, error } = await supabase
    .from('movies')
    .insert({
      title: input.title,
      director: input.director || null,
      actors: input.actors || null,
      year: input.year || null,
      region: input.region || null,
      duration: input.duration || null,
      genre: input.genre || '未分类',
      cover_url: input.cover_url || null,
      tags: input.tags || [],
      status: input.status || 'want',
      rating: input.rating ?? null,
      douban_rating: input.douban_rating ?? null,
      comment: input.comment || null,
      notes: input.notes || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Movie;
}

// ---- 更新影视 ----
export async function updateMovie(id: string, input: Partial<MovieInput>): Promise<Movie> {
  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.director !== undefined) updateData.director = input.director || null;
  if (input.actors !== undefined) updateData.actors = input.actors || null;
  if (input.year !== undefined) updateData.year = input.year || null;
  if (input.region !== undefined) updateData.region = input.region || null;
  if (input.duration !== undefined) updateData.duration = input.duration || null;
  if (input.genre !== undefined) updateData.genre = input.genre || '未分类';
  if (input.cover_url !== undefined) updateData.cover_url = input.cover_url || null;
  if (input.tags !== undefined) updateData.tags = input.tags || [];
  if (input.status !== undefined) updateData.status = input.status;
  if (input.rating !== undefined) updateData.rating = input.rating;
  if (input.douban_rating !== undefined) updateData.douban_rating = input.douban_rating;
  if (input.comment !== undefined) updateData.comment = input.comment || null;
  if (input.notes !== undefined) updateData.notes = input.notes || null;

  const { data, error } = await supabase
    .from('movies')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Movie;
}

// ---- 更新状态 ----
export async function updateMovieStatus(id: string, status: MovieStatus): Promise<void> {
  const { error } = await supabase.from('movies').update({ status }).eq('id', id);
  if (error) throw error;
}

// ---- 删除影视 ----
export async function deleteMovie(id: string): Promise<void> {
  const { error } = await supabase.from('movies').delete().eq('id', id);
  if (error) throw error;
}

// ---- 获取所有类型 ----
export async function getMovieGenres(): Promise<string[]> {
  const { data, error } = await supabase.from('movies').select('genre');
  if (error) throw error;
  const genres = new Set<string>();
  (data || []).forEach((row: { genre: string }) => genres.add(row.genre));
  return Array.from(genres).sort();
}
