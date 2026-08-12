import { NextRequest, NextResponse } from 'next/server';

/**
 * 书籍搜索 API
 * 主源：豆瓣图书 suggest（国内直连，返回书名/作者/出版社/年份/封面/ISBN）
 * 备源1：Google Books（部署到 Vercel 后可用）
 * 备源2：OpenLibrary（部署到 Vercel 后可用）
 */

interface BookResult {
  title: string;
  author: string;
  publisher: string;
  pub_date: string;
  cover_url: string;
  category: string;
  description: string;
  douban_id?: string;
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function searchDoubanBooks(query: string): Promise<BookResult[]> {
  const url = `https://book.douban.com/j/subject_suggest?q=${encodeURIComponent(query)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'application/json, text/plain, */*',
        Referer: 'https://book.douban.com/',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`豆瓣 HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .map((item: any) => ({
        title: item.title || '',
        author: item.author_name || '',
        publisher: item.publisher || '',
        pub_date: item.year || '',
        cover_url: item.pic || item.img || item.image_url || '',
        category: '',
        description: '',
        douban_id: item.id ? String(item.id) : undefined,
      }))
      .filter((r: BookResult) => r.title);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function searchGoogleBooks(query: string): Promise<BookResult[]> {
  const url = new URL('https://www.googleapis.com/books/v1/volumes');
  url.searchParams.set('q', query);
  url.searchParams.set('maxResults', '8');
  url.searchParams.set('printType', 'books');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Google Books HTTP ${res.status}`);

    const data = await res.json();
    return (data.items || [])
      .map((item: any) => {
        const v = item.volumeInfo || {};
        let cover = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '';
        if (cover.startsWith('http:')) cover = 'https:' + cover.slice(5);
        return {
          title: v.title || '',
          author: (v.authors || []).join(', '),
          publisher: v.publisher || '',
          pub_date: v.publishedDate || '',
          cover_url: cover,
          category: (v.categories || [''])[0] || '',
          description: v.description || '',
        };
      })
      .filter((r: BookResult) => r.title);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function searchOpenLibrary(query: string): Promise<BookResult[]> {
  const url = new URL('https://openlibrary.org/search.json');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '8');
  url.searchParams.set(
    'fields',
    'title,author_name,publisher,first_publish_year,cover_i,isbn,subject'
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`OpenLibrary HTTP ${res.status}`);

    const data = await res.json();
    return (data.docs || [])
      .slice(0, 8)
      .map((doc: any) => ({
        title: doc.title || '',
        author: (doc.author_name || []).join(', '),
        publisher: (doc.publisher || [''])[0] || '',
        pub_date: doc.first_publish_year ? String(doc.first_publish_year) : '',
        cover_url: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
          : '',
        category: (doc.subject || [''])[0] || '',
        description: '',
      }))
      .filter((r: BookResult) => r.title);
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
    const results = await searchDoubanBooks(query);
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
    console.error('[API] Douban books search error:', msg);
  }

  // 2. Google Books（备选，Vercel 部署后可用）
  try {
    const results = await searchGoogleBooks(query);
    if (results.length > 0) {
      return NextResponse.json({ results, source: 'google-books' });
    }
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? '超时(15s)'
          : err.message
        : '未知错误';
    errors.push(`Google Books: ${msg}`);
    console.error('[API] Google Books search error:', msg);
  }

  // 3. OpenLibrary（备选）
  try {
    const results = await searchOpenLibrary(query);
    if (results.length > 0) {
      return NextResponse.json({ results, source: 'openlibrary' });
    }
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? '超时(15s)'
          : err.message
        : '未知错误';
    errors.push(`OpenLibrary: ${msg}`);
    console.error('[API] OpenLibrary search error:', msg);
  }

  const errorMsg =
    errors.length > 0
      ? `所有搜索源均失败：${errors.join('；')}`
      : '未找到相关书籍';
  return NextResponse.json({ results: [], error: errorMsg }, { status: 502 });
}
