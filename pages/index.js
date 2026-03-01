import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import { Heart, LogOut, Lock, Loader, Eye, Play, Youtube, X, Search, Calendar, ExternalLink, ThumbsUp, Share2, CheckCircle } from 'lucide-react';
import { FaTelegramPlane } from "react-icons/fa";
import { IoBookmarkOutline, IoBookmark } from "react-icons/io5";
import { LuInstagram } from "react-icons/lu";
import Head from "next/head";
import { createClient } from '@supabase/supabase-js';
import MobileNavbar from '../components/MobileNavbar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);


const LOGO_URL = '/assets/lego.png';

// --- MANTIQ: 24 Soatlik Random (Seeded Shuffle) ---
const getDailySeed = () => {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
};

const dailyShuffle = (array) => {
  const seed = getDailySeed();
  const shuffled = [...array];
  
  const random = (seedValue) => {
    var x = Math.sin(seedValue) * 10000;
    return x - Math.floor(x);
  };

  let currentSeed = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    const r = random(currentSeed++);
    const j = Math.floor(r * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
// --------------------------------------------------

// ===================================================
// ✅ NEWS SLIDER — DOM-ref usuli (100% ishonchli infinity loop)
// ===================================================
const NewsSlider = ({ news }) => {
  const [itemsPerView, setItemsPerView] = useState(3);

  const trackRef = useRef(null);
  const idxRef = useRef(0);
  const ipvRef = useRef(3);
  const lenRef = useRef(0);
  const intervalRef = useRef(null);
  const isJumping = useRef(false);
  const isTouching = useRef(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const safeNews = Array.isArray(news) && news.length > 0 ? news : [];

  useEffect(() => {
    ipvRef.current = itemsPerView;
  }, [itemsPerView]);

  useEffect(() => {
    lenRef.current = safeNews.length;
  }, [safeNews.length]);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const ipv = w >= 1200 ? 3 : w >= 768 ? 2 : 1;
      ipvRef.current = ipv;
      setItemsPerView(ipv);
      if (trackRef.current) {
        idxRef.current = 0;
        trackRef.current.style.transition = 'none';
        trackRef.current.style.transform = 'translateX(0%)';
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const moveTo = (newIdx) => {
    if (!trackRef.current) return;
    idxRef.current = newIdx;
    trackRef.current.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
    trackRef.current.style.transform = `translateX(-${newIdx * (100 / ipvRef.current)}%)`;
  };

  const jumpTo = (newIdx) => {
    if (!trackRef.current) return;
    idxRef.current = newIdx;
    trackRef.current.style.transition = 'none';
    trackRef.current.style.transform = `translateX(-${newIdx * (100 / ipvRef.current)}%)`;
  };

  const stopAuto = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const nextSlide = () => {
    if (lenRef.current === 0 || isJumping.current) return;
    moveTo(idxRef.current + 1);
  };

  const prevSlide = () => {
    if (lenRef.current === 0 || isJumping.current) return;
    stopAuto();
    moveTo(idxRef.current - 1);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onTransitionEnd = () => {
      const idx = idxRef.current;
      const len = lenRef.current;
      if (len === 0) return;

      if (idx >= len) {
        isJumping.current = true;
        jumpTo(idx - len);
        // ✅ BUG FIX: setTimeout kafolatlangan reset (rAF ba'zi brauzerlarda ishlamaydi)
        setTimeout(() => {
          isJumping.current = false;
        }, 50);
      } else if (idx < 0) {
        isJumping.current = true;
        jumpTo(len - 1);
        setTimeout(() => {
          isJumping.current = false;
        }, 50);
      }
    };

    track.addEventListener('transitionend', onTransitionEnd);
    return () => track.removeEventListener('transitionend', onTransitionEnd);
  }, [safeNews.length]);

  useEffect(() => {
    if (safeNews.length === 0) return;
    stopAuto();
    intervalRef.current = setInterval(() => {
      nextSlide();
    }, 4000);
    return () => stopAuto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsPerView, safeNews.length]);

  const handleTouchStart = (e) => {
    stopAuto();
    isTouching.current = true;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (!isTouching.current) return;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isTouching.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) nextSlide();
    if (distance < -50) prevSlide();
    isTouching.current = false;
    intervalRef.current = setInterval(() => nextSlide(), 4000);
  };

  // ✅ BUG FIX: news bo'sh bo'lsa null qaytarmasdan placeholder ko'rsatamiz
  if (!safeNews || safeNews.length === 0) {
    return (
      <div className="news-section-wrapper">
        <div className="row-title-header">
          <h2 className="news-main-title">E'lon va yangiliklar</h2>
        </div>
        <div style={{ 
          height: 200, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: 14
        }}>
          Yangiliklar yuklanmoqda...
        </div>
      </div>
    );
  }

  const clones = safeNews.slice(0, itemsPerView);
  const extendedNews = [...safeNews, ...clones];

  return (
    <div className="news-section-wrapper">
      <div className="row-title-header">
        <h2 className="news-main-title">E'lon va yangiliklar</h2>
      </div>

      <div
        className="news-slider-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={trackRef}
          className="news-track"
          style={{
            display: 'flex',
            width: '100%',
            willChange: 'transform',
          }}
        >
          {extendedNews.map((item, index) => (
            <div 
              key={`${item.id}-${index}`} 
              className="news-slide-item"
              style={{
                flex: `0 0 ${100 / itemsPerView}%`,
                maxWidth: `${100 / itemsPerView}%`,
                padding: '0 10px'
              }}
            >
               <div className="news-card">
                <div className="news-bg-image" style={{ backgroundImage: `url(${item.image_url || LOGO_URL})` }}></div>
                <div className="news-overlay"></div>

                <div className="news-header">
                  <div className="news-views">
                    <span style={{ fontWeight: '700' }}>Popular</span>
                  </div>
                  <div className="news-date">
                    <Calendar size={14} />
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="news-content-wrapper">
                  <div className="news-author">
                    <img src="http://localhost:3000/favicon.png" alt="Author" className="news-author-img" />
                    <div className="news-author-info">
                      <div className="news-author-name">
                        MochitvUz
                        <CheckCircle size={14} className="verified-icon" fill="#3b82f6" color="#fff" />
                      </div>
                    </div>
                    <button className="news-sub-btn">Obuna</button>
                  </div>

                  <div className="news-text-body">
                    <h3 className="news-title">🔥 {item.title}</h3>
                    <p className="news-desc">{item.content}</p>
                  </div>

                  <a href={item.external_link || '#'} target="_blank" rel="noreferrer" className="news-action-btn">
                    To'liq ko'rish <ExternalLink size={16} />
                  </a>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// Skeleton Card Component
const SkeletonCard = () => (
  <div className="anime-card-skeleton">
    <div className="skeleton-image-wrapper">
       <div className="skeleton-shine"></div>
    </div>
    <div className="skeleton-text-line title"></div>
    <div className="skeleton-text-line meta"></div>
  </div>
);

// Individual Anime Card
function AnimeCard({ anime, allViews, favorites, toggleFavorite, goToAnime, isHorizontal = false }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className={`anime-card ${isHorizontal ? 'horizontal-card' : ''}`} onClick={() => goToAnime(anime)}>
      <div className="card-image-wrapper">
        {!imageLoaded && <div className="skeleton-image-overlay" />}
        <img 
          className={`card-image ${imageLoaded ? 'loaded' : 'loading'}`} 
          src={anime.image_url} 
          alt={anime.title} 
          onLoad={() => setImageLoaded(true)}
        />
        
        <div className="card-header">
          <div className="card-views">
            <Eye size={12} />
            <span>{allViews[anime.id] || 0}</span>
          </div>
          <button 
            className={`card-like-btn ${favorites.includes(anime.id) ? 'liked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(anime.id);
            }}
          >
            {favorites.includes(anime.id) 
              ? <IoBookmark size={23} /> 
              : <IoBookmarkOutline size={23} />
            }
          </button>
        </div>
        
        <div className="card-overlay">
          <div className="card-overlay-info">
            <div className="card-overlay-meta">
              <div className="card-rating">
                <span>⭐ {anime.rating}</span>
              </div>
              <div className="card-episodes">{anime.episodes} qism</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card-content">
        <div className="card-title">{anime.title}</div>
      </div>
    </div>
  );
}

// Search Modal Component
function SearchModal({ onClose, animeCards, onAnimeClick, allViews }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    const results = animeCards.filter(anime =>
      anime.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(results);
  }, [searchQuery, animeCards]);

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-modal-header">
          <div className="search-input-wrapper">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Anime qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          <button className="search-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="search-results">
          {searchQuery.trim() === '' ? (
            <div className="search-empty">
              <Search size={48} />
              <p>Anime nomini kiriting</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="search-empty">
              <p>Natija topilmadi</p>
            </div>
          ) : (
            <div className="search-results-grid">
              {searchResults.map((anime) => (
                <div
                  key={anime.id}
                  className="search-result-card"
                  onClick={() => {
                    onAnimeClick(anime);
                    onClose();
                  }}
                >
                  <img src={anime.image_url} alt={anime.title} className="search-result-image" />
                  <div className="search-result-info">
                    <div className="search-result-title">{anime.title}</div>
                    <div className="search-result-meta">
                      <span>⭐ {anime.rating}</span>
                      <span>📺 {anime.episodes} qism</span>
                      <span className="search-result-views">
                        <Eye size={14} />
                        {allViews[anime.id] || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================================================
// ✅ TELEGRAM CODE MODAL
// ===================================================
function TelegramCodeModal({ onClose, onVerify, onStart, loading, errorText }) {
  const [code, setCode] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (String(code).trim().length !== 5) return;
    onVerify(code);
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="auth-modal-header">
          <h2 className="auth-modal-title">Telegram orqali kirish</h2>
          <p className="auth-modal-subtitle">
            Botga <b>Start</b> bosing — 5 xonali kod keladi. Kodni shu yerga kiriting.
          </p>
        </div>

        <button
          className="google-auth-btn"
          style={{ background: '#2AABEE', color: '#fff' }}
          onClick={onStart}
          disabled={loading}
        >
          <FaTelegramPlane size={20} />
          <span>Botga o'tish / Start</span>
        </button>

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-input-group">
            <label className="auth-label">5 xonali kod</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              className="auth-input"
              placeholder="XXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              required
            />
          </div>

          {errorText ? (
            <div style={{ color: '#ef4444', fontSize: 13, marginTop: -8 }}>
              {errorText}
            </div>
          ) : null}

          <button type="submit" className="auth-submit-btn" disabled={loading || String(code).trim().length !== 5}>
            {loading ? (
              <>
                <Loader className="animate-spin" size={18} />
                Tekshirilmoqda...
              </>
            ) : (
              "Kodni tasdiqlash"
            )}
          </button>
        </form>

        <div className="auth-switch" style={{ marginTop: 14 }}>
          Kod kelmadimi? Botda <b>/start</b> ni qayta bosing va yana urinib ko'ring.
        </div>
      </div>
    </div>
  );
}

// Auth Modal
function AuthModal({ mode, onClose, onLogin, onRegister, onTelegramOpen, loading }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentMode, setCurrentMode] = useState(mode);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentMode === 'login') {
      onLogin(username, password);
    } else {
      onRegister(username, password, confirmPassword);
    }
  };

  const switchMode = () => {
    setCurrentMode(currentMode === 'login' ? 'register' : 'login');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose}>
          <X size={18} />
        </button>
        
        <div className="auth-modal-header">
          <h2 className="auth-modal-title">
            {currentMode === 'login' ? 'Tizimga kirish' : "Ro'yxatdan o'tish"}
          </h2>
          <p className="auth-modal-subtitle">
            {currentMode === 'login' 
              ? 'Akkauntingizga kiring' 
              : "Yangi akkount yarating"}
          </p>
        </div>

        <button 
          className="google-auth-btn"
          onClick={onTelegramOpen}
          disabled={loading}
          style={{
            background: 'rgba(42, 171, 238, 0.15)',
            border: '1px solid rgba(42, 171, 238, 0.5)',
            color: '#9fdcff'
          }}
        >
          <FaTelegramPlane size={22} />
          <span>Telegram orqali {currentMode === 'login' ? 'kirish' : "ro'yxatdan o'tish"}</span>
        </button>

        <div className="auth-divider">
          <span>Yoki login/parol orqali</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <label className="auth-label">Username (max 10 harf)</label>
            <input
              type="text"
              maxLength={10}
              className="auth-input"
              placeholder="Username kiriting"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Parol</label>
            <input
              type="password"
              className="auth-input"
              placeholder="Parol kiriting"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {currentMode === 'register' && (
            <div className="auth-input-group">
              <label className="auth-label">Parolni tasdiqlang</label>
              <input
                type="password"
                className="auth-input"
                placeholder="Parolni qayta kiriting"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={18} />
                Kuting...
              </>
            ) : (
              currentMode === 'login' ? 'Kirish' : "Ro'yxatdan o'tish"
            )}
          </button>
        </form>

        <div className="auth-switch">
          {currentMode === 'login' 
            ? "Akkauntingiz yo'qmi? " 
            : "Akkauntingiz bormi? "}
          <span className="auth-switch-link" onClick={switchMode}>
            {currentMode === 'login' ? "Ro'yxatdan o'tish" : 'Kirish'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [modal, setModal] = useState({ show: false, type: '', message: '', onConfirm: null });
  const [authModal, setAuthModal] = useState({ show: false, mode: 'login' });
  const [searchModal, setSearchModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [activeTab, setActiveTab] = useState('home');

  const [tgModal, setTgModal] = useState(false);
  const [tgAuthLoading, setTgAuthLoading] = useState(false);
  const [tgAuthError, setTgAuthError] = useState('');

  const [carouselData, setCarouselData] = useState([]);
  const [animeCards, setAnimeCards] = useState([]);
  const [newsData, setNewsData] = useState([]); 
  
  const [row1, setRow1] = useState([]); 
  const [row2, setRow2] = useState([]); 
  const [row3, setRow3] = useState([]); 
  const [row4, setRow4] = useState([]); 

  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [allViews, setAllViews] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  const showModal = (type, message, onConfirm = null) => {
    setModal({ show: true, type, message, onConfirm });
  };

  const hideModal = () => {
    setModal({ show: false, type: '', message: '', onConfirm: null });
  };

  const showAuthModal = (mode = 'login') => {
    setAuthModal({ show: true, mode });
  };

  const hideAuthModal = () => {
    setAuthModal({ show: false, mode: 'login' });
  };

  const showSearchModal = () => {
    setSearchModal(true);
    setActiveTab('search');
  };

  const hideSearchModal = () => {
    setSearchModal(false);
    setActiveTab('home');
  };

  const openTelegramModal = () => {
    setTgAuthError('');
    setTgModal(true);
  };
  const closeTelegramModal = () => {
    setTgAuthError('');
    setTgModal(false);
  };

  const handleHomeClick = () => {
    setActiveTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchClick = () => {
    setActiveTab('search');
    showSearchModal();
  };

  const handleProfileClick = () => {
    setActiveTab('profile');
    if (currentUser) {
      goToProfile();
    } else {
      showAuthModal('login');
    }
  };

  useEffect(() => {
    setMounted(true);
    checkCurrentUser();
    loadData();
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => {
        window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  useEffect(() => {
    if (carouselData.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % carouselData.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [carouselData]);

  const checkIsMobile = () => {
    setIsMobile(window.innerWidth < 1200);
  };

  const checkCurrentUser = async () => {
    try {
      const user = localStorage.getItem('anime_user');
      if (user) {
        const userData = JSON.parse(user);
        setCurrentUser(userData);
        await loadUserFavorites(userData.id);
      }
    } catch (error) {
      console.error('User check error:', error);
    }
  };

  const loadUserFavorites = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('anime_id')
        .eq('user_id', userId);

      if (!error && data) {
        setFavorites(data.map(f => f.anime_id));
      }
    } catch (error) {
      console.error('Load favorites error:', error);
    }
  };

  const loadAllViews = async () => {
    try {
      const { data, error } = await supabase
        .from('anime_views')
        .select('anime_id, view_count');

      if (!error && data) {
        const viewsObj = {};
        data.forEach(v => {
          if (!viewsObj[v.anime_id]) {
            viewsObj[v.anime_id] = 0;
          }
          viewsObj[v.anime_id] += v.view_count;
        });
        setAllViews(viewsObj);
      }
    } catch (error) {
      console.error('Load all views error:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: carouselItems } = await supabase
        .from('anime_carousel')
        .select('*, anime_cards(*)')
        .order('position', { ascending: true });
      
      const { data: cards } = await supabase
        .from('anime_cards')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: news } = await supabase
        .from('news_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10); 

      setCarouselData(carouselItems || []);
      setAnimeCards(cards || []);
      setNewsData(news || []);
      
      if (cards && cards.length > 0) {
        distributeAnimeRows(cards);
      }

      await loadAllViews();
    } catch (error) {
      console.error('Xato:', error);
    }
    setLoading(false);
  };

  const distributeAnimeRows = (allCards) => {
    const cardsCopy = [...allCards];
    const shuffled = dailyShuffle(cardsCopy);

    const quarter = Math.ceil(shuffled.length / 4);
    const part1 = shuffled.slice(0, quarter);
    const part2 = shuffled.slice(quarter, quarter * 2);
    const part3 = shuffled.slice(quarter * 2, quarter * 3);
    const part4 = shuffled.slice(quarter * 3);

    setRow1(part1);
    setRow2(part2);
    setRow3(part3);
    setRow4(part4);
  };

  const handleTelegramStart = async () => {
    setTgAuthError('');
    setTgAuthLoading(true);
    try {
      const res = await fetch('/api/auth/telegram/start', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Xatolik yuz berdi');
      }

      if (data?.botUrl) {
        window.open(data.botUrl, '_blank');
      }
    } catch (e) {
      console.error(e);
      window.open('https://t.me/mochitv_bot', '_blank');
    }
    setTgAuthLoading(false);
  };

  const handleTelegramVerify = async (code) => {
    setTgAuthError('');
    setTgAuthLoading(true);

    try {
      const res = await fetch('/api/auth/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();

      if (!res.ok || !data?.ok || !data?.telegram?.id) {
        throw new Error(data?.message || 'Kod notogri yoki eskirgan');
      }

      const tg = data.telegram;
      const fullName = `${tg.first_name || ''} ${tg.last_name || ''}`.trim() || (tg.username ? tg.username : 'TelegramUser');
      const cleanUsernameBase = (tg.username || fullName || 'tguser')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 10) || 'tguser';

      const fallbackUsername = `${cleanUsernameBase}`.substring(0, 10);

      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', String(tg.id))
        .single();

      let finalUser = existingUser;

      if (!existingUser) {
        const { data: sameUsername } = await supabase
          .from('users')
          .select('id, username')
          .eq('username', fallbackUsername)
          .single();

        const finalUsername = sameUsername
          ? (fallbackUsername.substring(0, 7) + String(tg.id).slice(-3)).substring(0, 10)
          : fallbackUsername;

        const { data: newUser, error: insErr } = await supabase
          .from('users')
          .insert([{
            username: finalUsername,
            password: `telegram_${tg.id}`, 
            provider: 'telegram',
            telegram_id: String(tg.id),
            telegram_username: tg.username || null,
            full_name: fullName,
            avatar_url: tg.photo_url || null,
          }])
          .select()
          .single();

        if (insErr) {
          throw new Error("Telegram orqali ro'yxatdan o'tishda xato");
        }
        finalUser = newUser;
      } else {
        const { data: updatedUser } = await supabase
          .from('users')
          .update({
            full_name: fullName,
            avatar_url: tg.photo_url || existingUser.avatar_url || null,
            telegram_username: tg.username || existingUser.telegram_username || null,
            provider: 'telegram',
          })
          .eq('id', existingUser.id)
          .select()
          .single();
        finalUser = updatedUser || existingUser;
      }

      if (finalUser) {
        localStorage.setItem('anime_user', JSON.stringify(finalUser));
        setCurrentUser(finalUser);
        await loadUserFavorites(finalUser.id);
        closeTelegramModal();
        hideAuthModal();
        showModal('success', `Xush kelibsiz, ${finalUser.username}!`);
      }
    } catch (e) {
      setTgAuthError(e.message || 'Telegram verify xato');
    }

    setTgAuthLoading(false);
  };

  const handleLogin = async (username, password) => {
    setAuthLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !data) {
        showModal('error', 'Username yoki parol xato!');
        setAuthLoading(false);
        return;
      }

      localStorage.setItem('anime_user', JSON.stringify(data));
      setCurrentUser(data);
      await loadUserFavorites(data.id);
      hideAuthModal();
      showModal('success', 'Xush kelibsiz, ' + data.username + '!');
    } catch (error) {
      showModal('error', 'Kirish jarayonida xato yuz berdi');
    }
    setAuthLoading(false);
  };

  const handleRegister = async (username, password, confirmPassword) => {
    if (!username || !password || !confirmPassword) {
      showModal('error', 'Barcha maydonlarni to\'ldiring!');
      setAuthLoading(false);
      return;
    }
    if (username.length < 3) {
      showModal('error', 'Username kamida 3 ta belgidan iborat bo\'lishi kerak!');
      setAuthLoading(false);
      return;
    }
    if (password.length < 6) {
      showModal('error', 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak!');
      setAuthLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      showModal('error', 'Parollar mos kelmadi!');
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUser) {
        showModal('error', 'Bu username allaqachon band!');
        setAuthLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .insert([{ username, password, provider: 'local' }])
        .select()
        .single();

      if (error) throw error;

      localStorage.setItem('anime_user', JSON.stringify(data));
      setCurrentUser(data);
      hideAuthModal();
      showModal('success', 'Ro\'yxatdan o\'tdingiz! Xush kelibsiz!');
    } catch (error) {
      showModal('error', 'Ro\'yxatdan o\'tishda xato yuz berdi');
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('anime_user');
    setCurrentUser(null);
    setFavorites([]);
    showModal('success', 'Tizimdan chiqdingiz!');
  };

  const goToProfile = () => {
    if (currentUser) {
      window.location.href = `/profile/${currentUser.username}`;
    }
  };

  const toggleFavorite = async (animeId) => {
    if (!currentUser) {
      showModal('error', 'Saralanganlarni saqlash uchun tizimga kiring!');
      return;
    }

    try {
      const isFavorite = favorites.includes(animeId);
      if (isFavorite) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('anime_id', animeId);
        if (!error) setFavorites(favorites.filter(id => id !== animeId));
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .insert([{ user_id: currentUser.id, anime_id: animeId }]);
        if (!error) setFavorites([...favorites, animeId]);
      }
    } catch (error) {
      console.error('Favorite error:', error);
      showModal('error', 'Xatolik yuz berdi');
    }
  };

  const addView = async (animeId) => {
    try {
      const userId = currentUser ? currentUser.id : 'guest_' + Date.now();
      const { data: existing } = await supabase
        .from('anime_views')
        .select('*')
        .eq('user_id', userId)
        .eq('anime_id', animeId)
        .single();

      if (existing) {
        const newCount = existing.view_count + 1;
        await supabase
          .from('anime_views')
          .update({ view_count: newCount, last_viewed: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('anime_id', animeId);
      } else {
        await supabase
          .from('anime_views')
          .insert([{ user_id: userId, anime_id: animeId, view_count: 1 }]);
      }
      await loadAllViews();
    } catch (error) {
      console.error('View error:', error);
    }
  };

  const goToAnime = (anime) => {
    addView(anime.id);
    const slugTitle = anime.title.toLowerCase().replace(/\s+/g, '-');
    window.location.href = `/anime/${slugTitle}?id=${anime.id}`;
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const goToAdmin = () => {
    window.location.href = '/admin/admin';
  };

  if (!mounted) return null;
  const isAdmin = currentUser?.username === 'Malika';

  return (
    <>
      <Head>
        <title>MochiTv.Uz — Anime ko'rish platformasi | Eng zo'r animelar Uzbek tilida</title>
        <meta name="description" content="MochiTv — Eng so'nggi va mashhur animelarni online tomosha qiling. Uzbek tilida tarjima animelar, HD sifat, bepul anime platforma." />
        <meta name="keywords" content="anime uzbek tilida, anime online, tarjima anime, anime ko'rish, uzbek anime sayt, mochi tv, anime uz" />
        <meta name="author" content="MochiTV" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta property="og:title" content="MochiTv.Uz — Cheksiz Anime Dunyosi" />
        <meta property="og:description" content="Eng zo'r animelarni Uzbek tilida tomosha qiling." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://mochitv.uz" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* ✅ Propeller Ads — Asosiy Tag Script */}
      <Script
        src="https://5gvci.com/act/files/tag.min.js?z=10639082"
        data-cfasync="false"
        strategy="afterInteractive"
      />

      {/* ✅ Propeller Ads — Vignette Banner Script */}
      <Script
        id="propeller-vignette"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(s){s.dataset.zone='10639095',s.src='https://gizokraijaw.net/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`,
        }}
      />

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; overflow-x: hidden; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          /* ✅ ORQA FON O'ZGARTIRILDI: #000000 → #090b10 */
          background: #090b10;
          color: #ffffff;
          -webkit-tap-highlight-color: transparent;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background-color: rgba(59, 130, 246, 0.6); border-radius: 10px; }
        ::-webkit-scrollbar-track { background-color: rgba(255, 255, 255, 0.05); }

        /* ✅ ORQA FON EFFEKTLARI */
        .bg-grid {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 0;
        }
        .bg-vignette {
          position: fixed; inset: 0;
          background:
            radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.05), transparent 60%),
            linear-gradient(to top, #090b10 0%, transparent 100%);
          pointer-events: none;
          z-index: 0;
        }

        /* --- NEWS SLIDER CSS --- */
        .news-section-wrapper {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto 50px;
          padding: 0 20px;
        }
        .news-main-title {
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          border-left: 4px solid #8b5cf6;
          padding-left: 12px;
          margin-bottom: 20px;
          text-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
        }
        .news-slider-viewport {
          width: 100%;
          overflow: hidden;
          position: relative;
          cursor: grab;
          padding-bottom: 20px;
        }
        .news-slider-viewport:active { cursor: grabbing; }
        .news-track {
          display: flex;
          will-change: transform;
        }
        .news-slide-item {
          flex-shrink: 0;
          padding: 0 10px;
          box-sizing: border-box;
        }
        .news-card {
          position: relative;
          width: 100%;
          height: 400px;
          border-radius: 24px;
          overflow: hidden;
          background: #111;
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .news-bg-image {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background-size: cover;
          background-position: center;
          transition: transform 0.5s;
        }
        .news-card:hover .news-bg-image { transform: scale(1.05); }
        .news-overlay {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 60%, #000 100%);
          z-index: 1;
        }
        .news-header {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          padding: 15px 20px;
        }
        .news-views, .news-date {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          padding: 6px 12px;
          border-radius: 50px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .news-content-wrapper {
          position: relative;
          z-index: 2;
          padding: 0 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .news-author {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 15px;
        }
        .news-author-img {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255,255,255,0.1);
        }
        .news-author-info { flex: 1; }
        .news-author-name {
          font-weight: 700;
          font-size: 15px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .verified-icon { margin-left: 4px; }
        .news-sub-btn {
          background: rgba(255,255,255,0.9);
          color: #000;
          border: none;
          padding: 6px 16px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .news-sub-btn:hover { background: #fff; transform: scale(1.05); }
        .news-text-body { margin-bottom: 20px; }
        .news-title {
          font-size: 20px;
          font-weight: 800;
          margin-bottom: 8px;
          line-height: 1.3;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }
        .news-desc {
          font-size: 14px;
          color: rgba(255,255,255,0.8);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .news-action-btn {
          background: linear-gradient(90deg, #6200EE 0%, #B819D2 100%);
          color: #fff;
          text-decoration: none;
          padding: 12px;
          border-radius: 12px;
          text-align: center;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.3s;
          box-shadow: 0 4px 15px rgba(184, 25, 210, 0.4);
        }
        .news-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(184, 25, 210, 0.6);
        }

        /* --- MAIN STYLES --- */
        .horizontal-section {
          margin-bottom: 40px;
          padding: 0 0 0 20px;
          max-width: 1400px;
          margin-left: auto;
          margin-right: auto;
        }
        .row-title-header {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
          padding-right: 20px;
        }
        .row-title {
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          border-left: 4px solid #3b82f6;
          padding-left: 12px;
        }
        .horizontal-scroll-container {
          display: flex;
          gap: 15px;
          overflow-x: auto;
          padding-bottom: 15px;
          padding-right: 20px;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        .horizontal-scroll-container::-webkit-scrollbar { height: 0px; background: transparent; }
        .horizontal-card { flex: 0 0 auto; width: 200px; }

        /* SKELETON */
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .anime-card-skeleton {
          width: 200px;
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .skeleton-image-wrapper {
          width: 100%;
          aspect-ratio: 2/3;
          background: #1a1a1a;
          border-radius: 20px;
          position: relative;
          overflow: hidden;
        }
        .skeleton-shine {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          animation: shine 1.5s infinite;
        }
        .skeleton-text-line {
          height: 16px;
          background: #1a1a1a;
          border-radius: 4px;
          position: relative;
          overflow: hidden;
        }
        .skeleton-text-line::after {
          content: '';
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
          animation: shine 1.5s infinite;
        }
        .skeleton-text-line.title { width: 80%; }
        .skeleton-text-line.meta { width: 50%; height: 12px; }

        .skeleton-image-overlay {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background: #1a1a1a;
          z-index: 1;
        }

        .card-image { opacity: 0; transition: opacity 0.5s ease; }
        .card-image.loaded { opacity: 1; }

        .container { width: 100%; min-height: 100vh; position: relative; z-index: 1; }
        .site-header {
          position: sticky;
          top: 0; left: 0; right: 0;
          z-index: 100;
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }
        .header-logo { height: 40px; width: auto; cursor: pointer; }
        .header-right { display: flex; align-items: center; }
        .search-btn {
          background: none;
          border: none;
          color: steelblue;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }
        .login-btn {
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.5);
          color: #3b82f6;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .login-btn:hover { background: rgba(59, 130, 246, 0.3); transform: translateY(-2px); }
        .user-info {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(255, 255, 255, 0.05);
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .user-name {
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .user-name:hover { color: #3b82f6; }
        .logout-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-size: 14px;
          padding: 0;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .logout-btn:hover { color: #ef4444; }

        /* CAROUSEL */
        .carousel-wrapper {
          width: 100%;
          height: 600px;
          position: relative;
          overflow: hidden;
          margin-bottom: 40px;
          background: #000;
        }
        .carousel-container { width: 100%; height: 100%; position: relative; }
        .carousel-slide {
          width: 100%;
          height: 100%;
          position: absolute;
          opacity: 0;
          transition: opacity 0.8s ease-in-out;
          display: flex;
          overflow: hidden;
        }
        .carousel-slide.active { opacity: 1; z-index: 2; }
        .carousel-backdrop {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background-size: cover;
          background-position: center;
          filter: blur(16px) brightness(0.4);
          transform: scale(1.1);
          z-index: 1;
        }
        .carousel-gradient-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 100%);
          z-index: 2;
        }
        .carousel-inner-content {
          position: relative;
          z-index: 3;
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          gap: 40px;
        }
        .carousel-text-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-width: 700px;
          padding-bottom: 20px;
        }
        .carousel-title {
          font-size: 48px;
          font-weight: 800;
          margin-bottom: 15px;
          line-height: 1.1;
          background: linear-gradient(90deg, #fff, #ccc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 2px 2px 10px rgba(0,0,0,0.5);
        }
        .carousel-meta {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
          font-size: 16px;
          color: rgba(255,255, 255, 0.9);
          font-weight: 500;
        }
        .carousel-genres {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 25px;
        }
        .genre-badge {
          background: rgba(59, 130, 246, 0.2);
          padding: 6px 14px;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid rgba(59, 130, 246, 0.4);
          color: #60a5fa;
          backdrop-filter: blur(5px);
        }
        .carousel-description {
          font-size: 16px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 30px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .carousel-watch-btn {
          align-self: flex-start;
          background: #3b82f6;
          border: none;
          color: #fff;
          padding: 12px 28px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 700;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
        }
        .carousel-watch-btn:hover {
          background: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(59, 130, 246, 0.6);
        }
        .carousel-poster-section {
          flex: 0 0 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: floatPoster 6s ease-in-out infinite;
        }
        @keyframes floatPoster {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .carousel-poster-img {
          width: 320px;
          aspect-ratio: 2/3;
          object-fit: cover;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1);
        }
        .carousel-dots {
          position: absolute;
          bottom: 25px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 10px;
          z-index: 10;
        }
        .carousel-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          transition: all 0.3s;
        }
        .carousel-dot.active {
          background: #3b82f6;
          width: 30px;
          border-radius: 5px;
        }

        /* Search Modal Styles */
        .search-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 99999;
          backdrop-filter: blur(8px);
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .search-modal {
          background: #1a1a1a;
          border-radius: 20px 20px 0 0;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          min-height: 90vh;
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease-out;
        }
        .search-modal-header {
          padding: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          gap: 15px;
          align-items: center;
        }
        .search-input-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 12px;
        }
        .search-icon { color: rgba(255, 255, 255, 0.5); }
        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #fff;
          font-size: 16px;
          outline: none;
        }
        .search-input::placeholder { color: rgba(255, 255, 255, 0.4); }
        .search-close-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
          min-width: 40px;
          height: 40px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }
        .search-close-btn:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
        .search-results { flex: 1; overflow-y: auto; padding: 20px; }
        .search-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
          padding: 60px 20px;
          color: rgba(255, 255, 255, 0.5);
        }
        .search-results-grid { display: grid; grid-template-columns: 1fr; gap: 15px; }
        .search-result-card {
          display: flex;
          gap: 15px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .search-result-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(59, 130, 246, 0.5);
          transform: translateX(5px);
        }
        .search-result-image { width: 80px; height: 120px; object-fit: cover; border-radius: 8px; }
        .search-result-info { flex: 1; display: flex; flex-direction: column; gap: 8px; justify-content: center; }
        .search-result-title { font-size: 16px; font-weight: 600; color: #fff; }
        .search-result-meta { display: flex; gap: 15px; font-size: 13px; color: rgba(255, 255, 255, 0.6); }
        .search-result-views { display: flex; align-items: center; gap: 5px; }

        .carousel-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: rgba(255, 255, 255, 0.5);
          font-size: 18px;
        }

        .admin-section {
          max-width: 1400px;
          margin: 0 auto 40px;
          padding: 0 20px;
          display: flex;
          justify-content: center;
        }
        .admin-button {
          background: none;
          border: 2px solid;
          color: #fff;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          transition: all .3s;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cards-section { max-width: 1400px; margin: 0 auto; }
        .anime-card {
          cursor: pointer;
          transition: transform 0.3s;
          position: relative;
          border-radius: 20px;
          overflow: hidden;
        }
        .card-image-wrapper {
          width: 100%;
          aspect-ratio: 2/3;
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          background: #1a1a1a;
        }
        .card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
          border-radius: 20px;
        }
        .anime-card:hover .card-image { transform: scale(1.05); }
        .card-header {
          position: absolute;
          top: 0; left: 0; right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent);
          z-index: 3;
        }
        .card-views {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.6);
          padding: 6px 10px;
          border-radius: 10px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 600;
        }
        .card-like-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }
        .card-like-btn:hover { color: #fff; }
        .card-like-btn.liked { color: #FFD700; }
        .card-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, transparent 50%);
          opacity: 0;
          transition: opacity 0.3s;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 15px;
          z-index: 2;
        }
        .anime-card:hover .card-overlay { opacity: 1; }
        .card-overlay-info { display: flex; flex-direction: column; gap: 8px; }
        .card-overlay-meta { display: flex; align-items: center; gap: 10px; font-size: 12px; }
        .card-rating { display: flex; align-items: center; gap: 4px; color: #fbbf24; }
        .card-episodes { color: rgba(255, 255, 255, 0.8); }
        .card-content { padding: 5px 10px; }
        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          white-space: wrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .footer {
          background: rgba(0, 0, 0, 0.95);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 40px 20px;
          margin-bottom:40px;
          position: relative;
        }
        .footer-content { max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 30px; }
        .footer-section { display: grid; grid-template-columns: repeat(3, 1fr); justify-content: center; }
        .footer-col { display: flex; flex-direction: column; gap: 15px; margin: 0 auto; }
        .footer-title { font-size: 16px; font-weight: 700; color: #fff; }
        .footer-link {
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          font-size: 14px;
          transition: color 0.3s;
          cursor: pointer;
        }
        .footer-link:hover { color: #3b82f6; }
        .footer-socials { display: flex; gap: 15px; align-items: center; }
        .social-icon {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s;
          color: #3b82f6;
        }
        .social-icon:hover { background: rgba(59, 130, 246, 0.3); transform: translateY(-2px); }
        .footer-bottom { text-align: center; padding-top: 20px; color: rgba(255, 255, 255, 0.7); font-size: 14px; }

        .auth-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          backdrop-filter: blur(8px);
        }
        .auth-modal {
          background: #1a1a1a;
          border-radius: 16px;
          padding: 40px;
          max-width: 400px;
          width: 90%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
        }
        .auth-modal-header { text-align: center; margin-bottom: 20px; }
        .auth-modal-title { font-size: 24px; font-weight: 700; margin-bottom: 10px; }
        .auth-modal-subtitle { font-size: 14px; color: rgba(255, 255, 255, 0.6); }

        .google-auth-btn {
          width: 100%;
          padding: 12px;
          background: #fff;
          color: #111;
          border: none;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 14px;
          transition: all 0.3s;
        }
        .google-auth-btn:hover { background: #f0f0f0; }

        .auth-divider {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
        }
        .auth-divider::before, .auth-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
        }
        .auth-divider span { padding: 0 10px; }

        .auth-form { display: flex; flex-direction: column; gap: 20px; }
        .auth-input-group { display: flex; flex-direction: column; gap: 8px; }
        .auth-label { font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.8); }
        .auth-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          transition: all 0.3s;
        }
        .auth-input:focus {
          outline: none;
          border-color: #3b82f6;
          background: rgba(255, 255, 255, 0.08);
        }

        .auth-submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border: none;
          color: #fff;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .auth-submit-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4); }
        .auth-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .auth-switch {
          text-align: center;
          margin-top: 20px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
        }
        .auth-switch-link { color: #3b82f6; cursor: pointer; font-weight: 600; transition: color 0.3s; }
        .auth-switch-link:hover { color: #2563eb; }

        .auth-close-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: all 0.3s;
        }
        .auth-close-btn:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }

        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
        }
        .modal {
          background: #1a1a1a;
          border-radius: 12px;
          padding: 30px;
          max-width: 400px;
          width: 90%;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .modal-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .modal-icon {
          width: 40px; height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }
        .modal-icon.success { background: #10b981; }
        .modal-icon.error { background: #ef4444; }
        .modal-title { font-size: 18px; font-weight: 600; }
        .modal-message { color: rgba(255, 255, 255, 0.8); line-height: 1.5; margin-bottom: 20px; }
        .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
        .modal-btn { padding: 10px 20px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; font-size: 14px; }
        .modal-btn.primary { background: #3b82f6; color: #fff; }
        .modal-btn.secondary { background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.8); }

        .loader-container { display: flex; justify-content: center; align-items: center; min-height: 400px; }
        .empty-state { text-align: center; padding: 60px 20px; color: rgba(255, 255, 255, 0.5); width: 100%; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }

        /* --- MEDIA QUERIES --- */
        @media (max-width: 1200px) {
          .footer-section { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 900px) {
          .carousel-wrapper { height: 400px; }
          .carousel-inner-content { display: block; padding: 0 20px; }
          .carousel-poster-section { display: none; }
          .carousel-backdrop { filter: none; transform: scale(1); opacity: 1; filter: brightness(0.7); }
          .carousel-gradient-overlay { background: linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, transparent 100%); }
          .carousel-text-section {
            position: absolute;
            bottom: 0; left: 0; right: 0;
            max-width: 100%;
            padding: 40px 20px 20px;
            z-index: 4;
            justify-content: flex-end;
            height: auto;
          }
          .carousel-title {
            font-size: 29px;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            background: none;
            -webkit-text-fill-color: #fff;
            color: #fff;
          }
          .carousel-description {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            font-size: 14px;
            margin-bottom: 15px;
          }
          .carousel-watch-btn {
            position: absolute;
            top: 0px;
            right: 20px;
            background: none;
            border: 2px solid #fff;
            padding: 7px 10px;
            font-size: 12px;
            backdrop-filter: blur(1rem);
            box-shadow: none;
            align-self: auto;
            margin-top: -60px !important;
          }
          .carousel-dots { bottom: 15px; }
          .footer-section { display: flex; justify-content: center; }
          .horizontal-card { width: 150px; }
          .anime-card-skeleton { width: 150px; }
          .row-title { font-size: 20px; }
          .news-card { height: 380px; }
        }
        @media (max-width: 768px) {
          .search-btn { display: none !important; }
        }
        @media (max-width: 600px) {
          ::-webkit-scrollbar { width: 0px; }
          .carousel-wrapper { height: 300px; }
          .mobile-hide { display: none; }
          .carousel-title { font-size: 23px; }
          .carousel-meta { font-size: 12px; gap: 12px; margin-bottom: 12px; }
          .carousel-genres { gap: 6px; margin-bottom: 12px; }
          .genre-badge { padding: 4px 10px; font-size: 11px; }
          .carousel-description { font-size: 12px; }
          .site-header { flex-wrap: wrap; padding: 15px 10px; }
          .mobile-hide { display: none !important; }
          .header-logo { height: 32px; }
          .footer-content { gap: 20px; }
          .footer-col { gap: 10px; display: flex; flex-direction: default; }
          .footer-title { font-size: 14px; }
          .footer-link { font-size: 12px; }
          .social-icon { width: 36px; height: 36px; }
          .search-modal { max-height: 90vh; border-radius: 15px 15px 0 0; }
          .search-result-image { width: 60px; height: 90px; }
          .search-result-title { font-size: 14px; }
          .search-result-meta { font-size: 12px; gap: 10px; }
          .news-card { height: 350px; }
          .news-title { font-size: 18px; }
        }
      `}</style>

      {/* ✅ ORQA FON DIVLARI */}
      <div className="bg-grid"></div>
      <div className="bg-vignette"></div>

      <div className="container">
        {/* Header */}
        <div className="site-header">
          <img src={LOGO_URL} alt="Mochi" className="header-logo" onClick={() => window.location.href = '/'} />
          
          <div className="header-right">
            <button className="search-btn" onClick={showSearchModal}>
              <Search size={20} />
            </button>
            
            {currentUser ? (
              <div className="user-info">
                <span className="user-name" onClick={goToProfile}>{currentUser.username}</span>
                <button className="logout-btn" onClick={handleLogout}>
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button className="login-btn" onClick={() => showAuthModal('login')}>
                Kirish
              </button>
            )}
          </div>
        </div>

        {/* Carousel */}
        <div className="carousel-wrapper">
          <div className="carousel-container">
            {!loading && carouselData.length === 0 ? (
              <div className="carousel-empty">
                <div>Carousel bo'sh</div>
              </div>
            ) : loading ? (
              <div className="loader-container">
                <Loader className="animate-spin" size={48} color="#3b82f6" />
              </div>
            ) : (
              carouselData.map((item, index) => (
                <div
                  key={item.id}
                  className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}
                >
                  <div
                    className="carousel-backdrop"
                    style={{ backgroundImage: `url(${item.anime_cards.image_url})` }}
                  ></div>
                  <div className="carousel-gradient-overlay"></div>

                  <div className="carousel-inner-content">
                    <div className="carousel-text-section">
                      <div className="carousel-title">{item.anime_cards.title}</div>
                      <div className="carousel-meta">
                        <div className="carousel-meta-item">
                          <span>⭐ {item.anime_cards.rating}</span>
                        </div>
                        <div className="carousel-meta-item">
                          <span>📺 {item.anime_cards.episodes} qism</span>
                        </div>
                      </div>

                      {item.anime_cards.genres && item.anime_cards.genres.length > 0 && (
                        <div className="carousel-genres">
                          {item.anime_cards.genres.slice(0, 3).map((genre, idx) => (
                            <span key={idx} className="genre-badge">{genre}</span>
                          ))}
                        </div>
                      )}

                      {item.anime_cards.description && (
                        <div className="carousel-description">
                          {item.anime_cards.description}
                        </div>
                      )}

                      <button 
                        className="carousel-watch-btn"
                        onClick={() => goToAnime(item.anime_cards)}
                      >
                        <Play size={20} fill="currentColor" />
                        Tomosha qilish
                      </button>
                    </div>

                    <div className="carousel-poster-section">
                       <img 
                         src={item.anime_cards.image_url} 
                         alt={item.anime_cards.title} 
                         className="carousel-poster-img"
                       />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {carouselData.length > 0 && (
            <div className="carousel-dots">
              {carouselData.map((_, index) => (
                <div
                  key={index}
                  className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
          )}
        </div>

        {/* NEWS SECTION */}
        <NewsSlider news={newsData} />

        {/* Admin Panel Button */}
        {isAdmin && (
          <div className="admin-section">
            <button className="admin-button" onClick={goToAdmin}>
              <Lock size={18} />
              Admin Panel
            </button>
          </div>
        )}

        {/* ANIME SECTIONS */}
        <div className="cards-section">
          {loading ? (
             <div className="cards-section-loading">
               {[1, 2, 3, 4].map((rowId) => (
                 <div key={rowId} className="horizontal-section">
                   <div className="row-title-header">
                      <div style={{width: 200, height: 28, background: '#1a1a1a', borderRadius: 8}}></div>
                   </div>
                   <div className="horizontal-scroll-container" style={{overflow: 'hidden'}}>
                     {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
                   </div>
                 </div>
               ))}
             </div>
          ) : animeCards.length === 0 ? (
            <div className="empty-state">Hali anime qo'shilmagan</div>
          ) : (
            <>
              {/* ROW 1 */}
              <div className="horizontal-section">
                <div className="row-title-header">
                  <h2 className="row-title">Bugun Tavsiya Etamiz</h2>
                </div>
                <div className="horizontal-scroll-container">
                  {row1.map((anime) => (
                    <AnimeCard 
                      key={anime.id} 
                      anime={anime}
                      allViews={allViews}
                      favorites={favorites}
                      toggleFavorite={toggleFavorite}
                      goToAnime={goToAnime}
                      isHorizontal={true}
                    />
                  ))}
                </div>
              </div>

              {/* ROW 2 */}
              <div className="horizontal-section">
                <div className="row-title-header">
                  <h2 className="row-title">Trenddagi Animelar</h2>
                </div>
                <div className="horizontal-scroll-container">
                  {row2.map((anime) => (
                    <AnimeCard 
                      key={anime.id} 
                      anime={anime}
                      allViews={allViews}
                      favorites={favorites}
                      toggleFavorite={toggleFavorite}
                      goToAnime={goToAnime}
                      isHorizontal={true}
                    />
                  ))}
                </div>
              </div>

              {/* ROW 3 */}
              <div className="horizontal-section">
                <div className="row-title-header">
                  <h2 className="row-title">Yangi Qo'shilganlar</h2>
                </div>
                <div className="horizontal-scroll-container">
                  {row3.map((anime) => (
                    <AnimeCard 
                      key={anime.id} 
                      anime={anime}
                      allViews={allViews}
                      favorites={favorites}
                      toggleFavorite={toggleFavorite}
                      goToAnime={goToAnime}
                      isHorizontal={true}
                    />
                  ))}
                </div>
              </div>

              {/* ROW 4 */}
              <div className="horizontal-section">
                <div className="row-title-header">
                  <h2 className="row-title">Afsonaviy Animelar</h2>
                </div>
                <div className="horizontal-scroll-container">
                  {row4.map((anime) => (
                    <AnimeCard 
                      key={anime.id} 
                      anime={anime}
                      allViews={allViews}
                      favorites={favorites}
                      toggleFavorite={toggleFavorite}
                      goToAnime={goToAnime}
                      isHorizontal={true}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search Modal */}
        {searchModal && (
          <SearchModal 
            onClose={hideSearchModal}
            animeCards={animeCards}
            onAnimeClick={goToAnime}
            allViews={allViews}
          />
        )}

        {/* Auth Modal */}
        {authModal.show && (
          <AuthModal 
            mode={authModal.mode}
            onClose={hideAuthModal}
            onLogin={handleLogin}
            onRegister={handleRegister}
            onTelegramOpen={openTelegramModal}
            loading={authLoading}
          />
        )}

        {/* Telegram Code Modal */}
        {tgModal && (
          <TelegramCodeModal
            onClose={closeTelegramModal}
            onVerify={handleTelegramVerify}
            onStart={handleTelegramStart}
            loading={tgAuthLoading}
            errorText={tgAuthError}
          />
        )}

        {/* General Modal */}
        {modal.show && (
          <div className="modal-overlay" onClick={hideModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className={`modal-icon ${modal.type}`}>
                  {modal.type === 'success' && '✓'}
                  {modal.type === 'error' && '✕'}
                </div>
                <div className="modal-title">
                  {modal.type === 'success' && 'Muvaffaqiyatli'}
                  {modal.type === 'error' && 'Xato'}
                </div>
              </div>
              <div className="modal-message">{modal.message}</div>
              <div className="modal-actions">
                <button className="modal-btn primary" onClick={hideModal}>OK</button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Navbar */}
        <MobileNavbar
          currentUser={currentUser}
          onSearchClick={handleSearchClick}
          onProfileClick={handleProfileClick}
          onHomeClick={handleHomeClick}
          activeTab={activeTab}
        />
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-col">
              <div className="footer-title">MochiTV Haqida</div>
              <a href="/info" className="footer-link">Biz haqimizda</a>
              <a href="/info" className="footer-link">Aloqa</a>
              <a href="/info" className="footer-link">Muammo Xabar Qilish</a>
            </div>
            <div className="footer-col">
              <div className="footer-title">Yordam</div>
              <a href="/info" className="footer-link">FAQ</a>
              <a href="/info" className="footer-link">Qo'llanma</a>
              <a href="/info" className="footer-link">Shartlar va Shartlar</a>
            </div>
            <div className="footer-col mobile-hide">
              <div className="footer-title">Ijtimoiy Tarmoqlar</div>
              <div className="footer-socials">
                <a className="social-icon" href="https://youtube.com/@MochiTvUz" target="_blank" rel="noopener noreferrer" title="YouTube">
                  <Youtube size={20} />
                </a>
                <a className="social-icon" href="https://t.me/MochitvUz" target="_blank" rel="noopener noreferrer" title="Telegram">
                  <FaTelegramPlane size={20} />
                </a>
                <a className="social-icon" href="https://instagram.com/mochitv_uz" target="_blank" rel="noopener noreferrer" title="Instagram">
                  <LuInstagram size={20} />
                </a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 MochiTv.Uz Barcha huquqlar himoyalangan.</p>
          </div>
        </div>
      </footer>
    </>
  );
}