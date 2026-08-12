/**
 * 把封面 URL 转成代理 URL，绕过豆瓣等图床的防盗链
 * - data URL（用户上传的 base64）→ 原样返回，不走代理
 * - 已经是代理路径 → 原样返回
 * - 其他外链 → 走 /api/image-proxy
 */
export function proxyCover(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('data:')) return url; // base64 直接显示
  if (url.startsWith('/api/')) return url; // 已是代理路径
  if (url.startsWith('/')) return url; // 其他相对路径
  // 外链 → 走代理
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}