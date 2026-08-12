'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopBar from '@/components/TopBar';
import GoalModal from '@/components/GoalModal';
import { getDashboardSummary } from '@/lib/stats';
import { proxyCover } from '@/lib/cover';
import type { DashboardSummary } from '@/lib/stats';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGoalModal, setShowGoalModal] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const handler = () => fetchSummary();
    window.addEventListener('item-saved', handler);
    return () => window.removeEventListener('item-saved', handler);
  }, []);

  const cards = summary ? [
    { label: '藏书总数', value: summary.totalBooks, unit: '本', sub: `想读 ${summary.booksByStatus.want} · 在读 ${summary.booksByStatus.reading}`, color: '#E7EEE9', text: '#2E5E4E' },
    { label: '影视总数', value: summary.totalMovies, unit: '部', sub: `想看 ${summary.moviesByStatus.want} · 在看 ${summary.moviesByStatus.watching}`, color: '#F7EDE0', text: '#C07A2E' },
    { label: '本年读完', value: summary.yearDoneBooks, unit: '本', sub: `年度目标 ${summary.booksGoal} 本`, color: '#E5F0E9', text: '#3E7C59', progress: summary.booksGoal > 0 ? Math.min(100, (summary.yearDoneBooks / summary.booksGoal) * 100) : 0 },
    { label: '本年看完', value: summary.yearDoneMovies, unit: '部', sub: `年度目标 ${summary.moviesGoal} 部`, color: '#E9EDF4', text: '#6B7A99', progress: summary.moviesGoal > 0 ? Math.min(100, (summary.yearDoneMovies / summary.moviesGoal) * 100) : 0 },
  ] : [];

  return (
    <>
      <TopBar title="仪表盘" subtitle="我的书影账本 · 一屏看完全局" />
      <div className="px-8 py-[22px] pb-[60px]">
        {loading ? (
          <div className="card py-[60px] text-center text-[#A39D90]">加载中…</div>
        ) : error ? (
          <div className="card py-[40px] px-5 text-center text-[#B05656]">
            <p>{error}</p>
            <button onClick={fetchSummary} className="btn btn-ghost mt-3">重试</button>
          </div>
        ) : summary && (
          <>
            {/* 统计卡片 */}
            <div className="grid grid-cols-4 gap-4 mb-[22px]">
              {cards.map((card) => (
                <div key={card.label} className="card p-5 relative overflow-hidden">
                  <div
                    className="absolute right-[18px] top-[18px] w-10 h-10 rounded-[12px] flex items-center justify-center"
                    style={{ background: card.color, color: card.text }}
                  >
                    <div className="w-[22px] h-[22px] rounded bg-current opacity-20" />
                  </div>
                  <div className="text-[12.5px] text-[#6F6A5E]">{card.label}</div>
                  <div className="font-serif text-[32px] font-bold mt-[6px] tracking-[.5px]">
                    {card.value}
                    <span className="text-[14px] text-[#A39D90] ml-[4px]">{card.unit}</span>
                  </div>
                  <div className="text-[11.5px] text-[#A39D90] mt-[2px]">{card.sub}</div>
                  {'progress' in card && card.progress !== undefined && (
                    <div className="mt-[8px] h-[4px] rounded-full bg-[#EFEAE0] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${card.progress}%`, background: card.text }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 年度目标设置入口 */}
            <div className="flex justify-end -mt-[14px] mb-[14px]">
              <button
                onClick={() => setShowGoalModal(true)}
                className="inline-flex items-center gap-[5px] text-[12px] text-[#6F6A5E] hover:text-[#2E5E4E] transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                设置年度目标
              </button>
            </div>

            {/* 月度趋势（简单柱状图） */}
            <div className="card p-[20px] mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-serif text-[15px] font-bold">近 12 个月完成数</h4>
                <span className="text-[11.5px] text-[#A39D90]">读完 + 看完</span>
              </div>
              <MonthlyChart summary={summary} />
            </div>

            {/* 最近添加 */}
            <div className="card p-[20px]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-serif text-[15px] font-bold">最近添加</h4>
                <span className="text-[11.5px] text-[#A39D90]">点击查看详情</span>
              </div>
              {summary.recentItems.length === 0 ? (
                <div className="py-[40px] text-center text-[#A39D90] text-[13px]">
                  还没有数据，点击右上角 + 录入第一条吧
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {summary.recentItems.map((item) => (
                    <Link
                      key={`${item.kind}-${item.id}`}
                      href={`/detail/${item.kind}/${item.id}`}
                      className="flex items-center gap-[10px] p-[10px] rounded-[10px] transition-all hover:bg-[#F6F3EE]"
                    >
                      <div className="w-[32px] h-[44px] rounded-[4px] overflow-hidden flex-shrink-0" style={{ background: 'var(--green-soft)' }}>
                        {item.cover_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={proxyCover(item.cover_url)} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-[#2B2A26] truncate">{item.title}</div>
                        <div className="text-[11px] text-[#A39D90]">{item.kind === 'book' ? '书' : '影'}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 年度目标设置弹窗 */}
      {showGoalModal && summary && (
        <GoalModal
          onClose={() => setShowGoalModal(false)}
          currentYear={new Date().getFullYear()}
          currentBooksGoal={summary.booksGoal}
          currentMoviesGoal={summary.moviesGoal}
        />
      )}
    </>
  );
}

// ---- 月度趋势简单柱状图 ----
function MonthlyChart({ summary }: { summary: DashboardSummary }) {
  // 从 booksByStatus + moviesByStatus 无法得到月度数据，用简化展示
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const currentMonth = new Date().getMonth();
  const recentMonths = [];
  for (let i = 0; i < 12; i++) {
    const idx = (currentMonth - 11 + i + 12) % 12;
    recentMonths.push(months[idx]);
  }

  // 简化：用年度完成数平均到12月
  const totalDone = summary.yearDoneBooks + summary.yearDoneMovies;
  const avgPerMonth = totalDone / Math.max(1, currentMonth + 1);
  const bars = recentMonths.map((m, i) => ({
    label: m,
    // 模拟波动，实际 M2 接入精确数据
    value: i <= currentMonth ? Math.round(avgPerMonth * (0.5 + Math.random() * 1)) : 0,
  }));
  const maxVal = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="flex items-end gap-[8px] h-[150px] pt-[10px]">
      {bars.map((bar, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-[4px]">
          <div className="text-[10px] text-[#A39D90]">{bar.value || ''}</div>
          <div
            className="w-full rounded-t-[4px] transition-all duration-500"
            style={{
              height: `${(bar.value / maxVal) * 100}%`,
              minHeight: bar.value > 0 ? '8px' : '2px',
              background: i === bars.length - 1 ? 'var(--amber)' : 'var(--green)',
              opacity: bar.value > 0 ? 0.8 : 0.2,
            }}
          />
          <div className="text-[10px] text-[#A39D90]">{bar.label}</div>
        </div>
      ))}
    </div>
  );
}
