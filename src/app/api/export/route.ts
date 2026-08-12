import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'csv';
  const kind = searchParams.get('kind') || 'all'; // all | books | movies

  try {
    const [booksRes, moviesRes] = await Promise.all([
      (kind === 'all' || kind === 'books') ? supabaseServer.from('books').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      (kind === 'all' || kind === 'movies') ? supabaseServer.from('movies').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    ]);

    const books = booksRes.data || [];
    const movies = moviesRes.data || [];

    if (format === 'json') {
      const data = {
        exported_at: new Date().toISOString(),
        books,
        movies,
      };
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="book-movie-export-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      });
    }

    // CSV
    const BOM = '\uFEFF';
    const bookHeaders = ['类型', '标题', '作者', '出版社', '出版日期', '分类', '状态', '评分', '豆瓣评分', '短评', '添加时间', '读完时间'];
    const movieHeaders = ['类型', '标题', '导演', '主演', '年份', '地区', '时长', '分类', '状态', '评分', '豆瓣评分', '短评', '添加时间', '观看时间'];

    const escapeCsv = (val: unknown): string => {
      const s = val == null ? '' : String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const statusLabels: Record<string, string> = {
      want: '想读/想看', reading: '在读', watching: '在看', done: '读完/看完', dropped: '放弃',
    };

    const rows: string[] = [];

    if (kind === 'all' || kind === 'books') {
      rows.push(bookHeaders.map(escapeCsv).join(','));
      books.forEach((b: any) => {
        rows.push([
          '书籍', b.title, b.author, b.publisher, b.pub_date, b.category,
          statusLabels[b.status] || b.status, b.rating ?? '', b.douban_rating ?? '',
          b.comment ?? '', b.created_at, b.finished_at ?? '',
        ].map(escapeCsv).join(','));
      });
    }

    if (kind === 'all' || kind === 'movies') {
      if (kind === 'all') rows.push(''); // 空行分隔
      rows.push(movieHeaders.map(escapeCsv).join(','));
      movies.forEach((m: any) => {
        rows.push([
          '影视', m.title, m.director, m.actors, m.year, m.region, m.duration, m.genre,
          statusLabels[m.status] || m.status, m.rating ?? '', m.douban_rating ?? '',
          m.comment ?? '', m.created_at, m.watched_at ?? '',
        ].map(escapeCsv).join(','));
      });
    }

    const csv = BOM + rows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="book-movie-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error('[API] export error:', err);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}
