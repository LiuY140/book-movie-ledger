'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import { supabase } from '@/lib/supabase';
import type { Settings as SettingsType } from '@/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [newBookCat, setNewBookCat] = useState('');
  const [newMovieCat, setNewMovieCat] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('settings').select('*').single();
      if (data) setSettings(data as SettingsType);
    }
    load();
  }, []);

  const updateSettings = async (patch: Partial<SettingsType>) => {
    if (!settings) return;
    setSaving(true);
    try {
      const { data } = await supabase.from('settings').update(patch).eq('id', settings.id).select().single();
      if (data) {
        setSettings(data as SettingsType);
        setMessage('已保存');
        setTimeout(() => setMessage(''), 2000);
      }
    } catch {
      setMessage('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const addBookCategory = () => {
    const t = newBookCat.trim();
    if (!t || !settings) return;
    if (settings.book_categories.includes(t)) return;
    const updated = [...settings.book_categories, t];
    setSettings({ ...settings, book_categories: updated });
    updateSettings({ book_categories: updated });
    setNewBookCat('');
  };

  const removeBookCategory = (cat: string) => {
    if (!settings) return;
    const updated = settings.book_categories.filter((c) => c !== cat);
    setSettings({ ...settings, book_categories: updated });
    updateSettings({ book_categories: updated });
  };

  const addMovieCategory = () => {
    const t = newMovieCat.trim();
    if (!t || !settings) return;
    if (settings.movie_categories.includes(t)) return;
    const updated = [...settings.movie_categories, t];
    setSettings({ ...settings, movie_categories: updated });
    updateSettings({ movie_categories: updated });
    setNewMovieCat('');
  };

  const removeMovieCategory = (cat: string) => {
    if (!settings) return;
    const updated = settings.movie_categories.filter((c) => c !== cat);
    setSettings({ ...settings, movie_categories: updated });
    updateSettings({ movie_categories: updated });
  };

  const handleExport = (format: 'csv' | 'json') => {
    window.open(`/api/export?format=${format}`, '_blank');
  };

  return (
    <>
      <TopBar title="设置" subtitle="数据归自己" showAddButton={false} />
      <div className="px-8 py-[22px] pb-[60px]">
        <div className="max-w-[760px] flex flex-col gap-[18px]">
          {/* 消息提示 */}
          {message && (
            <div className="px-[14px] py-[8px] bg-[#E5F0E9] border border-[#3E7C59]/20 rounded-[8px] text-[#3E7C59] text-[12.5px] animate-fade-up">
              {message}
            </div>
          )}

          {/* 数据导出 */}
          <div id="export" className="card p-[22px]">
            <h4 className="font-serif text-[16px] mb-1">数据导出</h4>
            <p className="text-[12.5px] text-[#6F6A5E] mb-4">
              数据属于你自己，随时一键带走。支持全量导出 CSV / JSON，可用于备份或迁移。
            </p>
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => handleExport('csv')} className="btn btn-primary">导出 CSV（Excel 可用）</button>
              <button onClick={() => handleExport('json')} className="btn btn-ghost">导出 JSON（含全部笔记）</button>
            </div>
            <div className="text-[11.5px] text-[#A39D90] mt-3">
              CSV 已带 BOM，中文在 Excel / Numbers 打开不乱码。
            </div>
          </div>

          {/* 类型管理 */}
          <div className="card p-[22px]">
            <h4 className="font-serif text-[16px] mb-1">类型管理</h4>
            <p className="text-[12.5px] text-[#6F6A5E] mb-4">
              预置类型可直接使用，也可添加你的自定义类型（如「哲学」「日剧」）。
            </p>

            {/* 书籍类型 */}
            <div className="text-[12px] text-[#6F6A5E] mb-[6px]">书籍类型</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {settings?.book_categories.map((t) => (
                <span key={t} className="tag tag-type" style={{ cursor: 'pointer' }} onClick={() => removeBookCategory(t)} title="点击删除">
                  {t} ×
                </span>
              ))}
            </div>
            <div className="flex gap-[6px] mb-4">
              <input
                className="input"
                style={{ width: '200px' }}
                value={newBookCat}
                onChange={(e) => setNewBookCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBookCategory(); } }}
                placeholder="添加书籍类型…"
              />
              <button onClick={addBookCategory} className="btn btn-soft px-3">添加</button>
            </div>

            {/* 影视类型 */}
            <div className="text-[12px] text-[#6F6A5E] mb-[6px]">影视类型</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {settings?.movie_categories.map((t) => (
                <span key={t} className="tag tag-type" style={{ cursor: 'pointer' }} onClick={() => removeMovieCategory(t)} title="点击删除">
                  {t} ×
                </span>
              ))}
            </div>
            <div className="flex gap-[6px]">
              <input
                className="input"
                style={{ width: '200px' }}
                value={newMovieCat}
                onChange={(e) => setNewMovieCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMovieCategory(); } }}
                placeholder="添加影视类型…"
              />
              <button onClick={addMovieCategory} className="btn btn-soft px-3">添加</button>
            </div>
          </div>

          {/* 隐私说明 */}
          <div className="card p-[22px]">
            <h4 className="font-serif text-[16px] mb-1">隐私说明</h4>
            <p className="text-[12.5px] text-[#6F6A5E]">
              单用户私有账本，无社交、无推荐噪音。公网链接即数据入口，请勿分享含隐私信息的链接。
            </p>
          </div>

          {/* 技术信息 */}
          <div className="card p-[22px]">
            <h4 className="font-serif text-[16px] mb-1">技术信息</h4>
            <div className="text-[12.5px] text-[#6F6A5E] space-y-1">
              <div>框架：Next.js 14 (App Router) + TypeScript</div>
              <div>数据库：Supabase (PostgreSQL)</div>
              <div>样式：Tailwind CSS</div>
              <div>元数据源：Google Books API / TMDB API</div>
              <div>部署：Vercel / Cloudflare Pages</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
