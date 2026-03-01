import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  CreditCard, Check, X, Eye, Clock, CheckCircle, XCircle,
  ArrowLeft, Loader, Bell, RefreshCw, User, Inbox, ExternalLink, BarChart2
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const STATUS_LABELS = {
  pending:  { label: 'Kutilmoqda', icon: <Clock size={14} />,       color: '#f59e0b' },
  approved: { label: 'Tasdiqlandi', icon: <CheckCircle size={14} />, color: '#22c55e' },
  rejected: { label: 'Rad etildi', icon: <XCircle size={14} />,     color: '#ef4444' },
};

const TYPE_LABELS = {
  playlist: 'Playlist',
  anime:    'Anime yuklash',
};

export default function PaymentAdmin() {
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending | approved | rejected | all
  const [selectedPayment, setSelectedPayment] = useState(null); // chek ko'rish uchun
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

  useEffect(() => {
    const user = localStorage.getItem('anime_user');
    if (user) {
      const parsed = JSON.parse(user);
      if (parsed.username === 'Malika') {
        setCurrentUser(parsed);
        loadPayments();
      } else {
        window.location.href = '/';
      }
    } else {
      window.location.href = '/';
    }
    setAuthChecked(true);
  }, []);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3500);
  };

  const loadPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          users (
            id,
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const list = data || [];
      setPayments(list);

      // Statistika
      setStats({
        pending:  list.filter(p => p.status === 'pending').length,
        approved: list.filter(p => p.status === 'approved').length,
        rejected: list.filter(p => p.status === 'rejected').length,
        total:    list.length,
      });
    } catch (e) {
      showToast('error', 'Yuklashda xatolik: ' + e.message);
    }
    setLoading(false);
  };

  // To'lovni tasdiqlash yoki rad etish
  const handleDecision = async (payment, decision) => {
    setProcessingId(payment.id);
    try {
      // 1. payments jadvalini yangilash
      const { error: payError } = await supabase
        .from('payments')
        .update({ status: decision })
        .eq('id', payment.id);
      if (payError) throw payError;

      // 2. Foydalanuvchiga notification yuborish
      const isApproved = decision === 'approved';
      const typeName = TYPE_LABELS[payment.payment_type] || payment.payment_type;

      const notifData = {
        user_id: payment.user_id,
        title: isApproved ? '✅ To\'lov tasdiqlandi!' : '❌ To\'lov rad etildi',
        message: isApproved
          ? `Sizning ${typeName} uchun ${payment.amount} so'mlik to'lovingiz tasdiqlandi. Endi foydalanishingiz mumkin!`
          : `Sizning ${typeName} uchun ${payment.amount} so'mlik to'lovingiz rad etildi. Iltimos, to'g'ri chek yuboring yoki biz bilan bog'laning.`,
        type: isApproved ? 'success' : 'warning',
        is_read: false,
      };

      const { error: notifError } = await supabase
        .from('notifications')
        .insert([notifData]);

      // Notification xatosi kritik emas, davom etamiz
      if (notifError) console.warn('Notification yuborilmadi:', notifError.message);

      showToast('success', isApproved ? 'To\'lov tasdiqlandi va foydalanuvchiga xabar yuborildi!' : 'To\'lov rad etildi va foydalanuvchiga xabar yuborildi!');
      await loadPayments();
    } catch (e) {
      showToast('error', 'Xatolik: ' + e.message);
    }
    setProcessingId(null);
  };

  const filteredPayments = filter === 'all'
    ? payments
    : payments.filter(p => p.status === filter);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('uz-UZ') + ' ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  };

  if (!authChecked || !currentUser) return null;

  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; outline: none; }
        body { font-family: 'Courier New', Courier, monospace; background: #000; color: #fff; padding: 20px; min-height: 100vh; }

        .page { max-width: 1200px; margin: 0 auto; }

        /* HEADER */
        .header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 24px 30px; border: 2px solid #fff; border-radius: 12px;
          margin-bottom: 30px; flex-wrap: wrap; gap: 15px;
        }
        .header-title { font-size: 28px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; display: flex; align-items: center; gap: 12px; }
        .header-btns { display: flex; gap: 10px; }
        .btn {
          background: #000; border: 2px solid #fff; color: #fff;
          padding: 10px 20px; border-radius: 8px; cursor: pointer;
          font-size: 13px; font-weight: 700; font-family: 'Courier New', monospace;
          text-transform: uppercase; display: flex; align-items: center; gap: 8px;
          transition: all 0.2s;
        }
        .btn:hover { background: #fff; color: #000; }

        /* STATS */
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
        .stat-card {
          border: 2px solid #fff; border-radius: 12px; padding: 20px 24px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .stat-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
        .stat-value { font-size: 32px; font-weight: 800; }
        .stat-card.pending  .stat-value { color: #f59e0b; }
        .stat-card.approved .stat-value { color: #22c55e; }
        .stat-card.rejected .stat-value { color: #ef4444; }
        .stat-card.total    .stat-value { color: #fff; }

        /* FILTER TABS */
        .filter-tabs { display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; }
        .filter-tab {
          padding: 10px 22px; border-radius: 8px; border: 2px solid #fff;
          background: #000; color: #fff; cursor: pointer; font-size: 13px;
          font-weight: 700; font-family: 'Courier New', monospace; text-transform: uppercase;
          transition: all 0.2s; display: flex; align-items: center; gap: 8px;
        }
        .filter-tab.active { background: #fff; color: #000; }
        .filter-tab .count {
          background: rgba(255,255,255,0.15); padding: 2px 8px; border-radius: 20px;
          font-size: 12px;
        }
        .filter-tab.active .count { background: rgba(0,0,0,0.15); }

        /* PAYMENT TABLE */
        .table-wrapper { border: 2px solid #fff; border-radius: 12px; overflow: hidden; }
        .table-header {
          display: grid;
          grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr 1.5fr;
          padding: 14px 20px;
          background: #111; border-bottom: 2px solid #fff;
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 1px; color: #888;
        }
        .payment-row {
          display: grid;
          grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr 1.5fr;
          padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08);
          align-items: center; transition: background 0.2s;
        }
        .payment-row:last-child { border-bottom: none; }
        .payment-row:hover { background: rgba(255,255,255,0.03); }

        /* User cell */
        .user-cell { display: flex; align-items: center; gap: 10px; }
        .user-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          object-fit: cover; border: 2px solid #fff; flex-shrink: 0;
          background: #222;
        }
        .user-name { font-weight: 700; font-size: 14px; }
        .user-id { font-size: 11px; color: #666; margin-top: 2px; }

        /* Status badge */
        .status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px; border-radius: 20px; font-size: 12px;
          font-weight: 700; border: 1.5px solid;
        }
        .status-pending  { color: #f59e0b; border-color: #f59e0b; background: rgba(245,158,11,0.08); }
        .status-approved { color: #22c55e; border-color: #22c55e; background: rgba(34,197,94,0.08); }
        .status-rejected { color: #ef4444; border-color: #ef4444; background: rgba(239,68,68,0.08); }

        /* Amount */
        .amount { font-weight: 800; font-size: 16px; }

        /* Type badge */
        .type-badge {
          display: inline-block; padding: 4px 10px; border-radius: 6px;
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          border: 1.5px solid #fff; letter-spacing: 0.5px;
        }

        /* Actions */
        .actions-cell { display: flex; gap: 8px; align-items: center; justify-content: flex-end; }
        .action-btn {
          border: 2px solid; border-radius: 8px; cursor: pointer;
          padding: 7px 10px; display: flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 700; font-family: 'Courier New', monospace;
          text-transform: uppercase; transition: all 0.2s; background: #000;
        }
        .action-btn.view   { color: #fff;    border-color: #fff;    }
        .action-btn.view:hover   { background: #fff;    color: #000; }
        .action-btn.approve { color: #22c55e; border-color: #22c55e; }
        .action-btn.approve:hover { background: #22c55e; color: #000; }
        .action-btn.reject  { color: #ef4444; border-color: #ef4444; }
        .action-btn.reject:hover  { background: #ef4444; color: #000; }
        .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Empty / Loading */
        .empty-state {
          padding: 80px 20px; text-align: center; color: #555;
          font-size: 16px; font-family: 'Courier New', monospace;
        }
        .empty-icon { font-size: 48px; margin-bottom: 16px; }

        /* MODAL — chek ko'rish */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.92);
          z-index: 99999; display: flex; align-items: center; justify-content: center;
          padding: 20px; backdrop-filter: blur(8px);
        }
        .modal {
          background: #000; border: 2px solid #fff; border-radius: 16px;
          padding: 32px; max-width: 600px; width: 100%; max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #fff;
        }
        .modal-title { font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        .close-btn {
          background: #000; border: 2px solid #fff; color: #fff;
          width: 36px; height: 36px; border-radius: 8px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .close-btn:hover { background: #fff; color: #000; }

        .modal-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; }
        .info-item { border: 1.5px solid rgba(255,255,255,0.2); border-radius: 10px; padding: 14px 16px; }
        .info-key { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
        .info-val { font-size: 15px; font-weight: 700; }

        .receipt-container {
          border: 2px solid #fff; border-radius: 12px; overflow: hidden;
          margin-bottom: 24px; position: relative;
        }
        .receipt-container img {
          width: 100%; display: block; max-height: 400px; object-fit: contain;
          background: #111;
        }
        .receipt-label {
          position: absolute; top: 10px; left: 10px;
          background: #000; border: 2px solid #fff; color: #fff;
          padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700;
        }
        .receipt-open-btn {
          display: block; text-align: center; padding: 10px;
          background: rgba(255,255,255,0.05); color: #fff; text-decoration: none;
          font-size: 12px; font-weight: 700; font-family: 'Courier New', monospace;
          text-transform: uppercase; letter-spacing: 1px; transition: background 0.2s;
        }
        .receipt-open-btn:hover { background: rgba(255,255,255,0.12); }

        .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
        .modal-btn {
          padding: 12px 28px; border: 2px solid; border-radius: 8px;
          font-weight: 800; cursor: pointer; font-size: 14px;
          font-family: 'Courier New', monospace; text-transform: uppercase;
          display: flex; align-items: center; gap: 8px; transition: all 0.2s;
        }
        .modal-btn.approve { background: #000; color: #22c55e; border-color: #22c55e; }
        .modal-btn.approve:hover { background: #22c55e; color: #000; }
        .modal-btn.reject  { background: #000; color: #ef4444; border-color: #ef4444; }
        .modal-btn.reject:hover  { background: #ef4444; color: #000; }
        .modal-btn.close   { background: #000; color: #fff;    border-color: #fff;    }
        .modal-btn.close:hover   { background: #fff;   color: #000; }
        .modal-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* TOAST */
        .toast {
          position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
          padding: 12px 24px; border-radius: 30px; z-index: 999999;
          display: flex; align-items: center; gap: 10px; font-weight: 700;
          font-size: 14px; font-family: 'Courier New', monospace;
          box-shadow: 0 10px 30px rgba(0,0,0,0.6); border: 2px solid;
          backdrop-filter: blur(10px); white-space: nowrap;
        }
        .toast.success { background: rgba(0,0,0,0.9); color: #22c55e; border-color: #22c55e; }
        .toast.error   { background: rgba(0,0,0,0.9); color: #ef4444; border-color: #ef4444; }

        /* Responsive */
        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .table-header,
          .payment-row { grid-template-columns: 1.5fr 1fr 1fr 1.2fr; }
          .table-header > *:nth-child(3),
          .payment-row > *:nth-child(3),
          .table-header > *:nth-child(5),
          .payment-row > *:nth-child(5) { display: none; }
        }
        @media (max-width: 600px) {
          body { padding: 12px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .stat-value { font-size: 24px; }
          .table-header { display: none; }
          .payment-row { grid-template-columns: 1fr; gap: 10px; padding: 16px; border-bottom: 2px solid rgba(255,255,255,0.1); }
          .actions-cell { justify-content: flex-start; }
          .modal-info-grid { grid-template-columns: 1fr; }
          .modal-actions { flex-direction: column; }
          .modal-btn { justify-content: center; }
        }
      `}</style>

      {/* TOAST */}
      {toast.show && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <Check size={16} /> : <X size={16} />}
          {toast.message}
        </div>
      )}

      {/* CHEK KO'RISH MODALI */}
      {selectedPayment && (
        <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">To'lov tafsiloti</span>
              <button className="close-btn" onClick={() => setSelectedPayment(null)}><X size={18} /></button>
            </div>

            {/* Info grid */}
            <div className="modal-info-grid">
              <div className="info-item">
                <div className="info-key">Foydalanuvchi</div>
                <div className="info-val" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={14} />
                  {selectedPayment.users?.username || 'Noma\'lum'}
                </div>
              </div>
              <div className="info-item">
                <div className="info-key">Summa</div>
                <div className="info-val" style={{ color: '#f59e0b' }}>
                  {selectedPayment.amount?.toLocaleString()} so'm
                </div>
              </div>
              <div className="info-item">
                <div className="info-key">Tur</div>
                <div className="info-val">{TYPE_LABELS[selectedPayment.payment_type] || selectedPayment.payment_type}</div>
              </div>
              <div className="info-item">
                <div className="info-key">Holat</div>
                <div className="info-val">
                  <span className={`status-badge status-${selectedPayment.status}`}>
                    {STATUS_LABELS[selectedPayment.status]?.icon}
                    {STATUS_LABELS[selectedPayment.status]?.label}
                  </span>
                </div>
              </div>
              <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                <div className="info-key">Sana</div>
                <div className="info-val">{formatDate(selectedPayment.created_at)}</div>
              </div>
            </div>

            {/* Chek rasmi */}
            {selectedPayment.receipt_url ? (
              <div className="receipt-container">
                <div className="receipt-label">Chek rasmi</div>
                <img src={selectedPayment.receipt_url} alt="Chek" />
                <a
                  href={selectedPayment.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="receipt-open-btn"
                >
                  <ExternalLink size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                  To'liq o'lchamda ko'rish
                </a>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: 12, marginBottom: 24, color: '#555' }}>
                Chek rasmi yuklanmagan
              </div>
            )}

            <div className="modal-actions">
              {selectedPayment.status === 'pending' && (
                <>
                  <button
                    className="modal-btn reject"
                    onClick={async () => { await handleDecision(selectedPayment, 'rejected'); setSelectedPayment(null); }}
                    disabled={processingId === selectedPayment.id}
                  >
                    {processingId === selectedPayment.id ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={16} />}
                    Rad etish
                  </button>
                  <button
                    className="modal-btn approve"
                    onClick={async () => { await handleDecision(selectedPayment, 'approved'); setSelectedPayment(null); }}
                    disabled={processingId === selectedPayment.id}
                  >
                    {processingId === selectedPayment.id ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
                    Tasdiqlash
                  </button>
                </>
              )}
              <button className="modal-btn close" onClick={() => setSelectedPayment(null)}>
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page">
        {/* HEADER */}
        <div className="header">
          <div className="header-title">
            <CreditCard size={28} />
            To'lovlar boshqaruvi
          </div>
          <div className="header-btns">
            <button className="btn" onClick={loadPayments}>
              <RefreshCw size={14} /> Yangilash
            </button>
            <button className="btn" onClick={() => window.location.href = '/admin/admin'}>
              <ArrowLeft size={14} /> Orqaga
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="stats-grid">
          <div className="stat-card pending" onClick={() => setFilter('pending')} style={{ cursor: 'pointer' }}>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={12} /> Kutilmoqda</div>
            <div className="stat-value">{stats.pending}</div>
          </div>
          <div className="stat-card approved" onClick={() => setFilter('approved')} style={{ cursor: 'pointer' }}>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={12} /> Tasdiqlangan</div>
            <div className="stat-value">{stats.approved}</div>
          </div>
          <div className="stat-card rejected" onClick={() => setFilter('rejected')} style={{ cursor: 'pointer' }}>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><XCircle size={12} /> Rad etilgan</div>
            <div className="stat-value">{stats.rejected}</div>
          </div>
          <div className="stat-card total" onClick={() => setFilter('all')} style={{ cursor: 'pointer' }}>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BarChart2 size={12} /> Jami</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>

        {/* FILTER TABS */}
        <div className="filter-tabs">
          {[
            { key: 'pending',  label: 'Kutilmoqda',   count: stats.pending  },
            { key: 'approved', label: 'Tasdiqlangan',  count: stats.approved },
            { key: 'rejected', label: 'Rad etilgan',   count: stats.rejected },
            { key: 'all',      label: 'Barchasi',      count: stats.total    },
          ].map(tab => (
            <button
              key={tab.key}
              className={`filter-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
              <span className="count">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* TABLE */}
        <div className="table-wrapper">
          <div className="table-header">
            <span>Foydalanuvchi</span>
            <span>Summa</span>
            <span>Tur</span>
            <span>Holat</span>
            <span>Sana</span>
            <span style={{ textAlign: 'right' }}>Amallar</span>
          </div>

          {loading ? (
            <div className="empty-state">
              <Loader size={32} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 16px' }} />
              Yuklanmoqda...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="empty-state">
              <Inbox size={48} style={{ display: 'block', margin: '0 auto 16px', opacity: 0.3 }} />
              {filter === 'pending' ? 'Kutilayotgan to\'lovlar yo\'q' : 'To\'lovlar topilmadi'}
            </div>
          ) : (
            filteredPayments.map(payment => (
              <div key={payment.id} className="payment-row">
                {/* User */}
                <div className="user-cell">
                  <img
                    className="user-avatar"
                    src={payment.users?.avatar_url || 'https://i.pinimg.com/736x/ce/21/07/ce21071acfd1e9deb34850f70285a5f0.jpg'}
                    alt=""
                  />
                  <div>
                    <div className="user-name">{payment.users?.username || 'Noma\'lum'}</div>
                    <div className="user-id">{payment.id.slice(0, 8)}...</div>
                  </div>
                </div>

                {/* Summa */}
                <div className="amount" style={{ color: '#f59e0b' }}>
                  {payment.amount?.toLocaleString()} <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>so'm</span>
                </div>

                {/* Tur */}
                <div>
                  <span className="type-badge">{TYPE_LABELS[payment.payment_type] || payment.payment_type}</span>
                </div>

                {/* Holat */}
                <div>
                  <span className={`status-badge status-${payment.status}`}>
                    {STATUS_LABELS[payment.status]?.icon}
                    {STATUS_LABELS[payment.status]?.label}
                  </span>
                </div>

                {/* Sana */}
                <div style={{ fontSize: 12, color: '#666' }}>
                  {formatDate(payment.created_at)}
                </div>

                {/* Amallar */}
                <div className="actions-cell">
                  <button className="action-btn view" onClick={() => setSelectedPayment(payment)}>
                    <Eye size={13} /> Chek
                  </button>
                  {payment.status === 'pending' && (
                    <>
                      <button
                        className="action-btn reject"
                        onClick={() => handleDecision(payment, 'rejected')}
                        disabled={processingId === payment.id}
                      >
                        {processingId === payment.id
                          ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
                          : <X size={13} />}
                      </button>
                      <button
                        className="action-btn approve"
                        onClick={() => handleDecision(payment, 'approved')}
                        disabled={processingId === payment.id}
                      >
                        {processingId === payment.id
                          ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
                          : <Check size={13} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}