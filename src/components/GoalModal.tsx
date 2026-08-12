'use client';

import { useState, useEffect } from 'react';

interface GoalModalProps {
  onClose: () => void;
  currentYear: number;
  currentBooksGoal: number;
  currentMoviesGoal: number;
}

export default function GoalModal({ onClose, currentYear, currentBooksGoal, currentMoviesGoal }: GoalModalProps) {
  const [year, setYear] = useState(currentYear);
  const [booksGoal, setBooksGoal] = useState(String(currentBooksGoal));
  const [moviesGoal, setMoviesGoal] = useState(String(currentMoviesGoal));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const bg = parseInt(booksGoal) || 0;
    const mg = parseInt(moviesGoal) || 0;
    const y = parseInt(String(year)) || new Date().getFullYear();

    if (y < 2000 || y > 2100) {
      setError('年份不合法');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: y, books_goal: bg, movies_goal: mg }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存失败');
      }
      // 通知页面刷新
      window.dispatchEvent(new CustomEvent('item-saved'));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-fade-up"
      style={{ background: 'rgba(43,42,38,.42)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#FFFDF9] rounded-[18px] shadow-[0_18px_44px_rgba(0,0,0,.25)] w-full max-w-[420px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-[24px] py-[18px] border-b border-[#EFEAE0]">
          <h3 className="font-serif text-[18px] font-bold">设置年度目标</h3>
          <button onClick={onClose} className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[#A39D90] hover:bg-[#F6F3EE] hover:text-[#2B2A26] transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-[24px] py-[20px]">
          <div className="space-y-[16px]">
            <div>
              <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">年份</label>
              <input
                className="input"
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || currentYear)}
                min={2000}
                max={2100}
              />
            </div>
            <div>
              <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">读书目标（本）</label>
              <input
                className="input"
                type="number"
                value={booksGoal}
                onChange={(e) => setBooksGoal(e.target.value)}
                min={0}
                placeholder="30"
              />
            </div>
            <div>
              <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">观影目标（部）</label>
              <input
                className="input"
                type="number"
                value={moviesGoal}
                onChange={(e) => setMoviesGoal(e.target.value)}
                min={0}
                placeholder="20"
              />
            </div>
          </div>

          {error && (
            <div className="mt-[14px] px-[14px] py-[8px] bg-[#F9ECEC] border border-[#D8B4B4] rounded-[8px] text-[#B05656] text-[12.5px]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-[10px] mt-[20px]">
            <button onClick={onClose} className="btn btn-ghost">取消</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              {saving ? '保存中…' : '保存目标'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
