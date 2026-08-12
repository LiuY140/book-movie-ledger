'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import TopBar from '@/components/TopBar';
import GoalModal from '@/components/GoalModal';
import { getStatsDetail } from '@/lib/stats';
import type { StatsDetail } from '@/lib/stats';

type ViewMode = 'combined' | 'books' | 'movies';

export default function StatsPage() {
  const [stats, setStats] = useState<StatsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<ViewMode>('combined');
  const [showGoalModal, setShowGoalModal] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStatsDetail();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const handler = () => fetchStats();
    window.addEventListener('item-saved', handler);
    return () => window.removeEventListener('item-saved', handler);
  }, []);

  // 根据 view 实时计算各模块数据（必须在所有早期 return 之前，确保 hooks 顺序稳定）
  const viewData = useMemo(() => {
    if (!stats) {
      return {
        ratingDist: new Array(11).fill(0),
        categoryDist: {},
        monthlyTrend: [],
        topRated: [],
      };
    }

    const books = stats.booksRaw;
    const movies = stats.moviesRaw;
    const now = new Date();

    // 选中的数据源
    const showBooks = view !== 'movies';
    const showMovies = view !== 'books';
    const items = [
      ...(showBooks ? books : []),
      ...(showMovies ? movies : []),
    ];

    // 评分分布
    const ratingDist = new Array(11).fill(0);
    items.forEach((item) => {
      if (item.rating != null && item.rating >= 0 && item.rating <= 10) {
        ratingDist[item.rating]++;
      }
    });

    // 类型分布
    const categoryDist: Record<string, number> = {};
    if (showBooks) {
      books.forEach((b) => {
        const cat = b.category || '未分类';
        categoryDist[cat] = (categoryDist[cat] || 0) + 1;
      });
    }
    if (showMovies) {
      movies.forEach((m) => {
        const cat = m.genre || '未分类';
        categoryDist[cat] = (categoryDist[cat] || 0) + 1;
      });
    }

    // 月度趋势（近12个月）
    const monthlyTrend: { month: string; books: number; movies: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyTrend.push({ month: `${d.getMonth() + 1}月`, books: 0, movies: 0 });
    }
    const monthIndex = (dateStr: string | null) => {
      if (!dateStr) return -1;
      const d = new Date(dateStr);
      const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      return 11 - diff;
    };
    if (showBooks) {
      books.forEach((b) => {
        if (b.status === 'done' && b.finished_at) {
          const idx = monthIndex(b.finished_at);
          if (idx >= 0 && idx < 12) monthlyTrend[idx].books++;
        }
      });
    }
    if (showMovies) {
      movies.forEach((m) => {
        if (m.status === 'done' && m.watched_at) {
          const idx = monthIndex(m.watched_at);
          if (idx >= 0 && idx < 12) monthlyTrend[idx].movies++;
        }
      });
    }

    // 最高评分
    const topRated = items
      .filter((x) => x.rating != null && x.rating > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10);

    return { ratingDist, categoryDist, monthlyTrend, topRated };
  }, [stats, view]);

  if (loading) {
    return (
      <>
        <TopBar title="统计" subtitle="记录与统计并重" showAddButton={false} />
        <div className="px-8 py-[22px]"><div className="card py-[60px] text-center text-[#A39D90]">加载中…</div></div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <TopBar title="统计" subtitle="记录与统计并重" showAddButton={false} />
        <div className="px-8 py-[22px]">
          <div className="card py-[40px] px-5 text-center text-[#B05656]">
            <p>{error}</p>
            <button onClick={fetchStats} className="btn btn-ghost mt-3">重试</button>
          </div>
        </div>
      </>
    );
  }

  if (!stats) return null;

  // 评分分布最大值
  const maxRating = Math.max(...viewData.ratingDist, 1);

  // 类型分布排序
  const sortedCategories = Object.entries(viewData.categoryDist).sort((a, b) => b[1] - a[1]);
  const maxCategory = Math.max(...sortedCategories.map(([, v]) => v), 1);

  // 月度趋势最大值
  const maxMonthly = view === 'books'
    ? Math.max(...viewData.monthlyTrend.map((m) => m.books), 1)
    : view === 'movies'
    ? Math.max(...viewData.monthlyTrend.map((m) => m.movies), 1)
    : Math.max(...viewData.monthlyTrend.map((m) => m.books + m.movies), 1);

  return (
    <>
      <TopBar title="统计" subtitle="记录与统计并重" showAddButton={false} />
      <div className="px-8 py-[22px] pb-[60px]">
        {/* 视角切换 */}
        <div className="flex items-center gap-[10px] mb-[18px]">
          <div className="inline-flex bg-[#FFFDF9] border border-[#E7E1D4] rounded-[10px] p-[3px] gap-[2px]">
            {(['combined', 'books', 'movies'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-[6px] rounded-[8px] text-[13px] transition-all ${
                  view === v ? 'bg-[#2E5E4E] text-white font-semibold' : 'text-[#6F6A5E] hover:text-[#2B2A26]'
                }`}
              >
                {v === 'combined' ? '合并视角' : v === 'books' ? '书籍' : '影视'}
              </button>
            ))}
          </div>
          <span className="text-[12px] text-[#A39D90] ml-[10px]">
            {view === 'combined'
              ? `共 ${stats.totalBooks + stats.totalMovies} 条记录`
              : view === 'books'
              ? `${stats.totalBooks} 本书`
              : `${stats.totalMovies} 部影视`}
          </span>
        </div>

        <div className="grid grid-cols-[1.2fr_1fr] gap-4">
          {/* 评分分布 */}
          <div className="card p-[20px]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-serif text-[15px] font-bold">评分分布</h4>
              <span className="text-[11.5px] text-[#A39D90]">我的评分 · 0-10 分</span>
            </div>
            <div className="flex items-end gap-[6px] h-[180px] pt-[10px]">
              {viewData.ratingDist.map((count, rating) => (
                <div key={rating} className="flex-1 flex flex-col items-center gap-[3px]">
                  <div className="text-[10px] text-[#A39D90]">{count || ''}</div>
                  <div
                    className="w-full rounded-t-[4px] transition-all duration-500"
                    style={{
                      height: `${(count / maxRating) * 100}%`,
                      minHeight: count > 0 ? '6px' : '2px',
                      background: rating >= 8 ? 'var(--green)' : rating >= 5 ? 'var(--amber)' : '#D8D1C2',
                      opacity: count > 0 ? 0.85 : 0.2,
                    }}
                  />
                  <div className="text-[10px] text-[#A39D90]">{rating}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 类型分布 */}
          <div className="card p-[20px]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-serif text-[15px] font-bold">类型分布</h4>
              <span className="text-[11.5px] text-[#A39D90]">占比与数量</span>
            </div>
            {sortedCategories.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-[#A39D90] text-[13px]">暂无数据</div>
            ) : (
              <div className="space-y-[8px] max-h-[180px] overflow-y-auto">
                {sortedCategories.slice(0, 8).map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-[8px]">
                    <span className="text-[12px] text-[#2B2A26] w-[60px] flex-shrink-0 truncate">{cat}</span>
                    <div className="flex-1 h-[18px] rounded-[4px] bg-[#F6F3EE] overflow-hidden">
                      <div
                        className="h-full rounded-[4px] transition-all duration-500 flex items-center justify-end px-[6px]"
                        style={{ width: `${(count / maxCategory) * 100}%`, background: 'var(--green)', opacity: 0.8 }}
                      >
                        <span className="text-[10px] text-white font-medium">{count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 月度趋势 */}
          <div className="card p-[20px]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-serif text-[15px] font-bold">月度趋势</h4>
              <span className="text-[11.5px] text-[#A39D90]">完成数 · 近 12 个月</span>
            </div>
            <div className="flex items-end gap-[4px] h-[150px] pt-[10px]">
              {viewData.monthlyTrend.map((m, i) => {
                const total = view === 'books' ? m.books : view === 'movies' ? m.movies : m.books + m.movies;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-[3px]">
                    <div className="text-[10px] text-[#A39D90]">{total || ''}</div>
                    <div className="w-full flex flex-col-reverse rounded-t-[4px] overflow-hidden" style={{ height: `${(total / maxMonthly) * 100}%`, minHeight: total > 0 ? '4px' : '2px' }}>
                      {m.movies > 0 && (
                        <div style={{ height: `${(m.movies / total) * 100}%`, background: 'var(--amber)', opacity: 0.8 }} />
                      )}
                      {m.books > 0 && (
                        <div style={{ height: `${(m.books / total) * 100}%`, background: 'var(--green)', opacity: 0.8 }} />
                      )}
                    </div>
                    <div className="text-[10px] text-[#A39D90]">{m.month}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-[12px] mt-[8px] text-[11px] text-[#6F6A5E]">
              {view !== 'movies' && (
                <span className="flex items-center gap-[4px]"><span className="w-[8px] h-[8px] rounded-[2px]" style={{ background: 'var(--green)' }} />书籍</span>
              )}
              {view !== 'books' && (
                <span className="flex items-center gap-[4px]"><span className="w-[8px] h-[8px] rounded-[2px]" style={{ background: 'var(--amber)' }} />影视</span>
              )}
            </div>
          </div>

          {/* 年度目标 */}
          <div className="card p-[20px]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-serif text-[15px] font-bold">年度目标</h4>
              <div className="flex items-center gap-[10px]">
                <span className="text-[11.5px] text-[#A39D90]">
                  {new Date().getFullYear()}
                  {view !== 'movies' && ` · 读书 ${stats.booksGoal} 本`}
                  {view !== 'books' && ` · 观影 ${stats.moviesGoal} 部`}
                </span>
                <button
                  onClick={() => setShowGoalModal(true)}
                  className="inline-flex items-center gap-[4px] text-[11.5px] text-[#6F6A5E] hover:text-[#2E5E4E] transition-colors px-[8px] py-[3px] rounded-[6px] hover:bg-[#F6F3EE]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  设置
                </button>
              </div>
            </div>
            <div className="flex items-center justify-around h-[150px]">
              {/* 书籍进度环 */}
              {view !== 'movies' && (
                <ProgressRing
                  value={stats.yearDoneBooks}
                  max={stats.booksGoal}
                  label="读书"
                  color="var(--green)"
                />
              )}
              {/* 影视进度环 */}
              {view !== 'books' && (
                <ProgressRing
                  value={stats.yearDoneMovies}
                  max={stats.moviesGoal}
                  label="观影"
                  color="var(--amber)"
                />
              )}
            </div>
          </div>
        </div>

        {/* 最高评分列表 */}
        {viewData.topRated.length > 0 && (
          <div className="card p-[20px] mt-4">
            <h4 className="font-serif text-[15px] font-bold mb-3">评分最高</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {viewData.topRated.map((item, i) => (
                <Link
                  key={item.id}
                  href={`/detail/${item.kind}/${item.id}`}
                  className="flex items-center gap-[8px] p-[8px] rounded-[8px] transition-all hover:bg-[#F6F3EE]"
                >
                  <span className="font-serif text-[20px] font-bold text-[#E7E1D4] w-[24px]">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium text-[#2B2A26] truncate">{item.title}</div>
                    <div className="text-[11px] text-[#A39D90]">{item.kind === 'book' ? '书' : '影'} · {item.rating}/10</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 年度目标设置弹窗 */}
      {showGoalModal && (
        <GoalModal
          onClose={() => setShowGoalModal(false)}
          currentYear={new Date().getFullYear()}
          currentBooksGoal={stats.booksGoal}
          currentMoviesGoal={stats.moviesGoal}
        />
      )}
    </>
  );
}

// ---- 进度环组件 ----
function ProgressRing({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: '110px', height: '110px' }}>
        <svg width="110" height="110" className="-rotate-90">
          <circle cx="55" cy="55" r={radius} fill="none" stroke="#EFEAE0" strokeWidth="8" />
          <circle
            cx="55" cy="55" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-[24px] font-bold" style={{ color }}>{value}</span>
          <span className="text-[10px] text-[#A39D90]">/ {max}</span>
        </div>
      </div>
      <span className="text-[12px] text-[#6F6A5E] mt-[6px]">{label}</span>
    </div>
  );
}
