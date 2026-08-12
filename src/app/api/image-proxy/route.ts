import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';

/**
 * 封面图片代理
 * - GET /api/image-proxy?url=<encoded url>
 * - 服务端 fetch 图片（不发 Referer 给源站），绕过豆瓣等图床的防盗链
 * - 内存 LRU 缓存（最多 200 张、合计 ≤ 50MB、TTL 1 小时）
 * - 浏览器 Cache-Control: 1 天
 *
 * 注意：data URL（用户上传的 base64 封面）不要走代理，直接显示
 */

// LRU 缓存：key = 原始 URL，value = 图片字节
const cache = new LRUCache<string, { buffer: Buffer; contentType: string }>({
  max: 200,
  maxSize: 50 * 1024 * 1024, // 总上限 50MB
  ttl: 1000 * 60 * 60, // 1 小时
  sizeCalculation: (v) => v.buffer.length,
});

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: '缺少 url 参数' }, { status: 400 });
  }

  // 校验：必须是合法 http(s) URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'url 不合法' }, { status: 400 });
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return NextResponse.json({ error: '仅支持 http(s) 协议' }, { status: 400 });
  }

  // 命中缓存
  const cached = cache.get(url);
  if (cached) {
    return new NextResponse(new Uint8Array(cached.buffer), {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=86400',
        'X-Cache': 'HIT',
      },
    });
  }

  // 未命中：上游 fetch
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s 超时

    // 豆瓣防盗链要求 Referer 必须来自豆瓣域名
    // 根据目标域名伪造对应的 Referer，让豆瓣放行
    const hostname = parsed.hostname;
    let spoofReferer: string | undefined;
    if (hostname.endsWith('doubanio.com') || hostname.endsWith('douban.com')) {
      if (hostname.startsWith('movie')) {
        spoofReferer = 'https://movie.douban.com/';
      } else if (hostname.startsWith('book')) {
        spoofReferer = 'https://book.douban.com/';
      } else {
        // 兜底：通用豆瓣 Referer
        spoofReferer = 'https://www.douban.com/';
      }
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        ...(spoofReferer ? { Referer: spoofReferer } : {}),
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `源站返回 ${res.status}` },
        { status: 502 }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    // 只缓存 < 3MB 的图（防止单张大图撑爆内存）
    if (buffer.length <= 3 * 1024 * 1024) {
      cache.set(url, { buffer, contentType });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'X-Cache': 'MISS',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json(
      { error: '代理失败', message: msg },
      { status: 502 }
    );
  }
}