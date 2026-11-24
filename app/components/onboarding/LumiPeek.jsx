'use client';

// v62: Lumi bay ngang giờ cưỡi mây PHÍA SAU thành phố (city/skyLumi.js, vẽ trên lớp trời 2D) — không che thành phố.
// v61: nút Lumi chuyển lên thanh menu (Nav.jsx phát sự kiện 'kw-lumi-call'); bấm là Lumi bay mây xuống
//      ngay dưới nút và mở menu (LumiMenu.jsx): dẫn đường · khám phá ngẫu nhiên · trang này dùng sao · lối tắt admin.
// v60: Lumi ghé ngang — thay cho kiểu lấp ló 4 góc (v59) hay bị mép màn hình / thanh menu che.
// Lumi hiện TRỌN người ở chỗ trống, không dính mép:
//   • "Mây"  — ngồi trên đám mây bay ngang qua màn hình (dưới thanh menu), nói 1 câu, rồi "bụp" tan mất.
//   • "Đi bộ" — lạch bạch đi vào từ một bên mép dưới, dừng lại vẫy tay + nói, rồi thụt xuống biến mất.
// Mỗi lần chỉ ~5 giây. Rê chuột vào Lumi thì Lumi đứng lại chờ; bấm vào thì nhảy + nói thêm.
// Nút "Gọi Lumi" ở mép phải màn hình: bấm là Lumi ra ngay (kể cả khi đã tắt Lumi tự xuất hiện).
// Khoảnh khắc tự xuất hiện giữ như v59: chào ngày mới, vào một khu, ngồi im lâu, cuộn tới cuối trang,
// nhận huy hiệu, ghé ngang ngẫu nhiên. Cách nhau ≥ 50 giây, tối đa 8 lần/phiên, không chen khi đang có hướng dẫn / hộp thoại.
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../AuthProvider';
import LumiMenu from './LumiMenu';
import { LUMI_SVG } from './lumiArt';
import { isCameoOff, setCameoOff, LUMI_CAMEO_EVENT } from '@/lib/lumiCameo';
import { todayKey } from '@/lib/onboarding';
import './onboarding.css';

const GAP_MS = 50_000;
const MAX_PER_SESSION = 8;
const SHOW_MS = 4600; // thời gian Lumi ở ngoài trước khi biến mất (cộng hiệu ứng ra/vào ≈ 5 giây)

// Gradient riêng để không đụng id với các hình Lumi khác trên trang.
const FIG_SVG = LUMI_SVG.replaceAll('kwoB', 'kwlB').replaceAll('kwoG', 'kwlG');
const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';
export const LUMI_CALL_EVENT = 'kw-lumi-call';
const CLOUD_SVG = `<svg viewBox="0 0 150 62" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><linearGradient id="kwlC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#eeeaff"/><stop offset="1" stop-color="#cfc6ff"/></linearGradient></defs>
  <path d="M26 54 C10 54 5 40 17 34 C14 21 31 14 42 21 C48 8 70 5 79 18 C88 9 108 12 110 27 C125 23 141 34 134 47 C143 52 135 60 125 59 L32 60 C24 60 20 57 26 54Z" fill="url(#kwlC)"/>
  <path d="M40 30 C46 25 55 25 60 30 M86 26 C92 22 100 23 104 28" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>
</svg>`;

const PAGE_LINES = [
  ['/knowledge-hub', ['Psst… khái niệm nào cũng có đồ thị liên kết đó, bấm thử xem!', 'Lumi hay lạc trong thư viện này lắm 📚']],
  ['/students', ['Bài của các anh chị khoá trước nè, xem thử đi!', 'Case study hôm nay xem cái nào ta? 🎬']],
  ['/videos', ['Bắp rang đâu rồi? 🍿 Xem video nào!']],
  ['/images', ['Case study hình ảnh nè — nhìn kỹ từng chi tiết nha 🔍']],
  ['/discussion', ['Có ai đang bàn chuyện gì vui hông? 👀', 'Thả 1 tim cho bài bạn thích đi!']],
  ['/temple', ['Suỵt… nhỏ tiếng thôi, đang ở chùa đó 🙏', 'Gõ mõ chưa? Công đức tới đâu rồi?']],
  ['/journey', ['Streak của bạn đang cháy nè 🔥', 'Hành trình của bạn dài ghê rồi đó!']],
  ['/metro', ['Hook hôm nay viết chưa? MetroGram đang chờ! 🚇']],
  ['/medisland', ['Agency của bạn chạy kênh nào tuần này? 📈', 'Nhớ đi hỏi cư dân trên đảo nha!']],
  ['/games', ['Bốc thăm đi, Lumi hồi hộp quá! 🎲']],
  ['/news', ['Tin mới nóng hổi nè 📰']],
  ['/research', ['Góc nghiên cứu nghiêm túc ghê… Lumi đứng ngoài nhìn thôi 🤓']],
  ['/profile', ['Thẻ cư dân của bạn dễ thương ghê!']],
  ['/home', ['Nhà đẹp quá trời! Lumi vô chơi được hông? 🏡']],
  ['/island', ['Hòn đảo riêng nè… Lumi chỉ ngó xíu thôi 🏝️']],
];
const IDLE = ['Còn đó hông? 👀', 'Lumi tưởng bạn ngủ quên rồi…', 'Psst… đi dạo một vòng không?'];
const BOTTOM = ['Hết trang rồi nè! 🙈', 'Đọc tới cuối luôn, giỏi ghê!', 'Cuối đường rồi, quay lại thôi 🏃'];
const CHEER = ['Yayyy! 🎉', 'Giỏi quá trời luôn!', 'Lumi thấy hết rồi nha, tuyệt ghê ✨'];
const AMBIENT = [
  'Lumi chỉ bay ngang thôi… 👋',
  'Bạn có biết dưới thành phố có 2 tầng tàu điện ngầm không?',
  'Nhấn Ctrl + K để tìm nhanh nè!',
  'Ủa, bạn thấy Lumi rồi hả? 🙈',
  'Đừng quên streak hôm nay nha 🔥',
  'Ra trang chủ tìm Lumi đi, Lumi hay đi dạo trong city lắm ✨',
];
const POKE = ['Hihi, nhột! 😆', 'Bắt được Lumi rồi! 🙈', 'Lumi đây! Cần gì cứ gọi nha.', 'Lumi đi thắp đèn tiếp đây ✨'];

const rnd = (a) => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = (t) => 1 - (1 - t) ** 3;
function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' })) % 24;
  if (h >= 5 && h < 11) return 'Chào buổi sáng! ☀️ Hôm nay khám phá gì nè?';
  if (h >= 11 && h < 13) return 'Trưa rồi, nhớ ăn cơm nha 🍚';
  if (h >= 13 && h < 18) return 'Chiều nay học gì nè? Lumi đi cùng nha!';
  if (h >= 18 && h < 22) return 'Tối rồi, thành phố lên đèn ✨ Lumi đi thắp đèn đây!';
  return 'Khuya rồi đó… đừng thức khuya quá nha 🌙';
}
const pageLine = (path) => PAGE_LINES.find(([p]) => path.startsWith(p))?.[1];

// Có thứ khác đang chiếm sân khấu? (hướng dẫn Lumi, hộp thoại, cổng đăng ký, game toàn màn hình)
function busy() {
  if (typeof document === 'undefined') return true;
  if (document.hidden) return true;
  return !!document.querySelector('.kwo-lumi.is-show, .kwo-scrim, [aria-modal="true"], .kwg, .kwmd.full, .kwmg.full');
}
const ss = {
  get(k, d) { try { const v = sessionStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};

export default function LumiPeek() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { user } = useAuth() || {};
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [off, setOff] = useState(true); // tắt Lumi TỰ xuất hiện (nút Gọi Lumi vẫn dùng được)
  const [ready, setReady] = useState(false);
  const [run, setRun] = useState(null); // { id, kind, dir, top, side }
  const [phase, setPhase] = useState('in'); // in | talk | out
  const [moving, setMoving] = useState(false);
  const [mood, setMood] = useState('happy');
  const [say, setSay] = useState(null); // { text, menu }
  const [hop, setHop] = useState(0);
  const wrap = useRef(null);
  const raf = useRef(0);
  const st = useRef(null); // trạng thái chuyến đang chạy
  const hover = useRef(false);

  useEffect(() => {
    setOff(isCameoOff());
    setReady(true);
    const on = () => setOff(isCameoOff());
    window.addEventListener(LUMI_CAMEO_EVENT, on);
    return () => window.removeEventListener(LUMI_CAMEO_EVENT, on);
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    st.current = null;
    hover.current = false;
    setRun(null);
    setSay(null);
    setMoving(false);
  }, []);

  // Vòng chạy: tính vị trí theo thời gian (dừng đồng hồ khi đang rê chuột vào Lumi).
  const tick = useCallback((now) => {
    const s = st.current;
    if (!s) return;
    const dt = Math.min(64, now - s.last);
    s.last = now;
    if (!hover.current || s.phase === 'out') s.el += dt;
    const el = s.el;
    const p = s.travel ? clamp(el / s.travel, 0, 1) : 1;
    const x = s.x0 + (s.x1 - s.x0) * easeOut(p);
    if (wrap.current) wrap.current.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;

    const isMoving = p < 1 && !hover.current;
    if (isMoving !== s.moving) { s.moving = isMoving; setMoving(isMoving); }
    if (!s.said && el >= s.sayAt) { s.said = true; setSay(s.menu ? { panel: true } : { text: s.text }); if (s.phase === 'in') { s.phase = 'talk'; setPhase('talk'); } }
    if (s.phase !== 'out' && el >= s.exitAt) { s.phase = 'out'; setPhase('out'); setSay(null); s.goneAt = el + 520; }
    if (s.phase === 'out' && el >= s.goneAt) { stop(); return; }
    raf.current = requestAnimationFrame(tick);
  }, [stop]);

  // Một chuyến ghé ngang ~5 giây.
  const appear = useCallback((text, opts = {}) => {
    if (st.current) return false;
    if (!opts.summon && (off || busy())) return false;
    if (!opts.summon) {
      const now = Date.now();
      const count = ss.get('kw_lumi_peek_n', 0);
      if (!opts.force && (now - ss.get('kw_lumi_peek_t', 0) < GAP_MS || count >= MAX_PER_SESSION)) return false;
      // v62: có bầu trời thành phố trên màn hình -> Lumi cưỡi mây bay PHÍA SAU thành phố (vẽ trên lớp trời).
      // Ở Main City không bao giờ bay đè lên thành phố; trang khác thì đi bộ ở mép dưới.
      const sky = typeof window !== 'undefined' ? window.__kwSkyLumi : null;
      const skyOk = !!sky?.canFly?.();
      if (!skyOk && window.location.pathname === '/') return false;
      ss.set('kw_lumi_peek_t', now);
      ss.set('kw_lumi_peek_n', count + 1);
      if (skyOk) return sky.fly(text);
    }
    const W = window.innerWidth;
    const H = window.innerHeight;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const menu = !!opts.menu;
    const kind = menu ? 'cloud' : 'walk'; // v62: tự ghé ngang trên trang = đi bộ; mây trên màn hình chỉ dùng khi bấm nút Lumi
    const size = kind === 'cloud' ? 150 : 84;
    const dir = menu ? -1 : Math.random() < 0.5 ? 1 : -1; // 1: trái → phải
    const x1 = menu ? Math.max(8, W - size - (W < 640 ? 8 : 24)) : clamp(W * (0.28 + Math.random() * 0.44) - size / 2, 12, W - size - 12);
    const x0 = reduce ? x1 : dir > 0 ? -size - 20 : W + 20;
    // Mây bay ngay dưới thanh menu, chừa chỗ cho bong bóng thoại phía trên.
    const nav = document.querySelector('.kw-nav');
    const navBottom = nav ? Math.max(0, Math.round(nav.getBoundingClientRect().bottom)) : 0;
    const top = menu ? navBottom + 4 : navBottom + 64 + Math.round(Math.random() * clamp(H * 0.16, 0, 110));
    const travel = reduce ? 0 : menu ? 1200 : kind === 'cloud' ? 4200 : 1900;
    st.current = {
      kind, x0, x1, travel, text,
      el: 0, last: performance.now(), moving: false, said: false, phase: 'in',
      sayAt: menu ? 500 : kind === 'cloud' ? 900 : travel + 80,
      exitAt: menu ? Infinity : SHOW_MS,
      menu,
      goneAt: Infinity,
    };
    setMood(opts.mood || 'happy');
    setSay(null);
    setPhase('in');
    setRun({ id: Date.now(), kind, dir, top, x0, menu, side: menu || x1 + size / 2 > W / 2 ? 'r' : 'l' });
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame((t) => { if (st.current) st.current.last = t; tick(t); });
    return true;
  }, [off, tick]);

  const appearRef = useRef(appear);
  appearRef.current = appear;

  // ---- Khoảnh khắc 1+2: chào ngày mới / vào một khu ----
  useEffect(() => {
    if (off) return undefined;
    let greeted = false;
    try { greeted = localStorage.getItem('kw_lumi_greet') === todayKey(); } catch { /* ignore */ }
    const t = setTimeout(() => {
      if (!greeted) {
        if (appearRef.current(greeting(), { force: true, mood: 'big' })) { try { localStorage.setItem('kw_lumi_greet', todayKey()); } catch { /* ignore */ } }
        return;
      }
      const lines = pageLine(pathname);
      if (Math.random() < (lines ? 0.4 : 0.15)) appearRef.current(rnd(lines || AMBIENT));
    }, greeted ? 7000 + Math.random() * 6000 : 4500);
    return () => clearTimeout(t);
  }, [pathname, off]);

  // ---- Khoảnh khắc 3: ngồi im lâu ----
  useEffect(() => {
    if (off) return undefined;
    let last = Date.now();
    let lastIdle = 0;
    const touch = () => { last = Date.now(); };
    const evs = ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'];
    evs.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const iv = setInterval(() => {
      const now = Date.now();
      if (now - last > 55_000 && now - lastIdle > 240_000) {
        if (appearRef.current(rnd(IDLE), { mood: 'wow' })) lastIdle = now;
      }
    }, 5000);
    return () => { clearInterval(iv); evs.forEach((e) => window.removeEventListener(e, touch)); };
  }, [off]);

  // ---- Khoảnh khắc 4: cuộn tới cuối trang dài (Lumi đi bộ ra) ----
  useEffect(() => {
    if (off) return undefined;
    let done = false;
    const on = () => {
      if (done) return;
      const d = document.documentElement;
      if (d.scrollHeight < window.innerHeight * 1.8) return;
      if (window.scrollY + window.innerHeight >= d.scrollHeight - 40) {
        done = true;
        appearRef.current(rnd(BOTTOM), { kind: 'walk', mood: 'wow' });
      }
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [pathname, off]);

  // ---- Khoảnh khắc 5: huy hiệu / thông báo vui (Lumi bay mây ra) ----
  useEffect(() => {
    if (off) return undefined;
    const on = (e) => {
      const m = String(e.detail?.message || '');
      const big = /badge|huy hiệu|streak/i.test(m);
      if (big || Math.random() < 0.25) setTimeout(() => appearRef.current(rnd(CHEER), { mood: 'big', kind: 'cloud', force: big }), 900);
    };
    window.addEventListener('kw-toast', on);
    return () => window.removeEventListener('kw-toast', on);
  }, [off]);

  // ---- Khoảnh khắc 6: ghé ngang ngẫu nhiên ----
  useEffect(() => {
    if (off) return undefined;
    let t;
    const loop = () => {
      t = setTimeout(() => { appearRef.current(rnd(AMBIENT)); loop(); }, 150_000 + Math.random() * 120_000);
    };
    loop();
    return () => clearTimeout(t);
  }, [off]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // Bấm vào Lumi: nhảy + nói, ở lại thêm một chút.
  const poke = () => {
    const s = st.current;
    if (!s || s.phase === 'out') return;
    setHop((h) => h + 1);
    if (s.menu) return;
    setMood(Math.random() < 0.5 ? 'big' : 'wink');
    s.said = true;
    s.phase = 'talk';
    setPhase('talk');
    setSay({ text: rnd(POKE), menu: true });
    s.exitAt = Math.max(s.exitAt, s.el + 3400);
  };
  // Lumi rời đi (thụt / bụp mất).
  const close = useCallback(() => {
    const s = st.current;
    if (s && s.phase !== 'out') s.exitAt = s.el;
  }, []);
  // Bấm nút Lumi trên thanh menu: Lumi bay xuống ngay dưới nút và mở menu.
  const summon = useCallback(() => {
    const s = st.current;
    if (s) {
      if (s.menu && s.phase !== 'out') { close(); return; } // bấm lần nữa = đóng
      stop();
    }
    appearRef.current('', { summon: true, menu: true, mood: 'big' });
  }, [close, stop]);
  useEffect(() => {
    const on = () => summon();
    window.addEventListener(LUMI_CALL_EVENT, on);
    return () => window.removeEventListener(LUMI_CALL_EVENT, on);
  }, [summon]);
  // Đổi trang hoặc bấm ra ngoài thì menu Lumi đóng lại.
  useEffect(() => { if (st.current?.menu) close(); }, [pathname, close]);
  useEffect(() => {
    if (!run?.menu) return undefined;
    const on = (e) => {
      if (wrap.current?.contains(e.target) || e.target.closest?.('[data-lumi-call]')) return;
      close();
    };
    document.addEventListener('pointerdown', on);
    return () => document.removeEventListener('pointerdown', on);
  }, [run, close]);
  const go = (href) => {
    setSay({ text: rnd(['Đi thôi! 💨', 'Theo Lumi nè! ✨', 'Tới liền!']) });
    setHop((h) => h + 1);
    if (st.current) st.current.exitAt = st.current.el + 700;
    setTimeout(() => router.push(href), 350);
  };
  const compose = () => {
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('kw-notice-compose'));
      close();
    } else {
      try { sessionStorage.setItem('kw_notice_compose', '1'); } catch { /* ignore */ }
      go('/');
    }
  };
  const toggleAuto = () => {
    const next = !off;
    setCameoOff(next);
    if (st.current) {
      setSay({ text: next ? 'Okie, Lumi sẽ không tự ra nữa. Cần thì bấm nút Lumi trên thanh menu nha 💜' : 'Yay! Lumi sẽ thỉnh thoảng ghé ngang nha ✨' });
      st.current.exitAt = Math.max(st.current.exitAt, st.current.el + 2600);
    }
  };

  if (!ready) return null;

  const enter = () => { hover.current = true; };
  const leave = () => { hover.current = false; };

  return (
    <>
      {run && (
        <div
          key={run.id}
          ref={wrap}
          className={`kwl is-${run.kind} ${run.menu ? 'is-menu' : ''} ${moving ? 'is-moving' : ''} ${run.dir < 0 ? 'is-rev' : ''}`}
          data-phase={phase}
          style={{ transform: `translate3d(${run.x0}px,0,0)`, ...(run.kind === 'cloud' ? { top: run.top } : null) }}
        >
          <div className="kwl-body">
            <button
              type="button"
              className="kwl-fig"
              aria-label="Lumi"
              onClick={poke}
              onPointerEnter={enter}
              onPointerLeave={leave}
            >
              <span className="kwl-ride">
                <span className="kwl-flip">
                  <span key={hop} className={`kwl-pose ${hop ? 'is-hop' : ''}`} data-mood={mood} dangerouslySetInnerHTML={{ __html: FIG_SVG }} />
                </span>
                {run.kind === 'cloud' && <span className="kwl-cloud" dangerouslySetInnerHTML={{ __html: CLOUD_SVG }} />}
              </span>
            </button>
          </div>
          {say?.panel && phase !== 'out' && (
            <div className="kwl-panel">
              <LumiMenu
                pathname={pathname}
                isAdmin={isAdmin}
                loggedIn={!!user}
                onGo={go}
                onCompose={compose}
                onClose={close}
                onTalk={() => setHop((h) => h + 1)}
              />
            </div>
          )}
          {say && !say.panel && phase !== 'out' && (
            <div className={`kwl-say is-${run.side} ${run.menu ? 'is-below' : ''}`} role="status" onPointerEnter={enter} onPointerLeave={leave}>
              <span className="kwo-nm">Lumi</span> {say.text}
              {say.menu && (
                <button type="button" className="kwl-mute" onClick={toggleAuto}>{off ? 'Bật Lumi tự ghé ngang' : 'Tắt Lumi tự ghé ngang'}</button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
