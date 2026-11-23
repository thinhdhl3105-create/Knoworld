'use client';

// v58: Hướng dẫn cư dân mới cùng Lumi — chú đom đóm thắp đèn của Knoworld City.
// Bật ngay sau khi người mới bấm "Enter the city" ở cổng đăng ký (VisitorGate).
// Luồng: Lumi chào → chọn lý do đến → dạo phố (spotlight trên menu) → hộ chiếu tuần đầu (5 dấu) → huy hiệu.
// Bỏ qua được mọi lúc. "Ẩn Lumi" tắt riêng nhân vật (hướng dẫn vẫn chạy).
// Dấu hộ chiếu tự đóng theo hoạt động thật (trang đã ghé + tiến độ my_progress).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useProgress from '../useProgress';
import { loadOnb, saveOnb, todayKey, replayOnboarding } from '@/lib/onboarding';
import { toast } from '@/lib/engagement';
import './onboarding.css';

/* ------------------------------------------------------------------ Lumi */
function starPath(cx, cy, R, r) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const q = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${(cx + q * Math.cos(a)).toFixed(1)} ${(cy + q * Math.sin(a)).toFixed(1)}`;
  }
  return `${d}Z`;
}

const LUMI_SVG = `<svg viewBox="0 0 100 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><radialGradient id="kwoB" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#f1edff"/><stop offset=".55" stop-color="#b9adff"/><stop offset="1" stop-color="#7d6cf0"/></radialGradient>
  <radialGradient id="kwoG"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#f6bd56" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="50" cy="109" rx="24" ry="3.5" fill="rgba(0,0,0,.3)"/>
  <path d="M50 27 Q47 15 56 9" stroke="#8d7fff" stroke-width="3" fill="none" stroke-linecap="round"/>
  <g class="kwo-star"><circle cx="57" cy="8" r="11" fill="url(#kwoG)"/><path d="${starPath(57, 8, 6, 2.6)}" fill="#ffd66e"/></g>
  <ellipse cx="38" cy="103" rx="9" ry="5.5" fill="#6f5fe0"/><ellipse cx="62" cy="103" rx="9" ry="5.5" fill="#6f5fe0"/>
  <ellipse cx="14" cy="68" rx="7" ry="11" fill="#9a8cff" transform="rotate(25 14 68)"/>
  <g class="kwo-arm"><ellipse cx="87" cy="62" rx="7" ry="11" fill="#9a8cff" transform="rotate(-35 87 62)"/></g>
  <path d="M50 24 C78 24 90 46 90 70 C90 92 72 103 50 103 C28 103 10 92 10 70 C10 46 22 24 50 24Z" fill="url(#kwoB)"/>
  <ellipse cx="50" cy="84" rx="15" ry="11" fill="#fff4c9" opacity=".6"/>
  <ellipse cx="34" cy="38" rx="9" ry="5" fill="#fff" opacity=".35" transform="rotate(-25 34 38)"/>
  <g class="kwo-eyes">
    <g class="kwo-eye-l"><ellipse cx="37" cy="58" rx="6" ry="7.5" fill="#241c45"/><circle cx="39" cy="55" r="2.3" fill="#fff"/><circle cx="35.5" cy="61" r="1" fill="#fff"/></g>
    <g class="kwo-eye-r"><ellipse cx="63" cy="58" rx="6" ry="7.5" fill="#241c45"/><circle cx="65" cy="55" r="2.3" fill="#fff"/><circle cx="61.5" cy="61" r="1" fill="#fff"/></g>
  </g>
  <path class="kwo-wink" d="M57 59 Q63 53 69 59" stroke="#241c45" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="27" cy="69" rx="5" ry="3" fill="#ff9bd2" opacity=".65"/><ellipse cx="73" cy="69" rx="5" ry="3" fill="#ff9bd2" opacity=".65"/>
  <path class="kwo-m-happy" d="M44 68 Q50 75 56 68" stroke="#241c45" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <ellipse class="kwo-m-wow" cx="50" cy="71" rx="3.8" ry="4.8" fill="#241c45"/>
  <path class="kwo-m-big" d="M42 67 Q50 80 58 67 Z" fill="#241c45"/>
</svg>`;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const LW = 84; // kích thước Lumi nổi
const LH = 96;

// Điều khiển Lumi nổi + bong bóng thoại (thao tác DOM trực tiếp cho mượt).
function createLumi(el, bub, { isOff, onSleep }) {
  let tok = 0;
  const anim = (c) => { el.classList.remove('is-enter', 'is-hop'); void el.offsetWidth; el.classList.add(c); };
  const api = {
    mood(m) { el.dataset.mood = m; },
    to(x, y) {
      if (isOff()) return;
      x = clamp(x, 6, window.innerWidth - LW - 6);
      y = clamp(y, 6, window.innerHeight - LH - 8);
      const was = el.classList.contains('is-show');
      if (!was) el.style.transition = 'none';
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      if (!was) { void el.offsetWidth; el.style.transition = ''; }
      el.classList.add('is-show');
      anim(was ? 'is-hop' : 'is-enter');
    },
    hide() { el.classList.remove('is-show'); api.hideBubble(); },
    hideBubble() { bub.classList.remove('is-show'); tok += 1; },
    say(text, acts = [], sides = ['right', 'left', 'above']) {
      if (isOff()) return;
      tok += 1;
      const my = tok;
      bub.innerHTML = '';
      const line = document.createElement('div');
      line.innerHTML = '<span class="kwo-nm">Lumi</span> ';
      const tx = document.createElement('span');
      line.appendChild(tx);
      bub.appendChild(line);
      if (acts.length) {
        const row = document.createElement('div');
        row.className = 'kwo-bacts';
        acts.forEach((a) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = `kwo-bb ${a.primary ? 'is-p' : 'is-g'}`;
          b.textContent = a.label;
          b.onclick = a.onClick;
          row.appendChild(b);
        });
        bub.appendChild(row);
      }
      const off = document.createElement('button');
      off.type = 'button';
      off.className = 'kwo-off';
      off.textContent = 'Ẩn Lumi ✕';
      off.onclick = onSleep;
      bub.appendChild(off);
      // Đo kích thước với câu đầy đủ rồi mới gõ chữ.
      tx.textContent = text;
      const lx = parseFloat(el.style.left) || 0;
      const ly = parseFloat(el.style.top) || 0;
      const bw = bub.offsetWidth;
      const bh = bub.offsetHeight;
      const W = window.innerWidth;
      let x = null;
      let y = null;
      for (const s of sides) {
        if (s === 'right' && lx + LW + 8 + bw < W - 8) { x = lx + LW + 6; y = ly + 30 - bh / 2; break; }
        if (s === 'left' && lx - 8 - bw > 8) { x = lx - 6 - bw; y = ly + 30 - bh / 2; break; }
        if (s === 'aboveL' && lx + LW - bw > 8) { x = lx + LW - bw; y = ly - bh - 6; break; }
        if (s === 'above') { x = clamp(lx + LW / 2 - bw / 2, 8, W - bw - 8); y = ly - bh - 6; break; }
      }
      if (x === null) { x = clamp(lx + LW / 2 - bw / 2, 8, W - bw - 8); y = ly - bh - 6; }
      bub.style.left = `${x}px`;
      bub.style.top = `${clamp(y, 8, window.innerHeight - bh - 8)}px`;
      tx.textContent = '';
      bub.classList.add('is-show');
      // Gõ chữ theo thời gian thực (không chậm lại khi thành phố 3D làm máy bận).
      const t0 = performance.now() + 200;
      const step = () => {
        if (my !== tok) return;
        const i = Math.max(0, Math.floor((performance.now() - t0) / 16));
        tx.textContent = text.slice(0, i);
        if (i < text.length) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    hop() { anim('is-hop'); },
  };
  return api;
}

function InlineLumi({ text, mood = 'happy', onSleep }) {
  return (
    <div className="kwo-inline" data-mood={mood}>
      <div className="kwo-li-fig" dangerouslySetInnerHTML={{ __html: LUMI_SVG }} />
      <div className="kwo-li-b">
        <span className="kwo-nm">Lumi</span> {text}
        <button type="button" className="kwo-off is-inline" onClick={onSleep}>Ẩn Lumi ✕</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Nội dung */
const PATHS = [
  { id: 'media', icon: 'campaign', c: '#ff8f6b', t: 'Media Strategy & Tactics', s: 'Chạy chiến dịch ngân sách quảng cáo trên Medisland', hl: 'medisland' },
  { id: 'smm', icon: 'tag', c: '#ff4fd8', t: 'Social Media Marketing', s: 'Viết hook mỗi ngày ở MetroGram (ga B1)', hl: 'metro' },
  { id: 'ebiz', icon: 'storefront', c: '#4fb6ff', t: 'E-Business & Marketing', s: 'Khái niệm, case study video và hình ảnh', hl: 'cases' },
  { id: 'explore', icon: 'explore', c: '#c6bfff', t: 'Chỉ muốn khám phá', s: 'Đi dạo thành phố, chùa, đảo trò chơi', hl: 'games' },
];

// t: danh sách data-tour có thể làm mục tiêu (lấy cái đầu tiên đang hiện trên màn hình).
// district: là một khu trên menu → nếu bị gom vào "More"/☰ thì chỉ vào nút đó.
const TOUR = [
  { id: 'hub', t: ['knowledge-hub'], district: true, e: '📚', h: 'Knowledge Hub', d: 'Thư viện khái niệm đã và đang học. Mỗi khái niệm có định nghĩa, ví dụ và đồ thị liên kết với khái niệm khác.' },
  { id: 'cases', t: ['case-studies'], district: true, e: '🎬', h: 'Case Studies', d: 'Video, bài của sinh viên và case study hình ảnh — nơi xem kiến thức được áp dụng thật.' },
  { id: 'games', t: ['games'], district: true, e: '🎲', h: 'Game Island', d: 'Bốc thăm thứ tự thuyết trình, nhận thương hiệu ngẫu nhiên cho nhóm và các trò nhỏ của lớp.' },
  { id: 'temple', t: ['temple'], district: true, e: '🛕', h: 'Temple', d: 'Đi dạo quanh chùa, gõ công đức, thắp nhang và xin quẻ — một góc thư giãn của thành phố.' },
  { id: 'journey', t: ['journey'], e: '🔥', h: 'Streak & My Journey', d: 'Mỗi ngày ghé Knoworld là thêm 1 ngày streak. Không có điểm, không có bài kiểm tra — chỉ có hành trình của bạn.' },
  { id: 'search', t: ['search'], e: '🔎', h: 'Tìm nhanh', d: 'Nhấn Ctrl + K (hoặc phím /) ở bất kỳ đâu để tìm khái niệm, case study hay khu vực.' },
];
const SPECIAL = {
  medisland: { id: 'medisland', t: ['medisland'], district: true, e: '📈', h: 'Medisland', d: 'Hòn đảo của môn Media Strategy: nhóm bạn thành một agency, chạy ngân sách OOH/TV/Digital trong 4 tuần và phỏng vấn cư dân.' },
  metro: { id: 'metro', t: [], e: '🚇', h: 'Metro · MetroGram', d: 'Dưới thành phố có tàu điện ngầm. Ga B1 là MetroGram: mỗi ngày nhóm viết một hook theo brand guideline, cư dân mục tiêu sẽ like và share.', link: { href: '/metro/gram', label: 'Mở MetroGram' } },
};

function buildSteps(pathId) {
  const p = PATHS.find((x) => x.id === pathId) || PATHS[3];
  const steps = TOUR.map((s) => ({ ...s }));
  if (SPECIAL[p.hl]) steps.splice(2, 0, { ...SPECIAL[p.hl], mine: true });
  else {
    const i = steps.findIndex((s) => s.id === p.hl);
    if (i > -1) steps[i].mine = true;
  }
  return steps;
}

const visible = (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
};
function findTarget(step) {
  for (const k of step.t || []) {
    for (const el of document.querySelectorAll(`[data-tour="${k}"]`)) if (visible(el)) return { el, note: null };
  }
  if (step.district) {
    for (const [k, note] of [['more', 'Khu này nằm trong nút “More”.'], ['menu', 'Mở nút ☰ để thấy khu này.']]) {
      for (const el of document.querySelectorAll(`[data-tour="${k}"]`)) if (visible(el)) return { el, note };
    }
  }
  return null;
}

const QUESTS = [
  { id: 'hub', t: 'Ghé Knowledge Hub', href: '/knowledge-hub', test: (c) => c.path.startsWith('/knowledge-hub') || (c.p.concepts_explored || 0) > 0 },
  { id: 'cases', t: 'Mở 1 Case Study', href: '/students', test: (c) => ['/videos', '/students', '/images'].some((x) => c.path.startsWith(x)) || (c.p.cases_viewed || 0) > 0 },
  { id: 'heart', t: 'Ghé Discussion hoặc thả tim 1 bài', href: '/discussion', test: (c) => c.path.startsWith('/discussion') || ((c.p.hearts_given || 0) + (c.p.reactions_given || 0)) > 0 },
  { id: 'temple', t: 'Ghé Temple', href: '/temple', test: (c) => c.path.startsWith('/temple') },
  { id: 'return', t: 'Quay lại vào ngày mai', href: null, test: (c) => !!c.first && c.today !== c.first },
];

/* ------------------------------------------------------------------ Component */
export default function Onboarding() {
  const pathname = usePathname() || '/';
  const { progress } = useProgress();
  const [s, setS] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | intro | path | tour | quest | celebrate
  const [pick, setPick] = useState(null);
  const [steps, setSteps] = useState([]);
  const [tourI, setTourI] = useState(0);
  const [geo, setGeo] = useState(null);
  const [tick, setTick] = useState(0);
  const [wide, setWide] = useState(false);

  const lumiRef = useRef(null);
  const bubRef = useRef(null);
  const modalRef = useRef(null);
  const tipRef = useRef(null);
  const questRef = useRef(null);
  const canvasRef = useRef(null);
  const L = useRef(null);
  const offRef = useRef(false);
  const questIntro = useRef(false);
  const hideTimer = useRef(null);

  const update = useCallback((patch) => {
    setS((prev) => {
      const next = { stamps: [], first_day: todayKey(), ...(prev || {}), ...patch };
      saveOnb(next);
      return next;
    });
  }, []);

  const sleep = useCallback(() => {
    offRef.current = true;
    update({ lumi_off: true });
    L.current?.hide();
    toast('Lumi đi ngủ rồi 💤 — gọi lại ở trang My Journey', 'bedtime');
  }, [update]);
  const sleepRef = useRef(sleep);
  sleepRef.current = sleep;

  // Tạo bộ điều khiển Lumi một lần.
  useEffect(() => {
    L.current = createLumi(lumiRef.current, bubRef.current, { isOff: () => offRef.current, onSleep: () => sleepRef.current() });
    const onR = () => { setWide(window.innerWidth >= 1140); setTick((t) => t + 1); };
    onR();
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  // Đọc trạng thái + lắng nghe "bắt đầu" (từ cổng đăng ký hoặc nút xem lại).
  useEffect(() => {
    const boot = () => {
      const st = loadOnb();
      if (!st) return;
      offRef.current = !!st.lumi_off;
      if (st.status === 'touring') st.status = 'quest';
      setS(st);
      setPick(st.path || null);
      if (st.status === 'pending') setTimeout(() => setPhase('intro'), 900);
      else if (st.status === 'quest') setPhase('quest');
      else setPhase('idle');
    };
    boot();
    window.addEventListener('kw-onboarding', boot);
    return () => window.removeEventListener('kw-onboarding', boot);
  }, []);

  const skipAll = useCallback(() => {
    const lm = L.current;
    lm?.hideBubble();
    update({ status: 'quest', min: true, skipped: true });
    setPhase('quest');
    if (!offRef.current && lm) {
      lm.mood('wink');
      const el = lumiRef.current;
      if (el?.classList.contains('is-show')) {
        lm.say('Không sao! Khi nào cần, vào My Journey → “Xem lại hướng dẫn” nhé.', [], ['above', 'left']);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => lm.hide(), 2800);
      }
    }
  }, [update]);

  /* ---- Bước 0: Lumi nhảy ra chào ---- */
  useEffect(() => {
    if (phase !== 'intro') return undefined;
    const lm = L.current;
    if (offRef.current) { setPhase('path'); return undefined; }
    lm.mood('wow');
    lm.to(window.innerWidth / 2 - LW / 2, window.innerHeight - 270);
    const name = (() => {
      try { return (JSON.parse(localStorage.getItem('kw_visitor') || 'null')?.full_name || '').trim().split(/\s+/).slice(-1)[0]; } catch { return ''; }
    })();
    const t = setTimeout(() => {
      lm.mood('happy');
      lm.say(
        `Xin chào${name ? ` ${name}` : ''}! Mình là Lumi — chú đom đóm thắp đèn của Knoworld City. Cho mình dẫn bạn đi một vòng khoảng 2 phút nhé?`,
        [
          { label: 'Đi thôi!', primary: true, onClick: () => { lm.hideBubble(); setPhase('path'); } },
          { label: 'Bỏ qua hướng dẫn', onClick: skipAll },
        ],
        ['above'],
      );
    }, 750);
    return () => clearTimeout(t);
  }, [phase, skipAll]);

  /* ---- Bước 1: chọn lý do đến (Lumi đứng cạnh hộp nếu màn rộng) ---- */
  useEffect(() => {
    if ((phase !== 'path' && phase !== 'celebrate') || offRef.current) return undefined;
    const lm = L.current;
    if (!wide) { lm.hide(); return undefined; }
    const t = setTimeout(() => {
      const r = modalRef.current?.getBoundingClientRect();
      if (!r) return;
      lm.mood(phase === 'celebrate' ? 'big' : 'happy');
      lm.to(r.left - 100, r.bottom - 120);
      setTimeout(() => lm.say(
        phase === 'celebrate' ? 'Yayyy! Bạn là cư dân chính thức rồi! Mình tự hào về bạn lắm 🎉' : 'Chọn một hướng, mình sẽ dẫn bạn tới đúng khu cần đến.',
        [], ['aboveL', 'above'],
      ), 120);
    }, 80);
    return () => clearTimeout(t);
  }, [phase, wide]);

  const startTour = () => {
    if (!pick) return;
    update({ status: 'touring', path: pick });
    setSteps(buildSteps(pick));
    setTourI(0);
    L.current?.hideBubble();
    setPhase('tour');
  };

  const finishTour = useCallback(() => {
    questIntro.current = true;
    setGeo(null);
    update({ status: 'quest', min: false });
    setPhase('quest');
  }, [update]);

  /* ---- Bước 2: dạo phố — tính vị trí spotlight + thẻ ---- */
  useLayoutEffect(() => {
    if (phase !== 'tour') return;
    const st = steps[tourI];
    if (!st) { finishTour(); return; }
    const W = window.innerWidth;
    const H = window.innerHeight;
    const tw = Math.min(330, W - 32);
    const found = findTarget(st);
    if (found) {
      const r = found.el.getBoundingClientRect();
      const pad = 6;
      const left = clamp(r.left + r.width / 2 - tw / 2, 16, W - tw - 16);
      setGeo({
        spot: { left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 },
        tip: r.top < H / 2 ? { left, top: r.bottom + 16 } : { left, bottom: H - r.top + 16 },
        tw, note: found.note,
      });
    } else {
      setGeo({ spot: null, tip: { left: (W - tw) / 2, top: Math.max(90, H / 2 - 140) }, tw, note: null });
    }
  }, [phase, tourI, steps, tick, finishTour]);

  // Lumi nhảy tới cạnh thẻ hướng dẫn.
  useEffect(() => {
    if (phase !== 'tour' || !geo || offRef.current) return undefined;
    const t = setTimeout(() => {
      const r = tipRef.current?.getBoundingClientRect();
      if (!r) return;
      const lm = L.current;
      lm.hideBubble();
      lm.mood(['happy', 'wow', 'wink', 'big'][tourI % 4]);
      if (r.right + LW + 16 < window.innerWidth) lm.to(r.right + 10, r.bottom - LH);
      else if (r.left > LW + 16) lm.to(r.left - LW - 10, r.bottom - LH);
      else if (geo.tip.bottom != null) lm.to(r.right - LW - 8, r.top - LH - 6);
      else lm.to(r.right - LW - 8, r.bottom + 8);
    }, 60);
    return () => clearTimeout(t);
  }, [phase, geo, tourI]);

  /* ---- Bước 3: hộ chiếu tuần đầu ---- */
  const lumiNearQuest = useCallback(() => {
    const q = questRef.current?.getBoundingClientRect();
    if (!q || offRef.current) return false;
    if (window.innerWidth > 700) L.current.to(q.right + 12, q.top + 4);
    else L.current.to(q.right - LW - 8, q.top - LH - 8);
    return true;
  }, []);

  useEffect(() => {
    if (phase !== 'quest' || !questIntro.current) return undefined;
    questIntro.current = false;
    const t = setTimeout(() => {
      if (!lumiNearQuest()) return;
      const lm = L.current;
      lm.mood('big');
      setTimeout(() => lm.say(
        'Đây là hộ chiếu của bạn! Ghé đủ 5 nơi để đóng dấu — xong mình sẽ ăn mừng cùng bạn 🎉',
        [{ label: 'Để mình thử!', primary: true, onClick: () => { lm.hideBubble(); lm.mood('wink'); setTimeout(() => lm.hide(), 700); } }],
        ['right', 'aboveL', 'above'],
      ), 150);
    }, 500);
    return () => clearTimeout(t);
  }, [phase, lumiNearQuest]);

  // Tự đóng dấu khi người dùng thật sự ghé / tương tác.
  useEffect(() => {
    if (phase !== 'quest' || !s) return;
    const ctx = { path: pathname, p: progress || {}, today: todayKey(), first: s.first_day };
    const have = new Set(s.stamps || []);
    const fresh = QUESTS.filter((q) => { if (have.has(q.id)) return false; try { return q.test(ctx); } catch { return false; } });
    if (!fresh.length) return;
    const stamps = [...have, ...fresh.map((q) => q.id)];
    update({ stamps });
    toast(`Đóng dấu hộ chiếu: ${fresh[0].t}`, 'verified');
    if (stamps.length >= QUESTS.length) {
      setTimeout(() => { update({ status: 'done', done_at: new Date().toISOString() }); setPhase('celebrate'); }, 1200);
      return;
    }
    if (!offRef.current) {
      setTimeout(() => {
        if (!lumiNearQuest()) return;
        const lm = L.current;
        lm.mood('big');
        setTimeout(() => lm.say(`Cộp! Đóng dấu rồi ✨ Còn ${QUESTS.length - stamps.length} dấu nữa thôi.`, [], ['right', 'aboveL', 'above']), 120);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => lm.hide(), 2800);
      }, 400);
    }
  }, [phase, pathname, progress, s, update, lumiNearQuest]);

  /* ---- Ăn mừng: pháo hoa ---- */
  useEffect(() => {
    if (phase !== 'celebrate') return undefined;
    const cv = canvasRef.current;
    if (!cv) return undefined;
    const dpr = window.devicePixelRatio || 1;
    cv.width = window.innerWidth * dpr;
    cv.height = window.innerHeight * dpr;
    const cx = cv.getContext('2d');
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = ['#c6bfff', '#f6bd56', '#5ee0a0', '#ff9bd2', '#7ee8ff'];
    let parts = [];
    const timers = [];
    for (let b = 0; b < 6; b++) {
      timers.push(setTimeout(() => {
        const x = window.innerWidth * (0.15 + 0.7 * Math.random());
        const y = window.innerHeight * (0.12 + 0.3 * Math.random());
        for (let i = 0; i < 60; i++) {
          const a = Math.random() * 6.283;
          const sp = 1.5 + Math.random() * 4;
          parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 1, c: cols[i % cols.length] });
        }
      }, b * 300));
    }
    let raf;
    const loop = () => {
      cx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      parts = parts.filter((p) => p.l > 0);
      parts.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.vx *= 0.985; p.l -= 0.012;
        cx.globalAlpha = Math.max(p.l, 0);
        cx.fillStyle = p.c;
        cx.beginPath(); cx.arc(p.x, p.y, 2.2, 0, 6.283); cx.fill();
      });
      cx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    loop();
    const stop = setTimeout(() => cancelAnimationFrame(raf), 6000);
    return () => { timers.forEach(clearTimeout); clearTimeout(stop); cancelAnimationFrame(raf); };
  }, [phase]);

  const closeAll = () => { L.current?.hide(); setPhase('idle'); };
  const closeQuest = () => { update({ status: 'closed' }); closeAll(); };

  const onLumiClick = () => {
    const el = lumiRef.current;
    const m = el.dataset.mood;
    L.current.hop();
    L.current.mood('big');
    setTimeout(() => L.current.mood(m === 'big' ? 'happy' : m), 700);
  };

  const st = phase === 'tour' ? steps[tourI] : null;
  const myPath = PATHS.find((p) => p.id === (s?.path || pick));
  const stamps = new Set(s?.stamps || []);
  const nStamp = QUESTS.filter((q) => stamps.has(q.id)).length;
  const showInline = !wide && !offRef.current;

  return (
    <>
      {/* Lumi nổi + bong bóng thoại */}
      <div ref={lumiRef} className="kwo-lumi" data-mood="happy" title="Lumi" onClick={onLumiClick} aria-hidden="true">
        <div className="kwo-lb" dangerouslySetInnerHTML={{ __html: LUMI_SVG }} />
      </div>
      <div ref={bubRef} className="kwo-bubble" role="status" aria-live="polite" />

      {/* Bước 1: lý do đến */}
      {phase === 'path' && (
        <div className="kwo-scrim">
          <div ref={modalRef} className="kwo-modal" role="dialog" aria-modal="true" aria-label="Chào mừng đến Knoworld City">
            <button type="button" className="kwo-skip" onClick={skipAll}>Bỏ qua hướng dẫn</button>
            {showInline && <InlineLumi text="Chọn một hướng, mình sẽ dẫn bạn tới đúng khu cần đến." onSleep={sleep} />}
            <div className="kwo-kicker">Cư dân mới · Knoworld City</div>
            <h2>Bạn đến Knoworld để làm gì?</h2>
            <p className="kwo-lead">Chọn một hướng — chuyến dạo phố sẽ chỉ cho bạn khu phù hợp nhất. Không có bài kiểm tra nào cả, cứ thoải mái khám phá.</p>
            <div className="kwo-paths">
              {PATHS.map((p) => (
                <button key={p.id} type="button" className={`kwo-path ${pick === p.id ? 'is-on' : ''}`} onClick={() => setPick(p.id)} aria-pressed={pick === p.id}>
                  <span className="kwo-ic" style={{ background: `${p.c}22`, color: p.c }}><span className="material-symbols-outlined">{p.icon}</span></span>
                  <span><b>{p.t}</b><small>{p.s}</small></span>
                </button>
              ))}
            </div>
            <div className="kwo-actions">
              <button type="button" className="kwo-btn is-ghost" onClick={skipAll}>Để sau</button>
              <button type="button" className="kwo-btn is-primary" disabled={!pick} onClick={startTour}>
                Dạo một vòng thành phố <span className="material-symbols-outlined">tour</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bước 2: dạo phố */}
      {phase === 'tour' && st && geo && (
        <>
          <div className="kwo-block" />
          {geo.spot ? <div className="kwo-spot" style={geo.spot} /> : <div className="kwo-dim" />}
          <div ref={tipRef} className="kwo-tip" style={{ ...geo.tip, width: geo.tw }} role="dialog" aria-label={st.h}>
            <div className="kwo-guide">
              <span className="kwo-face" aria-hidden="true">{st.e}</span>
              <div><h3>{st.h}</h3><div className="kwo-cnt">{tourI + 1} / {steps.length}</div></div>
            </div>
            <p>{st.d}</p>
            {geo.note && <p className="kwo-note">{geo.note}</p>}
            {st.mine && myPath && (
              <div className="kwo-foryou"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>Dành cho bạn — vì bạn chọn “{myPath.t}”.</div>
            )}
            {st.link && <Link href={st.link.href} className="kwo-link" onClick={finishTour}>{st.link.label} →</Link>}
            <div className="kwo-tacts">
              <button type="button" className="kwo-btn is-ghost is-sm" onClick={skipAll}>Bỏ qua</button>
              <span className="kwo-row">
                {tourI > 0 && (
                  <button type="button" className="kwo-btn is-ghost is-sm" onClick={() => setTourI(tourI - 1)} aria-label="Quay lại">
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                )}
                <button type="button" className="kwo-btn is-primary is-sm" onClick={() => (tourI < steps.length - 1 ? setTourI(tourI + 1) : finishTour())}>
                  {tourI < steps.length - 1 ? 'Tiếp' : 'Xong, nhận hộ chiếu'}
                </button>
              </span>
            </div>
          </div>
        </>
      )}

      {/* Bước 3: hộ chiếu tuần đầu */}
      {phase === 'quest' && s && (
        <div ref={questRef} className={`kwo-quest ${s.min ? 'is-min' : ''}`} role="region" aria-label="Hộ chiếu cư dân">
          <div className="kwo-qhead">
            <button type="button" className="kwo-qtoggle" onClick={() => update({ min: !s.min })} aria-expanded={!s.min}>
              <Ring n={nStamp} t={QUESTS.length} />
              <span className="kwo-qtitle">
                <b>Hộ chiếu cư dân</b>
                <small>{nStamp === QUESTS.length ? 'Hoàn thành!' : 'Đóng đủ dấu để thành Cư dân chính thức'}</small>
              </span>
              <span className="material-symbols-outlined kwo-chev">{s.min ? 'expand_less' : 'expand_more'}</span>
            </button>
            <button type="button" className="kwo-qclose" onClick={closeQuest} aria-label="Ẩn hộ chiếu" title="Ẩn hộ chiếu">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          {!s.min && (
            <>
              <ul className="kwo-qlist">
                {QUESTS.map((q) => {
                  const done = stamps.has(q.id);
                  return (
                    <li key={q.id} className={done ? 'is-done' : ''}>
                      <span className="kwo-chk">{done && <span className="material-symbols-outlined">check</span>}</span>
                      <span className="kwo-qt">{q.t}</span>
                      {!done && q.href && <Link href={q.href} className="kwo-go">Đi →</Link>}
                    </li>
                  );
                })}
              </ul>
              <p className="kwo-qfoot">Không có điểm hay bài kiểm tra — chỉ cần ghé thăm. Dấu “ngày mai” tự đóng khi bạn quay lại.</p>
            </>
          )}
        </div>
      )}

      {/* Ăn mừng */}
      {phase === 'celebrate' && (
        <>
          <canvas ref={canvasRef} className="kwo-fx" />
          <div className="kwo-scrim">
            <div ref={modalRef} className="kwo-modal is-center" role="dialog" aria-modal="true" aria-label="Cư dân chính thức">
              {showInline && <InlineLumi mood="big" text="Yayyy! Bạn là cư dân chính thức rồi! 🎉" onSleep={sleep} />}
              <div className="kwo-badge"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span></div>
              <div className="kwo-kicker">Huy hiệu mới</div>
              <h2>Bạn là Cư dân chính thức!</h2>
              <p className="kwo-lead">Bạn đã đi qua những khu quan trọng nhất của thành phố. Còn rất nhiều ngóc ngách đang chờ — cứ tiếp tục đi dạo nhé.</p>
              <button type="button" className="kwo-btn is-primary" onClick={closeAll}>Khám phá tiếp</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Ring({ n, t }) {
  const R = 16;
  const C = 2 * Math.PI * R;
  return (
    <svg className="kwo-ring" viewBox="0 0 40 40" aria-hidden="true">
      <defs><linearGradient id="kwoRing"><stop offset="0" stopColor="#8d7fff" /><stop offset="1" stopColor="#5ee0a0" /></linearGradient></defs>
      <circle cx="20" cy="20" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="4" />
      <circle cx="20" cy="20" r={R} fill="none" stroke="url(#kwoRing)" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C * (1 - n / t)} transform="rotate(-90 20 20)" style={{ transition: 'stroke-dashoffset .6s' }} />
      <text x="20" y="24" textAnchor="middle" fontSize="11" fontWeight="700" fill="#e5e0ed" fontFamily="Space Grotesk">{n}/{t}</text>
    </svg>
  );
}

// Nút ở trang My Journey: xem lại hướng dẫn + gọi Lumi dậy.
export function OnboardingReplay() {
  return (
    <button type="button" onClick={replayOnboarding} className="kwo-replay">
      <span className="kwo-replay-fig" dangerouslySetInnerHTML={{ __html: LUMI_SVG }} />
      Xem lại hướng dẫn cùng Lumi
    </button>
  );
}
