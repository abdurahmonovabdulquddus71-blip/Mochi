import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, Loader, Check, X, 
  LogOut, Plus, Bell,
  Play, ListVideo, Film, Pencil, AlertTriangle
} from 'lucide-react';

import MobileNavbar from '../../components/MobileNavbar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CARD_NUMBER = '8600 0417 4424 5680';
const DEFAULT_BANNER = 'https://wallpapercave.com/wp/wp7263387.jpg';
const LOGO_URL = '/assets/lego.png';
const DEFAULT_AVATAR = "https://i.pinimg.com/736x/ce/21/07/ce21071acfd1e9deb34850f70285a5f0.jpg";

// 1 ta to'lov uchun qancha anime qo'shish mumkinligi (Kovata)
const ANIME_PER_PAYMENT = 5; 
const PLAYLIST_PER_PAYMENT = 1;

// Fayl tanlash komponenti
function FileInput({ label, accept, onChange }) {
  const [fileName, setFileName] = useState('');
  return (
    <div style={{ marginBottom: 15 }}>
      {label && <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>{label}</label>}
      <label style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '10px 14px', cursor: 'pointer', transition: 'border 0.3s'
      }}>
        <span style={{
          background: 'rgba(217,70,239,0.15)', border: '1px solid rgba(217,70,239,0.4)',
          color: '#d946ef', borderRadius: 8, padding: '5px 12px',
          fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0
        }}>📎 Tanlash</span>
        <span style={{
          fontSize: 13, color: fileName ? '#fff' : 'rgba(255,255,255,0.35)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {fileName || 'Fayl tanlanmagan'}
        </span>
        <input type="file" accept={accept} style={{ display: 'none' }} onChange={e => {
          const file = e.target.files[0];
          if (file) { setFileName(file.name); onChange(e); }
        }} />
      </label>
    </div>
  );
}

export default function UserProfile() {
  const router = useRouter();
  const { username } = router.query;

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('asosiy');
  const [currentUser, setCurrentUser] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [userAnimes, setUserAnimes] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [approvedPayments, setApprovedPayments] = useState([]); // Yangi: tasdiqlangan to'lovlar
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modallar
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [showPrePaymentModal, setShowPrePaymentModal] = useState(false); 
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showAddAnimeModal, setShowAddAnimeModal] = useState(false); // Yangi: Anime yuklash oynasi
  const [modal, setModal] = useState({ show: false, type: '', message: '' });

  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [saving, setSaving] = useState(false);

  // Yangi anime qo'shish statelari
  const [animeForm, setAnimeForm] = useState({ title: '', description: '', rating: '', episodes: '', genres: '' });
  const [animeCoverFile, setAnimeCoverFile] = useState(null);

  const [episodeNumber, setEpisodeNumber] = useState('');
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [episodeVideoFile, setEpisodeVideoFile] = useState(null);

  const [paymentType, setPaymentType] = useState('');
  const [userPaymentAmount, setUserPaymentAmount] = useState(0);
  const [receiptFile, setReceiptFile] = useState(null);
  const [verifyingReceipt, setVerifyingReceipt] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem('anime_user');
    if (storedUser) setCurrentUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    if (username && mounted) loadProfileData(username);
  }, [username, mounted]);

  const showNotification = (type, message) => {
    setModal({ show: true, type, message });
    setTimeout(() => setModal({ show: false, type: '', message: '' }), 4000);
  };

  const loadProfileData = async (targetUsername) => {
    setLoading(true);
    try {
      const { data: user, error } = await supabase.from('users').select('*').eq('username', targetUsername).single();
      if (error || !user) { setLoading(false); return; }
      setProfileUser(user);
      setEditUsername(user.username);
      setEditBio(user.bio || '');

     const { data: favs, error: favError } = await supabase
  .from('user_favorites')
  .select(`
    id,
    anime_card_id,
    anime_cards!fk_anime_card (*)
  `)
  .eq('user_id', user.id);

if (favError) {
  console.warn("Favorites error:", favError.message);
  setFavorites([]);
} else {
  setFavorites(favs || []);
}

      const { data: plists } = await supabase.from('news_posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (plists) setPlaylists(plists);

      const { data: animes } = await supabase.from('anime_cards').select('*').eq('uploader_id', user.id).order('created_at', { ascending: false });
      if (animes) setUserAnimes(animes);

      if (currentUser && currentUser.id === user.id) {
        // Bildirishnomalarni olish
        try {
          const { data: notifs } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
          if (notifs) setNotifications(notifs);
        } catch (e) { console.warn('Notifications:', e.message); }

        // Tasdiqlangan to'lovlarni olish (Kvota uchun)
        try {
          const { data: pays } = await supabase.from('payments').select('*').eq('user_id', user.id).eq('status', 'approved');
          if (pays) setApprovedPayments(pays);
        } catch (e) { console.warn('Payments:', e.message); }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadEpisodes = async (animeId) => {
    try {
      const { data } = await supabase.from('anime_episodes').select('*').eq('anime_id', animeId).order('episode_number', { ascending: true });
      if (data) setEpisodes(data);
    } catch (e) { console.error(e); }
  };

  // API route orqali Catbox ga yuklash (CORS yo'q)
  const uploadToCatbox = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1];
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileBase64: base64, fileName: file.name, fileType: file.type }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Yuklash xatosi');
          resolve(data.url);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error("Faylni o'qishda xatolik"));
      reader.readAsDataURL(file);
    });
  };

  // Kvotalarni hisoblash
  const animePaymentsCount = approvedPayments.filter(p => p.payment_type === 'anime').length;
  const availableAnimeQuota = Math.max(0, (animePaymentsCount * ANIME_PER_PAYMENT) - userAnimes.length);

  const playlistPaymentsCount = approvedPayments.filter(p => p.payment_type === 'playlist').length;
  const availablePlaylistQuota = Math.max(0, (playlistPaymentsCount * PLAYLIST_PER_PAYMENT) - playlists.length);

  // Tugma bosilganda ishlovchi mantiqlar
  const handleAddAnimeClick = () => {
    if (availableAnimeQuota > 0) {
      setShowAddAnimeModal(true); // Kvota bo'lsa darhol yuklash oynasini ochish
    } else {
      initiatePayment('anime'); // Yo'q bo'lsa info/to'lov oynasi
    }
  };

  const handleAddPlaylistClick = () => {
    if (availablePlaylistQuota > 0) {
      // Playlist kvotasi bor
      showNotification('success', "Sizda playlist ochish imkoni bor! (Bu xususiyat tez orada to'liq ishga tushadi)");
    } else {
      initiatePayment('playlist');
    }
  };

  const initiatePayment = (type) => {
    const amount = (type === 'playlist' ? 4990 : 7990) + Math.floor(Math.random() * 99);
    setPaymentType(type);
    setUserPaymentAmount(amount);
    setReceiptFile(null);
    setShowPrePaymentModal(true); 
  };

  const handleVerifyReceipt = async () => {
    if (!receiptFile) return showNotification('error', "Iltimos, chek rasmini yuklang!");
    setVerifyingReceipt(true);
    try {
      const fileUrl = await uploadToCatbox(receiptFile);
      const { error } = await supabase.from('payments').insert([{
        user_id: profileUser.id, amount: userPaymentAmount,
        payment_type: paymentType, receipt_url: fileUrl, status: 'pending'
      }]);
      if (error) throw error;
      setShowPaymentModal(false);
      showNotification('success', "Chek yuborildi! Admin tez orada tasdiqlaydi.");
      // Optimistic update for UI if needed, but 'pending' doesn't give quota anyway
    } catch (err) {
      showNotification('error', "Xatolik: " + err.message);
    }
    setVerifyingReceipt(false);
  };

  // Xavfsiz Anime Yuklash
  const handleUploadAnime = async () => {
    if (!animeForm.title || !animeForm.description || !animeCoverFile) {
      return showNotification('error', "Barcha asosiy maydonlarni to'ldiring!");
    }
    setSaving(true);
    try {
      const fileUrl = await uploadToCatbox(animeCoverFile);
      const genresArray = animeForm.genres.split(',').map(g => g.trim()).filter(Boolean);

      const newAnimeData = {
        title: animeForm.title,
        description: animeForm.description,
        rating: parseFloat(animeForm.rating) || 0,
        episodes: parseInt(animeForm.episodes) || 12,
        genres: genresArray,
        image_url: fileUrl,
        uploader_id: profileUser.id
      };

      const { data, error } = await supabase.from('anime_cards').insert([newAnimeData]).select();
      if (error) throw error;

      setUserAnimes([data[0], ...userAnimes]);
      setShowAddAnimeModal(false);
      showNotification('success', "Anime muvaffaqiyatli yuklandi!");
      setAnimeForm({ title: '', description: '', rating: '', episodes: '', genres: '' });
      setAnimeCoverFile(null);
    } catch (err) {
      showNotification('error', "Yuklashda xatolik: " + err.message);
    }
    setSaving(false);
  };

  const handleSaveProfile = async () => {
    if (!isOwnProfile) return;
    setSaving(true);
    try {
      let avatarUrl = profileUser.avatar_url;
      let bannerUrl = profileUser.banner_url;
      if (avatarFile) avatarUrl = await uploadToCatbox(avatarFile);
      if (bannerFile) bannerUrl = await uploadToCatbox(bannerFile);
      const updates = { username: editUsername, bio: editBio, avatar_url: avatarUrl, banner_url: bannerUrl };
      const { error } = await supabase.from('users').update(updates).eq('id', profileUser.id);
      if (error) throw error;
      const updatedUser = { ...profileUser, ...updates };
      setProfileUser(updatedUser);
      setCurrentUser(updatedUser);
      localStorage.setItem('anime_user', JSON.stringify(updatedUser));
      setShowEditModal(false);
      showNotification('success', 'Profil saqlandi!');
      if (username !== editUsername) router.push(`/profile/${editUsername}`);
    } catch (e) { showNotification('error', 'Xatolik: ' + e.message); }
    setSaving(false);
  };

  const handleOpenNotifs = () => {
    setShowNotifModal(true);
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) {
      supabase.from('notifications').update({ is_read: true }).in('id', unreadIds).then();
    }
  };

  const handleCloseNotifs = () => {
    setShowNotifModal(false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleLogout = () => { localStorage.removeItem('anime_user'); window.location.href = '/'; };
  const goToAnime = (anime) => { window.location.href = `/anime/${anime.title.toLowerCase().replace(/\s+/g, '-')}?id=${anime.id}`; };

  const isOwnProfile = currentUser && profileUser && currentUser.id === profileUser.id;
  const unreadNotifs = notifications.filter(n => !n.is_read).length;

  if (!mounted) return null;

  const renderEmptyState = (text) => (
    <div className="empty-state-wrapper">
      <p className="empty-text-top">{text}</p>
      <div className="empty-face">ㅠㅠ</div>
      <p className="empty-text-bottom">Hech narsa topilmadi</p>
    </div>
  );

  return (
    <>
      <Head>
        <title>{profileUser ? `${profileUser.username} | Mochitv.Uz` : 'Profil'}</title>
      </Head>

      <style jsx global>{`
        @keyframes spin { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }
        .loader-spin { animation: spin 0.9s linear infinite; }
        * { -webkit-tap-highlight-color:transparent!important; outline:none!important; box-sizing:border-box; }
        body { background-color:#030303; color:#fff; margin:0; font-family:'Inter','Segoe UI',sans-serif; overflow-x:hidden; }

        .banner-container {
          width:100%; height:280px;
          background-image:url('${profileUser?.banner_url || DEFAULT_BANNER}');
          background-size:cover; background-position:center; position:relative;
        }
        .banner-overlay { position:absolute; inset:0; background:linear-gradient(to bottom,rgba(3,3,3,0.1) 0%,rgba(3,3,3,0.9) 100%); }
        .top-navbar { position:absolute; top:0; left:0; right:0; display:flex; justify-content:space-between; align-items:center; padding:20px 30px; z-index:50; }
        .brand { display:flex; align-items:center; gap:12px; font-size:22px; font-weight:800; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.8); }
        .brand .logo-text { background:linear-gradient(90deg,#fff 0%,#d946ef 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .notif-bell { position:relative; cursor:pointer; color:#fff; }
        .notif-badge { position:absolute; top:-5px; right:-5px; background:#ef4444; color:#fff; font-size:10px; font-weight:bold; border-radius:50%; width:16px; height:16px; display:flex; align-items:center; justify-content:center; }

        .profile-section { position:relative; z-index:10; margin-top:-80px; display:flex; flex-direction:column; align-items:center; padding:0 20px; }
        .avatar-wrapper { position:relative; border-radius:50%; padding:5px; background:rgba(255,255,255,0.05); backdrop-filter:blur(10px); margin-bottom:15px; }
        .avatar { width:140px; height:140px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,0.1); background:#111; display:block; }
        .avatar-pencil-btn { position:absolute; bottom:8px; right:8px; width:34px; height:34px; border-radius:50%; background:rgba(217,70,239,0.85); backdrop-filter:blur(10px); border:2px solid rgba(255,255,255,0.3); display:flex; align-items:center; justify-content:center; cursor:pointer; color:#fff; box-shadow:0 4px 15px rgba(217,70,239,0.5); transition:all 0.3s; z-index:20; }
        .avatar-pencil-btn:hover { background:#d946ef; transform:scale(1.1); }
        .avatar-pencil-btn:active { transform:scale(0.95); }
        .username { font-size:32px; font-weight:800; margin:0; text-shadow:0 4px 15px rgba(0,0,0,0.8); }
        .user-bio { color:rgba(255,255,255,0.6); font-size:14px; margin-top:5px; max-width:400px; text-align:center; }

        .action-bar { display:flex; flex-wrap:nowrap; justify-content:center; gap:10px; margin-top:20px; width:100%; max-width:440px; }
        .action-btn { display:flex; align-items:center; justify-content:center; gap:6px; padding:10px 18px; border-radius:30px; font-weight:600; font-size:14px; cursor:pointer; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); backdrop-filter:blur(15px); color:#fff; transition:all 0.3s; white-space:nowrap; flex:1; }
        .action-btn:active { transform:scale(0.95); }
        .action-btn:hover { background:rgba(255,255,255,0.15); border-color:#d946ef; }
        .action-btn.primary { background:rgba(217,70,239,0.2); border-color:#d946ef; color:#fdf4ff; }
        .action-btn.primary:hover { background:rgba(217,70,239,0.4); }
        @media (max-width:420px) { .action-btn { font-size:12px; padding:9px 10px; gap:4px; } .action-btn svg { width:14px; height:14px; flex-shrink:0; } }
        @media (max-width:330px) { .action-btn { font-size:11px; padding:8px 7px; gap:3px; } }

        .tabs-container { width:100%; max-width:800px; margin:40px auto 20px; display:flex; background:rgba(255,255,255,0.03); border-radius:20px; padding:6px; backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.05); }
        .tab { flex:1; text-align:center; font-weight:600; color:rgba(255,255,255,0.45); cursor:pointer; transition:all 0.3s; padding:11px 6px; border-radius:15px; display:flex; align-items:center; justify-content:center; gap:5px; font-size:13px; }
        .tab.active { background:rgba(255,255,255,0.1); color:#fff; box-shadow:0 4px 15px rgba(0,0,0,0.2); }
        .tab svg { flex-shrink:0; }
        @media (max-width:480px) { .tabs-container { margin:30px 8px 16px; width:auto; } .tab { font-size:11px; padding:10px 3px; gap:3px; } .tab svg { width:14px; height:14px; } }

        .content-container { max-width:1200px; margin:0 auto; padding:20px 20px 100px; min-height:40vh; }
        .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:20px; }
        .card { position:relative; aspect-ratio:2/3; border-radius:16px; overflow:hidden; cursor:pointer; background:#111; box-shadow:0 10px 30px rgba(0,0,0,0.5); }
        .card img { width:100%; height:100%; object-fit:cover; transition:transform 0.5s; }
        .card:hover img { transform:scale(1.08); }
        .card-overlay { position:absolute; bottom:0; left:0; right:0; padding:30px 15px 15px; background:linear-gradient(to top,rgba(0,0,0,0.9) 0%,transparent 100%); }
        .card-title { font-weight:700; font-size:14px; text-shadow:0 2px 4px rgba(0,0,0,0.8); line-height:1.4; }

        .empty-state-wrapper { display:flex; flex-direction:column; align-items:center; justify-content:center; margin-top:60px; color:rgba(255,255,255,0.4); text-align:center; }
        .empty-text-top { font-size:15px; margin-bottom:20px; }
        .empty-face { font-size:70px; font-weight:300; letter-spacing:15px; margin:10px 0 30px; opacity:0.6; font-family:"Malgun Gothic",sans-serif; }
        .empty-text-bottom { font-size:14px; font-weight:500; color:rgba(255,255,255,0.6); }

        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:99999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(15px); padding:20px; overflow-y:auto; }
        .modal-box { background:rgba(20,20,20,0.9); width:100%; max-width:450px; padding:25px; border-radius:24px; border:1px solid rgba(255,255,255,0.1); box-shadow:0 20px 50px rgba(0,0,0,0.5); max-height:90vh; overflow-y:auto; backdrop-filter:blur(20px); }
        .modal-box::-webkit-scrollbar { width: 6px; }
        .modal-box::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        
        .modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; }
        .modal-header h2 { margin:0; font-size:20px; font-weight:700; }
        .close-btn { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.3s; }
        .close-btn:hover { background:#ef4444; border-color:#ef4444; }
        
        .input { width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); padding:14px; border-radius:12px; color:#fff; margin-bottom:15px; font-size:15px; transition:border 0.3s; }
        .input:focus { border-color:#d946ef; }
        
        .warning-box { background:rgba(239,68,68,0.1); border-left:4px solid #ef4444; padding:15px; border-radius:8px; margin-bottom:20px; display:flex; gap:12px; align-items:flex-start; }
        .warning-text { font-size:13px; color:rgba(255,255,255,0.85); line-height:1.5; }

        .playlist-item { display:flex; gap:20px; background:rgba(255,255,255,0.03); padding:20px; border-radius:20px; margin-bottom:15px; border:1px solid rgba(255,255,255,0.05); backdrop-filter:blur(10px); align-items:center; }
        .notif-item { padding:15px; border-radius:12px; background:rgba(255,255,255,0.05); margin-bottom:10px; border-left:4px solid #333; transition: all 0.3s ease; }
        .notif-item.unread { border-left-color:#d946ef; background:rgba(217,70,239,0.05); }
        .notif-time { font-size:11px; color:#888; margin-top:8px; display:block; }

        @media (max-width:768px) { .grid { grid-template-columns:repeat(2,1fr); } .banner-container { height:200px; } .username { font-size:26px; } }
      `}</style>

      {modal.show && (
        <div style={{ position:'fixed', top:30, left:'50%', transform:'translateX(-50%)', background:modal.type==='error'?'rgba(239,68,68,0.9)':'rgba(217,70,239,0.9)', backdropFilter:'blur(10px)', color:'#fff', padding:'12px 24px', borderRadius:'30px', zIndex:999999, display:'flex', alignItems:'center', gap:10, fontWeight:600, boxShadow:'0 10px 30px rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.2)' }}>
          {modal.type==='error'?<X size={18}/>:<Check size={18}/>} {modal.message}
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>
          <Loader className="loader-spin" size={50} color="#d946ef" />
        </div>
      ) : !profileUser ? (
        <div style={{ textAlign:'center', marginTop:100 }}>{renderEmptyState("Foydalanuvchi topilmadi")}</div>
      ) : (
        <>
          <div className="banner-container">
            <div className="banner-overlay" />
            <div className="top-navbar">
              <div className="brand" onClick={() => router.push('/')}><span className="logo-text">Mochitv.Uz</span></div>
              {isOwnProfile && (
                <div className="notif-bell" onClick={handleOpenNotifs}>
                  <Bell size={26} />
                  {unreadNotifs > 0 && <span className="notif-badge">{unreadNotifs}</span>}
                </div>
              )}
            </div>
          </div>

          <div className="profile-section">
            <div className="avatar-wrapper">
              <img src={profileUser.avatar_url || DEFAULT_AVATAR} alt={profileUser.username} className="avatar" />
              {isOwnProfile && (
                <button className="avatar-pencil-btn" onClick={() => setShowEditModal(true)}><Pencil size={15} /></button>
              )}
            </div>
            <h1 className="username">{profileUser.username}</h1>
            {profileUser.bio && <p className="user-bio">{profileUser.bio}</p>}
            {isOwnProfile && (
              <div className="action-bar">
                <button className="action-btn primary" onClick={handleAddPlaylistClick}><ListVideo size={16} /> Playlist qo'shish</button>
                <button className="action-btn primary" onClick={handleAddAnimeClick}><Plus size={16} /> Anime qo'shish</button>
              </div>
            )}
          </div>

          <div className="tabs-container">
            <div className={`tab ${activeTab==='asosiy'?'active':''}`} onClick={() => setActiveTab('asosiy')}><Film size={15} /> Asosiy</div>
            <div className={`tab ${activeTab==='obunalar'?'active':''}`} onClick={() => setActiveTab('obunalar')}><Heart size={15} /> Obunalar</div>
            <div className={`tab ${activeTab==='playlistlar'?'active':''}`} onClick={() => setActiveTab('playlistlar')}><ListVideo size={15} /> Playlistlar</div>
            {selectedAnime && (
              <div className={`tab ${activeTab==='episodes'?'active':''}`} onClick={() => setActiveTab('episodes')}><Play size={15} /> Qismlar</div>
            )}
          </div>

          <div className="content-container">
            {activeTab === 'asosiy' && (
              <div className="grid">
                {userAnimes.length === 0 ? <div style={{gridColumn:'1/-1'}}>{renderEmptyState("Hali anime yuklanmagan :")}</div>
                  : userAnimes.map(anime => (
                  <div key={anime.id} className="card" onClick={() => { setSelectedAnime(anime); loadEpisodes(anime.id); setActiveTab('episodes'); }}>
                    <img src={anime.image_url} alt={anime.title} />
                    <div className="card-overlay"><div className="card-title">{anime.title}</div></div>
                  </div>
                ))}
              </div>
            )}

           {activeTab === 'obunalar' && (
  <div className="grid">
    {favorites.length === 0 ? (
      <div style={{ gridColumn: '1/-1' }}>
        {renderEmptyState("Tomosha qilib bo'lgan animelari ro'yxati :")}
      </div>
    ) : (
      favorites
        .filter(fav => fav.anime_cards) // null larni olib tashlaydi
        .map(fav => (
          <div
            key={fav.anime_card_id}
            className="card"
            onClick={() => goToAnime(fav.anime_cards)}
          >
            <img
              src={fav.anime_cards?.image_url || "/fallback.jpg"}
              alt={fav.anime_cards?.title || "Anime"}
            />
            <div className="card-overlay">
              <div className="card-title">
                {fav.anime_cards?.title || "Nomsiz anime"}
              </div>
            </div>
          </div>
        ))
    )}
  </div>
)}

            {activeTab === 'playlistlar' && (
              <div>
                {playlists.length === 0 ? renderEmptyState("Yaratilgan playlistlar mavjud emas :") : playlists.map(item => (
                  <div key={item.id} className="playlist-item">
                    <img src={item.image_url || LOGO_URL} style={{width:100,height:100,borderRadius:15,objectFit:'cover'}} alt="" />
                    <div style={{flex:1}}>
                      <h3 style={{fontSize:18,marginBottom:8,fontWeight:700}}>{item.title}</h3>
                      <p style={{fontSize:14,color:'rgba(255,255,255,0.6)',lineHeight:1.5}}>{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'episodes' && selectedAnime && (
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:25}}>
                  <h3 style={{fontSize:20,fontWeight:700}}>{selectedAnime.title}</h3>
                  {isOwnProfile && (
                    <button className="action-btn primary" style={{flex:'none'}} onClick={() => setShowEpisodeModal(true)}><Plus size={16}/> Qism yuklash</button>
                  )}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:15}}>
                  {episodes.length === 0 ? renderEmptyState("Hozircha qismlar yuklanmagan :") : episodes.map(ep => (
                    <div key={ep.id} style={{background:'rgba(255,255,255,0.03)',padding:'15px 25px',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'space-between',border:'1px solid rgba(255,255,255,0.05)',backdropFilter:'blur(10px)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:20}}>
                        <div style={{fontSize:22,fontWeight:800,color:'#d946ef',width:40}}>{ep.episode_number}</div>
                        <div style={{fontSize:15,fontWeight:500}}>{ep.title}</div>
                      </div>
                      <a href={ep.video_url} target="_blank" rel="noreferrer" style={{width:45,height:45,borderRadius:'50%',background:'rgba(217,70,239,0.1)',display:'flex',alignItems:'center',justifyContent:'center',color:'#d946ef',transition:'all 0.3s'}}>
                        <Play size={18} style={{marginLeft:4}}/>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Profil tahrirlash */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Profil sozlamalari</h2><button className="close-btn" onClick={() => setShowEditModal(false)}><X size={18}/></button></div>
            <label style={{fontSize:13,color:'#888',marginBottom:5,display:'block'}}>Username</label>
            <input className="input" placeholder="Username" value={editUsername} onChange={e => setEditUsername(e.target.value)} />
            <label style={{fontSize:13,color:'#888',marginBottom:5,display:'block'}}>Bio</label>
            <textarea className="input" placeholder="O'zingiz haqingizda" value={editBio} onChange={e => setEditBio(e.target.value)} style={{height:100,resize:'none'}} />
            <FileInput label="Avatar o'zgartirish" accept="image/*" onChange={e => setAvatarFile(e.target.files[0])} />
            <FileInput label="Banner o'zgartirish" accept="image/*" onChange={e => setBannerFile(e.target.files[0])} />
            <button className="action-btn primary" style={{width:'100%',justifyContent:'center',marginTop:10,padding:14}} onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Yuklanmoqda...' : 'Saqlash'}
            </button>
            <button className="action-btn" style={{width:'100%',justifyContent:'center',marginTop:12,color:'#ef4444',border:'none'}} onClick={handleLogout}>
              <LogOut size={18}/> Profildan chiqish
            </button>
          </div>
        </div>
      )}

      {/* ANIME YUKLASH OYNASI (Faqat kvota bo'lsa chiqadi) */}
      {showAddAnimeModal && (
        <div className="modal-overlay" onClick={() => setShowAddAnimeModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Anime Yuklash</h2>
              <button className="close-btn" onClick={() => setShowAddAnimeModal(false)}><X size={18}/></button>
            </div>
            
            <div style={{ marginBottom: 15, background: 'rgba(217,70,239,0.1)', padding: '10px 15px', borderRadius: 8, color: '#d946ef', fontSize: 13, fontWeight: 600 }}>
              Sizda yana {availableAnimeQuota} ta anime yuklash imkoniyati bor.
            </div>

            <div className="warning-box">
              <AlertTriangle color="#ef4444" size={24} style={{flexShrink:0}} />
              <div className="warning-text">
                <b>Qat'iy ogohlantirish:</b> Platformaga faqat o'zbek tilidagi animelarni yuklang! 
                Kino, serial, <b>18+ (kattalar uchun)</b> materiallar yoki boshqa tillardagi kontent mutlaqo man etiladi.
                Qoida buzilsa, profilingiz darhol bloklanadi va to'lovingiz bekor qilinadi.
              </div>
            </div>

            <label style={{fontSize:13,color:'#888',marginBottom:5,display:'block'}}>Nomi</label>
            <input className="input" placeholder="Masalan: Naruto" value={animeForm.title} onChange={e => setAnimeForm({...animeForm, title: e.target.value})} />
            
            <div style={{display:'flex', gap:10}}>
              <div style={{flex:1}}>
                <label style={{fontSize:13,color:'#888',marginBottom:5,display:'block'}}>Reyting (0-10)</label>
                <input className="input" type="number" step="0.1" max="10" placeholder="8.5" value={animeForm.rating} onChange={e => setAnimeForm({...animeForm, rating: e.target.value})} />
              </div>
              <div style={{flex:1}}>
                <label style={{fontSize:13,color:'#888',marginBottom:5,display:'block'}}>Qismlar soni</label>
                <input className="input" type="number" placeholder="24" value={animeForm.episodes} onChange={e => setAnimeForm({...animeForm, episodes: e.target.value})} />
              </div>
            </div>

            <label style={{fontSize:13,color:'#888',marginBottom:5,display:'block'}}>Janrlar (vergul bilan ajrating)</label>
            <input className="input" placeholder="Action, Drama, Maktab" value={animeForm.genres} onChange={e => setAnimeForm({...animeForm, genres: e.target.value})} />

            <label style={{fontSize:13,color:'#888',marginBottom:5,display:'block'}}>Ta'rifi</label>
            <textarea className="input" placeholder="Anime haqida qisqacha ma'lumot..." value={animeForm.description} onChange={e => setAnimeForm({...animeForm, description: e.target.value})} style={{height:80,resize:'none'}} />

            <FileInput label="Muqova rasmi (Cover Image)" accept="image/*" onChange={e => setAnimeCoverFile(e.target.files[0])} />

            <button className="action-btn primary" style={{width:'100%',justifyContent:'center',padding:14,marginTop:5}} onClick={handleUploadAnime} disabled={saving}>
              {saving ? 'Serverga yuklanmoqda...' : "Xavfsiz Qo'shish"}
            </button>
          </div>
        </div>
      )}

      {/* To'lovdan oldingi ma'lumot (Tushuntirish oynasi) */}
      {showPrePaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPrePaymentModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{paymentType === 'anime' ? "Anime qo'shish xizmati" : "Playlist yaratish"}</h2>
              <button className="close-btn" onClick={() => setShowPrePaymentModal(false)}><X size={18}/></button>
            </div>
            
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.6, marginBottom: 25 }}>
              {paymentType === 'anime' ? (
                <>
                  <p style={{ marginBottom: 12 }}>Platformamizga yangi anime qo'shish maxsus pullik xizmat hisoblanadi. 1 ta to'lov evaziga siz <b>{ANIME_PER_PAYMENT} ta</b> anime yuklash imkoniyatiga (kvotasiga) ega bo'lasiz!</p>
                  <p>To'lov admin tomonidan tasdiqlanganidan so'nggina, animelaringizni to'liq joylash va ularga istalgancha bepul qismlar yuklash imkoniyatiga ega bo'lasiz!</p>
                </>
              ) : (
                <>
                  <p style={{ marginBottom: 12 }}>Playlist — bu xuddi sizning shaxsiy kanalingiz kabi ishlaydi. Unda o'zingiz yoqtirgan yoki boshqalarga tavsiya qilmoqchi bo'lgan animelarni bir joyga jamlaysiz.</p>
                  <p style={{ marginBottom: 12 }}>Agar sizning playlistingiz mashhur bo'lsa, u bizning <b>Top 10</b> talik ro'yxatimizdan joy oladi!</p>
                  <p>Ushbu ajoyib imkoniyatdan foydalanish uchun dastlab to'lov tasdiqlanishi talab etiladi.</p>
                </>
              )}
            </div>

            <button className="action-btn primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }} onClick={() => { setShowPrePaymentModal(false); setShowPaymentModal(true); }}>
              Davom etish
            </button>
          </div>
        </div>
      )}

      {/* Asosiy To'lov oynasi (Chek yuborish) */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>To'lov — Chek yuborish</h2><button className="close-btn" onClick={() => setShowPaymentModal(false)}><X size={18}/></button></div>
            <div style={{background:'rgba(0,0,0,0.5)',padding:20,borderRadius:15,marginBottom:20,textAlign:'center'}}>
              <p style={{color:'rgba(255,255,255,0.6)',fontSize:13,marginBottom:5}}>Karta raqami:</p>
              <p style={{fontSize:20,letterSpacing:2,fontWeight:700}}>{CARD_NUMBER}</p>
              <p style={{marginTop:15,color:'rgba(255,255,255,0.6)',fontSize:13}}>To'lov summasi:</p>
              <p style={{fontSize:26,color:'#d946ef',fontWeight:800}}>{userPaymentAmount} so'm</p>
            </div>
            <FileInput label="Chek rasmini yuklang" accept="image/*" onChange={e => setReceiptFile(e.target.files[0])} />
            <button className="action-btn primary" style={{width:'100%',justifyContent:'center',padding:14,marginTop:5}} onClick={handleVerifyReceipt} disabled={verifyingReceipt}>
              {verifyingReceipt ? 'Yuborilmoqda...' : 'Tasdiqlashga yuborish'}
            </button>
          </div>
        </div>
      )}

      {/* Bildirishnomalar */}
      {showNotifModal && (
        <div className="modal-overlay" onClick={handleCloseNotifs}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{maxHeight:'80vh'}}>
            <div className="modal-header"><h2>Bildirishnomalar</h2><button className="close-btn" onClick={handleCloseNotifs}><X size={18}/></button></div>
            {notifications.length === 0 ? <p style={{textAlign:'center',color:'#888',marginTop:30}}>Bildirishnomalar yo'q</p>
              : notifications.map(n => (
              <div key={n.id} className={`notif-item ${!n.is_read?'unread':''}`}>
                <div style={{fontWeight:600,fontSize:15}}>{n.title}</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.7)',marginTop:5}}>{n.message}</div>
                <span className="notif-time">{new Date(n.created_at).toLocaleDateString('uz-UZ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Qism qo'shish */}
      {showEpisodeModal && (
        <div className="modal-overlay" onClick={() => setShowEpisodeModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Qism qo'shish</h2><button className="close-btn" onClick={() => setShowEpisodeModal(false)}><X size={18}/></button></div>
            <input className="input" placeholder="Qism raqami" value={episodeNumber} onChange={e => setEpisodeNumber(e.target.value)} type="number" />
            <input className="input" placeholder="Nomi" value={episodeTitle} onChange={e => setEpisodeTitle(e.target.value)} />
            <FileInput label="Video fayl" accept="video/*" onChange={e => setEpisodeVideoFile(e.target.files[0])} />
            <button className="action-btn primary" style={{width:'100%',justifyContent:'center',padding:14,marginTop:5}} onClick={() => { setShowEpisodeModal(false); showNotification('success', 'Qism yuklandi'); }}>Yuklash</button>
          </div>
        </div>
      )}

      <MobileNavbar currentUser={currentUser} activeTab="profile" />
    </>
  );
}