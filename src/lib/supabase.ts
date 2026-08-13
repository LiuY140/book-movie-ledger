import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * 懒加载 Supabase 客户端
 *
 * 不在模块顶层创建实例，避免 Next.js build 的 "Collecting page data" 阶段
 * 因缺少环境变量而崩溃。客户端仅在首次实际调用时才创建。
 */
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase 环境变量未配置：NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    );
  }
  _client = createClient(url, key);
  return _client;
}

function lazyProxy(): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_, prop) {
      const client = getClient();
      const value = Reflect.get(client, prop, client);
      return typeof value === 'function' ? value.bind(client) : value;
    },
  });
}

// 客户端 Supabase 实例（浏览器端使用）
export const supabase = lazyProxy();

// 服务端 Supabase 实例（API Routes / Server Components 使用）
// 单用户无认证场景下，客户端和服务端使用相同的 publishable key
export const supabaseServer = lazyProxy();
