'use client';

// v64: CREATIVE CITY — màn chiếu của giáo viên (chỉ tài khoản admin).
// Chọn/tạo phòng, chuyển trạm cho cả lớp, điều khiển câu đố Ảnh Lạ, bấm giờ vẽ,
// duyệt tranh, xem Phòng Tranh & word cloud cỡ lớn, sửa bộ câu hỏi và danh sách thương hiệu.
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '@/app/components/AuthProvider';
import {
  CC_ADMIN_EMAIL, CC_STATIONS, ccChannel, ccError, ccState, normRoom,
  adminRooms, adminCreateRoom, adminUpdateRoom, adminResetRoom, adminPlayers, adminQuestions, adminSaveQuestion,
  adminDeleteQuestion, adminUploadQuizImage, adminArt, adminSetArt, adminBrands, adminSaveBrand, adminDeleteBrand,
  adminClearWords, adminQuiz, adminDraw, adminShuffleQuestions, adminScans, withZoom, parseQuizImage,
  adminDeleteRoom, ccZone, ccStation, joinLink, CC_ZONES, CC_ZONE_VIEWS, CC_QUIZ_SECONDS,
} from '@/lib/creative';
import { Av, Board, Cloud, Pin, QuizPhoto, Ring, Shape, TILE_COLORS } from '../ui';

const ms = (iso) => (iso ? Date.parse(iso) : 0);
const fmtClock = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const zoneName = (z) => ccStation(z)?.full || 'Cả thành phố';
const TABS = [...CC_STATIONS.map((s) => ({ id: s.id, label: s.name, color: s.color, live: true })),
  { id: 'questions', label: 'Bộ câu hỏi', icon: 'quiz' }, { id: 'brands', label: 'Đề vẽ', icon: 'sell' }, { id: 'rooms', label: 'Phòng', icon: 'meeting_room' }];

export default function CreativeHostPage() {
  const { user, loading } = useAuth();
  const isAdmin = (user?.email || '').toLowerCase() === CC_ADMIN_EMAIL;
  if (loading) return <main className="cc"><div className="cc-wide" style={{ paddingTop: 80 }}><span className="cc-hint">Đang kiểm tra tài khoản…</span></div></main>;
  if (!isAdmin) {
    return (
      <main className="cc"><div className="cc-wrap" style={{ paddingTop: 80 }}>
        <div className="cc-glass cc-card">
          <span className="cc-label">Creative City · Màn chiếu</span>
          <h1 style={{ fontSize: 26 }}>Chỉ giáo viên mới mở được màn chiếu</h1>
          <p style={{ margin: 0, color: 'var(--soft)' }}>Đăng nhập bằng tài khoản admin của Knoworld để điều khiển buổi học. Học sinh vào ở trang Creative City bằng mã phòng.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link className="cc-btn" href="/login">Đăng nhập</Link>
            <Link className="cc-btn ghost" href="/creative">Trang học sinh</Link>
          </div>
        </div>
      </div></main>
    );
  }
  return <Host />;
}

function Host() {
  const [rooms, setRooms] = useState([]);
  const [code, setCode] = useState('');
  const [tab, setTab] = useState('gate');
  const [st, setSt] = useState(null);
  const [players, setPlayers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [err, setErr] = useState('');
  const [offset, setOffset] = useState(0);
  const chRef = useRef(null);
  const rawRoom = rooms.find((r) => r.code === code) || null;
  const room = useMemo(() => {
    if (!rawRoom) return null;
    let z = ccZone(rawRoom.zone);
    if (!z) { try { z = ccZone(localStorage.getItem(`cc_host_zone_${rawRoom.code}`)); } catch { /* ignore */ } }
    return { ...rawRoom, zone: z };
  }, [rawRoom]);
  const zone = room?.zone || null;
  const tabs = useMemo(() => (zone
    ? TABS.filter((t) => !t.live || t.id === 'gate' || CC_ZONE_VIEWS[zone].includes(t.id) || (zone === 'draw' && t.id === 'wall'))
    : TABS), [zone]);

  const loadRooms = useCallback(async () => {
    try {
      const list = await adminRooms(); setRooms(list);
      setCode((c) => {
        if (c && list.some((r) => r.code === c)) return c;
        let saved = ''; try { saved = localStorage.getItem('cc_host_room') || ''; } catch { /* ignore */ }
        return list.some((r) => r.code === saved) ? saved : (list[0]?.code || '');
      });
    } catch (e) { setErr(ccError(e)); }
  }, []);
  const loadQuestions = useCallback(async () => { try { setQuestions(await adminQuestions()); } catch (e) { setErr(ccError(e)); } }, []);
  useEffect(() => { loadRooms(); loadQuestions(); }, [loadRooms, loadQuestions]);
  useEffect(() => { if (code) { try { localStorage.setItem('cc_host_room', code); } catch { /* ignore */ } } }, [code]);

  const refresh = useCallback(async () => {
    if (!code) return;
    try { const d = await ccState(code, null); setSt(d); setOffset(ms(d.now) - Date.now()); } catch { /* phòng đóng */ }
  }, [code]);
  // v67: ai vừa vào lớp -> bật thông báo trên màn chiếu; đếm số máy đã quét QR.
  const [scans, setScans] = useState(() => new Set());
  const [toasts, setToasts] = useState([]);
  const seen = useRef(null);
  const pushToast = useCallback((t) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((xs) => [...xs.slice(-4), { ...t, id }]);
    setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), 4200);
  }, []);
  const refreshPlayers = useCallback(async () => {
    if (!code) return;
    try {
      const list = await adminPlayers(code);
      setPlayers(list);
      if (seen.current) list.forEach((p) => { if (!seen.current.has(p.id)) pushToast({ name: p.name, color: p.color }); });
      seen.current = new Set(list.map((p) => p.id));
    } catch { /* ignore */ }
  }, [code, pushToast]);
  const refreshScans = useCallback(async () => {
    if (!code) return;
    const rows = await adminScans(code);
    if (rows) setScans((s) => { const n = new Set(s); rows.forEach((r) => n.add(r.visitor)); return n.size === s.size ? s : n; });
  }, [code]);

  useEffect(() => {
    if (!code) return undefined;
    setSt(null); seen.current = null; setScans(new Set()); setToasts([]);
    refresh(); refreshPlayers(); refreshScans();
    const a = setInterval(refresh, 1500); const b = setInterval(refreshPlayers, 2000); const c = setInterval(refreshScans, 4000);
    chRef.current = ccChannel(code, (m) => {
      if (m?.kind === 'scan' && m.v) setScans((s) => (s.has(m.v) ? s : new Set(s).add(m.v)));
      else if (m?.kind === 'join') refreshPlayers();
      refresh();
    });
    return () => { clearInterval(a); clearInterval(b); clearInterval(c); chRef.current?.close(); chRef.current = null; };
  }, [code, refresh, refreshPlayers, refreshScans]);

  const ping = () => chRef.current?.ping({ at: Date.now() });
  const patchRoom = async (patch) => {
    setErr('');
    try { const r = await adminUpdateRoom(code, patch); setRooms((xs) => xs.map((x) => (x.code === code ? r : x))); ping(); refresh(); } catch (e) { setErr(ccError(e)); }
  };
  // v68: luôn gửi kèm số câu (trước đây gửi rỗng -> máy chủ đặt về câu 1).
  const quiz = useCallback(async (phase, index) => {
    setErr('');
    try { await adminQuiz(code, phase, index ?? room?.quiz_index ?? 0); await loadRooms(); ping(); refresh(); } catch (e) { setErr(ccError(e)); }
  }, [code, room?.quiz_index, loadRooms, refresh]);
  const goStation = (id) => { setTab(id); if (room && room.station !== id) patchRoom({ station: id }); };

  // v65: Tạo lớp mới kiểu Kahoot — một chạm, mã PIN 6 số, mở ngay sảnh chờ.
  const [creating, setCreating] = useState(false);
  const [menu, setMenu] = useState(false);
  const newClass = useCallback(async (zoneId = null) => {
    setCreating(true); setErr(''); setMenu(false);
    const z = ccZone(zoneId);
    const d = new Date();
    const title = `${z ? `${ccStation(z).name} · ` : ''}Lớp ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    try {
      for (let i = 0; i < 6; i += 1) {
        const pin = String(100000 + Math.floor(Math.random() * 900000));
        try {
          await adminCreateRoom(pin, title, z);
          try { if (z) localStorage.setItem(`cc_host_zone_${pin}`, z); } catch { /* ignore */ }
          if (!z || z === 'guess') { try { await adminShuffleQuestions(); await loadQuestions(); } catch { /* vẫn dùng thứ tự cũ */ } }
          await loadRooms(); setCode(pin); setTab('gate'); return;
        } catch (e) { if (e?.code !== '23505') throw e; }
      }
      throw new Error('Không tạo được mã PIN, thử lại nhé.');
    } catch (e) { setErr(ccError(e)); } finally { setCreating(false); }
  }, [loadRooms, loadQuestions]);
  const autoNew = useRef(false);
  useEffect(() => {
    if (autoNew.current) return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('new') === '1') {
      autoNew.current = true;
      try { window.history.replaceState(null, '', '/creative/host'); } catch { /* ignore */ }
      newClass(sp.get('zone'));
    }
  }, [newClass]);

  const joinUrl = typeof window !== 'undefined' && code ? joinLink(window.location.origin, code, zone) : '';
  const deleteRoom = async (c) => {
    setErr('');
    try {
      await adminDeleteRoom(c);
      try { localStorage.removeItem(`cc_host_zone_${c}`); if (localStorage.getItem('cc_host_room') === c) localStorage.removeItem('cc_host_room'); } catch { /* ignore */ }
      if (c === code) { setCode(''); setTab('gate'); }
      await loadRooms();
    } catch (e) { setErr(ccError(e)); }
  };
  const newMenu = (
    <div className="cc-newmenu">
      <button type="button" className="cc-btn gold sm" onClick={() => setMenu((m) => !m)} disabled={creating} aria-expanded={menu}>
        <span className="material-symbols-outlined" style={{ fontSize: 17 }}>add</span>{creating ? 'Đang tạo…' : 'Tạo lớp mới'}
        <span className="material-symbols-outlined" style={{ fontSize: 17 }}>expand_more</span>
      </button>
      {menu && (
        <div className="cc-newmenu-pop cc-glass" role="menu">
          <span className="cc-label">Tạo lớp trong khu…</span>
          {CC_ZONES.map((z) => (
            <button key={z} type="button" role="menuitem" onClick={() => newClass(z)}>
              <span className="cc-dot" style={{ background: ccStation(z).color }} /><b>{ccStation(z).full}</b><small>QR chỉ vào {ccStation(z).name}</small>
            </button>
          ))}
          <button type="button" role="menuitem" onClick={() => newClass(null)}>
            <span className="cc-dot" style={{ background: '#ffd27a' }} /><b>Cả thành phố</b><small>Đi qua tất cả các trạm</small>
          </button>
        </div>
      )}
    </div>
  );
  return (
    <main className="cc">
      <header className="cc-host-top">
        <div className="cc-wide"><div className="row">
          <span className="cc-pill cc-brand"><span className="cc-logo" />Creative City</span>
          <span className="cc-label" style={{ marginLeft: 4 }}>Màn chiếu giáo viên</span>
          <select className="cc-input" style={{ width: 'auto', height: 36, marginLeft: 'auto' }} value={code} onChange={(e) => setCode(e.target.value)} aria-label="Chọn phòng">
            {!rooms.length && <option value="">Chưa có lớp</option>}
            {rooms.map((r) => <option key={r.code} value={r.code}>{r.code} · {r.title}</option>)}
          </select>
          {newMenu}
          <button type="button" className="cc-btn ghost sm" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>Toàn màn hình</button>
          <Link className="cc-btn ghost sm" href="/?city=creative"><span className="material-symbols-outlined" style={{ fontSize: 17 }}>flight</span>Creative City</Link>
          <Link className="cc-btn ghost sm" href="/"><span className="material-symbols-outlined" style={{ fontSize: 17 }}>home</span>Knoworld City</Link>
        </div></div>
      </header>
      <div className="cc-wide">
        {err && <p className="cc-err" style={{ marginTop: 10 }}>{err}</p>}
        {!room ? (
          <div style={{ display: 'grid', gap: 16, paddingTop: 24 }}>
            <div className="cc-glass cc-card" style={{ justifyItems: 'start' }}>
              <span className="cc-label">Bắt đầu buổi học</span>
              <h2 style={{ fontSize: 28 }}>Tạo lớp mới, nhận mã PIN cho học sinh</h2>
              <p style={{ margin: 0, color: 'var(--soft)' }}>Giống Kahoot: chọn khu, bấm một lần là có mã PIN 6 số và mã QR. Quét QR của khu nào thì học sinh vào thẳng khu đó.</p>
              <div className="cc-zonepick">
                {CC_ZONES.map((z) => (
                  <button key={z} type="button" disabled={creating} onClick={() => newClass(z)} style={{ '--c': ccStation(z).color }}>
                    <span className="material-symbols-outlined">{ccStation(z).icon}</span><b>{ccStation(z).full}</b>
                  </button>
                ))}
                <button type="button" disabled={creating} onClick={() => newClass(null)} style={{ '--c': '#ffd27a' }}>
                  <span className="material-symbols-outlined">location_city</span><b>Cả thành phố</b>
                </button>
              </div>
            </div>
            <RoomsPanel rooms={rooms} onCreated={async (c) => { await loadRooms(); setCode(c); }} onDelete={deleteRoom} />
          </div>
        ) : (
          <div className="cc-host">
            <div className="cc-glass cc-host-main">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {zone && <span className="cc-zonetag" style={{ '--c': ccStation(zone).color }}>Lớp khu {ccStation(zone).name}</span>}
                {tabs.map((t) => (
                  <button key={t.id} type="button" className={`cc-chip${tab === t.id ? ' on' : ''}`} onClick={() => (t.live ? goStation(t.id) : setTab(t.id))}>
                    {t.live ? <span className="cc-dot" style={{ background: t.color }} /> : <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>}
                    {t.label}{t.live && room.station === t.id && <span className="live" />}
                  </button>
                ))}
              </div>
              {tab === 'gate' && <HostGate room={room} players={players} scans={Math.max(scans.size, players.length)} patchRoom={patchRoom} joinUrl={joinUrl} onStart={() => goStation(zone || 'guess')} />}
              {tab === 'guess' && <HostGuess room={room} st={st} offset={offset} questions={questions.filter((x) => x.active)} quiz={quiz} reloadQuestions={loadQuestions} patchRoom={patchRoom} />}
              {tab === 'draw' && <HostDraw room={room} st={st} offset={offset} players={players} code={code} ping={ping} reload={loadRooms} />}
              {tab === 'wall' && <HostWall code={code} />}
              {tab === 'plaza' && <HostPlaza st={st} code={code} refresh={refresh} ping={ping} />}
              {tab === 'questions' && <QuestionsEditor questions={questions} reload={loadQuestions} />}
              {tab === 'brands' && <BrandsEditor />}
              {tab === 'rooms' && <RoomsPanel rooms={rooms} current={room} onCreated={async (c) => { await loadRooms(); setCode(c); }} patchRoom={patchRoom} onDelete={deleteRoom}
                onReset={async () => { try { await adminResetRoom(code); ping(); await loadRooms(); refresh(); refreshPlayers(); } catch (e) { setErr(ccError(e)); } }} />}
            </div>
            <aside className="cc-host-side">
              <JoinCard url={joinUrl} code={code} zone={zone} players={st?.players ?? players.length} scans={Math.max(scans.size, players.length)} />
              <div className="cc-glass cc-card"><span className="cc-label">Bảng điểm Ảnh Lạ</span><Board rows={st?.top} /></div>
            </aside>
          </div>
        )}
      </div>
      <div className="cc-toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="cc-toast"><Av name={t.name} color={t.color} /><span><b>{t.name}</b> vừa vào lớp</span><span className="cc-toast-pop">🎉</span></div>)}
      </div>
    </main>
  );
}

function HH({ title, sub, children }) {
  return <div className="cc-hh"><div><span className="cc-label">{sub}</span><h2>{title}</h2></div><div className="ctrl">{children}</div></div>;
}

// v68: bấm vào mã QR -> phóng to toàn màn hình để cả lớp quét; nút X (hoặc Esc) thu nhỏ lại.
function useQr(url, width) {
  const [img, setImg] = useState('');
  useEffect(() => { if (!url) { setImg(''); return; } QRCode.toDataURL(url, { margin: 1, width, color: { dark: '#13121b', light: '#ffffff' } }).then(setImg).catch(() => setImg('')); }, [url, width]);
  return img;
}
function QrBig({ url, code, zone, onClose }) {
  const img = useQr(url, 1000);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const pin = /^\d{6}$/.test(code) ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
  return (
    <div className="cc-qrbig" role="dialog" aria-modal="true" aria-label="Mã QR phóng to" onClick={onClose}>
      <button type="button" className="cc-qrbig-x" onClick={onClose} aria-label="Thu nhỏ mã QR"><span className="material-symbols-outlined">close</span></button>
      <div className="cc-qrbig-in" onClick={(e) => e.stopPropagation()}>
        {img && <img src={img} alt={`Mã QR vào lớp ${code}`} />}
        <div className="cc-qrbig-txt">
          <span>{zone ? `Quét để vào ${zoneName(zone)}` : 'Quét để vào Creative City'}</span>
          <strong>{pin}</strong>
        </div>
      </div>
    </div>
  );
}
function QrThumb({ url, code, zone, width = 400, className = 'cc-qr', children }) {
  const img = useQr(url, width);
  const [big, setBig] = useState(false);
  return (
    <>
      <button type="button" className={`${className} cc-qr-btn`} onClick={() => setBig(true)} title="Bấm để phóng to" aria-label="Phóng to mã QR">
        {img && <img src={img} alt={`Mã QR vào lớp ${code}`} />}
        <span className="cc-qr-zoom material-symbols-outlined" aria-hidden="true">zoom_out_map</span>
        {children}
      </button>
      {big && <QrBig url={url} code={code} zone={zone} onClose={() => setBig(false)} />}
    </>
  );
}

function JoinCard({ url, code, zone, players, scans }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="cc-glass cc-card">
      <span className="cc-label">{zone ? `Quét để vào ${ccStation(zone).name}` : 'Quét để vào'}</span>
      <QrThumb url={url} code={code} zone={zone} />
      <div className="cc-code">{code}</div>
      <button type="button" className="cc-btn ghost sm" onClick={() => { navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}>{copied ? 'Đã chép link' : 'Chép link vào phòng'}</button>
      <div className="cc-stat"><span>Đã quét QR</span><b>{scans}</b></div>
      <div className="cc-stat"><span>Đã vào lớp</span><b>{players}</b></div>
    </div>
  );
}

/* ------------------------------------------------------------------ Cổng */
function Lobby({ room, players, scans, joinUrl, onStart }) {
  const host = typeof window !== 'undefined' ? window.location.host : '';
  const [tick, setTick] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setTick(Date.now()), 5000); return () => clearInterval(id); }, []);
  const online = players.filter((p) => tick - ms(p.last_seen) < 45000).length;
  const pin = /^\d{6}$/.test(room.code) ? `${room.code.slice(0, 3)} ${room.code.slice(3)}` : room.code;
  return (
    <div className="cc-lobby">
      <div className="cc-lobby-pin">
        {room.zone && <span className="cc-zonetag" style={{ '--c': ccStation(room.zone).color }}>Lớp khu {zoneName(room.zone)}</span>}
        <span>Vào <b>{host}/creative</b> và nhập mã PIN</span>
        <strong>{pin}</strong>
        <span className="cc-hint">{room.title}</span>
      </div>
      <QrThumb url={joinUrl} code={room.code} zone={room.zone} width={520} className="cc-lobby-qr"><span>hoặc quét mã · bấm để phóng to</span></QrThumb>
      <div className="cc-lobby-stats">
        <Counter label="Đã quét QR" value={scans} color="#7ee8ff" />
        <Counter label="Đã đăng ký vào lớp" value={players.length} color="#ffd27a" />
        <Counter label="Đang online" value={online} color="#5ee0a0" />
      </div>
      {players.length > 0 && (
        <div className="cc-lobby-crowd">
          {players.slice(0, 48).map((p) => <span key={p.id} className="cc-joiner pop"><Av name={p.name} color={p.color} />{p.name}</span>)}
          {players.length > 48 && <span className="cc-joiner">+{players.length - 48}</span>}
        </div>
      )}
      <div className="cc-lobby-foot">
        <span className="cc-lobby-count"><b>{players.length}</b> học sinh đã vào</span>
        <button type="button" className="cc-btn" onClick={onStart} disabled={!players.length}>Bắt đầu · {zoneName(room.zone || 'guess')}</button>
      </div>
    </div>
  );
}

function Counter({ label, value, color }) {
  const [bump, setBump] = useState(0);
  const prev = useRef(value);
  useEffect(() => { if (value > prev.current) setBump((b) => b + 1); prev.current = value; }, [value]);
  return (
    <div className="cc-counter" style={{ '--c': color }}>
      <b key={bump} className={bump ? 'bump' : ''}>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function HostGate({ room, players, scans, patchRoom, joinUrl, onStart }) {
  const [menti, setMenti] = useState(room.menti_code || '');
  const [embed, setEmbed] = useState(room.menti_embed || '');
  useEffect(() => { setMenti(room.menti_code || ''); setEmbed(room.menti_embed || ''); }, [room.code, room.menti_code, room.menti_embed]);
  const embedSrc = useMemo(() => {
    const m = String(room.menti_embed || '').match(/src=['"]([^'"]+)['"]/); const u = m ? m[1] : room.menti_embed;
    return /^https:\/\/(www\.)?mentimeter\.com\//.test(u || '') ? u : '';
  }, [room.menti_embed]);
  return (
    <>
      <Lobby room={room} players={players} scans={scans} joinUrl={joinUrl} onStart={onStart} />
      <HH title="Cổng thành phố" sub="Trạm 0 · check-in" />
      <div className="cc-split">
        <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <span className="cc-label">Vừa vào phòng ({players.length})</span>
          {players.length ? <div className="cc-joiners">{players.slice(0, 60).map((p) => <span key={p.id} className="cc-joiner"><Av name={p.name} color={p.color} />{p.name}</span>)}</div>
            : <div className="cc-empty">Chưa có ai. Mời học sinh quét QR bên phải.</div>}
        </div>
        <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <span className="cc-label">Mentimeter khởi động</span>
          {embedSrc ? <iframe className="cc-iframe" src={embedSrc} title="Kết quả Mentimeter" allowFullScreen /> : <div className="cc-empty">Dán mã nhúng kết quả Mentimeter bên dưới để hiện kết quả ở đây.</div>}
          <div className="cc-field"><label htmlFor="cc-menti">Mã Mentimeter (học sinh thấy trên điện thoại)</label><input id="cc-menti" className="cc-input" value={menti} onChange={(e) => setMenti(e.target.value)} placeholder="VD: 1234 5678" /></div>
          <div className="cc-field"><label htmlFor="cc-embed">Mã nhúng kết quả (Share → Embed slides)</label><input id="cc-embed" className="cc-input" value={embed} onChange={(e) => setEmbed(e.target.value)} placeholder="Dán đoạn <iframe …> hoặc link …/embed" /></div>
          <button type="button" className="cc-btn sm" style={{ justifySelf: 'start' }} onClick={() => patchRoom({ menti_code: menti.trim(), menti_embed: embed.trim() })}>Lưu Mentimeter</button>
          <span className="cc-hint">Mentimeter không cho trả lời trong khung nhúng, nên học sinh vẫn bình chọn trên menti.com. Khung nhúng có kèm công cụ trình bày, nên chỉ hiện ở màn chiếu này.</span>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Ảnh Lạ */
// v68: chế độ TỰ CHẠY — bấm Bắt đầu một lần: mỗi câu 10 giây -> hết giờ lộ đáp án (5 giây)
// -> bảng điểm (5 giây) -> tự sang câu tiếp theo, tới hết bộ câu hỏi.
const REVEAL_S = 5;
const BOARD_S = 5;
function HostGuess({ room, st, offset, questions, quiz, reloadQuestions, patchRoom }) {
  const [mixing, setMixing] = useState(false);
  const mix = async () => { setMixing(true); try { await adminShuffleQuestions(); await reloadQuestions(); await quiz('idle', 0); } catch { /* ignore */ } finally { setMixing(false); } };
  const autoKey = `cc_auto_${room.code}`;
  const [auto, setAutoRaw] = useState(() => { try { return sessionStorage.getItem(autoKey) === '1'; } catch { return false; } });
  const setAuto = useCallback((v) => { setAutoRaw(v); try { if (v) sessionStorage.setItem(autoKey, '1'); else sessionStorage.removeItem(autoKey); } catch { /* ignore */ } }, [autoKey]);
  const [now, setNow] = useState(Date.now());
  const q = questions[room.quiz_index] || null;
  const phase = room.quiz_phase;
  const n = room.quiz_index;
  const isLast = n >= questions.length - 1;
  useEffect(() => { if (phase !== 'run' && !auto) return undefined; const id = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(id); }, [phase, auto]);
  const left = phase === 'run' ? room.quiz_seconds - (now + offset - ms(room.quiz_started_at)) / 1000 : 0;
  const answered = st?.quiz?.answered ?? 0;
  const players = st?.players ?? 0;

  // thời điểm vào pha hiện tại (để đếm 5 giây lộ đáp án / bảng điểm)
  const phaseKey = `${room.code}-${n}-${phase}-${room.quiz_started_at}`;
  const phaseAt = useRef({ key: '', t: 0 });
  if (phaseAt.current.key !== phaseKey) phaseAt.current = { key: phaseKey, t: Date.now() };
  const since = (now - phaseAt.current.t) / 1000;
  const fired = useRef('');
  const step = useCallback((key, fn) => { if (fired.current === key) return; fired.current = key; fn(); }, []);

  useEffect(() => {
    if (!q) return;
    if (phase === 'run') {
      // tự chạy: đúng 10 giây mới lộ đáp án; bấm tay: hết giờ hoặc cả lớp trả lời xong
      if (left <= 0 && (auto || left <= -0.6)) step(`${phaseKey}-r`, () => quiz('reveal', n));
      else if (!auto && players > 0 && answered >= players) step(`${phaseKey}-r`, () => quiz('reveal', n));
      return;
    }
    if (!auto) return;
    if (phase === 'idle') step(`${phaseKey}-go`, () => quiz('run', n));
    else if (phase === 'reveal' && since >= REVEAL_S) step(`${phaseKey}-b`, () => quiz('board', n));
    else if (phase === 'board' && since >= BOARD_S) {
      if (isLast) step(`${phaseKey}-end`, () => setAuto(false));
      else step(`${phaseKey}-n`, () => quiz('run', n + 1));
    }
  }, [q, phase, left, since, auto, answered, players, n, isLast, phaseKey, quiz, step, setAuto]);

  const startAuto = async () => {
    if (room.quiz_seconds !== CC_QUIZ_SECONDS) await patchRoom({ quiz_seconds: CC_QUIZ_SECONDS });
    fired.current = '';
    setAuto(true);
    if (phase === 'board' && isLast) quiz('run', 0);
  };

  if (!questions.length) return <><HH title="Phòng Ảnh Lạ" sub="Trạm 1" /><div className="cc-empty">Chưa có câu hỏi đang bật. Thêm ở tab Bộ câu hỏi.</div></>;
  if (!q) return <><HH title="Phòng Ảnh Lạ" sub="Trạm 1 · đã hết câu hỏi"><button type="button" className="cc-btn" onClick={() => quiz('idle', 0)}>Về câu 1</button></HH><div className="cc-empty">Đã chơi hết {questions.length} câu.</div></>;

  const autoBar = auto ? (
    <div className="cc-autobar">
      <span className="cc-pulse" />
      <span>
        <b>Đang tự chạy</b> · {room.quiz_seconds} giây/câu
        {phase === 'reveal' && ` · bảng điểm sau ${Math.max(0, Math.ceil(REVEAL_S - since))}s`}
        {phase === 'board' && (isLast ? ' · câu cuối' : ` · câu ${n + 2} sau ${Math.max(0, Math.ceil(BOARD_S - since))}s`)}
      </span>
      <button type="button" className="cc-btn ghost sm" onClick={() => setAuto(false)}>⏸ Tạm dừng</button>
    </div>
  ) : null;

  if (phase === 'board') {
    const done = isLast && !auto;
    return (
      <>
        <HH title={done ? 'Bảng điểm chung cuộc' : 'Bảng điểm'} sub={`Sau câu ${n + 1}/${questions.length}`}>
          {!auto && !isLast && <button type="button" className="cc-btn gold" onClick={startAuto}>▶ Tự chạy tiếp</button>}
          {!auto && <button type="button" className="cc-btn ghost" onClick={() => (isLast ? quiz('idle', 0) : quiz('run', n + 1))}>{isLast ? 'Chơi lại từ câu 1' : 'Câu tiếp theo'}</button>}
        </HH>
        {autoBar}
        <div style={{ maxWidth: 620 }}><Board rows={st?.top} /></div>
      </>
    );
  }
  const reveal = phase === 'reveal';
  const dist = st?.quiz?.dist || [0, 0, 0, 0];
  const maxD = Math.max(1, ...dist);
  return (
    <>
      <HH title={q.question} sub={`Trạm 1 · câu ${n + 1}/${questions.length}`}>
        {phase === 'idle' && !auto && <>
          {n === 0 && <button type="button" className="cc-btn ghost sm" disabled={mixing} onClick={mix} title="Đổi thứ tự câu hỏi và vị trí đáp án">{mixing ? 'Đang xáo…' : '🔀 Xáo trộn'}</button>}
          <button type="button" className="cc-btn ghost sm" disabled={n === 0} onClick={() => quiz('idle', n - 1)}>← Câu trước</button>
          <button type="button" className="cc-btn ghost sm" disabled={isLast} onClick={() => quiz('idle', n + 1)}>Câu sau →</button>
          <button type="button" className="cc-btn gold" onClick={startAuto}>▶ Bắt đầu tự động · {CC_QUIZ_SECONDS} giây/câu</button>
        </>}
        {phase === 'run' && !auto && <button type="button" className="cc-btn gold" onClick={() => quiz('reveal', n)}>Lộ đáp án</button>}
        {reveal && !auto && <>
          <button type="button" className="cc-btn" onClick={() => quiz('board', n)}>Bảng điểm</button>
          <button type="button" className="cc-btn gold sm" onClick={startAuto}>▶ Tự chạy tiếp</button>
        </>}
      </HH>
      {autoBar}
      <div className="cc-split">
        <QuizPhoto q={q} uid={`h${n}`} full={reveal}>{phase === 'run' && <Ring left={left} total={room.quiz_seconds} />}</QuizPhoto>
        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <div className="cc-stat"><span>Đã trả lời</span><b>{answered} / {players}</b></div>
          <div className="cc-progress"><i style={{ width: `${players ? Math.min(100, (answered / players) * 100) : 0}%` }} /></div>
          {reveal && (
            <div className="cc-vbars">
              {dist.map((d, j) => <div key={j} className="cc-vbar"><b>{d}</b><i style={{ height: `${(d / maxD) * 150}px`, background: TILE_COLORS[j], opacity: j === q.ok ? 1 : 0.35 }} /></div>)}
            </div>
          )}
          <div className="cc-tiles" style={{ marginTop: 0 }}>
            {q.opts.map((o, j) => (
              <div key={j} className={`cc-tile cc-t${j}${reveal && j !== q.ok ? ' dim' : ''}`}><Shape i={j} /><span>{o}</span>{reveal && j === q.ok && <span className="tick">✓</span>}</div>
            ))}
          </div>
          <span className="cc-hint">{phase === 'idle' ? `Bấm Bắt đầu tự động: mỗi câu ${CC_QUIZ_SECONDS} giây, hết giờ hiện đáp án, rồi bảng điểm, rồi tự sang câu tiếp.` : phase === 'run' ? (auto ? `Hết ${room.quiz_seconds} giây sẽ tự lộ đáp án.` : 'Hết giờ hoặc cả lớp trả lời xong sẽ tự lộ đáp án.') : 'Đáp án đúng đã hiện trên mọi điện thoại.'}</span>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Xưởng Vẽ (bấm giờ + duyệt tranh) */
function HostDraw({ room, st, offset, players, code, ping, reload }) {
  const [mins, setMins] = useState(room.draw_minutes || 4);
  const [art, setArt] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [err, setErr] = useState('');
  const started = ms(room.draw_started_at);
  useEffect(() => { if (!started) return undefined; const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, [started]);
  const loadArt = useCallback(async () => { try { setArt(await adminArt(code)); } catch (e) { setErr(ccError(e)); } }, [code]);
  useEffect(() => { loadArt(); const id = setInterval(loadArt, 4000); return () => clearInterval(id); }, [loadArt]);
  const leftS = started ? room.draw_minutes * 60 - (now + offset - started) / 1000 : null;
  const pending = art.filter((a) => a.status === 'pending');
  const set = async (ids, status) => { try { await Promise.all(ids.map((id) => adminSetArt(id, status))); loadArt(); ping(); } catch (e) { setErr(ccError(e)); } };
  const timer = async (m) => { try { await adminDraw(code, m); await reload(); ping(); } catch (e) { setErr(ccError(e)); } };
  const counts = useMemo(() => {
    const m = new Map(); players.forEach((p) => { if (p.brand) m.set(p.brand, (m.get(p.brand) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [players]);
  const maxC = Math.max(1, ...counts.map((c) => c[1]));
  const uploaded = art.length;
  return (
    <>
      <HH title="Xưởng Vẽ Sáng Tạo" sub="Trạm 2 · đề vẽ vui + trò Vẽ tiếp 30 giây trên điện thoại, không vẽ logo hay tên nhãn hàng">
        <input type="number" min={1} max={60} className="cc-input" style={{ width: 80, height: 40 }} value={mins} onChange={(e) => setMins(Number(e.target.value) || 1)} aria-label="Số phút vẽ" />
        <button type="button" className="cc-btn" onClick={() => timer(mins)}>{started ? 'Bấm giờ lại' : 'Bấm giờ vẽ'}</button>
        {started && <button type="button" className="cc-btn ghost" onClick={() => timer(null)}>Tắt đồng hồ</button>}
      </HH>
      {err && <p className="cc-err">{err}</p>}
      <div className="cc-split">
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <span className="cc-label">Thời gian còn lại</span>
          <div className="cc-bigclock">{leftS == null ? `${room.draw_minutes}:00` : leftS > 0 ? fmtClock(leftS) : 'Hết giờ'}</div>
          <div className="cc-stat"><span>Tranh đã tải lên</span><b>{uploaded} / {st?.players ?? players.length}</b></div>
          <div className="cc-progress"><i style={{ width: `${players.length ? Math.min(100, (uploaded / players.length) * 100) : 0}%` }} /></div>
          <span className="cc-label" style={{ marginTop: 6 }}>Đề đã phát</span>
          {counts.length ? <div style={{ display: 'grid', gap: 8 }}>{counts.map(([b, c]) => <div key={b} className="cc-hbar"><span>{b}</span><div className="track"><i style={{ width: `${(c / maxC) * 100}%` }} /></div><b>{c}</b></div>)}</div>
            : <div className="cc-empty">Chưa ai bốc đề.</div>}
        </div>
        <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="cc-label">Hàng chờ duyệt ({pending.length})</span>
            {pending.length > 1 && <button type="button" className="cc-btn mint sm" style={{ marginLeft: 'auto' }} onClick={() => set(pending.map((a) => a.id), 'ok')}>Duyệt tất cả</button>}
          </div>
          {pending.length ? (
            <div className="cc-queue">
              {pending.map((a) => (
                <div key={a.id} className="cc-qitem">
                  <Pin a={{ ...a, pending: false }} />
                  <div className="qm"><div className="row">
                    <button type="button" className="cc-btn mint sm" onClick={() => set([a.id], 'ok')}>Duyệt</button>
                    <button type="button" className="cc-btn ghost sm" onClick={() => set([a.id], 'hidden')}>Ẩn</button>
                  </div></div>
                </div>
              ))}
            </div>
          ) : <div className="cc-empty">Chưa có tranh chờ duyệt.</div>}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Phòng Tranh */
function HostWall({ code }) {
  const [art, setArt] = useState([]);
  const [sort, setSort] = useState('new');
  const [open, setOpen] = useState(null);
  const load = useCallback(async () => { try { setArt(await adminArt(code)); } catch { /* ignore */ } }, [code]);
  useEffect(() => { load(); const id = setInterval(load, 5000); return () => clearInterval(id); }, [load]);
  let list = art.filter((a) => a.status === 'ok');
  if (sort === 'hot') list = [...list].sort((a, b) => b.hearts - a.hearts);
  return (
    <>
      <HH title="Phòng Tranh" sub={`Trạm 3 · ${list.length} tác phẩm`}>
        <button type="button" className={`cc-chip${sort === 'new' ? ' on' : ''}`} onClick={() => setSort('new')}>Mới nhất</button>
        <button type="button" className={`cc-chip${sort === 'hot' ? ' on' : ''}`} onClick={() => setSort('hot')}>Nhiều tim nhất</button>
      </HH>
      {list.length ? (
        <div className="cc-masonry wide">
          {list.map((a) => <Pin key={a.id} a={a} onOpen={setOpen} extra={<button type="button" className="cc-btn ghost sm" onClick={async () => { await adminSetArt(a.id, 'hidden'); load(); }}>Ẩn tranh</button>} />)}
        </div>
      ) : <div className="cc-empty">Chưa có tranh nào được duyệt.</div>}
      {open && (
        <div role="dialog" aria-modal="true" onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(5,4,10,.82)', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div className="cc-glass" style={{ maxWidth: 760, width: '100%', overflow: 'hidden', background: 'var(--surface)' }}>
            <Pin a={open} />
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ Quảng trường */
function HostPlaza({ st, code, refresh, ping }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <HH title="Quảng trường" sub="Trạm 4 · kết bài">
        {confirm
          ? <><span className="cc-hint">Xoá toàn bộ từ?</span><button type="button" className="cc-btn danger sm" onClick={async () => { await adminClearWords(code); setConfirm(false); ping(); refresh(); }}>Xoá</button><button type="button" className="cc-btn ghost sm" onClick={() => setConfirm(false)}>Giữ lại</button></>
          : <button type="button" className="cc-btn ghost sm" onClick={() => setConfirm(true)}>Xoá word cloud</button>}
      </HH>
      <div style={{ fontFamily: 'var(--display)', fontSize: 24, color: 'var(--soft)' }}>Sáng tạo với em là…</div>
      <Cloud words={st?.words} big />
    </>
  );
}

/* ------------------------------------------------------------------ Bộ câu hỏi */
function QuestionsEditor({ questions, reload }) {
  const blank = { question: 'Đây là gì?', opts: ['', '', '', ''], ok: 0, sort: (questions.at(-1)?.sort || 0) + 1, active: true, image_path: null, builtin: null };
  return (
    <>
      <HH title="Bộ câu hỏi Ảnh Lạ" sub={`Dùng chung cho mọi phòng · ${questions.filter((x) => x.active).length} câu đang bật`}>
        <button type="button" className="cc-btn ghost sm" onClick={async () => { await adminShuffleQuestions(); reload(); }}>🔀 Xáo trộn thứ tự + đáp án</button>
      </HH>
      <p className="cc-hint" style={{ margin: 0 }}>Ảnh thật được phóng sát vào một chi tiết; khi lộ đáp án mới hiện toàn cảnh. Chỉnh độ phóng và điểm phóng ngay dưới ảnh. Mỗi lần tạo lớp mới, bộ câu hỏi tự xáo trộn.</p>
      <div style={{ display: 'grid', gap: 10 }}>
        {questions.map((q) => <QuestionRow key={q.id} q={q} reload={reload} />)}
        <QuestionRow key={`new-${questions.length}`} q={blank} reload={reload} isNew />
      </div>
    </>
  );
}

function QuestionRow({ q, reload, isNew }) {
  const [row, setRow] = useState(q);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => { setRow(q); }, [q]);
  const set = (k, v) => setRow((r) => ({ ...r, [k]: v }));
  const save = async (patch = {}) => {
    const next = { ...row, ...patch };
    if (!next.question.trim() || next.opts.some((o) => !String(o).trim())) { setMsg('Điền câu hỏi và đủ 4 đáp án.'); return; }
    setBusy(true); setMsg('');
    try { await adminSaveQuestion({ ...next, opts: next.opts.map((o) => String(o).trim()) }); setMsg('Đã lưu'); await reload(); } catch (e) { setMsg(ccError(e)); } finally { setBusy(false); }
  };
  const upload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true); setMsg('Đang tải ảnh…');
    try { const path = withZoom(await adminUploadQuizImage(f), 2.5, 50, 50); setRow((r) => ({ ...r, image_path: path })); if (!isNew) await save({ image_path: path }); else setMsg('Đã chọn ảnh, bấm Thêm câu hỏi để lưu.'); } catch (ex) { setMsg(ccError(ex)); } finally { setBusy(false); e.target.value = ''; }
  };
  const hasPic = row.image_path || row.builtin;
  const im = parseQuizImage(row.image_path);
  const setZoom = (z, x, y) => set('image_path', withZoom(row.image_path, z, x, y));
  return (
    <div className="cc-qrow" style={isNew ? { borderStyle: 'dashed' } : undefined}>
      <div style={{ display: 'grid', gap: 6, alignContent: 'start' }}>
        <div className="thumb">{hasPic ? <QuizPhoto q={row} uid={`e${row.id || 'new'}`} /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#555', fontSize: 11 }}>Chưa có ảnh</div>}</div>
        <label className="cc-btn ghost sm" htmlFor={`qf-${row.id || 'new'}`} style={{ cursor: 'pointer' }}>{row.image_path ? 'Đổi ảnh' : 'Tải ảnh thật'}</label>
        <input id={`qf-${row.id || 'new'}`} type="file" accept="image/*" className="cc-sr" onChange={upload} />
        {im && (
          <div style={{ display: 'grid', gap: 4, fontSize: 11 }} className="cc-hint">
            <label>Phóng {im.z}x<input type="range" min={1} max={6} step={0.5} value={im.z} onChange={(e) => setZoom(Number(e.target.value), im.x, im.y)} style={{ width: '100%' }} /></label>
            {im.z > 1 && <>
              <label>Ngang {im.x}%<input type="range" min={0} max={100} step={5} value={im.x} onChange={(e) => setZoom(im.z, Number(e.target.value), im.y)} style={{ width: '100%' }} /></label>
              <label>Dọc {im.y}%<input type="range" min={0} max={100} step={5} value={im.y} onChange={(e) => setZoom(im.z, im.x, Number(e.target.value))} style={{ width: '100%' }} /></label>
            </>}
          </div>
        )}
        <input className="cc-input" style={{ height: 32, fontSize: 11 }} placeholder="…hoặc dán link ảnh" value={im && /^https?:/.test(im.base) ? im.base : ''} onChange={(e) => set('image_path', e.target.value.trim() ? withZoom(e.target.value.trim(), im?.z || 3, im?.x ?? 50, im?.y ?? 50) : null)} aria-label="Link ảnh" />
        {row.image_path && row.builtin && <button type="button" className="cc-btn ghost sm" onClick={() => (isNew ? set('image_path', null) : save({ image_path: null }))}>Dùng hình minh hoạ</button>}
      </div>
      <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="cc-input" style={{ width: 70 }} type="number" value={row.sort} onChange={(e) => set('sort', Number(e.target.value) || 0)} aria-label="Thứ tự" title="Thứ tự" />
          <input className="cc-input" value={row.question} onChange={(e) => set('question', e.target.value)} aria-label="Câu hỏi" placeholder="Câu hỏi" />
        </div>
        <div className="cc-opts-edit">
          {row.opts.map((o, i) => (
            <label key={i} className="cc-opt-edit">
              <input type="radio" name={`ok-${row.id || 'new'}`} checked={row.ok === i} onChange={() => set('ok', i)} aria-label={`Đáp án ${i + 1} là đáp án đúng`} />
              <span className="cc-dot" style={{ background: TILE_COLORS[i] }} />
              <input className="cc-input" style={{ height: 36 }} value={o} onChange={(e) => set('opts', row.opts.map((x, k) => (k === i ? e.target.value : x)))} placeholder={`Đáp án ${i + 1}`} />
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {!isNew && <label className="cc-hint" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={row.active} onChange={(e) => set('active', e.target.checked)} />Đang dùng</label>}
          <button type="button" className="cc-btn sm" disabled={busy} onClick={() => save()}>{isNew ? 'Thêm câu hỏi' : 'Lưu'}</button>
          {!isNew && (confirmDel
            ? <><button type="button" className="cc-btn danger sm" onClick={async () => { await adminDeleteQuestion(row.id); reload(); }}>Xoá hẳn</button><button type="button" className="cc-btn ghost sm" onClick={() => setConfirmDel(false)}>Giữ lại</button></>
            : <button type="button" className="cc-btn ghost sm" onClick={() => setConfirmDel(true)}>Xoá</button>)}
          <span className="cc-hint">Chấm tròn đánh dấu đáp án đúng.</span>
          {msg && <span className={msg === 'Đã lưu' ? 'cc-ok' : 'cc-hint'}>{msg}</span>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Thương hiệu */
function BrandsEditor() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [nb, setNb] = useState({ name: '', item: '' });
  const load = useCallback(async () => { try { setList(await adminBrands()); } catch (e) { setErr(ccError(e)); } }, []);
  useEffect(() => { load(); }, [load]);
  const save = async (row, old) => { setErr(''); try { await adminSaveBrand(row, old); load(); } catch (e) { setErr(ccError(e)); } };
  return (
    <>
      <HH title="Đề vẽ cho Xưởng Vẽ" sub="Mỗi học sinh bốc ngẫu nhiên một đề, chia đều trong lớp" />
      {err && <p className="cc-err">{err}</p>}
      <table className="cc-table">
        <thead><tr><th>Tên ngắn (dùng để lọc tranh)</th><th>Đề hiện cho học sinh</th><th>Dùng</th><th /></tr></thead>
        <tbody>
          {list.map((b) => <BrandRow key={b.name} b={b} onSave={save} onDelete={async () => { await adminDeleteBrand(b.name); load(); }} />)}
          <tr>
            <td><input className="cc-input" value={nb.name} onChange={(e) => setNb({ ...nb, name: e.target.value })} placeholder="VD: Khỉ đi siêu thị" /></td>
            <td><input className="cc-input" value={nb.item} onChange={(e) => setNb({ ...nb, item: e.target.value })} placeholder="VD: Một chú khỉ đang đẩy xe đi siêu thị — nó mua gì?" /></td>
            <td />
            <td><button type="button" className="cc-btn sm" onClick={async () => { if (!nb.name.trim() || !nb.item.trim()) return; await save({ name: nb.name.trim(), item: nb.item.trim(), sort: list.length + 1 }); setNb({ name: '', item: '' }); }}>Thêm</button></td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
function BrandRow({ b, onSave, onDelete }) {
  const [r, setR] = useState(b);
  useEffect(() => { setR(b); }, [b]);
  const dirty = r.name !== b.name || r.item !== b.item;
  return (
    <tr>
      <td><input className="cc-input" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} /></td>
      <td><input className="cc-input" value={r.item} onChange={(e) => setR({ ...r, item: e.target.value })} /></td>
      <td><input type="checkbox" checked={r.active} onChange={(e) => onSave({ ...r, active: e.target.checked }, b.name)} aria-label="Đang dùng" /></td>
      <td style={{ whiteSpace: 'nowrap' }}>
        {dirty && <button type="button" className="cc-btn sm" onClick={() => onSave(r, b.name)}>Lưu</button>}{' '}
        <button type="button" className="cc-btn ghost sm" onClick={onDelete}>Xoá</button>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ Phòng */
function RoomsPanel({ rooms, current, onCreated, patchRoom, onReset, onDelete }) {
  const [delCode, setDelCode] = useState('');
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(false);
  const create = async (e) => {
    e.preventDefault(); setErr('');
    const c = normRoom(code);
    if (!/^[A-Z0-9-]{3,16}$/.test(c)) { setErr('Mã phòng 3–16 ký tự: chữ không dấu, số hoặc dấu gạch.'); return; }
    try { await adminCreateRoom(c, title.trim() || 'Creative City'); setCode(''); setTitle(''); onCreated(c); } catch (ex) { setErr(ex?.code === '23505' ? 'Mã phòng này đã có.' : ccError(ex)); }
  };
  return (
    <div style={{ display: 'grid', gap: 16, paddingTop: current ? 0 : 18 }}>
      <HH title="Phòng học" sub="Mỗi buổi dạy một phòng; tường tranh và điểm của từng phòng được giữ riêng" />
      {current && (
        <div className="cc-glass cc-card">
          <span className="cc-label">Phòng đang mở · {current.code}</span>
          <div className="cc-field"><label htmlFor="cc-rt">Tên buổi học</label><input id="cc-rt" className="cc-input" defaultValue={current.title} onBlur={(e) => e.target.value.trim() && e.target.value !== current.title && patchRoom({ title: e.target.value.trim() })} /></div>
          <div className="cc-field"><label htmlFor="cc-qs">Số giây mỗi câu Ảnh Lạ</label><input id="cc-qs" className="cc-input" style={{ width: 100 }} type="number" min={5} max={120} defaultValue={current.quiz_seconds} onBlur={(e) => { const v = Math.min(120, Math.max(5, Number(e.target.value) || 20)); if (v !== current.quiz_seconds) patchRoom({ quiz_seconds: v }); }} /></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="cc-btn ghost sm" onClick={() => patchRoom({ is_open: !current.is_open })}>{current.is_open ? 'Đóng phòng' : 'Mở lại phòng'}</button>
            {confirm
              ? <><span className="cc-hint">Xoá người chơi, điểm, tranh và word cloud của phòng này?</span><button type="button" className="cc-btn danger sm" onClick={() => { setConfirm(false); onReset(); }}>Làm mới phòng</button><button type="button" className="cc-btn ghost sm" onClick={() => setConfirm(false)}>Huỷ</button></>
              : <button type="button" className="cc-btn danger sm" onClick={() => setConfirm(true)}>Làm mới phòng…</button>}
          </div>
          {!current.is_open && <span className="cc-err">Phòng đang đóng: học sinh không vào được.</span>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 10 }}>
            {delCode === current.code
              ? <><span className="cc-hint">Xoá hẳn lớp {current.code}? Người chơi, điểm, tranh và word cloud mất luôn, không khôi phục được.</span>
                <button type="button" className="cc-btn danger sm" onClick={() => { setDelCode(''); onDelete?.(current.code); }}>Xoá lớp</button>
                <button type="button" className="cc-btn ghost sm" onClick={() => setDelCode('')}>Huỷ</button></>
              : <button type="button" className="cc-btn danger sm" onClick={() => setDelCode(current.code)}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>Xoá lớp này…</button>}
          </div>
        </div>
      )}
      <form className="cc-glass cc-card" onSubmit={create}>
        <span className="cc-label">Tạo phòng mới</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="cc-input" style={{ maxWidth: 200 }} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Mã, VD: CC-2711" aria-label="Mã phòng" />
          <input className="cc-input" style={{ flex: 1, minWidth: 200 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên buổi, VD: THPT Lê Quý Đôn · 11A2" aria-label="Tên buổi" />
          <button className="cc-btn" type="submit">Tạo phòng</button>
        </div>
        {err && <span className="cc-err">{err}</span>}
      </form>
      {rooms.length > 0 && (
        <table className="cc-table">
          <thead><tr><th>Mã</th><th>Buổi học</th><th>Khu</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>{rooms.map((r) => (
            <tr key={r.code}>
              <td><b>{r.code}</b></td><td>{r.title}</td><td>{zoneName(ccZone(r.zone))}</td><td>{r.is_open ? 'Đang mở' : 'Đã đóng'}</td>
              <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                {delCode === r.code
                  ? <><button type="button" className="cc-btn danger sm" onClick={() => { setDelCode(''); onDelete?.(r.code); }}>Xoá hẳn</button>{' '}<button type="button" className="cc-btn ghost sm" onClick={() => setDelCode('')}>Huỷ</button></>
                  : <button type="button" className="cc-btn ghost sm" onClick={() => setDelCode(r.code)} aria-label={`Xoá lớp ${r.code}`}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>Xoá</button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
