import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// 客户端 Supabase 实例（浏览器端使用）
export const supabase = createClient(supabaseUrl, supabaseKey);

// 服务端 Supabase 实例（API Routes / Server Components 使用）
// 单用户无认证场景下，客户端和服务端使用相同的 publishable key
export const supabaseServer = createClient(supabaseUrl, supabaseKey);
