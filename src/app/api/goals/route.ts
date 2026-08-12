import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

/**
 * 年度目标 API
 * PUT /api/goals — upsert 年度目标
 * Body: { year: number, books_goal: number, movies_goal: number }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, books_goal, movies_goal } = body;

    if (!year || typeof year !== 'number') {
      return NextResponse.json({ error: '缺少有效的年份' }, { status: 400 });
    }
    if (books_goal == null || movies_goal == null) {
      return NextResponse.json({ error: '请填写书籍和影视目标' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('yearly_goals')
      .upsert(
        {
          year,
          books_goal: Math.max(0, Math.floor(books_goal)),
          movies_goal: Math.max(0, Math.floor(movies_goal)),
        },
        { onConflict: 'year' }
      )
      .select()
      .single();

    if (error) {
      console.error('[API] goals upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[API] goals error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '未知错误' },
      { status: 500 }
    );
  }
}
