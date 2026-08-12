import { NextRequest, NextResponse } from 'next/server';

/**
 * 豆瓣影视详情 API
 * 通过豆瓣条目 ID 调用 subject_abstract 接口，获取评分 + 导演/演员/时长/地区/类型
 * GET /api/search/movies/[id]?id=3541415
 *
 * 返回字段：
 * - douban_rating: 豆瓣评分 (float)
 * - director: 导演 (string，多个用逗号分隔)
 * - actors: 主演 (string，多个用逗号分隔)
 * - duration: 时长分钟数 (int)
 * - region: 地区 (string)
 * - year: 年份 (int)
 * - genre: 类型 (string，取第一个)
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const doubanId = params.id;
  if (!doubanId) {
    return NextResponse.json({ error: '缺少豆瓣条目 ID' }, { status: 400 });
  }

  const url = `https://movie.douban.com/j/subject_abstract?subject_id=${doubanId}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

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

    if (!res.ok) {
      return NextResponse.json(
        { error: `豆瓣返回 HTTP ${res.status}`, douban_id: doubanId },
        { status: 502 }
      );
    }

    const data = await res.json();
    const subject = data?.subject;
    if (!subject) {
      return NextResponse.json(
        { error: '豆瓣未返回条目信息', douban_id: doubanId },
        { status: 404 }
      );
    }

    // 解析时长 "148分钟" → 148
    let duration = 0;
    if (subject.duration) {
      const m = String(subject.duration).match(/(\d+)/);
      if (m) duration = parseInt(m[1]);
    }

    return NextResponse.json({
      douban_id: doubanId,
      douban_rating: subject.rate ? parseFloat(subject.rate) : null,
      director: (subject.directors || []).join(', '),
      actors: (subject.actors || []).join(', '),
      duration,
      region: subject.region || '',
      year: subject.release_year ? parseInt(subject.release_year) : 0,
      genre: (subject.types || [])[0] || '',
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const msg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? '豆瓣详情请求超时(12s)'
          : err.message
        : '未知错误';
    console.error('[API] Douban movie detail error:', msg);
    return NextResponse.json(
      { error: msg, douban_id: doubanId },
      { status: 502 }
    );
  }
}
