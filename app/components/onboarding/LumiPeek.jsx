'use client';

// v59: Lumi lấp ló ở 4 góc màn hình — thụt ra thụt vô vào những khoảnh khắc nhỏ:
//   • lời chào đầu tiên trong ngày (theo giờ VN)      • vào một khu mới (thỉnh thoảng, có câu hợp khu)
//   • ngồi im lâu không thao tác                       • cuộn tới cuối một trang dài
//   • vừa nhận huy hiệu / thông báo                    • ghé ngang ngẫu nhiên
// 4 kiểu: treo ngược dưới thanh menu (trái trên), nghiêng người ngó từ mép phải (phải trên),
// ngó từ mép trái (trái dưới), nhô đầu lên từ đáy (phải dưới).
// Bấm vào Lumi -> nhảy + nói; có nút "Tắt Lumi lấp ló" (tắt cả Lumi trong city). Bật lại ở My Journey.
// Giới hạn: cách nhau ≥ 50 giây, tối đa 8 lần mỗi phiên, không chen khi đang có hướng dẫn / hộp thoại.
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LUMI_SVG } from './lumiArt';
import { isCameoOff, setCameoOff, LUMI_CAMEO_EVENT } from '@/lib/lumiCameo';
import { todayKey } from '@/lib/onboarding';
import './onboarding.css';

const CORNERS = ['tl', 'tr', 'bl', 'br'];
const GAP_MS = 50_000;
const MAX_PER_SESSION = 8;

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
  'Lumi chỉ ghé ngang thôi… 👋',
  'Bạn có biết dưới thành phố có 2 tầng tàu điện ngầm không?',
  'Nhấn Ctrl + K để tìm nhanh nè!',
  'Ủa, bạn thấy Lumi rồi hả? 🙈',
  'Đừng quên streak hôm nay nha 🔥',
  'Ra trang chủ tìm Lumi đi, Lumi hay đi dạo trong city lắm ✨',
];
const POKE = ['Hihi, nhột! 😆', 'Bắt được Lumi rồi! 🙈', 'Lumi đây! Cần gì cứ gọi nha.', 'Lumi đi thắp đèn tiếp đây ✨'];

const rnd = (a) => a[(Math.random() * a.length) | 0];
function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' })) % 24;
  if (h >= 5 && h < 11) return 'Chào buổi sáng! ☀️ Hôm nay khám phá gì nè?';
  if (h >= 11 && h < 13) return 'Trưa rồi, nhớ ăn cơm nha 🍚';
  if (h >= 13 && h < 18) return 'Chiều nay học gì nè? Lumi đi cùng nha!';
  if (h >= 18 && h < 22) return 'Tối rồi, thành phố lên đèn ✨ Lumi đi thắp đèn đây!';
  return 'Khuya rồi đó… đừng thức khuya quá nha 🌙';
}
const pageLine = (path) => PAGE_LINES.find(([p]) => path.startsWith(p))?.[1];

// Có thứ khác đang chiếm sân khấu? (hướng dẫn Lumi, hộp thoại, cổng đăng ký)
function busy() {
  if (typeof document === 'undefined') return true;
  if (document.hidden) return true;
  return !!document.querySelector('.kwo-lumi.is-show, .kwo-scrim, [aria-modal="true"], .kwg');
}
const ss = {
  get(k, d) { try { const v = sessionStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};

export default function LumiPeek() {
  const pathname = usePathname() || '/';
  const [off, setOff] = useState(true); // chờ đọc cài đặt trên trình duyệt
  const [corner, setCorner] = useState('bl');
  const [pose, setPose] = useState('hidden'); // hidden | peek | out
  const [mood, setMood] = useState('happy');
  const [say, setSay] = useState(null); // { text, menu }
  const [hop, setHop] = useState(0);
  const timers = useRef([]);
  const active = useRef(false);
  const hover = useRef(false);
  const endAt = useRef(0);
  const navBottom = useRef(64);
  const navClear = useRef(false);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    setOff(isCameoOff());
    const on = () => setOff(isCameoOff());
    window.addEventListener(LUMI_CAMEO_EVENT, on);
    return () => window.removeEventListener(LUMI_CAMEO_EVENT, on);
  }, []);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const after = (ms, f) => { timers.current.push(setTimeout(f, ms)); };

  const finish = useCallback(() => {
    clear();
    setSay(null);
    setPose('hidden');
    after(700, () => { active.current = false; });
  }, []);

  // Giữ Lumi ở ngoài khi đang rê chuột; hết giờ thì thụt vào.
  const scheduleEnd = useCallback((ms) => {
    endAt.current = Date.now() + ms;
    const check = () => {
      if (hover.current) { after(600, check); return; }
      if (Date.now() >= endAt.current) finish(); else after(endAt.current - Date.now(), check);
    };
    after(ms, check);
  }, [finish]);

  // Màn lấp ló: thụt ra (một nửa) → thụt vô → thụt ra lần nữa → ló hẳn + nói → thụt vô.
  const peek = useCallback((text, opts = {}) => {
    if (off || active.current || busy()) return false;
    const now = Date.now();
    const count = ss.get('kw_lumi_peek_n', 0);
    if (!opts.force && (now - ss.get('kw_lumi_peek_t', 0) < GAP_MS || count >= MAX_PER_SESSION)) return false;
    ss.set('kw_lumi_peek_t', now);
    ss.set('kw_lumi_peek_n', count + 1);
    active.current = true;
    clear();
    const nav = document.querySelector('.kw-nav');
    navClear.current = !nav || nav.classList.contains('is-home');
    navBottom.current = nav && !navClear.current ? Math.max(0, Math.round(nav.getBoundingClientRect().bottom)) : 0;
    setCorner(opts.corner || rnd(CORNERS));
    setMood(opts.mood || 'happy');
    setSay(null);
    setPose('hidden');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let t = 60;
    if (!reduce) {
      after(t, () => setPose('peek')); t += 950;
      after(t, () => setPose('hidden')); t += 650;
      if (Math.random() < 0.6) { after(t, () => setPose('peek')); t += 800; after(t, () => setPose('hidden')); t += 550; }
    }
    after(t, () => { setPose('out'); setSay({ text }); scheduleEnd(4600); });
    return true;
  }, [off, scheduleEnd]);

  const peekRef = useRef(peek);
  peekRef.current = peek;

  // ---- Khoảnh khắc 1+2: chào ngày mới / vào một khu ----
  useEffect(() => {
    if (off) return undefined;
    let greeted = false;
    try { greeted = localStorage.getItem('kw_lumi_greet') === todayKey(); } catch { /* ignore */ }
    const t = setTimeout(() => {
      if (!greeted) {
        if (peekRef.current(greeting(), { force: true, mood: 'big' })) { try { localStorage.setItem('kw_lumi_greet', todayKey()); } catch { /* ignore */ } }
        return;
      }
      const lines = pageLine(pathname);
      if (Math.random() < (lines ? 0.4 : 0.15)) peekRef.current(rnd(lines || AMBIENT));
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
        if (peekRef.current(rnd(IDLE), { mood: 'wow' })) lastIdle = now;
      }
    }, 5000);
    return () => { clearInterval(iv); evs.forEach((e) => window.removeEventListener(e, touch)); };
  }, [off]);

  // ---- Khoảnh khắc 4: cuộn tới cuối trang dài ----
  useEffect(() => {
    if (off) return undefined;
    let done = false;
    const on = () => {
      if (done) return;
      const d = document.documentElement;
      if (d.scrollHeight < window.innerHeight * 1.8) return;
      if (window.scrollY + window.innerHeight >= d.scrollHeight - 40) {
        done = true;
        peekRef.current(rnd(BOTTOM), { corner: Math.random() < 0.5 ? 'br' : 'bl', mood: 'wow' });
      }
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [pathname, off]);

  // ---- Khoảnh khắc 5: huy hiệu / thông báo vui ----
  useEffect(() => {
    if (off) return undefined;
    const on = (e) => {
      const m = String(e.detail?.message || '');
      const big = /badge|huy hiệu|streak/i.test(m);
      if (big || Math.random() < 0.25) setTimeout(() => peekRef.current(rnd(CHEER), { mood: 'big', corner: 'tl', force: big }), 900);
    };
    window.addEventListener('kw-toast', on);
    return () => window.removeEventListener('kw-toast', on);
  }, [off]);

  // ---- Khoảnh khắc 6: ghé ngang ngẫu nhiên ----
  useEffect(() => {
    if (off) return undefined;
    let t;
    const loop = () => {
      t = setTimeout(() => { peekRef.current(rnd(AMBIENT)); loop(); }, 150_000 + Math.random() * 120_000);
    };
    loop();
    return () => clearTimeout(t);
  }, [off]);

  useEffect(() => () => clear(), []);
  useEffect(() => { if (off && active.current) finish(); }, [off, finish]);

  if (off) return null;

  const poke = () => {
    if (pose === 'hidden') return;
    setHop((h) => h + 1);
    setMood(Math.random() < 0.5 ? 'big' : 'wink');
    setPose('out');
    setSay({ text: rnd(POKE), menu: true });
    clear();
    scheduleEnd(5200);
  };
  const turnOff = () => { finish(); setCameoOff(true); };

  const style = { '--kwl-nav': `${navBottom.current}px` };
  return (
    <div className={`kwl is-${corner} ${navClear.current ? 'is-under' : ''}`} data-pose={pose} style={style} aria-hidden={pose === 'hidden'}>
      <div className="kwl-clip">
        <button
          type="button"
          className="kwl-fig"
          aria-label="Lumi"
          tabIndex={pose === 'hidden' ? -1 : 0}
          onClick={poke}
          onPointerEnter={() => { hover.current = true; if (pose === 'peek') setPose('out'); }}
          onPointerLeave={() => { hover.current = false; }}
        >
          <span key={hop} className={`kwl-pose ${hop ? 'is-hop' : ''}`} data-mood={mood} dangerouslySetInnerHTML={{ __html: LUMI_SVG }} />
        </button>
      </div>
      {say && pose === 'out' && (
        <div className="kwl-say" role="status" onPointerEnter={() => { hover.current = true; }} onPointerLeave={() => { hover.current = false; }}>
          <span className="kwo-nm">Lumi</span> {say.text}
          {say.menu && (
            <button type="button" className="kwl-mute" onClick={turnOff}>Tắt Lumi lấp ló</button>
          )}
        </div>
      )}
    </div>
  );
}
