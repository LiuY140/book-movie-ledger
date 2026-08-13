import { NextRequest, NextResponse } from 'next/server';

/**
 * 豆瓣书籍详情 API
 * 通过豆瓣条目 ID 抓取书籍详情页 HTML，提取评分
 * GET /api/search/books/[id]?id=2567698
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: doubanId } = await params;
  if (!doubanId) {
    return NextResponse.json({ error: '缺少豆瓣条目 ID' }, { status: 400 });
  }

  const url = `https://book.douban.com/subject/${doubanId}/`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        Referer: 'https://book.douban.com/',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json(
        { error: `豆瓣返回 HTTP ${res.status}`, douban_id: doubanId },
        { status: 502 }
      );
    }

    const html = await res.text();

    // 评分在 <strong class="ll rating_num " property="v:average">8.9</strong>
    const ratingMatch = html.match(/property="v:average"[^>]*>\s*([\d.]+)\s*</);
    const douban_rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

    // 出版社：豆瓣图书详情页 #info 区域
    // 结构1: <span class="pl">出版社:</span> <a href="...">中信出版社</a>
    // 结构2: <span class="pl">出版社:</span> 中信出版社
    let publisher: string | null = null;
    const publisherMatch = html.match(/出版社[:：][\s\S]*?(?:<a[^>]*>([^<]+)<\/a>|([^<\n]+))\s*<br/);
    if (publisherMatch) {
      publisher = (publisherMatch[1] || publisherMatch[2] || '').trim();
    }

    return NextResponse.json({
      douban_id: doubanId,
      douban_rating,
      publisher,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const msg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? '豆瓣详情页请求超时(12s)'
          : err.message
        : '未知错误';
    console.error('[API] Douban book detail error:', msg);
    return NextResponse.json(
      { error: msg, douban_id: doubanId },
      { status: 502 }
    );
  }
}
