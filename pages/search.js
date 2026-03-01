import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import {
  Search, X, Star, Eye,
  ChevronDown, Flame, Clock,
  Filter, ArrowUpDown, SearchX
} from 'lucide-react';
import { IoBookmarkOutline, IoBookmark } from "react-icons/io5";
import MobileNavbar from '../components/MobileNavbar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SORT_OPTIONS = [
  { value: 'newest',  label: 'Eng Yangi',     icon: 'clock' },
  { value: 'rating',  label: 'Reyting',        icon: 'star' },
  { value: 'views',   label: "Ko'p Ko'rilgan", icon: 'eye' },
  { value: 'popular', label: 'Mashhur',        icon: 'flame' },
];

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const SkeletonCard = () => (
  <div className="sk-card">
    <div className="sk-img"><div className="sk-shine" /></div>
    <div className="sk-body">
      <div className="sk-line w70" />
      <div className="sk-line w45" />
    </div>
  </div>
);

function AnimeCard({ anime, allViews, favorites, toggleFavorite, goToAnime, index }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const isFav = favorites.includes(anime.id);

  return (
    <div
      className="a-card"
      onClick={() => goToAnime(anime)}
      style={{ animationDelay: Math.min(index * 0.04, 0.35) + 's' }}
    >
      <div className="a-card-img-wrap">
        {!imgLoaded && <div className="a-card-img-skeleton" />}
        <img
          src={anime.image_url}
          alt={anime.title}
          className={'a-card-img' + (imgLoaded ? ' visible' : '')}
          onLoad={() => setImgLoaded(true)}
        />
        <div className="a-card-top-row">
          <span className="a-card-views">
            <Eye size={11} style={{marginRight:3}} /> {allViews[anime.id] || 0}
          </span>
          <button
            className={'a-card-fav' + (isFav ? ' active' : '')}
            onClick={e => { e.stopPropagation(); toggleFavorite(anime.id); }}
          >
            {isFav ? <IoBookmark size={20} /> : <IoBookmarkOutline size={20} />}
          </button>
        </div>
        <div className="a-card-overlay">
          <div className="a-card-meta">
            <span className="a-card-rating">
              <Star size={12} fill="currentColor" style={{marginRight:3}} /> {anime.rating}
            </span>
            <span className="a-card-eps">{anime.episodes} qism</span>
          </div>
          {anime.genres && anime.genres.length > 0 && (
            <div className="a-card-genres">
              {anime.genres.slice(0, 2).map((g, i) => (
                <span key={i} className="a-card-genre-tag">{g}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="a-card-title">{anime.title}</div>
    </div>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [allAnime, setAllAnime] = useState([]);
  const [allViews, setAllViews] = useState({});
  const [favorites, setFavorites] = useState([]);

  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('search');

  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    setMounted(true);
    loadUser();
    loadData();
    const urlQ = new URLSearchParams(window.location.search).get('q');
    if (urlQ) setQuery(urlQ);
    setTimeout(() => inputRef.current && inputRef.current.focus(), 200);
  }, []);

  const loadUser = async () => {
    try {
      const raw = localStorage.getItem('anime_user');
      if (!raw) return;
      const u = JSON.parse(raw);
      setCurrentUser(u);
      const { data } = await supabase.from('user_favorites').select('anime_id').eq('user_id', u.id);
      if (data) setFavorites(data.map(f => f.anime_id));
    } catch(e) {}
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        supabase.from('anime_cards').select('*').order('created_at', { ascending: false }),
        supabase.from('anime_views').select('anime_id, view_count'),
      ]);
      setAllAnime(r1.data || []);
      const vObj = {};
      (r2.data || []).forEach(v => { vObj[v.anime_id] = (vObj[v.anime_id] || 0) + v.view_count; });
      setAllViews(vObj);
    } catch(e) {}
    setLoading(false);
  };

  const results = (() => {
    let arr = [...allAnime];
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      arr = arr.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        (a.genres || []).some(g => g.toLowerCase().includes(q))
      );
    }
    if (minRating > 0) arr = arr.filter(a => parseFloat(a.rating || 0) >= minRating);
    if (sortBy === 'rating') arr.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
    else if (sortBy === 'views' || sortBy === 'popular') arr.sort((a, b) => (allViews[b.id] || 0) - (allViews[a.id] || 0));
    else arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return arr;
  })();

  const toggleFavorite = async (animeId) => {
    if (!currentUser) return;
    const isFav = favorites.includes(animeId);
    if (isFav) {
      await supabase.from('user_favorites').delete().eq('user_id', currentUser.id).eq('anime_id', animeId);
      setFavorites(prev => prev.filter(id => id !== animeId));
    } else {
      await supabase.from('user_favorites').insert([{ user_id: currentUser.id, anime_id: animeId }]);
      setFavorites(prev => [...prev, animeId]);
    }
  };

  const goToAnime = (anime) => {
    const slug = anime.title.toLowerCase().replace(/\s+/g, '-');
    router.push('/anime/' + slug + '?id=' + anime.id);
  };

  const clearSearch = () => { setQuery(''); inputRef.current && inputRef.current.focus(); };
  const hasActiveFilters = minRating > 0 || sortBy !== 'newest';
  const activeSortLabel = (SORT_OPTIONS.find(o => o.value === sortBy) || {}).label || 'Saralash';

  if (!mounted) return null;

  return (
    <>
      <Head>
        <title>Qidirish — MochiTV</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; overflow-x: hidden; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #090b10;
          color: #fff;
          -webkit-tap-highlight-color: transparent;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.5); border-radius: 10px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }

        .bg-grid {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .bg-vignette {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(circle at 50% 0%, rgba(212,175,55,0.04), transparent 55%),
            radial-gradient(circle at 80% 80%, rgba(59,130,246,0.04), transparent 50%),
            linear-gradient(to top, #090b10 0%, transparent 100%);
        }

        .s-header {
          position: sticky; top: 0; z-index: 100;
          padding: 12px 16px;
          background: rgba(9,11,16,0.9);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .s-search-bar {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 0 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .s-search-bar:focus-within {
          border-color: rgba(59,130,246,0.6);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }
        .s-search-icon { color: rgba(255,255,255,0.35); flex-shrink: 0; }
        .s-input {
          flex: 1; background: transparent; border: none;
          color: #fff; font-size: 16px; padding: 13px 0;
          outline: none;
        }
        .s-input::placeholder { color: rgba(255,255,255,0.25); }
        .s-clear-btn {
          background: rgba(255,255,255,0.08); border: none;
          color: rgba(255,255,255,0.5); width: 24px; height: 24px;
          border-radius: 50%; cursor: pointer; display: flex;
          align-items: center; justify-content: center;
          transition: all 0.2s; flex-shrink: 0;
        }
        .s-clear-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }

        .s-wrapper {
          position: relative; z-index: 1;
          max-width: 1400px; margin: 0 auto;
          padding: 20px 16px 100px;
        }

        .s-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; margin-bottom: 20px;
        }
        .s-result-count { font-size: 13px; color: rgba(255,255,255,0.35); }
        .s-result-count b { color: rgba(255,255,255,0.7); }
        .s-toolbar-right { display: flex; align-items: center; gap: 8px; }

        .s-sort-wrap { position: relative; }
        .s-sort-btn {
          display: flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #e2e8f0; padding: 8px 12px; border-radius: 10px;
          cursor: pointer; font-size: 13px; font-weight: 600;
          transition: all 0.2s; white-space: nowrap;
        }
        .s-sort-btn:hover, .s-sort-btn.open {
          border-color: rgba(59,130,246,0.5);
          background: rgba(59,130,246,0.08);
        }
        .s-chevron { transition: transform 0.2s; display:flex; align-items:center; }
        .s-sort-btn.open .s-chevron { transform: rotate(180deg); }
        .s-dropdown {
          position: absolute; top: calc(100% + 6px); right: 0;
          background: #13161e; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; overflow: hidden; z-index: 50;
          min-width: 170px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.7);
          animation: dropIn 0.15s ease;
        }
        @keyframes dropIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
        .s-dropdown-item {
          display: flex; align-items: center; gap: 9px;
          padding: 11px 16px; cursor: pointer;
          font-size: 13px; color: rgba(255,255,255,0.65);
          transition: all 0.15s;
        }
        .s-dropdown-item:hover { background: rgba(59,130,246,0.1); color: #fff; }
        .s-dropdown-item.active { color: #60a5fa; background: rgba(59,130,246,0.08); }

        .s-filter-btn {
          display: flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.65); padding: 8px 12px; border-radius: 10px;
          cursor: pointer; font-size: 13px; font-weight: 600;
          transition: all 0.2s; position: relative;
        }
        .s-filter-btn:hover, .s-filter-btn.open {
          border-color: rgba(139,92,246,0.5);
          background: rgba(139,92,246,0.08);
          color: #fff;
        }
        .s-filter-dot {
          position: absolute; top: 6px; right: 6px;
          width: 7px; height: 7px; border-radius: 50%; background: #3b82f6;
        }

        .s-filter-panel {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 18px;
          margin-bottom: 20px;
          animation: fadeSlide 0.2s ease;
        }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
        .s-filter-label {
          font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
          color: rgba(255,255,255,0.3); text-transform: uppercase; margin-bottom: 12px;
        }
        .s-rating-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .s-rating-chip {
          padding: 6px 14px; border-radius: 50px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.55);
          cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;
        }
        .s-rating-chip.active {
          background: rgba(251,191,36,0.12); border-color: rgba(251,191,36,0.45); color: #fbbf24;
        }
        .s-rating-chip:hover { border-color: rgba(251,191,36,0.35); color: #fbbf24; }
        .s-reset-btn {
          margin-top: 14px; background: none;
          border: 1px dashed rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.35); padding: 7px 16px;
          border-radius: 8px; cursor: pointer; font-size: 12px; transition: all 0.2s;
        }
        .s-reset-btn:hover { border-color: #ef4444; color: #ef4444; }

        .s-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
          gap: 16px;
        }
        @media (min-width: 600px) {
          .s-grid { grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)); gap: 18px; }
        }
        @media (min-width: 1024px) {
          .s-grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 20px; }
        }

        .a-card { cursor: pointer; opacity: 0; animation: cardIn 0.35s ease forwards; }
        @keyframes cardIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        .a-card-img-wrap {
          position: relative; width: 100%; aspect-ratio: 2/3;
          border-radius: 14px; overflow: hidden; background: #131720;
        }
        .a-card-img-skeleton {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, #131720, #1e2535, #131720);
          background-size: 200% 100%; animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .a-card-img { width:100%; height:100%; object-fit:cover; opacity:0; transition: opacity 0.4s, transform 0.4s; }
        .a-card-img.visible { opacity: 1; }
        .a-card:hover .a-card-img { transform: scale(1.06); }

        .a-card-top-row {
          position: absolute; top: 0; left: 0; right: 0;
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px;
          background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);
          z-index: 3;
        }
        .a-card-views {
          display: flex; align-items: center;
          font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.85);
          background: rgba(0,0,0,0.5); backdrop-filter: blur(6px);
          padding: 4px 8px; border-radius: 7px;
        }
        .a-card-fav {
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.65); transition: all 0.2s; display: flex; align-items: center;
        }
        .a-card-fav:hover { color: #fff; transform: scale(1.15); }
        .a-card-fav.active { color: #fbbf24; }

        .a-card-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 55%);
          opacity: 0; transition: opacity 0.3s;
          display: flex; flex-direction: column; justify-content: flex-end;
          padding: 12px; z-index: 2;
        }
        .a-card:hover .a-card-overlay { opacity: 1; }
        .a-card-meta { display: flex; gap: 8px; align-items: center; font-size: 12px; margin-bottom: 7px; }
        .a-card-rating { display: flex; align-items: center; color: #fbbf24; font-weight: 700; }
        .a-card-eps { color: rgba(255,255,255,0.7); }
        .a-card-genres { display: flex; gap: 5px; flex-wrap: wrap; }
        .a-card-genre-tag {
          background: rgba(59,130,246,0.22); border: 1px solid rgba(59,130,246,0.4);
          color: #93c5fd; font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 4px;
        }
        .a-card-title {
          font-size: 13px; font-weight: 600; color: #cbd5e1;
          margin-top: 8px; padding: 0 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color 0.2s;
        }
        .a-card:hover .a-card-title { color: #fff; }

        .sk-card { display: flex; flex-direction: column; gap: 10px; }
        .sk-img { width:100%; aspect-ratio:2/3; background:#131720; border-radius:14px; position:relative; overflow:hidden; }
        .sk-shine {
          position:absolute; inset:0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
          background-size: 200% 100%; animation: shimmer 1.5s infinite;
        }
        .sk-body { display:flex; flex-direction:column; gap:6px; padding:0 2px; }
        .sk-line {
          height:11px; border-radius:4px; background:#131720; position:relative; overflow:hidden;
        }
        .sk-line::after {
          content:''; position:absolute; inset:0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
          background-size: 200% 100%; animation: shimmer 1.5s infinite;
        }
        .w70 { width:70%; } .w45 { width:45%; }

        .s-empty {
          grid-column: 1 / -1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 80px 20px; text-align: center;
        }
        .s-empty-icon {
          width: 76px; height: 76px; border-radius: 50%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.25); margin-bottom: 18px;
        }
        .s-empty h3 { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
        .s-empty p { color: rgba(255,255,255,0.35); font-size: 14px; }
        .s-empty-reset {
          margin-top: 18px;
          background: rgba(59,130,246,0.12);
          border: 1px solid rgba(59,130,246,0.35);
          color: #60a5fa; padding: 10px 22px;
          border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600;
          transition: all 0.2s;
        }
        .s-empty-reset:hover { background: rgba(59,130,246,0.22); }

        @media (max-width: 480px) {
          .s-wrapper { padding: 16px 12px 90px; }
          .hide-sm { display: none; }
        }
      `}</style>

      <div className="bg-grid" />
      <div className="bg-vignette" />

      <header className="s-header">
        <div className="s-search-bar">
          <Search size={18} className="s-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="s-input"
            placeholder="Anime nomini yozing..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button className="s-clear-btn" onClick={clearSearch}>
              <X size={13} />
            </button>
          )}
        </div>
      </header>

      <main className="s-wrapper" onClick={() => setShowSortDropdown(false)}>

        <div className="s-toolbar">
          <span className="s-result-count">
            {loading
              ? 'Yuklanmoqda...'
              : <><b>{results.length}</b> ta anime</>
            }
          </span>
          <div className="s-toolbar-right">
            <button
              className={'s-filter-btn' + (showFilters ? ' open' : '')}
              onClick={e => { e.stopPropagation(); setShowFilters(v => !v); }}
            >
              <Filter size={14} />
              <span className="hide-sm">Filter</span>
              {hasActiveFilters && <span className="s-filter-dot" />}
            </button>

            <div className="s-sort-wrap" onClick={e => e.stopPropagation()}>
              <button
                className={'s-sort-btn' + (showSortDropdown ? ' open' : '')}
                onClick={() => setShowSortDropdown(v => !v)}
              >
                <ArrowUpDown size={14} />
                <span className="hide-sm">{activeSortLabel}</span>
                <span className="s-chevron"><ChevronDown size={13} /></span>
              </button>
              {showSortDropdown && (
                <div className="s-dropdown">
                  {SORT_OPTIONS.map(o => (
                    <div
                      key={o.value}
                      className={'s-dropdown-item' + (sortBy === o.value ? ' active' : '')}
                      onClick={() => { setSortBy(o.value); setShowSortDropdown(false); }}
                    >
                      {o.value === 'newest' && <Clock size={14} />}
                      {o.value === 'rating' && <Star size={14} />}
                      {o.value === 'views'  && <Eye size={14} />}
                      {o.value === 'popular'&& <Flame size={14} />}
                      {o.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="s-filter-panel">
            <div className="s-filter-label">Minimal Reyting</div>
            <div className="s-rating-row">
              {[0, 6, 7, 8, 9].map(r => (
                <button
                  key={r}
                  className={'s-rating-chip' + (minRating === r ? ' active' : '')}
                  onClick={() => setMinRating(r)}
                >
                  {r === 0 ? 'Barchasi' : r + '+ \u2b50'}
                </button>
              ))}
            </div>
            {hasActiveFilters && (
              <button className="s-reset-btn" onClick={() => { setMinRating(0); setSortBy('newest'); setQuery(''); }}>
                Filterni tozalash
              </button>
            )}
          </div>
        )}

        <div className="s-grid">
          {loading ? (
            Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)
          ) : results.length === 0 ? (
            <div className="s-empty">
              <div className="s-empty-icon"><SearchX size={34} /></div>
              <h3>Natija topilmadi</h3>
              <p>
                {debouncedQuery
                  ? '"' + debouncedQuery + '" bo\'yicha hech narsa topilmadi'
                  : "Tanlangan filtrlarga mos anime yo'q"}
              </p>
              <button className="s-empty-reset" onClick={() => { setQuery(''); setMinRating(0); setSortBy('newest'); }}>
                Qaytadan boshlash
              </button>
            </div>
          ) : (
            results.map((anime, i) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                allViews={allViews}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                goToAnime={goToAnime}
                index={i}
              />
            ))
          )}
        </div>
      </main>

      <MobileNavbar
        currentUser={currentUser}
        onSearchClick={() => setActiveTab('search')}
        onProfileClick={() => currentUser && router.push('/profile/' + currentUser.username)}
        onHomeClick={() => router.push('/')}
        activeTab={activeTab}
      />
    </>
  );
}