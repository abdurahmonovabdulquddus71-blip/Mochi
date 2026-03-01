import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Users, ArrowLeft, RefreshCw, Bell, BellOff, Search,
  Check, X, Loader, Send, User, Circle, CheckCircle,
  Clock, Calendar, MessageSquare, ChevronDown, ChevronUp,
  Activity, Inbox
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DEFAULT_AVATAR = 'https://i.pinimg.com/736x/ce/21/07/ce21071acfd1e9deb34850f70285a5f0.jpg';

// Faollik: oxirgi kirgan vaqtdan hisoblash
// last_seen ustuni users jadvalida bo'lishi kerak
const getActivityStatus = (lastSeen) => {
  if (!lastSeen) return { label: 'Noma\'lum', color: '#555', dot: '#555', active: false };
  const diff = Date.now() - new Date(lastSeen).getTime();
  const minutes = diff / 60000;
  if (minutes < 10)  return { label: 'Hozir faol', color: '#22c55e', dot: '#22c55e', active: true };
  if (minutes < 60)  return { label: `${Math.floor(minutes)} daqiqa oldin`, color: '#f59e0b', dot: '#f59e0b', active: false };
  const hours = minutes / 60;
  if (hours < 24)    return { label: `${Math.floor(hours)} soat oldin`, color: '#f59e0b', dot: '#f59e0b', active: false };
  const days = hours / 24;
  if (days < 7)      return { label: `${Math.floor(days)} kun oldin`, color: '#888', dot: '#888', active: false };
  return { label: `${Math.floor(days)} kun oldin`, color: '#ef4444', dot: '#ef4444', active: false };
};

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('uz-UZ') + ' ' + date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
};

export default function UsersAdmin() {
  const [authChecked, setAuthChecked]   = useState(false);
  const [currentUser, setCurrentUser]   = useState(null);
  const [users, setUsers]               = useState([]);
  const [filtered, setFiltered]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all | active | inactive
  const [selectedUsers, setSelectedUsers] = useState([]); // bulk select

  // Notification modal
  const [notifModal, setNotifModal]     = useState({ show: false, target: null }); // target: null = barchasi, user obj = alohida
  const [notifTitle, setNotifTitle]     = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType]       = useState('info'); // info | success | warning
  const [sending, setSending]           = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  useEffect(() => {
    const user = localStorage.getItem('anime_user');
    if (user) {
      const parsed = JSON.parse(user);
      if (parsed.username === 'Malika') {
        setCurrentUser(parsed);
        loadUsers();
      } else {
        window.location.href = '/';
      }
    } else {
      window.location.href = '/';
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, search, filterStatus]);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3500);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const list = data || [];
      setUsers(list);

      const activeCount = list.filter(u => {
        if (!u.last_seen) return false;
        return (Date.now() - new Date(u.last_seen).getTime()) < 10 * 60000;
      }).length;

      setStats({ total: list.length, active: activeCount, inactive: list.length - activeCount });
    } catch (e) {
      showToast('error', 'Yuklashda xatolik: ' + e.message);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let list = [...users];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }

    if (filterStatus === 'active') {
      list = list.filter(u => u.last_seen && (Date.now() - new Date(u.last_seen).getTime()) < 10 * 60000);
    } else if (filterStatus === 'inactive') {
      list = list.filter(u => !u.last_seen || (Date.now() - new Date(u.last_seen).getTime()) >= 10 * 60000);
    }

    setFiltered(list);
  };

  // Notification yuborish
  const handleSendNotif = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      showToast('error', 'Sarlavha va matn kiritish majburiy!');
      return;
    }
    setSending(true);

    try {
      let targetIds = [];

      if (notifModal.target === 'bulk') {
        // Tanlangan userlar
        targetIds = selectedUsers;
      } else if (notifModal.target === null) {
        // Barcha userlar
        targetIds = users.map(u => u.id);
      } else {
        // Bitta user
        targetIds = [notifModal.target.id];
      }

      if (targetIds.length === 0) {
        showToast('error', 'Hech qanday foydalanuvchi tanlanmagan!');
        setSending(false);
        return;
      }

      const rows = targetIds.map(uid => ({
        user_id: uid,
        title:   notifTitle.trim(),
        message: notifMessage.trim(),
        type:    notifType,
        is_read: false,
      }));

      const { error } = await supabase.from('notifications').insert(rows);
      if (error) throw error;

      setNotifModal({ show: false, target: null });
      setNotifTitle('');
      setNotifMessage('');
      setNotifType('info');
      setSelectedUsers([]);
      showToast('success', `${targetIds.length} ta foydalanuvchiga xabar yuborildi!`);
    } catch (e) {
      showToast('error', 'Xatolik: ' + e.message);
    }
    setSending(false);
  };

  const toggleSelectUser = (id) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filtered.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filtered.map(u => u.id));
    }
  };

  if (!authChecked || !currentUser) return null;

  return (
    <>
      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }

        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; outline: none; }
        body { font-family: 'Courier New', Courier, monospace; background: #000; color: #fff; padding: 20px; min-height: 100vh; }

        .page { max-width: 1300px; margin: 0 auto; }

        /* HEADER */
        .header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 24px 30px; border: 2px solid #fff; border-radius: 12px;
          margin-bottom: 28px; flex-wrap: wrap; gap: 15px;
        }
        .header-title { font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; display: flex; align-items: center; gap: 12px; }
        .header-btns { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn {
          background: #000; border: 2px solid #fff; color: #fff;
          padding: 10px 18px; border-radius: 8px; cursor: pointer;
          font-size: 13px; font-weight: 700; font-family: 'Courier New', monospace;
          text-transform: uppercase; display: flex; align-items: center; gap: 8px;
          transition: all 0.2s; white-space: nowrap;
        }
        .btn:hover { background: #fff; color: #000; }
        .btn.accent { border-color: #d946ef; color: #d946ef; }
        .btn.accent:hover { background: #d946ef; color: #000; }

        /* STATS */
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
        .stat-card {
          border: 2px solid #fff; border-radius: 12px; padding: 20px 24px;
          cursor: pointer; transition: all 0.2s;
        }
        .stat-card:hover { background: rgba(255,255,255,0.04); }
        .stat-card.active-filter { background: #fff; color: #000; }
        .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; opacity: 0.6; }
        .stat-card.active-filter .stat-label { opacity: 0.7; }
        .stat-value { font-size: 36px; font-weight: 800; }
        .stat-value.green { color: #22c55e; }
        .stat-value.red   { color: #ef4444; }
        .stat-card.active-filter .stat-value { color: #000; }

        /* TOOLBAR */
        .toolbar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
        .search-box {
          flex: 1; min-width: 200px; display: flex; align-items: center; gap: 10px;
          border: 2px solid #fff; border-radius: 8px; padding: 10px 14px;
          background: #000;
        }
        .search-box input {
          flex: 1; background: transparent; border: none; color: #fff;
          font-size: 14px; font-family: 'Courier New', monospace;
        }
        .search-box input::placeholder { color: #555; }

        /* BULK BAR */
        .bulk-bar {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 20px; border: 2px solid #d946ef; border-radius: 10px;
          margin-bottom: 16px; background: rgba(217,70,239,0.06);
          flex-wrap: wrap;
        }
        .bulk-count { font-weight: 700; color: #d946ef; font-size: 14px; }

        /* TABLE */
        .table-wrapper { border: 2px solid #fff; border-radius: 12px; overflow: hidden; }
        .table-header {
          display: grid;
          grid-template-columns: 40px 2.5fr 1.5fr 1fr 1.2fr 120px;
          padding: 13px 20px; background: #111;
          border-bottom: 2px solid #fff;
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 1px; color: #666; align-items: center;
        }
        .user-row {
          display: grid;
          grid-template-columns: 40px 2.5fr 1.5fr 1fr 1.2fr 120px;
          padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.07);
          align-items: center; transition: background 0.15s;
        }
        .user-row:last-child { border-bottom: none; }
        .user-row:hover { background: rgba(255,255,255,0.03); }
        .user-row.selected { background: rgba(217,70,239,0.07); }

        /* Checkbox */
        .cb {
          width: 20px; height: 20px; border: 2px solid #fff; border-radius: 4px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; flex-shrink: 0;
        }
        .cb.checked { background: #d946ef; border-color: #d946ef; }

        /* User cell */
        .user-cell { display: flex; align-items: center; gap: 12px; }
        .avatar-wrap { position: relative; flex-shrink: 0; }
        .avatar {
          width: 40px; height: 40px; border-radius: 50%;
          object-fit: cover; border: 2px solid rgba(255,255,255,0.2);
          background: #1a1a1a;
        }
        .active-dot {
          position: absolute; bottom: 1px; right: 1px;
          width: 10px; height: 10px; border-radius: 50%;
          border: 2px solid #000;
        }
        .active-dot.online { background: #22c55e; animation: pulse 2s infinite; }
        .active-dot.offline { background: #555; }

        .user-name { font-weight: 700; font-size: 14px; }
        .user-bio { font-size: 11px; color: #666; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }

        /* Last seen */
        .last-seen { font-size: 12px; display: flex; align-items: center; gap: 5px; }

        /* Status pill */
        .status-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 20px; font-size: 11px;
          font-weight: 700; white-space: nowrap; border: 1.5px solid;
        }

        /* Join date */
        .join-date { font-size: 12px; color: #555; display: flex; align-items: center; gap: 5px; }

        /* Row actions */
        .row-actions { display: flex; justify-content: flex-end; }
        .icon-btn {
          border: 2px solid #fff; border-radius: 8px; background: #000; color: #fff;
          width: 36px; height: 36px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .icon-btn:hover { background: #d946ef; border-color: #d946ef; }

        /* Empty */
        .empty-state {
          padding: 80px 20px; text-align: center; color: #555; font-size: 15px;
        }

        /* NOTIFICATION MODAL */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.92);
          z-index: 99999; display: flex; align-items: center; justify-content: center;
          padding: 20px; backdrop-filter: blur(10px);
        }
        .modal {
          background: #000; border: 2px solid #fff; border-radius: 16px;
          padding: 32px; max-width: 520px; width: 100%;
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 24px; padding-bottom: 18px; border-bottom: 2px solid rgba(255,255,255,0.1);
        }
        .modal-title { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        .close-btn {
          background: #000; border: 2px solid #fff; color: #fff;
          width: 34px; height: 34px; border-radius: 8px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .close-btn:hover { background: #fff; color: #000; }

        /* Target info */
        .target-info {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border: 1.5px solid rgba(217,70,239,0.4);
          border-radius: 10px; margin-bottom: 20px;
          background: rgba(217,70,239,0.06);
        }
        .target-info img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.2); }
        .target-name { font-weight: 700; font-size: 14px; }
        .target-sub  { font-size: 11px; color: #888; margin-top: 2px; }

        .form-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; display: block; }
        .form-group { margin-bottom: 18px; }
        .form-input, .form-textarea {
          width: 100%; background: #000; border: 2px solid rgba(255,255,255,0.2);
          border-radius: 10px; color: #fff; padding: 12px 14px;
          font-size: 14px; font-family: 'Courier New', monospace;
          transition: border 0.2s;
        }
        .form-input:focus, .form-textarea:focus { border-color: #d946ef; }
        .form-textarea { min-height: 100px; resize: vertical; }

        /* Type selector */
        .type-selector { display: flex; gap: 8px; }
        .type-btn {
          flex: 1; padding: 9px; border: 2px solid rgba(255,255,255,0.2);
          border-radius: 8px; background: #000; color: #888; cursor: pointer;
          font-size: 12px; font-weight: 700; font-family: 'Courier New', monospace;
          text-transform: uppercase; transition: all 0.2s; text-align: center;
        }
        .type-btn.active-info    { border-color: #60a5fa; color: #60a5fa; background: rgba(96,165,250,0.08); }
        .type-btn.active-success { border-color: #22c55e; color: #22c55e; background: rgba(34,197,94,0.08); }
        .type-btn.active-warning { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.08); }

        .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }
        .modal-btn {
          padding: 11px 24px; border: 2px solid; border-radius: 8px;
          font-weight: 800; cursor: pointer; font-size: 13px;
          font-family: 'Courier New', monospace; text-transform: uppercase;
          display: flex; align-items: center; gap: 8px; transition: all 0.2s;
        }
        .modal-btn.send  { background: #000; color: #d946ef; border-color: #d946ef; }
        .modal-btn.send:hover { background: #d946ef; color: #000; }
        .modal-btn.cancel { background: #000; color: #fff; border-color: #fff; }
        .modal-btn.cancel:hover { background: #fff; color: #000; }
        .modal-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* TOAST */
        .toast {
          position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
          padding: 12px 24px; border-radius: 30px; z-index: 999999;
          display: flex; align-items: center; gap: 10px; font-weight: 700;
          font-size: 13px; font-family: 'Courier New', monospace;
          box-shadow: 0 10px 30px rgba(0,0,0,0.6); border: 2px solid;
          backdrop-filter: blur(10px); white-space: nowrap;
        }
        .toast.success { background: rgba(0,0,0,0.95); color: #22c55e; border-color: #22c55e; }
        .toast.error   { background: rgba(0,0,0,0.95); color: #ef4444; border-color: #ef4444; }

        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: repeat(3, 1fr); }
          .table-header,
          .user-row { grid-template-columns: 40px 2fr 1.2fr 100px; }
          .table-header > *:nth-child(4),
          .user-row > *:nth-child(4),
          .table-header > *:nth-child(5),
          .user-row > *:nth-child(5) { display: none; }
        }
        @media (max-width: 600px) {
          body { padding: 12px; }
          .stats-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .stat-value { font-size: 26px; }
          .table-header { display: none; }
          .user-row { grid-template-columns: 40px 1fr 100px; gap: 8px; padding: 14px; }
          .table-header > *:nth-child(3),
          .user-row > *:nth-child(3) { display: none; }
          .header-title { font-size: 20px; }
        }
      `}</style>

      {/* TOAST */}
      {toast.show && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <Check size={15} /> : <X size={15} />}
          {toast.message}
        </div>
      )}

      {/* NOTIFICATION MODAL */}
      {notifModal.show && (
        <div className="modal-overlay" onClick={() => setNotifModal({ show: false, target: null })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                <Bell size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
                Xabar yuborish
              </span>
              <button className="close-btn" onClick={() => setNotifModal({ show: false, target: null })}><X size={16} /></button>
            </div>

            {/* Kimga yuboriladi */}
            <div className="target-info">
              {notifModal.target === null ? (
                <>
                  <Users size={28} style={{ color: '#d946ef', flexShrink: 0 }} />
                  <div>
                    <div className="target-name">Barcha foydalanuvchilar</div>
                    <div className="target-sub">{users.length} ta foydalanuvchiga yuboriladi</div>
                  </div>
                </>
              ) : notifModal.target === 'bulk' ? (
                <>
                  <CheckCircle size={28} style={{ color: '#d946ef', flexShrink: 0 }} />
                  <div>
                    <div className="target-name">Tanlangan foydalanuvchilar</div>
                    <div className="target-sub">{selectedUsers.length} ta foydalanuvchiga yuboriladi</div>
                  </div>
                </>
              ) : (
                <>
                  <img src={notifModal.target.avatar_url || DEFAULT_AVATAR} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  <div>
                    <div className="target-name">@{notifModal.target.username}</div>
                    <div className="target-sub">Faqat shu foydalanuvchiga yuboriladi</div>
                  </div>
                </>
              )}
            </div>

            {/* Type */}
            <div className="form-group">
              <label className="form-label">Xabar turi</label>
              <div className="type-selector">
                {['info', 'success', 'warning'].map(t => (
                  <button
                    key={t}
                    className={`type-btn ${notifType === t ? `active-${t}` : ''}`}
                    onClick={() => setNotifType(t)}
                  >
                    {t === 'info' ? 'Axborot' : t === 'success' ? 'Muvaffaq.' : 'Ogohlant.'}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="form-label">Sarlavha *</label>
              <input
                className="form-input"
                placeholder="Xabar sarlavhasi..."
                value={notifTitle}
                onChange={e => setNotifTitle(e.target.value)}
                disabled={sending}
              />
            </div>

            {/* Message */}
            <div className="form-group">
              <label className="form-label">Matn *</label>
              <textarea
                className="form-textarea"
                placeholder="Xabar matni..."
                value={notifMessage}
                onChange={e => setNotifMessage(e.target.value)}
                disabled={sending}
              />
            </div>

            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setNotifModal({ show: false, target: null })} disabled={sending}>
                Bekor
              </button>
              <button className="modal-btn send" onClick={handleSendNotif} disabled={sending}>
                {sending
                  ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={15} />}
                Yuborish
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page">
        {/* HEADER */}
        <div className="header">
          <div className="header-title">
            <Users size={26} />
            Foydalanuvchilar
          </div>
          <div className="header-btns">
            <button className="btn accent" onClick={() => { setNotifTitle(''); setNotifMessage(''); setNotifType('info'); setNotifModal({ show: true, target: null }); }}>
              <Bell size={14} /> Barchaga xabar
            </button>
            <button className="btn" onClick={loadUsers}>
              <RefreshCw size={14} /> Yangilash
            </button>
            <button className="btn" onClick={() => window.location.href = '/admin/admin'}>
              <ArrowLeft size={14} /> Orqaga
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="stats-grid">
          <div className={`stat-card ${filterStatus === 'all' ? 'active-filter' : ''}`} onClick={() => setFilterStatus('all')}>
            <div className="stat-label"><Users size={12} /> Jami</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className={`stat-card ${filterStatus === 'active' ? 'active-filter' : ''}`} onClick={() => setFilterStatus('active')}>
            <div className="stat-label"><Activity size={12} /> Faol (10 daq)</div>
            <div className={`stat-value ${filterStatus !== 'active' ? 'green' : ''}`}>{stats.active}</div>
          </div>
          <div className={`stat-card ${filterStatus === 'inactive' ? 'active-filter' : ''}`} onClick={() => setFilterStatus('inactive')}>
            <div className="stat-label"><BellOff size={12} /> Faol emas</div>
            <div className={`stat-value ${filterStatus !== 'inactive' ? 'red' : ''}`}>{stats.inactive}</div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="toolbar">
          <div className="search-box">
            <Search size={16} style={{ color: '#555', flexShrink: 0 }} />
            <input
              placeholder="Username yoki email bo'yicha qidirish..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', display: 'flex' }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* BULK ACTION BAR */}
        {selectedUsers.length > 0 && (
          <div className="bulk-bar">
            <CheckCircle size={16} style={{ color: '#d946ef' }} />
            <span className="bulk-count">{selectedUsers.length} ta tanlandi</span>
            <button className="btn accent" style={{ padding: '7px 14px', fontSize: 12 }}
              onClick={() => { setNotifTitle(''); setNotifMessage(''); setNotifType('info'); setNotifModal({ show: true, target: 'bulk' }); }}>
              <Send size={13} /> Xabar yuborish
            </button>
            <button className="btn" style={{ padding: '7px 14px', fontSize: 12 }}
              onClick={() => setSelectedUsers([])}>
              <X size={13} /> Bekor
            </button>
          </div>
        )}

        {/* TABLE */}
        <div className="table-wrapper">
          <div className="table-header">
            {/* Select all */}
            <div
              className={`cb ${selectedUsers.length === filtered.length && filtered.length > 0 ? 'checked' : ''}`}
              onClick={toggleSelectAll}
            >
              {selectedUsers.length === filtered.length && filtered.length > 0 && <Check size={12} color="#fff" />}
            </div>
            <span>Foydalanuvchi</span>
            <span>Holat / Oxirgi kirish</span>
            <span>Ro'yxatdan o'tgan</span>
            <span>Bio</span>
            <span style={{ textAlign: 'right' }}>Amal</span>
          </div>

          {loading ? (
            <div className="empty-state">
              <Loader size={32} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 16px' }} />
              Yuklanmoqda...
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Inbox size={40} style={{ display: 'block', margin: '0 auto 14px', opacity: 0.3 }} />
              Foydalanuvchilar topilmadi
            </div>
          ) : (
            filtered.map(user => {
              const status = getActivityStatus(user.last_seen);
              const isSelected = selectedUsers.includes(user.id);
              return (
                <div key={user.id} className={`user-row ${isSelected ? 'selected' : ''}`}>
                  {/* Checkbox */}
                  <div className={`cb ${isSelected ? 'checked' : ''}`} onClick={() => toggleSelectUser(user.id)}>
                    {isSelected && <Check size={12} color="#fff" />}
                  </div>

                  {/* User info */}
                  <div className="user-cell">
                    <div className="avatar-wrap">
                      <img className="avatar" src={user.avatar_url || DEFAULT_AVATAR} alt="" />
                      <span className={`active-dot ${status.active ? 'online' : 'offline'}`} />
                    </div>
                    <div>
                      <div className="user-name">@{user.username}</div>
                      {user.email && <div className="user-bio">{user.email}</div>}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <span className="status-pill" style={{ color: status.color, borderColor: status.color, background: status.color + '15' }}>
                      <Circle size={7} fill={status.color} stroke="none" />
                      {status.label}
                    </span>
                  </div>

                  {/* Join date */}
                  <div className="join-date">
                    <Calendar size={12} />
                    {formatDate(user.created_at)}
                  </div>

                  {/* Bio */}
                  <div style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                    {user.bio || <span style={{ opacity: 0.3 }}>— bio yo'q —</span>}
                  </div>

                  {/* Action */}
                  <div className="row-actions">
                    <button
                      className="icon-btn"
                      title="Xabar yuborish"
                      onClick={() => { setNotifTitle(''); setNotifMessage(''); setNotifType('info'); setNotifModal({ show: true, target: user }); }}
                    >
                      <MessageSquare size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div style={{ textAlign: 'right', marginTop: 14, fontSize: 12, color: '#444', fontFamily: 'Courier New, monospace' }}>
            {filtered.length} / {users.length} foydalanuvchi ko'rsatilmoqda
          </div>
        )}
      </div>
    </>
  );
}