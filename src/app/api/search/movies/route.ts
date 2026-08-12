import { NextRequest, NextResponse } from 'next/server';

/**
 * 影视搜索 API
 * 主源：豆瓣电影 suggest（国内直连，返回片名/年份/封面/类型）
 * 备源：TMDB（部署到 Vercel 后可用，数据更丰富：导演/演员/简介/地区）
 */

interface MovieResult {
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
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

async function searchDoubanMovies(query: string): Promise<MovieResult[]> {
  const url = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(query)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'application/json, text/plain, */*',
        Referer: 'https://movie.douban.com/',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`豆瓣 HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .map((item: any) => ({
        title: item.title || '',
        original_title: '',
        director: '',
        actors: '',
        year: item.year ? parseInt(item.year) : 0,
        region: '',
        duration: 0,
        genre: item.type === 'tv' ? '电视剧' : '电影',
        cover_url: item.img || item.pic || item.image_url || '',
        overview: '',
        douban_id: item.id ? String(item.id) : undefined,
      }))
      .filter((r: MovieResult) => r.title);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function searchTMDB(query: string): Promise<MovieResult[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB_API_KEY 未配置');

  const url = new URL(`${TMDB_BASE}/search/multi`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('query', query);
  url.searchParams.set('language', 'zh-CN');
  url.searchParams.set('page', '1');
  url.searchParams.set('include_adult', 'false');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);

    const data = await res.json();
    return (data.results || [])
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, 8)
      .map((item: any) => {
        const isMovie = item.media_type === 'movie';
        return {
          title: isMovie ? item.title || '' : item.name || '',
          original_title: isMovie ? item.original_title || '' : item.original_name || '',
          director: '',
          actors: '',
          year: isMovie
            ? item.release_date
              ? parseInt(item.release_date.slice(0, 4))
              : 0
            : item.first_air_date
              ? parseInt(item.first_air_date.slice(0, 4))
              : 0,
          region: item.origin_country?.[0] || '',
          duration: 0,
          genre: isMovie ? '电影' : '电视剧',
          cover_url: item.poster_path ? `${TMDB_IMG}${item.poster_path}` : '',
          overview: item.overview || '',
        };
      });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length < 1) {
    return NextResponse.json({ results: [] });
  }

  const errors: string[] = [];

  // 1. 豆瓣（国内首选）
  try {
    const results = await searchDoubanMovies(query);
    if (results.length > 0) {
      return NextResponse.json({ results, source: 'douban' });
    }
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? '超时(10s)'
          : err.message
        : '未知错误';
    errors.push(`豆瓣: ${msg}`);
    console.error('[API] Douban movies search error:', msg);
  }

  // 2. TMDB（备选，Vercel 部署后可用）
  try {
    const results = await searchTMDB(query);
    if (results.length > 0) {
      return NextResponse.json({ results, source: 'tmdb' });
    }
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? '超时(15s)'
          : err.message
        : '未知错误';
    errors.push(`TMDB: ${msg}`);
    console.error('[API] TMDB search error:', msg);
  }

  const errorMsg =
    errors.length > 0
      ? `所有搜索源均失败：${errors.join('；')}`
      : '未找到相关影视';
  return NextResponse.json({ results: [], error: errorMsg }, { status: 502 });
}
