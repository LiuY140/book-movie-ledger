import { supabase } from './supabase';
import { pinyin } from 'pinyin-pro';
import type { Book, BookInput, BookStatus } from '@/types';

// ---- 中文拼音排序辅助 ----
function pinyinSortKey(str: string): string {
  // 将中文字符转为无声调拼音，非中文字符保留原样，统一小写用于排序
  return pinyin(str, { toneType: 'none', type: 'array' })
    .map((s: string) => s.toLowerCase())
    .join('');
}

// ---- 查询参数 ----
export interface BookQuery {
  status?: BookStatus | 'all';
  category?: string;
  search?: string;
  sort?: 'added' | 'rating' | 'title' | 'finished';
}

// ---- 获取所有书籍 ----
export async function getAllBooks(query: BookQuery = {}): Promise<Book[]> {
  let q = supabase.from('books').select('*');

  // 状态筛选
  if (query.status && query.status !== 'all') {
    q = q.eq('status', query.status);
  }

  // 类型筛选
  if (query.category && query.category !== 'all') {
    q = q.eq('category', query.category);
  }

  // 搜索
  if (query.search && query.search.trim()) {
    q = q.or(`title.ilike.%${query.search.trim()}%,author.ilike.%${query.search.trim()}%`);
  }

  // 排序（title 走客户端拼音排序，其余走数据库 ORDER BY）
  const needPinyinSort = query.sort === 'title';
  if (!needPinyinSort) {
    switch (query.sort) {
      case 'rating':
        q = q.order('rating', { ascending: false, nullsFirst: false });
        break;
      case 'finished':
        q = q.order('finished_at', { ascending: false, nullsFirst: false });
        break;
      default:
        q = q.order('created_at', { ascending: false });
    }
  }

  const { data, error } = await q;
  if (error) throw error;
  const result = (data || []) as Book[];

  // 客户端拼音排序（解决中文标题按 Unicode 码点而非拼音排序的问题）
  if (needPinyinSort) {
    result.sort((a, b) => {
      const ka = pinyinSortKey(a.title);
      const kb = pinyinSortKey(b.title);
      return ka.localeCompare(kb);
    });
  }

  return result;
}

// ---- 获取单本书 ----
export async function getBookById(id: string): Promise<Book | null> {
  const { data, error } = await supabase.from('books').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Book;
}

// ---- 创建书籍 ----
export async function createBook(input: BookInput): Promise<Book> {
  const { data, error } = await supabase
    .from('books')
    .insert({
      title: input.title,
      author: input.author || null,
      publisher: input.publisher || null,
      pub_date: input.pub_date || null,
      cover_url: input.cover_url || null,
      category: input.category || '未分类',
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
  return data as Book;
}

// ---- 更新书籍 ----
export async function updateBook(id: string, input: Partial<BookInput>): Promise<Book> {
  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.author !== undefined) updateData.author = input.author || null;
  if (input.publisher !== undefined) updateData.publisher = input.publisher || null;
  if (input.pub_date !== undefined) updateData.pub_date = input.pub_date || null;
  if (input.cover_url !== undefined) updateData.cover_url = input.cover_url || null;
  if (input.category !== undefined) updateData.category = input.category || '未分类';
  if (input.tags !== undefined) updateData.tags = input.tags || [];
  if (input.status !== undefined) updateData.status = input.status;
  if (input.rating !== undefined) updateData.rating = input.rating;
  if (input.douban_rating !== undefined) updateData.douban_rating = input.douban_rating;
  if (input.comment !== undefined) updateData.comment = input.comment || null;
  if (input.notes !== undefined) updateData.notes = input.notes || null;

  const { data, error } = await supabase
    .from('books')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Book;
}

// ---- 更新状态 ----
export async function updateBookStatus(id: string, status: BookStatus): Promise<void> {
  const { error } = await supabase.from('books').update({ status }).eq('id', id);
  if (error) throw error;
}

// ---- 删除书籍 ----
export async function deleteBook(id: string): Promise<void> {
  const { error } = await supabase.from('books').delete().eq('id', id);
  if (error) throw error;
}

// ---- 获取所有分类 ----
export async function getBookCategories(): Promise<string[]> {
  const { data, error } = await supabase.from('books').select('category');
  if (error) throw error;
  const cats = new Set<string>();
  (data || []).forEach((row: { category: string }) => cats.add(row.category));
  return Array.from(cats).sort();
}
