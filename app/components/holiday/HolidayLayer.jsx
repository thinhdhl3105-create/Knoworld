'use client';

// v48→v49: Giao diện chúc mừng ngày lễ. Người xem: chỉ đổi giao diện (trang trí thành phố, bảng LED)
// + pháo hoa và dòng chúc mừng lúc vào trang (1 lần/phiên). Không thiệp tự bật, không tường lời chúc.
// Admin: mở bảng sửa lời chúc / xem trước từ bảng Today's Schedule.
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../AuthProvider';
import { useHoliday, setHolidayPreview, refreshHolidaySettings, getSettings } from './useHoliday';
import HolidayParticles from './HolidayParticles';
import HolidayArt from './HolidayArt';
import { HOLIDAYS, fill } from '@/lib/holidays';
import { saveHolidaySettings } from '@/lib/holidayWishes';
import './holiday.css';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';
const QUIET = ['/medisland', '/temple', '/museum', '/login'];
const FX_COLORS = {
  tet: ['#ff9fb5', '#ffc2d1', '#ffd23f'],
  newyear: ['#ffd27a', '#9be7ff', '#ff9bd2', '#c6bfff'],
  women83: ['#ff8fbd', '#ffc2dc', '#ffffff'],
  reunification: ['#ffde00', '#ff4a3d', '#fff1c8'],
  labour: ['#ff5a4e', '#ffd27a', '#7ee8ff', '#ffffff'],
  women2010: ['#d79bff', '#ff7aa8', '#ffb3e1'],
  teachers: ['#ffd25e', '#b7f07e', '#ffffff'],
  christmas: ['#ffffff'],
};

function subtitle(h) {
  switch (h.id) {
    case 'tet': return `Xuân ${h.canchi} · ${h.year}`;
    case 'newyear': return `Chào năm ${h.year}`;
    case 'reunification': return `${h.year - 1975} năm non sông thống nhất`;
    default: return `${h.name} · ${h.when}`;
  }
}

export default function HolidayLayer() {
  const h = useHoliday();
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const path = usePathname() || '/';
  const quiet = QUIET.some((p) => path.startsWith(p));
  const [burst, setBurst] = useState(0);   // v49: số lần bắn pháo hoa (tăng lên -> bắn lại)
  const [admin, setAdmin] = useState(false);
  const lastKey = useRef(null);

  // v49: ngày lễ chỉ đổi giao diện + bắn pháo hoa lúc vào (1 lần mỗi phiên truy cập). Không tự mở thiệp, không kêu gọi tương tác.
  useEffect(() => {
    if (!h) { setBurst(0); return; }
    const k = h.key + (h.preview ? ':p' : '');
    if (lastKey.current === k) return;
    lastKey.current = k;
    if (quiet && !h.preview) return;
    let seen = null; try { seen = sessionStorage.getItem('kw_hol_burst_' + k); } catch { /* ignore */ }
    if (seen && !h.preview) return;
    try { sessionStorage.setItem('kw_hol_burst_' + k, '1'); } catch { /* ignore */ }
    setBurst((b) => b + 1);
  }, [h, quiet]);

  // Lệnh từ bảng Today's Schedule (admin): bắn lại pháo hoa / mở bảng sửa lời chúc
  useEffect(() => {
    const onFire = () => setBurst((b) => b + 1);
    const onAdmin = () => setAdmin(true);
    window.addEventListener('kw-holiday-burst', onFire);
    window.addEventListener('kw-holiday-admin', onAdmin);
    return () => { window.removeEventListener('kw-holiday-burst', onFire); window.removeEventListener('kw-holiday-admin', onAdmin); };
  }, []);
  useEffect(() => {
    if (!admin) return undefined;
    const k = (e) => { if (e.key === 'Escape') setAdmin(false); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [admin]);

  if (!h) return null;
  const vars = { '--hb': h.colors.bg, '--hb2': h.colors.bg2, '--hi': h.colors.ink, '--ha': h.colors.accent, '--hs': h.colors.soft };
  const colors = FX_COLORS[h.id];
  return (
    <div style={vars} className="hl-root" data-holiday={h.id}>
      {burst > 0 && <Entry key={burst} h={h} colors={colors} />}
      {h.preview && isAdmin && (
        <div className="hl-preview-pill">
          <span>{h.emoji} Xem trước · {h.short}</span>
          <button type="button" onClick={() => setBurst((b) => b + 1)} title="Bắn pháo hoa lại">🎆</button>
          <button type="button" onClick={() => setAdmin(true)} title="Sửa lời chúc">✎</button>
          <button type="button" onClick={() => setHolidayPreview(null)} title="Thoát xem trước">⏻</button>
        </div>
      )}
      {admin && isAdmin && <Card h={h} colors={colors} isAdmin onClose={() => setAdmin(false)} />}
    </div>
  );
}

// Màn chào khi vào trang: pháo hoa + dòng chúc mừng, tự tắt sau vài giây, không chặn thao tác.
function Entry({ h, colors }) {
  const [on, setOn] = useState(true);
  useEffect(() => { const t = setTimeout(() => setOn(false), 7000); return () => clearTimeout(t); }, []);
  if (!on) return null;
  return (
    <div className="hl-entry" aria-hidden="true">
      <HolidayParticles kind="fireworks" colors={colors} density={1} />
      <div className="hl-entry-msg">
        <span className="hl-entry-emoji">{h.emoji}</span>
        <b>{fill(h.title, h)}</b>
        <small>{subtitle(h)}</small>
      </div>
    </div>
  );
}

function Card({ h, isAdmin, onClose }) {
  const [edit, setEdit] = useState(true);
  const art = useMemo(() => <HolidayArt h={h} />, [h]);
  return (
    <div className="hl-overlay" role="dialog" aria-modal="true" aria-label={h.title} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hl-card hl-card-solo">
        <button type="button" className="hl-close" onClick={onClose} aria-label="Đóng">✕</button>
        <section className="hl-hero">
          <div className="hl-art">{art}</div>
          <div className="hl-eyebrow">Knoworld City · {h.name} · {h.when}{h.preview ? ' · xem trước' : ''}</div>
          <h2 className="hl-title">{fill(h.title, h)}</h2>
          <div className="hl-sub">{subtitle(h)}</div>
          <p className="hl-msg">{fill(h.message, h)}</p>
          <div className="hl-sign">— Knoworld City</div>
          <p className="hl-admin-note">Chỉ admin thấy bảng này. Người xem chỉ thấy giao diện ngày lễ + pháo hoa lúc vào trang; tiêu đề hiện trên màn chào, lời chúc chạy trên bảng LED trong thành phố.</p>
          {isAdmin && <AdminBar h={h} edit={edit} setEdit={setEdit} />}
        </section>
      </div>
    </div>
  );
}

function AdminBar({ h, edit, setEdit }) {
  const [title, setTitle] = useState(h.title);
  const [message, setMessage] = useState(h.message);
  const [enabled, setEnabled] = useState(h.enabled !== false);
  const [state, setState] = useState('');
  async function save(reset) {
    setState('Đang lưu…');
    const all = { ...(await getSettings(true)) };
    if (reset) delete all[h.id]; else all[h.id] = { title: title.trim(), message: message.trim(), enabled };
    const { error } = await saveHolidaySettings(all);
    setState(error ? 'Lỗi: ' + error : 'Đã lưu ✓');
    if (!error) { refreshHolidaySettings(); if (reset) { const d = HOLIDAYS.find((x) => x.id === h.id); setTitle(d.title); setMessage(d.message); } }
  }
  return (
    <div className="hl-admin">
      <div className="hl-admin-row">
        <span>Admin</span>
        <select value={h.preview ? h.id : ''} onChange={(e) => setHolidayPreview(e.target.value || null)} aria-label="Xem trước ngày lễ">
          <option value="">Theo lịch (thoát xem trước)</option>
          {HOLIDAYS.map((x) => <option key={x.id} value={x.id}>Xem trước: {x.short} · {x.name}</option>)}
        </select>
        <button type="button" onClick={() => setEdit(!edit)}>{edit ? 'Đóng' : '✎ Sửa lời chúc'}</button>
      </div>
      {edit && (
        <div className="hl-admin-edit">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề" />
          <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Lời chúc ({year}, {years}, {canchi} sẽ được thay tự động)" />
          <label><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Hiện giao diện cho ngày lễ này</label>
          <div className="hl-admin-row">
            <button type="button" onClick={() => save(false)}>Lưu</button>
            <button type="button" onClick={() => save(true)}>Về mặc định</button>
            <span className="hl-admin-state">{state}</span>
          </div>
        </div>
      )}
    </div>
  );
}
