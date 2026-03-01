import { Home, Search, User, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function MobileNavbar({ 
  currentUser, 
  activeTab = 'home' 
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // 1024px dan kichik ekranlarda ko'rinadi (planshet va telefon)
      setIsVisible(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNavigation = (path) => {
    window.location.href = path;
  };

  // ✅ username ni currentUser ichidan olish (fallbacklar bilan)
  const username =
    currentUser?.username ||
    currentUser?.user_metadata?.username ||
    currentUser?.user_metadata?.full_name ||
    (currentUser?.email ? currentUser.email.split('@')[0] : '');

  if (!isVisible) return null;

  return (
    <>
      <style jsx>{`
        .mobile-navbar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 9999;
          padding-bottom: env(safe-area-inset-bottom);
          height: calc(60px + env(safe-area-inset-bottom));
          display: flex;
          align-items: center;
          justify-content: space-around;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
        }

        .nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          cursor: pointer;
          color: #6b7280; /* Oddiy kulrang (inactive) */
          transition: all 0.3s ease;
          gap: 4px;
          position: relative;
        }

        /* Bosilgandagi effekt */
        .nav-item:active {
          transform: scale(0.92);
        }

        /* Aktiv holat - Saytning ko'k rangi */
        .nav-item.active {
          color: #3b82f6; 
        }

        .nav-icon {
          transition: all 0.3s ease;
        }

        .nav-item.active .nav-icon {
          transform: translateY(-2px);
          filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4));
        }

        .nav-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.3px;
        }

        /* Aktiv bo'lganda yozuv biroz qalinlashadi */
        .nav-item.active .nav-label {
          font-weight: 700;
        }

        /* Avatar rasm */
        .avatar-container {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          padding: 1px;
          border: 1px solid transparent;
          transition: all 0.3s;
        }
        
        .nav-item.active .avatar-container {
          border-color: #3b82f6;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
        }

        .avatar-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
      `}</style>

      <nav className="mobile-navbar">
        
        {/* 1. ASOSIY */}
        <div 
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => handleNavigation('/')}
        >
          <Home size={22} className="nav-icon" strokeWidth={activeTab === 'home' ? 2.5 : 2} />
          <span className="nav-label">Asosiy</span>
        </div>

        {/* 2. QIDIRUV (search.js) */}
        <div 
          className={`nav-item ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => handleNavigation('/search')}
        >
          <Search size={22} className="nav-icon" strokeWidth={activeTab === 'search' ? 2.5 : 2} />
          <span className="nav-label">Qidiruv</span>
        </div>

        {/* 3. KIMO AI (kimo.js) - Oddiy ko'rinishda */}
        <div 
          className={`nav-item ${activeTab === 'kimo' ? 'active' : ''}`}
          onClick={() => handleNavigation('/kimo')}
        >
          {/* Sparkles ikonkasi AI uchun juda mos */}
          <Sparkles size={22} className="nav-icon" strokeWidth={activeTab === 'kimo' ? 2.5 : 2} />
          <span className="nav-label">Kimo AI</span>
        </div>

        {/* 4. PROFIL */}
        <div 
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleNavigation(`/profile/${encodeURIComponent(username)}`)}
        >
          {currentUser && currentUser.avatar_url ? (
            <div className="avatar-container">
              <img src={currentUser.avatar_url} alt="Profile" className="avatar-img" />
            </div>
          ) : (
            <User size={22} className="nav-icon" strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
          )}
          <span className="nav-label">Profil</span>
        </div>

      </nav>
      
      {/* Spacer - Navbar orqasida kontent qolib ketmasligi uchun */}
      <div style={{ height: '70px', display: isVisible ? 'block' : 'none' }}></div>
    </>
  );
}