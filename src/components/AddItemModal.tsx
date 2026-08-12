'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StarRating from './StarRating';
import { createBook, updateBook } from '@/lib/books';
import { createMovie, updateMovie } from '@/lib/movies';
import { supabase } from '@/lib/supabase';
import { proxyCover } from '@/lib/cover';
import type { Book, Movie, BookInput, MovieInput, BookStatus, MovieStatus, BookSearchResult, MovieSearchResult } from '@/types';

interface AddItemModalProps {
  kind: 'books' | 'movies';
  editItem: Book | Movie | null;
  onClose: () => void;
  /** 切换类型回调（仅新增模式传入，编辑模式为 undefined） */
  onSwitchKind?: (kind: 'books' | 'movies') => void;
}

const BOOK_STATUSES: { value: BookStatus; label: string }[] = [
  { value: 'want', label: '想读' },
  { value: 'reading', label: '在读' },
  { value: 'done', label: '读完' },
  { value: 'dropped', label: '放弃' },
];

const MOVIE_STATUSES: { value: MovieStatus; label: string }[] = [
  { value: 'want', label: '想看' },
  { value: 'watching', label: '在看' },
  { value: 'done', label: '看完' },
  { value: 'dropped', label: '放弃' },
];

const DEFAULT_BOOK_CATEGORIES = ['科幻', '文学', '历史', '社科', '经济', '心理', '效率', '未分类'];
const DEFAULT_MOVIE_GENRES = ['电影', '电视剧', '纪录片', '动画', '未分类'];

export default function AddItemModal({ kind, editItem, onClose, onSwitchKind }: AddItemModalProps) {
  const router = useRouter();
  const isBook = kind === 'books';
  const isEdit = !!editItem;

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookSearchResult[] | MovieSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 表单状态
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [publisher, setPublisher] = useState('');
  const [pubDate, setPubDate] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [category, setCategory] = useState(isBook ? '科幻' : '电影');
  const [director, setDirector] = useState('');
  const [actors, setActors] = useState('');
  const [year, setYear] = useState('');
  const [region, setRegion] = useState('');
  const [duration, setDuration] = useState('');
  const [status, setStatus] = useState<BookStatus | MovieStatus>('want');
  const [rating, setRating] = useState<number | null>(null);
  const [doubanRating, setDoubanRating] = useState('');
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // 错误和加载
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 重复检测
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string; title: string; status: string } | null>(null);
  const dupCheckRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 封面上传
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 分类列表
  const [categories, setCategories] = useState<string[]>(isBook ? DEFAULT_BOOK_CATEGORIES : DEFAULT_MOVIE_GENRES);

  // 重置表单到初始状态（切换类型时调用）
  const resetForm = useCallback((newIsBook: boolean) => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
    setHasSearched(false);
    setShowResults(false);
    setTitle('');
    setAuthor('');
    setPublisher('');
    setPubDate('');
    setCoverUrl('');
    setCategory(newIsBook ? '科幻' : '电影');
    setDirector('');
    setActors('');
    setYear('');
    setRegion('');
    setDuration('');
    setStatus('want');
    setRating(null);
    setDoubanRating('');
    setComment('');
    setTags([]);
    setTagInput('');
    setError('');
    setDuplicateWarning(null);
  }, []);

  // kind 变化时（用户切换 tab）重置表单
  useEffect(() => {
    if (!isEdit) {
      resetForm(isBook);
    }
  }, [kind, isEdit, resetForm, isBook]);

  // 加载分类
  useEffect(() => {
    async function loadCategories() {
      try {
        const { data } = await supabase.from('settings').select('*').single();
        if (data) {
          if (isBook) setCategories([...data.book_categories, '未分类']);
          else setCategories([...data.movie_categories, '未分类']);
        }
      } catch { /* 用默认值 */ }
    }
    loadCategories();
  }, [isBook]);

  // 编辑模式预填
  useEffect(() => {
    if (!editItem) return;
    if (isBook) {
      const b = editItem as Book;
      setTitle(b.title);
      setAuthor(b.author || '');
      setPublisher(b.publisher || '');
      setPubDate(b.pub_date || '');
      setCoverUrl(b.cover_url || '');
      setCategory(b.category);
      setStatus(b.status);
      setRating(b.rating);
      setDoubanRating(b.douban_rating ? String(b.douban_rating) : '');
      setComment(b.comment || '');
      setTags(b.tags || []);
    } else {
      const m = editItem as Movie;
      setTitle(m.title);
      setDirector(m.director || '');
      setActors(m.actors || '');
      setYear(m.year ? String(m.year) : '');
      setRegion(m.region || '');
      setDuration(m.duration ? String(m.duration) : '');
      setCoverUrl(m.cover_url || '');
      setCategory(m.genre);
      setStatus(m.status);
      setRating(m.rating);
      setDoubanRating(m.douban_rating ? String(m.douban_rating) : '');
      setComment(m.comment || '');
      setTags(m.tags || []);
    }
  }, [editItem, isBook]);

  // 重复检测 — 标题变化时防抖查询是否已录入过（仅新增模式）
  useEffect(() => {
    if (isEdit) return; // 编辑模式不检测
    if (!title.trim() || title.trim().length < 1) {
      setDuplicateWarning(null);
      return;
    }
    if (dupCheckRef.current) clearTimeout(dupCheckRef.current);
    dupCheckRef.current = setTimeout(async () => {
      const table = isBook ? 'books' : 'movies';
      const { data } = await supabase
        .from(table)
        .select('id,title,status')
        .ilike('title', title.trim())
        .limit(1);
      if (data && data.length > 0) {
        setDuplicateWarning(data[0] as { id: string; title: string; status: string });
      } else {
        setDuplicateWarning(null);
      }
    }, 500);
    return () => { if (dupCheckRef.current) clearTimeout(dupCheckRef.current); };
  }, [title, isEdit, isBook]);

  // 搜索（含防抖）— 统一走服务端 API 路由（豆瓣主源 + Google/TMDB 备源）
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setSearchError('');
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setSearchError('');
    setHasSearched(true);
    setShowResults(false);

    try {
      const endpoint = isBook ? '/api/search/books' : '/api/search/movies';
      const res = await fetch(`${endpoint}?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || `搜索失败 (HTTP ${res.status})`);
        setSearchResults([]);
      } else {
        setSearchResults(data.results || []);
        if ((data.results || []).length > 0) {
          setShowResults(true);
        }
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : '网络请求失败');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [isBook]);

  const onSearchInput = (val: string) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  // 选中搜索结果 — 先用 suggest 字段快速填表，再异步抓豆瓣详情补全评分等
  const pickResult = (result: BookSearchResult | MovieSearchResult) => {
    setShowResults(false);
    if (isBook) {
      const r = result as BookSearchResult;
      setTitle(r.title);
      setAuthor(r.author);
      setPublisher(r.publisher);
      setPubDate(r.pub_date);
      setCoverUrl(r.cover_url);
      if (r.category) setCategory(r.category);
      if (r.description) setComment(r.description.slice(0, 200));
      // 异步抓豆瓣评分 + 出版社
      if (r.douban_id) {
        setDoubanRating('获取中…');
        fetch(`/api/search/books/${r.douban_id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.douban_rating != null) {
              setDoubanRating(String(data.douban_rating));
            } else {
              setDoubanRating('');
            }
            // 如果 suggest 没返回出版社，用详情页的补全
            if (data.publisher && !r.publisher) {
              setPublisher(data.publisher);
            }
          })
          .catch(() => setDoubanRating(''));
      }
    } else {
      const r = result as MovieSearchResult;
      setTitle(r.title);
      setDirector(r.director);
      setActors(r.actors);
      setYear(r.year ? String(r.year) : '');
      setRegion(r.region);
      setDuration(r.duration ? String(r.duration) : '');
      setCoverUrl(r.cover_url);
      if (r.genre) setCategory(r.genre);
      if (r.overview) setComment(r.overview.slice(0, 200));
      // 异步抓豆瓣详情（评分 + 导演/演员/时长/地区/类型）
      if (r.douban_id) {
        setDoubanRating('获取中…');
        fetch(`/api/search/movies/${r.douban_id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.douban_rating != null) {
              setDoubanRating(String(data.douban_rating));
            } else {
              setDoubanRating('');
            }
            // 补全 suggest 没返回的字段（不覆盖用户已填的空值才填）
            if (data.director && !director) setDirector(data.director);
            if (data.actors && !actors) setActors(data.actors);
            if (data.duration && !duration) setDuration(String(data.duration));
            if (data.region && !region) setRegion(data.region);
            if (data.year && !year) setYear(String(data.year));
            if (data.genre && (!category || category === '电影')) setCategory(data.genre);
          })
          .catch(() => setDoubanRating(''));
      }
    }
  };

  // 标签操作
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  // 封面上传 — 改为客户端压缩后转 base64，存到 cover_url 字段
  // （不再依赖 Supabase Storage，零配置即可使用）
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      // 限制文件大小（2MB 原图）
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('封面图片建议不超过 2MB（太大时数据库会很占空间）');
      }
      // 限制文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('仅支持 JPG / PNG / WebP / GIF 格式');
      }
      // canvas 压缩到最长边 800px，转 base64
      const dataUrl = await compressImageToBase64(file, 800, 0.85);
      setCoverUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : '封面上传失败');
    } finally {
      setUploading(false);
      // 清空 input，允许重复上传同一文件
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 保存
  const handleSave = async () => {
    if (!title.trim()) {
      setError('请填写标题');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isBook) {
        // 规范化 pub_date：必须是合法 YYYY-MM-DD，否则不写入（避免 Postgres DATE 字段报错）
        const normalizedPubDate = (() => {
          const v = pubDate.trim();
          if (!v) return undefined;
          if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(v)) {
            // 补零成 YYYY-MM-DD
            const [y, m, d] = v.split('-').map((x) => parseInt(x, 10));
            if (y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
              return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            }
            return undefined;
          }
          // 仅年份 YYYY → 补成 YYYY-01-01（合理默认）
          if (/^\d{4}$/.test(v)) {
            return `${v}-01-01`;
          }
          // 不合法格式，跳过
          return undefined;
        })();

        const input: BookInput = {
          title: title.trim(),
          author: author.trim() || undefined,
          publisher: publisher.trim() || undefined,
          pub_date: normalizedPubDate,
          cover_url: coverUrl.trim() || undefined,
          category,
          tags,
          status: status as BookStatus,
          rating,
          douban_rating: doubanRating && !isNaN(parseFloat(doubanRating)) ? parseFloat(doubanRating) : null,
          comment: comment.trim() || undefined,
        };
        if (isEdit && editItem) {
          await updateBook(editItem.id, input);
        } else {
          await createBook(input);
        }
      } else {
        const input: MovieInput = {
          title: title.trim(),
          director: director.trim() || undefined,
          actors: actors.trim() || undefined,
          year: year ? parseInt(year) : undefined,
          region: region.trim() || undefined,
          duration: duration ? parseInt(duration) : undefined,
          genre: category,
          cover_url: coverUrl.trim() || undefined,
          tags,
          status: status as MovieStatus,
          rating,
          douban_rating: doubanRating && !isNaN(parseFloat(doubanRating)) ? parseFloat(doubanRating) : null,
          comment: comment.trim() || undefined,
        };
        if (isEdit && editItem) {
          await updateMovie(editItem.id, input);
        } else {
          await createMovie(input);
        }
      }
      // 通知列表页刷新
      window.dispatchEvent(new CustomEvent('item-saved'));
      onClose();
    } catch (err: any) {
      // 把 Supabase PostgrestError / 其他错误的真实信息展示出来
      let msg = '保存失败，请重试';
      if (err && typeof err === 'object') {
        const parts: string[] = [];
        if (err.message) parts.push(err.message);
        if (err.code) parts.push(`[${err.code}]`);
        if (err.details) parts.push(`(${err.details})`);
        if (err.hint) parts.push(`提示：${err.hint}`);
        if (parts.length > 0) msg = parts.join(' ');
      } else if (err instanceof Error) {
        msg = err.message;
      }
      console.error('[AddItemModal] save error:', err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = isBook ? BOOK_STATUSES : MOVIE_STATUSES;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[8vh] px-4 animate-fade-up"
      style={{ background: 'rgba(43,42,38,.42)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#FFFDF9] rounded-[18px] shadow-[0_18px_44px_rgba(0,0,0,.25)] w-full max-w-[560px] max-h-[82vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-[24px] py-[18px] border-b border-[#EFEAE0] sticky top-0 bg-[#FFFDF9] z-10 rounded-t-[18px]">
          <div className="flex items-center gap-[14px]">
            <h3 className="font-serif text-[18px] font-bold">
              {isEdit ? '编辑' : '录入'}
              {isBook ? '书籍' : '影视'}
            </h3>
            {/* 类型切换 tab（仅新增模式） */}
            {!isEdit && onSwitchKind && (
              <div className="flex bg-[#F6F3EE] rounded-[8px] p-[2px]">
                <button
                  onClick={() => onSwitchKind('books')}
                  className={`px-[10px] py-[3px] rounded-[6px] text-[12px] font-medium transition-all ${
                    isBook ? 'bg-white text-[#2E5E4E] shadow-sm' : 'text-[#A39D90] hover:text-[#6F6A5E]'
                  }`}
                >
                  📚 书籍
                </button>
                <button
                  onClick={() => onSwitchKind('movies')}
                  className={`px-[10px] py-[3px] rounded-[6px] text-[12px] font-medium transition-all ${
                    !isBook ? 'bg-white text-[#C07A2E] shadow-sm' : 'text-[#A39D90] hover:text-[#6F6A5E]'
                  }`}
                >
                  🎬 影视
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[#A39D90] hover:bg-[#F6F3EE] hover:text-[#2B2A26] transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-[24px] py-[20px]">
          {/* 搜索区 */}
          {!isEdit && (
            <div className="mb-[20px]">
              <label className="text-[12.5px] text-[#6F6A5E] mb-[6px] block">
                {isBook ? '搜索书名（豆瓣图书自动补全）' : '搜索片名（豆瓣电影自动补全）'}
              </label>
              <div className="relative">
                <input
                  className="input pr-[36px]"
                  placeholder={isBook ? '输入书名 / 作者…' : '输入片名 / 导演…'}
                  value={searchQuery}
                  onChange={(e) => onSearchInput(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 200)}
                />
                {searching && (
                  <div className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#A39D90] text-[12px]">搜索中…</div>
                )}
              </div>
              {/* 搜索错误提示 */}
              {searchError && (
                <div className="mt-[6px] px-[10px] py-[6px] bg-[#F9ECEC] border border-[#D8B4B4] rounded-[8px] text-[11.5px] text-[#B05656] flex items-start gap-[6px]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-[1px] flex-shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  <span>搜索失败：{searchError}。可直接在下方手动填写。</span>
                </div>
              )}
              {/* 搜索结果 */}
              {showResults && searchResults.length > 0 && (
                <div className="mt-[6px] border border-[#E7E1D4] rounded-[12px] bg-white max-h-[240px] overflow-y-auto shadow-[0_8px_24px_rgba(43,42,38,.1)]">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      onMouseDown={() => pickResult(r)}
                      className="flex items-center gap-[10px] w-full px-[12px] py-[8px] text-left transition-all hover:bg-[#F6F3EE] border-b border-[#EFEAE0] last:border-b-0"
                    >
                      {r.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={proxyCover(r.cover_url)} alt="" className="w-[28px] h-[40px] object-cover rounded-[4px] flex-shrink-0" />
                      ) : (
                        <div className="w-[28px] h-[40px] rounded-[4px] flex-shrink-0" style={{ background: 'var(--green-soft)' }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-[#2B2A26] truncate">{r.title}</div>
                        <div className="text-[11px] text-[#A39D90] truncate">
                          {isBook
                            ? `${(r as BookSearchResult).author || ''} ${(r as BookSearchResult).publisher || ''}`
                            : `${(r as MovieSearchResult).director || ''} ${(r as MovieSearchResult).year || ''}`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {/* 搜索无结果提示 */}
              {hasSearched && !searching && !searchError && searchResults.length === 0 && (
                <div className="mt-[6px] text-[11.5px] text-[#A39D90] py-[6px]">
                  未找到相关结果，可直接在下方手动填写。
                </div>
              )}
              {/* 外部搜索快捷链接（兜底：自动补全不可用时手动查信息） */}
              <div className="mt-[10px] pt-[10px] border-t border-dashed border-[#EFEAE0]">
                <div className="text-[11.5px] text-[#6F6A5E] mb-[7px] font-medium flex items-center gap-[5px]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                  找不到可用的自动补全？输入名称后点链接去外部网站搜
                </div>
                {searchQuery.trim() ? (
                  <div className="flex flex-wrap gap-[6px]">
                    {(isBook ? [
                      { label: '百度', url: `https://www.baidu.com/s?wd=${encodeURIComponent(searchQuery.trim() + ' 书籍')}` },
                      { label: '豆瓣读书', url: `https://www.douban.com/search?cat=1001&q=${encodeURIComponent(searchQuery.trim())}` },
                      { label: '当当', url: `https://search.dangdang.com/?key=${encodeURIComponent(searchQuery.trim())}` },
                      { label: '京东图书', url: `https://search.jd.com/Search?keyword=${encodeURIComponent(searchQuery.trim())}&enc=utf-8` },
                      { label: '孔夫子', url: `https://search.kongfz.com/item_result/?key=${encodeURIComponent(searchQuery.trim())}` },
                    ] : [
                      { label: '百度', url: `https://www.baidu.com/s?wd=${encodeURIComponent(searchQuery.trim() + ' 影视')}` },
                      { label: '豆瓣电影', url: `https://movie.douban.com/subject_search?search_text=${encodeURIComponent(searchQuery.trim())}&cat=1002` },
                      { label: '爱奇艺', url: `https://so.iqiyi.com/so/q_${encodeURIComponent(searchQuery.trim())}` },
                      { label: '腾讯视频', url: `https://v.qq.com/x/search/?q=${encodeURIComponent(searchQuery.trim())}` },
                      { label: 'B站', url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(searchQuery.trim())}` },
                    ]).map((link) => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-[10px] py-[4px] rounded-[7px] border border-[#E7E1D4] text-[#6F6A5E] hover:bg-[#F6F3EE] hover:border-[#2E5E4E] hover:text-[#2E5E4E] transition-all text-[11.5px] flex items-center gap-[3px]"
                      >
                        {link.label}
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M17 7H7m10 0v10" /></svg>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-[#A39D90]">先在上方输入名称再点链接（链接会带你的搜索词）</div>
                )}
                <div className="text-[11px] text-[#A39D90] mt-[8px]">
                  或直接在下方表单手动填写 ↓
                </div>
              </div>
            </div>
          )}

          {/* 表单 */}
          <div className="grid grid-cols-2 gap-[14px]">
            <div className="col-span-2">
              <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">标题 *</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="必填" />
              {/* 重复检测提示 */}
              {duplicateWarning && (
                <div className="mt-[6px] px-[10px] py-[7px] bg-[#FFF4E6] border border-[#E8C896] rounded-[8px] text-[11.5px] text-[#9A6B1F] flex items-start gap-[6px]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-[1px] flex-shrink-0">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <path d="M12 9v4M12 17h.01" />
                  </svg>
                  <span>
                    此{isBook ? '书籍' : '影视'}已存在于你的库中：
                    <a
                      href={`/detail/${isBook ? 'books' : 'movies'}/${duplicateWarning.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline hover:text-[#2E5E4E] ml-[2px]"
                    >
                      「{duplicateWarning.title}」
                    </a>
                    。确认要继续录入吗？
                  </span>
                </div>
              )}
            </div>

            {isBook ? (
              <>
                <div>
                  <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">作者</label>
                  <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
                </div>
                <div>
                  <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">出版社</label>
                  <input className="input" value={publisher} onChange={(e) => setPublisher(e.target.value)} />
                </div>
                <div>
                  <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">出版日期</label>
                  <input className="input" value={pubDate} onChange={(e) => setPubDate(e.target.value)} placeholder="YYYY-MM-DD" />
                </div>
                <div>
                  <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">类型</label>
                  <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">导演</label>
                  <input className="input" value={director} onChange={(e) => setDirector(e.target.value)} />
                </div>
                <div>
                  <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">主演</label>
                  <input className="input" value={actors} onChange={(e) => setActors(e.target.value)} />
                </div>
                <div>
                  <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">年份</label>
                  <input className="input" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" />
                </div>
                <div>
                  <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">地区</label>
                  <input className="input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="中国/美国/日本" />
                </div>
                <div>
                  <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">时长(分钟)</label>
                  <input className="input" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="120" />
                </div>
                <div>
                  <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">类型</label>
                  <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">封面</label>
              <div className="flex gap-[6px]">
                <input className="input flex-1" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="粘贴 URL…" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn btn-soft px-3 flex-shrink-0 whitespace-nowrap"
                  title="上传本地图片作为封面"
                >
                  {uploading ? '上传中…' : '上传'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </div>
              {/* 封面预览 */}
              {coverUrl && (
                <div className="mt-[6px] flex items-center gap-[8px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proxyCover(coverUrl)} alt="封面预览" className="w-[36px] h-[50px] object-cover rounded-[4px] border border-[#E7E1D4]" />
                  <span className="text-[11px] text-[#A39D90]">封面预览</span>
                </div>
              )}
            </div>
            <div>
              <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">状态</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as BookStatus | MovieStatus)}>
                {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">我的评分</label>
              <StarRating value={rating} onChange={setRating} size="md" />
            </div>

            <div>
              <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">豆瓣评分（选填）</label>
              <input className="input" value={doubanRating} onChange={(e) => setDoubanRating(e.target.value)} placeholder="8.5" />
            </div>

            <div>
              <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">标签</label>
              <div className="flex gap-[6px]">
                <input
                  className="input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="回车添加"
                />
                <button type="button" onClick={addTag} className="btn btn-soft px-3 flex-shrink-0">+</button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-[5px] mt-[6px]">
                  {tags.map((t) => (
                    <span key={t} className="tag tag-type" style={{ cursor: 'pointer' }} onClick={() => setTags(tags.filter((x) => x !== t))}>
                      {t} ×
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-2">
              <label className="text-[12.5px] text-[#6F6A5E] mb-[5px] block">短评</label>
              <textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="一句话感受…" />
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mt-[14px] px-[14px] py-[8px] bg-[#F9ECEC] border border-[#D8B4B4] rounded-[8px] text-[#B05656] text-[12.5px]">
              {error}
            </div>
          )}

          {/* 按钮 */}
          <div className="flex justify-end gap-[10px] mt-[20px]">
            <button onClick={onClose} className="btn btn-ghost">取消</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              {saving ? '保存中…' : isEdit ? '保存修改' : '确认录入'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 压缩图片到最长边 maxSize 像素，转成 base64 dataURL
 * - 等比例缩放
 * - 统一输出 jpeg（节省空间）
 * - 失败时抛出 Error
 */
function compressImageToBase64(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片加载失败'));
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          // 等比例缩放到最长边 = maxSize
          if (w >= h) {
            h = Math.round((h * maxSize) / w);
            w = maxSize;
          } else {
            w = Math.round((w * maxSize) / h);
            h = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('当前浏览器不支持图片压缩'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        // 优先输出 jpeg；若原图透明（如 PNG）则用 png
        const outputType = file.type === 'image/png' && hasTransparency(img) ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(outputType, quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 简单检测 PNG 是否含透明像素（前 32x32 抽样）
 */
function hasTransparency(img: HTMLImageElement): boolean {
  const canvas = document.createElement('canvas');
  const sampleSize = Math.min(32, img.width, img.height);
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  try {
    const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
  } catch {
    return false;
  }
  return false;
}
