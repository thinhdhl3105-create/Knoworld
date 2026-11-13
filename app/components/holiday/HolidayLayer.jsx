'use client';

// v48: Giao diện chúc mừng ngày lễ — thiệp chúc mừng (tự mở 1 lần/ngày), dải ruy băng
// gọi lại thiệp, hiệu ứng hạt nhẹ trên toàn trang, tường lời chúc (Supabase) và bảng admin.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../AuthProvider';
import { useHoliday, setHolidayPreview, refreshHolidaySettings, getSettings } from './useHoliday';
import HolidayParticles from './HolidayParticles';
import HolidayArt from './HolidayArt';
import { HOLIDAYS, fill, nextHoliday, vnToday } from '@/lib/holidays';
import { fetchWishes, addWish, deleteWish, subscribeWishes, saveHolidaySettings } from '@/lib/holidayWishes';
import { hasRegistered } from '@/lib/visitor';
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
const todayStr = () => { const t = vnToday(); return `${t.y}-${t.m}-${t.d}`; };
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } } };

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
  const [open, setOpen] = useState(false);
  const [fxOff, setFxOff] = useState(false);
  const [next, setNext] = useState(null);
  const lastKey = useRef(null);

  useEffect(() => { setNext(nextHoliday()); }, []);

  // tự mở thiệp: 1 lần/ngày cho mỗi dịp; xem trước thì mở ngay
  useEffect(() => {
    if (!h) { setOpen(false); return; }
    setFxOff(ls.get('kw_hol_fx_off_' + h.key) === '1');
    const k = h.key + (h.preview ? ':p' : '');
    if (lastKey.current === k) return;
    lastKey.current = k;
    if (h.preview) { setOpen(true); return; }
    if (quiet || !(hasRegistered() || user)) return;
    if (ls.get('kw_hol_seen_' + h.key) === todayStr()) return;
    const t = setTimeout(() => setOpen(true), 1400);
    return () => clearTimeout(t);
  }, [h, quiet, user]);

  const close = useCallback(() => { setOpen(false); if (h) ls.set('kw_hol_seen_' + h.key, todayStr()); }, [h]);
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [open, close]);

  if (!h) {
    if (!isAdmin || !next || quiet) return null;
    return (
      <button type="button" className="hl-next" onClick={() => setHolidayPreview(next.id)} title="Admin: xem trước giao diện ngày lễ sắp tới">
        🎉 {next.short} · còn {next.days} ngày <span>xem trước</span>
      </button>
    );
  }

  const vars = { '--hb': h.colors.bg, '--hb2': h.colors.bg2, '--hi': h.colors.ink, '--ha': h.colors.accent, '--hs': h.colors.soft };
  const colors = FX_COLORS[h.id];
  return (
    <div style={vars} className="hl-root" data-holiday={h.id}>
      {!open && !fxOff && !quiet && (
        <div className="hl-ambient"><HolidayParticles kind={h.fx} colors={colors} density={h.fx === 'fireworks' ? 0.2 : 0.28} /></div>
      )}
      {!open && !quiet && (
        <div className="hl-ribbon">
          <button type="button" onClick={() => setOpen(true)} className="hl-ribbon-main">
            <span aria-hidden="true">{h.emoji}</span>{h.preview ? 'Xem trước · ' : ''}{h.title}
          </button>
          <button type="button" className="hl-ribbon-x" title={fxOff ? 'Bật hiệu ứng' : 'Tắt hiệu ứng'}
            onClick={() => { const v = !fxOff; setFxOff(v); ls.set('kw_hol_fx_off_' + h.key, v ? '1' : '0'); }}>
            {fxOff ? '✨' : '✕'}
          </button>
          {h.preview && <button type="button" className="hl-ribbon-x" title="Thoát xem trước" onClick={() => setHolidayPreview(null)}>⏻</button>}
        </div>
      )}
      {open && <Card h={h} colors={colors} isAdmin={isAdmin} onClose={close} />}
    </div>
  );
}

function Card({ h, colors, isAdmin, onClose }) {
  const [wishes, setWishes] = useState([]);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let alive = true;
    try { const v = JSON.parse(localStorage.getItem('kw_visitor') || 'null'); if (v?.full_name) setName(v.full_name); } catch { /* ignore */ }
    fetchWishes(h.key).then((w) => alive && setWishes(w));
    const off = subscribeWishes(h.key, (row) => setWishes((list) => (list.some((x) => x.id === row.id) ? list : [row, ...list])));
    return () => { alive = false; off(); };
  }, [h.key]);

  async function send(e) {
    e.preventDefault(); setErr('');
    if (msg.trim().length < 2) { setErr('Viết vài chữ chúc mừng nhé ✍️'); return; }
    setBusy(true);
    const { data, error } = await addWish(h.key, name, msg);
    setBusy(false);
    if (error) { setErr(error); return; }
    setWishes((list) => (list.some((x) => x.id === data.id) ? list : [data, ...list]));
    setMsg(''); setSent(true); setTimeout(() => setSent(false), 2400);
  }

  const art = useMemo(() => <HolidayArt h={h} />, [h]);
  return (
    <div className="hl-overlay" role="dialog" aria-modal="true" aria-label={h.title} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hl-fx"><HolidayParticles kind={h.fx} colors={colors} density={1} /></div>
      <div className="hl-card">
        <button type="button" className="hl-close" onClick={onClose} aria-label="Đóng">✕</button>
        <section className="hl-hero">
          <div className="hl-art">{art}</div>
          <div className="hl-eyebrow">Knoworld City · {h.name} · {h.when}{h.preview ? ' · xem trước' : ''}</div>
          <h2 className="hl-title">{fill(h.title, h)}</h2>
          <div className="hl-sub">{subtitle(h)}</div>
          <p className="hl-msg">{fill(h.message, h)}</p>
          <div className="hl-sign">— Knoworld City</div>
          <div className="hl-actions">
            <button type="button" className="hl-btn primary" onClick={onClose}>Vào thành phố →</button>
            <a className="hl-btn" href="#hl-wish" onClick={(e) => { e.preventDefault(); document.getElementById('hl-wish-input')?.focus(); }}>💌 Gửi lời chúc</a>
          </div>
          {isAdmin && <AdminBar h={h} edit={edit} setEdit={setEdit} />}
        </section>
        <section className="hl-wall" id="hl-wish">
          <div className="hl-wall-head"><b>Lời chúc từ cư dân</b><span>{wishes.length}</span></div>
          <form className="hl-form" onSubmit={send}>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Tên của bạn" aria-label="Tên" />
            <textarea id="hl-wish-input" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={220} rows={3}
              placeholder={h.id === 'teachers' ? 'Viết lời tri ân gửi thầy cô…' : 'Viết lời chúc của bạn…'} aria-label="Lời chúc" />
            <div className="hl-form-row">
              <span className="hl-count">{msg.length}/220</span>
              {err && <span className="hl-err">{err}</span>}
              {sent && <span className="hl-ok">Đã gửi 💖</span>}
              <button type="submit" className="hl-btn primary sm" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi'}</button>
            </div>
          </form>
          <ul className="hl-wishes">
            {wishes.length === 0 && <li className="hl-empty">Chưa có lời chúc nào — hãy là người đầu tiên!</li>}
            {wishes.map((w, i) => (
              <li key={w.id} className="hl-wish" style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}>
                <p>{w.message}</p>
                <span>— {w.name}</span>
                {isAdmin && <button type="button" className="hl-del" title="Xoá" onClick={async () => { const { error } = await deleteWish(w.id); if (!error) setWishes((l) => l.filter((x) => x.id !== w.id)); }}>✕</button>}
              </li>
            ))}
          </ul>
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
