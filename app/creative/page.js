'use client';

// v64: CREATIVE CITY — giao diện điện thoại của học sinh (không cần tài khoản).
// Vào bằng link /creative?r=MÃ-PHÒNG (quét QR trên màn chiếu) + biệt danh.
// Điện thoại tự đi theo trạm giáo viên đang mở; vẫn xem lại được các trạm khác.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/components/AuthProvider';
import {
  CC_ADMIN_EMAIL, CC_COLORS, CC_STATIONS, ccError, ccJoin, ccState, ccAnswer, ccDrawBrand, ccWall, ccHeart, ccWord,
  ccSubmitArt, ccChannel, normRoom, savedToken, forgetToken, lastRoom, publicUrl, ccScan, ccAnnounce, visitorId,
  ccZone, ccStation, savedZone, saveZone, CC_ZONE_VIEWS,
} from '@/lib/creative';
import { HALF_DRAWINGS, halfSvgUrl } from './halves';
import { Av, Board, Cloud, Pin, QuizPhoto, Ring, Shape, Skyline } from './ui';

const ms = (iso) => (iso ? Date.parse(iso) : 0);
const fmtClock = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

export default function CreativeCityPage() {
  const [room, setRoom] = useState('');
  const [token, setToken] = useState(null);
  const [st, setSt] = useState(null);
  const [view, setView] = useState('gate');
  const [offset, setOffset] = useState(0);
  const [booting, setBooting] = useState(true);
  const [initRoom, setInitRoom] = useState('');
  const [kicked, setKicked] = useState('');
  const [carry, setCarry] = useState(null); // { img, brand } tranh vẽ trên điện thoại mang sang Phòng Tranh
  const [linkZone, setLinkZone] = useState(null); // v68: khu trên link QR (?s=guess)
  const lastStation = useRef(null);

  // Khởi động: đọc mã phòng trên link, thử vào lại bằng vé đã lưu.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const r = normRoom(sp.get('r') || lastRoom());
    setInitRoom(r);
    if (r) {
      const z = sp.get('r') ? ccZone(sp.get('s')) : savedZone(r);
      if (sp.get('r')) saveZone(r, z);
      setLinkZone(z);
    }
    // v67: quét QR (link có ?r=) -> màn chiếu đếm "đã quét" ngay
    if (sp.get('r')) { const v = visitorId(); ccScan(r, v); ccAnnounce(r, { kind: 'scan', v }); }
    const t = r ? savedToken(r) : null;
    if (!t) { setBooting(false); return; }
    ccJoin(r, '', '', t)
      .then((d) => { setRoom(d.room); setToken(d.token); })
      .catch(() => forgetToken(r))
      .finally(() => setBooting(false));
  }, []);

  const refresh = useCallback(async () => {
    if (!room) return;
    try {
      const d = await ccState(room, token);
      setOffset(ms(d.now) - Date.now());
      if (token && !d.me) { // phòng vừa được làm mới
        forgetToken(room); setToken(null); setRoom(''); setSt(null);
        setKicked('Giáo viên vừa làm mới phòng. Em vào lại nhé.');
        return;
      }
      setSt(d);
    } catch (e) {
      if (String(e?.message || '').includes('room_not_found')) { forgetToken(room); setRoom(''); setToken(null); setSt(null); setKicked('Phòng này đã đóng.'); }
    }
  }, [room, token]);

  useEffect(() => {
    if (!room) return undefined;
    refresh();
    const id = setInterval(refresh, 2000);
    const ch = ccChannel(room, () => refresh());
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); ch.close(); document.removeEventListener('visibilitychange', onVis); };
  }, [room, refresh]);

  // v68: lớp theo khu -> chỉ ở trong khu đó (không đi theo trạm khác).
  const zone = ccZone(st?.zone) || linkZone;
  const views = zone ? CC_ZONE_VIEWS[zone] : CC_STATIONS.map((x) => x.id);
  useEffect(() => { if (zone && !CC_ZONE_VIEWS[zone].includes(view)) setView(zone); }, [zone, view]);

  // Tự đi theo trạm giáo viên vừa mở (lớp cả thành phố).
  useEffect(() => {
    if (!st || zone) return;
    if (lastStation.current !== st.station) {
      lastStation.current = st.station;
      setView(st.station);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [st, zone]);

  if (booting) return <main className="cc"><div className="cc-wrap" style={{ paddingTop: 80 }}><span className="cc-hint">Đang mở Creative City…</span></div></main>;
  if (!room || !token) {
    return <GateJoin initRoom={initRoom} zone={linkZone} notice={kicked} onJoined={(d) => { setKicked(''); setRoom(d.room); setToken(d.token); }} />;
  }

  const me = st?.me;
  return (
    <main className="cc">
      <header className="cc-head">
        <div className="cc-wrap">
          <div className="cc-head-row">
            <span className="cc-pill cc-brand"><span className="cc-logo" />Creative City</span>
            {me && <span className="cc-me"><Av name={me.name} color={me.color} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{me.name}</span><b>{me.score}</b></span>}
          </div>
          {zone && views.length === 1 && <div className="cc-zonebar" style={{ '--c': ccStation(zone).color }}><span className="material-symbols-outlined" aria-hidden="true">{ccStation(zone).icon}</span>{ccStation(zone).full}</div>}
          {views.length > 1 && <nav className="cc-rail" aria-label="Các trạm">
            {CC_STATIONS.filter((x) => views.includes(x.id)).map((s) => (
              <button key={s.id} type="button" className={`cc-chip${view === s.id ? ' on' : ''}`} onClick={() => { setView(s.id); window.scrollTo({ top: 0 }); }}>
                <span className="cc-dot" style={{ background: s.color }} />{s.name}{st?.station === s.id && <span className="live" title="Giáo viên đang mở trạm này" />}
              </button>
            ))}
          </nav>}
        </div>
      </header>
      <div className="cc-wrap">
        {!st ? <p className="cc-hint" style={{ paddingTop: 30 }}>Đang kết nối…</p> : (
          <>
            {view === 'gate' && !zone && <GateHome st={st} />}
            {view === 'guess' && <Guess st={st} room={room} token={token} offset={offset} refresh={refresh} />}
            {view === 'draw' && <Draw st={st} room={room} token={token} offset={offset} refresh={refresh} onCarry={(c) => { setCarry(c); setView('wall'); window.scrollTo({ top: 0 }); }} />}
            {view === 'wall' && <Wall st={st} room={room} token={token} refresh={refresh} carry={carry} clearCarry={() => setCarry(null)} goDraw={() => setView('draw')} canDraw={views.includes('draw')} />}
            {view === 'plaza' && <Plaza st={st} room={room} token={token} refresh={refresh} />}
          </>
        )}
      </div>
    </main>
  );
}

function SecHead({ id, sub }) {
  const s = CC_STATIONS.find((x) => x.id === id);
  return (
    <div className="cc-sec-head">
      <div className="cc-ico" style={{ background: `${s.color}1f`, color: s.color }}><span className="material-symbols-outlined">{s.icon}</span></div>
      <div><h2>{s.full}</h2><small>{sub}</small></div>
    </div>
  );
}

/* ------------------------------------------------------------------ vào phòng */
function GateJoin({ initRoom, zone, notice, onJoined }) {
  const { user } = useAuth();
  const isAdmin = (user?.email || '').toLowerCase() === CC_ADMIN_EMAIL;
  const [code, setCode] = useState(initRoom || '');
  const [name, setName] = useState('');
  const [color, setColor] = useState(CC_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!normRoom(code)) { setErr('Nhập mã PIN trên màn chiếu nhé.'); return; }
    if (!name.trim()) { setErr('Nhập biệt danh để vào thành phố.'); return; }
    setBusy(true); setErr('');
    try { const d = await ccJoin(normRoom(code), name, color); ccAnnounce(d.room, { kind: 'join', name: name.trim(), color }); onJoined(d); } catch (ex) { setErr(ccError(ex)); } finally { setBusy(false); }
  };
  return (
    <main className="cc">
      <section className="cc-hero">
        <div className="cc-stars" />
        <div className="cc-wrap cc-hero-in">
          <Link href="/" className="cc-pill cc-backlink" style={{ marginBottom: 12 }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>Knoworld City</Link>
          <div className="cc-title">
            <span className="cc-label">Knoworld · Thành phố sáng tạo</span>
            <h1>Creative <em>City</em></h1>
            <p>Cùng một vật, mỗi người một góc nhìn. Nhập mã phòng và biệt danh là vào được, không cần tài khoản.</p>
          </div>
        </div>
        <Skyline />
      </section>
      <div className="cc-wrap" style={{ paddingTop: 18 }}>
        <form className="cc-glass cc-card" onSubmit={submit}>
          {notice && <div className="cc-result wait">{notice}</div>}
          {zone && initRoom && <div className="cc-zonebar" style={{ '--c': ccStation(zone).color }}><span className="material-symbols-outlined" aria-hidden="true">{ccStation(zone).icon}</span>Em đang vào {ccStation(zone).full}</div>}
          <div className="cc-field"><label htmlFor="cc-room">Mã PIN của lớp</label><input id="cc-room" className="cc-input" style={{ fontFamily: 'var(--display)', fontSize: 18, letterSpacing: '.08em' }} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete="off" autoCapitalize="characters" placeholder="VD: 482915" /></div>
          <div className="cc-field"><label htmlFor="cc-nick">Biệt danh</label><input id="cc-nick" className="cc-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoComplete="off" placeholder="VD: Minh Anh 11A2" /></div>
          <div className="cc-field">
            <label>Màu cư dân</label>
            <div className="cc-avs">
              {CC_COLORS.map((c) => (
                <button key={c} type="button" className={`cc-avbtn${color === c ? ' on' : ''}`} onClick={() => setColor(c)} aria-label={`Chọn màu ${c}`} aria-pressed={color === c}>
                  <span style={{ background: c }}>{name.trim() ? name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '?'}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="cc-btn" type="submit" disabled={busy}>{busy ? 'Đang vào…' : 'Vào thành phố'}</button>
          {err && <span className="cc-err">{err}</span>}
        </form>
        {isAdmin && (
          <div className="cc-glass cc-card" style={{ marginTop: 14, borderStyle: 'dashed', borderColor: 'rgba(255,210,122,.45)' }}>
            <span className="cc-label" style={{ color: 'var(--gold)' }}>Giáo viên</span>
            <p style={{ margin: 0, color: 'var(--soft)' }}>Tạo lớp mới để nhận mã PIN và mã QR cho học sinh, giống Kahoot.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link className="cc-btn gold" href="/creative/host?new=1">Tạo lớp mới</Link>
              <Link className="cc-btn ghost" href="/creative/host">Mở màn chiếu</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function GateHome({ st }) {
  return (
    <section className="cc-sec">
      <SecHead id="gate" sub={`${st.title} · ${st.players} cư dân đang trong phòng`} />
      <div className="cc-glass cc-card">
        <span className="cc-label">Em đã vào lớp {st.room}</span>
        <p style={{ margin: 0, color: 'var(--soft)' }}>Điện thoại sẽ tự chuyển tới trạm giáo viên đang mở. Chấm đỏ trên thanh trạm cho biết trạm đang diễn ra.</p>
      </div>
      {st.menti_code && (
        <div className="cc-menti" style={{ marginTop: 14 }}>
          <span className="cc-label" style={{ color: 'var(--cyan)' }}>Khởi động · Mentimeter</span>
          <span className="cc-hint">Vào menti.com và nhập mã</span>
          <span className="code">{st.menti_code}</span>
          <a className="cc-btn ghost" href={`https://www.menti.com/${String(st.menti_code).replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>Mở Mentimeter ↗</a>
        </div>
      )}
      <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
        {CC_STATIONS.slice(1).map((s, i) => (
          <div key={s.id} className="cc-glass" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="cc-dot" style={{ background: s.color }} /><b style={{ fontFamily: 'var(--display)' }}>{i + 1}. {s.full}</b>
          </div>
        ))}
      </div>
      <Link href="/" className="cc-btn ghost cc-backlink" style={{ marginTop: 14 }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>Về Knoworld City</Link>
    </section>
  );
}

/* ------------------------------------------------------------------ Ảnh Lạ */
function useNow(active) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function Guess({ st, room, token, offset, refresh }) {
  const q = st.quiz;
  const [picked, setPicked] = useState(null); // { index, choice }
  const [err, setErr] = useState('');
  const running = q?.phase === 'run';
  const now = useNow(running);
  useEffect(() => { setErr(''); }, [q?.index, q?.phase]);

  if (!q) return <section className="cc-sec"><SecHead id="guess" sub="Xem ảnh, chọn 1 trong 4 đáp án." /><div className="cc-empty">Chưa có câu hỏi nào.</div></section>;

  const mineChoice = q.mine?.choice ?? (picked && picked.index === q.index ? picked.choice : null);
  const left = running ? q.seconds - (now + offset - ms(q.started_at)) / 1000 : 0;
  const answer = async (i) => {
    if (mineChoice != null || left <= 0) return;
    setPicked({ index: q.index, choice: i }); setErr('');
    try { await ccAnswer(room, token, i); refresh(); } catch (e) { setErr(ccError(e)); }
  };
  const head = <SecHead id="guess" sub="Xem ảnh, chọn 1 trong 4 đáp án. Đúng và nhanh thì nhiều điểm." />;

  if (q.phase === 'idle') {
    return (
      <section className="cc-sec">{head}
        <div className="cc-wait"><span className="cc-pulse" /><span className="big">Câu {q.index + 1}/{q.total} sắp bắt đầu</span><span className="cc-hint">Nhìn lên màn chiếu và chuẩn bị nhé.</span></div>
      </section>
    );
  }
  if (q.phase === 'board') {
    return (
      <section className="cc-sec">{head}
        <div className="cc-glass cc-card">
          <span className="cc-label">Bảng điểm sau câu {q.index + 1}</span>
          <Board rows={st.top} meName={st.me?.name} />
          {st.me && <span className="cc-hint">Em đang hạng <b style={{ color: 'var(--gold)' }}>{st.me.rank}</b> với {st.me.score} điểm.</span>}
        </div>
      </section>
    );
  }
  const reveal = q.phase === 'reveal';
  const total = (q.dist || []).reduce((a, b) => a + b, 0);
  return (
    <section className="cc-sec">{head}
      <div className="cc-hint" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Câu {q.index + 1}/{q.total}</span><span>{q.answered}/{st.players} đã trả lời</span></div>
      <QuizPhoto q={q} uid={`p${q.index}`} full={reveal}>{running && <Ring left={left} total={q.seconds} />}</QuizPhoto>
      <p className="cc-q">{q.question}</p>
      <div className="cc-tiles">
        {(q.opts || []).map((o, i) => {
          const cls = ['cc-tile', `cc-t${i}`];
          if (reveal && i !== q.ok) cls.push('dim');
          if (!reveal && mineChoice != null && i !== mineChoice) cls.push('dim');
          if (mineChoice === i) cls.push('chosen');
          return (
            <button key={i} type="button" className={cls.join(' ')} disabled={reveal || mineChoice != null || left <= 0} onClick={() => answer(i)}>
              <Shape i={i} /><span>{o}</span>
              {reveal && i === q.ok && <span className="tick">✓</span>}
              {reveal && i !== q.ok && total > 0 && <span className="cnt">{q.dist[i]}</span>}
            </button>
          );
        })}
      </div>
      {running && mineChoice != null && <div className="cc-result wait"><span>Đã chọn. Hết giờ sẽ hiện đáp án…</span></div>}
      {running && mineChoice == null && left <= 0 && <div className="cc-result bad"><span>Hết giờ!</span></div>}
      {reveal && (
        q.mine
          ? <div className={`cc-result ${q.mine.correct ? 'ok' : 'bad'}`}><span>{q.mine.correct ? 'Chính xác!' : 'Chưa đúng rồi'}</span><b>+{q.mine.points}</b></div>
          : <div className="cc-result bad"><span>Em chưa trả lời câu này</span><b>+0</b></div>
      )}
      {err && <p className="cc-err">{err}</p>}
    </section>
  );
}

/* ------------------------------------------------------------------ Xưởng Vẽ */
function Draw({ st, room, token, offset, refresh, onCarry }) {
  const [mode, setMode] = useState('paper');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const me = st.me;
  const started = ms(st.draw?.started_at);
  const now = useNow(!!started);
  const leftS = started ? st.draw.minutes * 60 - (now + offset - started) / 1000 : null;
  const pick = async () => {
    setBusy(true); setErr('');
    try { await ccDrawBrand(room, token); await refresh(); } catch (e) { setErr(ccError(e)); } finally { setBusy(false); }
  };
  return (
    <section className="cc-sec">
      <SecHead id="draw" sub="Bốc một đề vẽ vui, hoặc thử tài Vẽ tiếp 30 giây." />
      <div className="cc-seg cc-seg3" role="tablist" aria-label="Cách vẽ">
        <button type="button" className={mode === 'paper' ? 'on' : ''} onClick={() => setMode('paper')}>Vẽ trên giấy</button>
        <button type="button" className={mode === 'app' ? 'on' : ''} onClick={() => setMode('app')}>Vẽ trên điện thoại</button>
        <button type="button" className={mode === 'half' ? 'on' : ''} onClick={() => setMode('half')}>⚡ Vẽ tiếp 30s</button>
      </div>
      {mode === 'half' ? <HalfDraw onDone={onCarry} /> : (
        <>
          <div className="cc-brief">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="cc-label" style={{ color: 'var(--pink)' }}>Đề vẽ của em</span>
              <span className="cc-clock">{leftS == null ? 'Chờ bấm giờ' : leftS > 0 ? fmtClock(leftS) : 'Hết giờ'}</span>
            </div>
            <div className="cc-brief-main">{me?.brand_item || 'Chưa bốc đề'}</div>
            <div className="cc-rule"><b>Luật:</b> không cần vẽ đẹp, cần vẽ lạ! Thêm một chi tiết bất ngờ mà chỉ em nghĩ ra (cảm xúc, nghề nghiệp, bối cảnh…). Không vẽ logo hay tên nhãn hàng nào.</div>
            {!me?.brand && <button type="button" className="cc-btn" onClick={pick} disabled={busy}>{busy ? 'Đang bốc…' : 'Bốc đề vẽ'}</button>}
            {err && <span className="cc-err">{err}</span>}
          </div>
          {mode === 'paper'
            ? (
              <div className="cc-paper">
                <span className="cc-label">Vẽ ra giấy</span>
                <p style={{ margin: 0, color: 'var(--soft)' }}>Dùng giấy và bút màu giáo viên phát. Vẽ xong, chụp ảnh tranh rồi tải lên ở Phòng Tranh.</p>
                <button type="button" className="cc-btn ghost" onClick={() => onCarry(null)}>Đi tới Phòng Tranh</button>
              </div>
            )
            : <DrawPad disabled={!me?.brand} blockMsg="Bốc đề vẽ trước đã nhé." onDone={(img) => onCarry({ img, brand: me?.brand })} />}
        </>
      )}
    </section>
  );
}

// v68: VẼ TIẾP 30 GIÂY — khung vẽ có sẵn nửa bức tranh (nửa con ngựa, nửa ấm trà…),
// em vẽ nốt nửa còn lại thành một thứ thật lạ (nửa ngựa nửa cọp?). Hết 30 giây là khoá bút.
const HALF_SECONDS = 30;
function HalfDraw({ onDone }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * HALF_DRAWINGS.length));
  const [startAt, setStartAt] = useState(null);
  const [round, setRound] = useState(0);
  const now = useNow(startAt != null);
  const left = startAt == null ? HALF_SECONDS : Math.max(0, HALF_SECONDS - (now - startAt) / 1000);
  const running = startAt != null && left > 0;
  const over = startAt != null && left <= 0;
  const h = HALF_DRAWINGS[idx];
  const bg = useMemo(() => halfSvgUrl(h), [h]);
  const next = () => { setIdx((i) => (i + 1 + Math.floor(Math.random() * (HALF_DRAWINGS.length - 1))) % HALF_DRAWINGS.length); setStartAt(null); setRound((r) => r + 1); };
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="cc-brief cc-half-brief">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span className="cc-label" style={{ color: 'var(--pink)' }}>Vẽ tiếp · {HALF_SECONDS} giây</span>
          <span className={`cc-clock${running && left <= 10 ? ' hot' : ''}`}>{over ? 'Hết giờ!' : `0:${String(Math.ceil(left)).padStart(2, '0')}`}</span>
        </div>
        <div className="cc-brief-main">Đây là <b>nửa {h.name}</b>. Nửa còn lại là gì?</div>
        <div className="cc-rule">Vẽ tiếp bên phải đường đứt nét thành một thứ <b>hoàn toàn khác</b>: {h.hint}</div>
        {running && <div className="cc-half-bar"><i style={{ width: `${(left / HALF_SECONDS) * 100}%` }} /></div>}
      </div>
      <DrawPad key={`${idx}-${round}`} bg={bg} disabled={!running} blockMsg={over ? 'Hết 30 giây rồi! Mang tranh sang Phòng Tranh hoặc thử hình khác.' : 'Bấm Bắt đầu 30 giây rồi vẽ nhé.'}
        doneLabel="Mang sang Phòng Tranh" onDone={(img) => onDone({ img, brand: `Vẽ tiếp: nửa ${h.name}` })}
        top={startAt == null && (
          <div className="cc-half-start">
            <button type="button" className="cc-btn" onClick={() => setStartAt(Date.now())}>▶ Bắt đầu 30 giây</button>
            <button type="button" className="cc-btn ghost sm" onClick={next}>🔀 Hình khác</button>
          </div>
        )} />
      {over && <button type="button" className="cc-btn ghost" onClick={next}>Chơi lượt mới với hình khác</button>}
    </div>
  );
}

const PEN = ['#1b1540', '#e3262f', '#ffb020', '#2fbf8f', '#1f6fd6', '#8d7fff', '#8b5a3c', '#ffffff'];
function DrawPad({ disabled, blockMsg, onDone, bg = null, top = null, doneLabel = 'Xong, mang sang Phòng Tranh' }) {
  const ref = useRef(null);
  const s = useRef({ color: PEN[0], size: 7, erase: false, down: false, last: null, hist: [], drew: false, w: 0, bgImg: null });
  const [, force] = useState(0);
  const [msg, setMsg] = useState('');
  const paintBg = useCallback(() => {
    const c = ref.current; if (!c) return;
    const w = s.current.w; const x = c.getContext('2d');
    x.save(); x.fillStyle = '#fbfaff'; x.fillRect(0, 0, w, w * 1.25);
    if (s.current.bgImg) x.drawImage(s.current.bgImg, 0, 0, w, w * 1.25);
    x.restore();
  }, []);
  useEffect(() => {
    const c = ref.current; const r = c.getBoundingClientRect(); const d = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(r.width * d); c.height = Math.round(r.width * 1.25 * d);
    const ctx = c.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; s.current.w = r.width;
    paintBg();
    if (bg) { const im = new Image(); im.onload = () => { s.current.bgImg = im; paintBg(); }; im.src = bg; }
  }, [bg, paintBg]);
  useEffect(() => { if (!disabled) setMsg(''); }, [disabled]);
  const ctx = () => ref.current.getContext('2d');
  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const ink = () => (s.current.erase ? '#fbfaff' : s.current.color);
  const wid = () => (s.current.erase ? s.current.size * 2.5 : s.current.size);
  const snap = () => { try { s.current.hist.push(ctx().getImageData(0, 0, ref.current.width, ref.current.height)); if (s.current.hist.length > 20) s.current.hist.shift(); } catch { /* ignore */ } };
  const down = (e) => {
    if (disabled) { setMsg(blockMsg || ''); return; }
    s.current.down = true; s.current.drew = true; ref.current.setPointerCapture(e.pointerId); snap();
    const p = pos(e); s.current.last = p; const x = ctx(); x.fillStyle = ink(); x.beginPath(); x.arc(p[0], p[1], wid() / 2, 0, 7); x.fill();
  };
  const move = (e) => {
    if (!s.current.down) return;
    if (disabled) { s.current.down = false; return; }
    const p = pos(e); const x = ctx(); x.strokeStyle = ink(); x.lineWidth = wid(); x.beginPath(); x.moveTo(...s.current.last); x.lineTo(...p); x.stroke(); s.current.last = p;
  };
  const up = () => { s.current.down = false; };
  const set = (k, v) => { s.current[k] = v; if (k === 'color') s.current.erase = false; force((n) => n + 1); };
  return (
    <div>
      <div className="cc-pad" style={{ position: 'relative' }}>
        <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Khung vẽ" />
        {top && <div className="cc-pad-over">{top}</div>}
      </div>
      <div className="cc-tools">
        {PEN.map((c) => <button key={c} type="button" className={`cc-sw${s.current.color === c && !s.current.erase ? ' on' : ''}`} style={{ background: c }} onClick={() => set('color', c)} aria-label={`Màu ${c}`} />)}
      </div>
      <div className="cc-tools">
        {[[3, 'Mảnh'], [7, 'Vừa'], [16, 'Đậm']].map(([v, l]) => <button key={v} type="button" className={`cc-tool${s.current.size === v ? ' on' : ''}`} onClick={() => set('size', v)}>{l}</button>)}
        <button type="button" className={`cc-tool${s.current.erase ? ' on' : ''}`} onClick={() => set('erase', !s.current.erase)}>Tẩy</button>
        <button type="button" className="cc-tool" disabled={disabled && !!bg} onClick={() => { const h = s.current.hist.pop(); if (h) ctx().putImageData(h, 0, 0); }}>Hoàn tác</button>
        <button type="button" className="cc-tool" disabled={disabled && !!bg} onClick={() => { snap(); paintBg(); }}>Xoá</button>
      </div>
      <button type="button" className="cc-btn" style={{ width: '100%', marginTop: 12 }} onClick={() => { if (!s.current.drew) { setMsg('Khung vẽ còn trống.'); return; } onDone(ref.current.toDataURL('image/png')); }}>{doneLabel}</button>
      {msg && <p className="cc-err">{msg}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ Phòng Tranh */
function Wall({ st, room, token, refresh, carry, clearCarry, goDraw, canDraw }) {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('Tất cả');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ t: '', ok: false });
  const [open, setOpen] = useState(null);
  const me = st.me;

  const load = useCallback(async () => { try { setList(await ccWall(room, token)); } catch { /* giữ danh sách cũ */ } }, [room, token]);
  useEffect(() => { load(); const id = setInterval(load, 6000); return () => clearInterval(id); }, [load]);
  useEffect(() => { if (carry?.img) { setFile(null); setPreview(carry.img); } }, [carry]);
  const artBrand = (!file && carry?.img && carry.brand) || me?.brand || (canDraw ? '' : 'Tranh tự do');
  useEffect(() => () => { if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  const pickFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith('image/')) { setMsg({ t: 'Chọn một file ảnh nhé.', ok: false }); return; }
    clearCarry(); setFile(f); setPreview(URL.createObjectURL(f)); setMsg({ t: '', ok: false });
  };
  const submit = async (e) => {
    e.preventDefault();
    const src = file || carry?.img;
    if (!src) { setMsg({ t: 'Chọn ảnh tranh trước đã.', ok: false }); return; }
    if (!artBrand) { setMsg({ t: 'Em cần bốc đề vẽ ở Xưởng Vẽ trước.', ok: false }); return; }
    setBusy(true); setMsg({ t: '', ok: false });
    try {
      await ccSubmitArt(room, token, src, { title, caption, brand: artBrand });
      setFile(null); setPreview(''); clearCarry(); setTitle(''); setCaption('');
      setMsg({ t: 'Đã gửi! Tranh sẽ hiện cho cả lớp sau khi giáo viên duyệt.', ok: true });
      load(); refresh();
    } catch (ex) { setMsg({ t: ccError(ex), ok: false }); } finally { setBusy(false); }
  };
  const heart = async (a) => {
    setList((xs) => xs.map((x) => (x.id === a.id ? { ...x, liked: !x.liked, hearts: x.hearts + (x.liked ? -1 : 1) } : x)));
    try { const r = await ccHeart(room, token, a.id); setList((xs) => xs.map((x) => (x.id === a.id ? { ...x, liked: r.liked, hearts: r.hearts } : x))); } catch { load(); }
  };

  const brands = useMemo(() => ['Tất cả', ...Array.from(new Set((list || []).map((a) => a.brand).filter(Boolean)))], [list]);
  const shown = (list || []).filter((a) => filter === 'Tất cả' || a.brand === filter);

  return (
    <section className="cc-sec">
      <SecHead id="wall" sub="Tải tranh của em lên tường chung. Chạm để xem lớn, thả tim bức em thích." />
      <form className="cc-upload" onSubmit={submit}>
        <span className="cc-label">Tải tranh lên{me ? ` · còn ${me.arts_left} lượt` : ''}</span>
        <label className="cc-drop" htmlFor="cc-file">
          {preview ? <img src={preview} alt="Ảnh tranh sẽ đăng" /> : <span><b>Chọn ảnh tranh của em</b><br /><span className="cc-hint">Chụp tranh giấy, hoặc dùng tranh vừa vẽ trên điện thoại</span></span>}
        </label>
        <input id="cc-file" type="file" accept="image/*" className="cc-sr" onChange={pickFile} />
        <div className="cc-field">
          <label>Đề em vẽ</label>
          {artBrand
            ? <span className="cc-tag" style={{ justifySelf: 'start', fontSize: 12.5, padding: '6px 10px' }}>{artBrand}</span>
            : <button type="button" className="cc-btn ghost sm" style={{ justifySelf: 'start' }} onClick={goDraw}>Chưa bốc đề · tới Xưởng Vẽ</button>}
        </div>
        <div className="cc-field"><label htmlFor="cc-title">Tên tác phẩm</label><input id="cc-title" className="cc-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="VD: Giọt đỏ trên bàn ăn" /></div>
        <div className="cc-field"><label htmlFor="cc-cap">Một dòng mô tả</label><input id="cc-cap" className="cc-input" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={140} placeholder="Chi tiết nào giúp người xem nhận ra?" /></div>
        <button className="cc-btn" type="submit" disabled={busy || (me && me.arts_left <= 0)}>{busy ? 'Đang tải lên…' : 'Đăng lên Phòng Tranh'}</button>
        {msg.t && <span className={msg.ok ? 'cc-ok' : 'cc-err'}>{msg.t}</span>}
      </form>
      <div className="cc-chips">
        {brands.map((b) => <button key={b} type="button" className={`cc-chip${filter === b ? ' on' : ''}`} onClick={() => setFilter(b)}>{b}</button>)}
      </div>
      {list == null ? <p className="cc-hint">Đang tải tường tranh…</p>
        : shown.length ? <div className="cc-masonry">{shown.map((a) => <Pin key={a.id} a={a} onOpen={setOpen} onHeart={heart} />)}</div>
          : <div className="cc-empty">Chưa có tranh nào. Tranh đầu tiên có thể là của em!</div>}
      {open && <Zoom a={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Zoom({ a, onClose }) {
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={a.title} onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(5,4,10,.78)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="cc-glass" style={{ maxWidth: 480, width: '100%', overflow: 'hidden', background: 'var(--surface)' }} onClick={(e) => e.stopPropagation()}>
        <img src={publicUrl(a.image_path)} alt={a.title} style={{ display: 'block', width: '100%', maxHeight: '62svh', objectFit: 'contain', background: '#fbfaff' }} />
        <div style={{ padding: 14, display: 'grid', gap: 6 }}>
          {a.brand && <span className="cc-label">{a.brand}</span>}
          <h3 style={{ fontSize: 20 }}>{a.title || 'Chưa đặt tên'}</h3>
          {a.caption && <p style={{ margin: 0, color: 'var(--soft)' }}>{a.caption}</p>}
          <span className="cc-hint">bởi {a.author} · ♥ {a.hearts}</span>
          <button type="button" className="cc-btn ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Quảng trường */
function Plaza({ st, room, token, refresh }) {
  const [word, setWord] = useState('');
  const [last, setLast] = useState('');
  const [err, setErr] = useState('');
  const left = st.me?.words_left ?? 0;
  const send = async (e) => {
    e.preventDefault(); const w = word.trim(); if (!w) return; setErr('');
    try { await ccWord(room, token, w); setLast(w.toLowerCase()); setWord(''); refresh(); } catch (ex) { setErr(ccError(ex)); }
  };
  return (
    <section className="cc-sec">
      <SecHead id="plaza" sub="Kết bài: sáng tạo với em là…" />
      <Cloud words={st.words} highlight={last} />
      <form onSubmit={send} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input className="cc-input" value={word} onChange={(e) => setWord(e.target.value)} maxLength={24} placeholder={left > 0 ? 'Một hai chữ thôi' : 'Em đã gửi đủ 3 từ'} disabled={left <= 0} aria-label="Từ khoá" />
        <button className="cc-btn" type="submit" disabled={left <= 0}>Gửi</button>
      </form>
      <p className="cc-hint">Còn {left} lượt gửi.</p>
      {err && <p className="cc-err">{err}</p>}
    </section>
  );
}
