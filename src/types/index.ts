// ============================================================
// 类型定义 — 个人书影管理平台
// ============================================================

// ---- 书籍 ----

export type BookStatus = 'want' | 'reading' | 'done' | 'dropped';

export interface Book {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  pub_date: string | null;
  cover_url: string | null;
  category: string;
  tags: string[];
  status: BookStatus;
  rating: number | null;       // 0-10 整数
  douban_rating: number | null; // float
  comment: string | null;
  notes: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookInput {
  title: string;
  author?: string;
  publisher?: string;
  pub_date?: string;
  cover_url?: string;
  category?: string;
  tags?: string[];
  status?: BookStatus;
  rating?: number | null;
  douban_rating?: number | null;
  comment?: string;
  notes?: string;
}

// ---- 影视 ----

export type MovieStatus = 'want' | 'watching' | 'done' | 'dropped';

export interface Movie {
  id: string;
  title: string;
  director: string | null;
  actors: string | null;
  year: number | null;
  region: string | null;
  duration: number | null;
  genre: string;
  cover_url: string | null;
  tags: string[];
  status: MovieStatus;
  rating: number | null;
  douban_rating: number | null;
  comment: string | null;
  notes: string | null;
  watched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MovieInput {
  title: string;
  director?: string;
  actors?: string;
  year?: number;
  region?: string;
  duration?: number;
  genre?: string;
  cover_url?: string;
  tags?: string[];
  status?: MovieStatus;
  rating?: number | null;
  douban_rating?: number | null;
  comment?: string;
  notes?: string;
}

// ---- 年度目标 ----

export interface YearlyGoal {
  id: string;
  year: number;
  books_goal: number;
  movies_goal: number;
  created_at: string;
  updated_at: string;
}

// ---- 设置 ----

export interface Settings {
  id: string;
  book_categories: string[];
  movie_categories: string[];
  default_view: string;
  updated_at: string;
}

// ---- 状态元数据 ----

export const BOOK_STATUS_META: Record<BookStatus, { label: string; tagClass: string }> = {
  want:    { label: '想读', tagClass: 'tag-want' },
  reading: { label: '在读', tagClass: 'tag-doing' },
  done:    { label: '读完', tagClass: 'tag-done' },
  dropped: { label: '放弃', tagClass: 'tag-give' },
};

export const MOVIE_STATUS_META: Record<MovieStatus, { label: string; tagClass: string }> = {
  want:     { label: '想看', tagClass: 'tag-want' },
  watching: { label: '在看', tagClass: 'tag-doing' },
  done:     { label: '看完', tagClass: 'tag-done' },
  dropped:  { label: '放弃', tagClass: 'tag-give' },
};

// ---- 自动补全搜索结果 ----

export interface BookSearchResult {
  title: string;
  author: string;
  publisher: string;
  pub_date: string;
  cover_url: string;
  category: string;
  description: string;
  douban_id?: string;       // 豆瓣条目 ID，用于后续抓取评分
  douban_rating?: number;   // 豆瓣评分（选中后异步补全）
}

export interface MovieSearchResult {
  title: string;
  original_title: string;
  director: string;
  actors: string;
  year: number;
  region: string;
  duration: number;
  genre: string;
  cover_url: string;
  overview: string;
  douban_id?: string;
  douban_rating?: number;
}

// ---- 统计 ----

export interface StatsSummary {
  totalBooks: number;
  totalMovies: number;
  booksByStatus: Record<BookStatus, number>;
  moviesByStatus: Record<MovieStatus, number>;
  yearDoneBooks: number;
  yearDoneMovies: number;
  ratingDistribution: number[];     // [0-10] 长度 11
  categoryDistribution: Record<string, number>;
  monthlyTrend: { month: string; count: number }[];
  topRated: { id: string; title: string; rating: number; kind: 'book' | 'movie' }[];
}
