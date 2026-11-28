// v71: Lumi lái máy bay nhỏ bay NGANG bầu trời, luôn từ trái sang phải, cùng tầng với mây
// (vẽ trên lớp trời 2D nằm SAU thành phố 3D -> toà nhà luôn che, Lumi không bao giờ che thành phố).
// Nhẹ hơn bản cưỡi mây voxel (v62–v63): máy bay là 1 ảnh SVG vẽ sẵn, mỗi khung chỉ drawImage + cánh quạt.
// Bay qua hết màn hình trong ~6,5 giây rồi tự ra khỏi khung. Bấm vào -> "bụp!" biến mất.
// Có thể nói 1 câu trong bong bóng nhỏ (LumiPeek gửi qua window.__kwSkyLumi.fly(text)).
// Tự xuất hiện mỗi 50–110 giây (tắt được bằng "Tắt Lumi tự ghé ngang").
import { lumiStaticSvg } from '../onboarding/lumiArt';

const CROSS = 6.5; // giây bay hết bề ngang
const POOF = 0.28;

const LINES = ['Wiii~ ✈️', 'Lumi bay ngang thôi nè 👋', 'Trên này gió mát ghê!', 'Chào cả thành phố! 🏙️', 'Bắt được Lumi hông? 💨'];

// Máy bay nhìn ngang, mũi hướng sang phải. viewBox 200x110; buồng lái (Lumi ngồi) ở x≈113, mép trên thân y≈48.
const PLANE_SVG = `<svg viewBox="0 0 200 110" width="400" height="220" xmlns="http://www.w3.org/2000/svg">
<path d="M24 60 L12 24 Q12 18 19 20 L46 56 Z" fill="#ff7a8a"/>
<path d="M14 64 L48 61 L48 70 L16 71 Z" fill="#e0566b"/>
<path d="M24 56 Q60 48 120 48 Q166 48 180 62 Q172 81 120 83 Q60 83 26 71 Z" fill="#ff8f6b"/>
<path d="M30 63 Q90 61 177 65 L175 71 Q90 70 30 68.5 Z" fill="#fff4e0"/>
<path d="M92 50 Q112 45.5 134 50" stroke="#c94f3a" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M134 50 Q143 33 151 50 Z" fill="rgba(205,236,255,.8)" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
<path d="M176 55 Q192 63 176 73 Z" fill="#ffd27a"/>
<circle cx="189" cy="64" r="4" fill="#5844d9"/>
<path d="M84 72 L130 72 L113 101 Q107 107 98 105 Z" fill="#e0566b"/>
<path d="M60 58.5 L62.2 63.4 L67.5 63.9 L63.5 67.4 L64.7 72.6 L60 69.9 L55.3 72.6 L56.5 67.4 L52.5 63.9 L57.8 63.4 Z" fill="#ffd66e"/>
</svg>`;

function loadImg(svg) {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return img;
}

function rr(c, x, y, w, h, r) {
  if (c.roundRect) { c.roundRect(x, y, w, h, r); return; }
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

function wrapText(c, text, max) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (c.measureText(t).width > max && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

const easeBack = (k) => { const s = 1.9; return 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2; };

export function createSkyLumi({ isOff, reduce }) {
  const plane = loadImg(PLANE_SVG);
  const img = { happy: loadImg(lumiStaticSvg({ mood: 'happy' })), big: loadImg(lumiStaticSvg({ mood: 'big' })), wow: loadImg(lumiStaticSvg({ mood: 'wow' })), blink: loadImg(lumiStaticSvg({ mood: 'happy', blink: true })) };
  let fl = null; // chuyến bay hiện tại
  let parts = []; // khói / lấp lánh khi bụp
  let boom = null;
  let nextAuto = 18 + Math.random() * 30;
  let now = 0;
  let box = null; // vùng bấm trúng (px CSS trong lớp trời)
  let lastW = 1280, lastH = 720;

  function start(text) {
    fl = {
      t0: now, out: 0,
      y: 0.14 + Math.random() * 0.16,
      ph: Math.random() * 6,
      text: text || (Math.random() < 0.5 ? LINES[(Math.random() * LINES.length) | 0] : ''),
      poked: false,
    };
  }

  // LumiPeek gọi: xuất hiện ngay nếu đang rảnh (trả về true nếu nhận).
  function fly(text) {
    if (fl) { if (!fl.text && !fl.out) fl.text = text; return true; }
    if (reduce) return false;
    start(text);
    nextAuto = now + 60 + Math.random() * 50;
    return true;
  }

  function poof(byClick) {
    if (!fl || fl.out) return false;
    fl.out = now;
    fl.poked = !!byClick;
    return true;
  }

  function burst(x, y, s, puffCol) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.random() * 0.4, sp = 70 + Math.random() * 70;
      parts.push({ k: 'puff', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, s: s * (0.5 + Math.random() * 0.5), t0: now, life: 0.6 + Math.random() * 0.3, col: puffCol });
    }
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 100;
      parts.push({ k: 'dot', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, s: 2.5 + Math.random() * 2.5, t0: now, life: 0.5 + Math.random() * 0.3, col: Math.random() < 0.5 ? '#ffd66e' : '#c6bfff' });
    }
    boom = { x, y: y - s * 1.6, t0: now };
  }

  function hit(px, py) {
    if (!fl || fl.out || !box) return false;
    return px >= box.x0 && px <= box.x1 && py >= box.y0 && py <= box.y1;
  }

  function bubble(c, x, y, text, alpha) {
    c.save();
    c.globalAlpha = alpha;
    c.font = '600 13px system-ui, -apple-system, "Segoe UI", sans-serif';
    const lines = wrapText(c, text, 190);
    const w = Math.max(...lines.map((l) => c.measureText(l).width)) + 22;
    const h = lines.length * 18 + 14;
    const bx = x - w / 2, by = y - h - 10;
    c.fillStyle = '#fff8e7';
    c.beginPath(); rr(c, bx, by, w, h, 12); c.fill();
    c.beginPath(); c.moveTo(x - 7, by + h - 1); c.lineTo(x, by + h + 8); c.lineTo(x + 7, by + h - 1); c.closePath(); c.fill();
    c.fillStyle = '#2a2140';
    c.textBaseline = 'top';
    lines.forEach((l, i) => c.fillText(l, bx + 11, by + 8 + i * 18));
    c.restore();
  }

  function drawParts(c, e) {
    if (!parts.length && !boom) return;
    parts = parts.filter((p) => now - p.t0 < p.life);
    for (const p of parts) {
      const k = (now - p.t0) / p.life, dt = now - p.t0;
      c.globalAlpha = 1 - k;
      c.fillStyle = p.col;
      c.beginPath(); c.arc(p.x + p.vx * dt, p.y + p.vy * dt + 60 * dt * dt, p.s * (p.k === 'puff' ? 1 + k * 0.6 : 1), 0, 6.283); c.fill();
    }
    c.globalAlpha = 1;
    if (boom) {
      const k = (now - boom.t0) / 0.8;
      if (k >= 1) { boom = null; return; }
      const sc = k < 0.2 ? easeBack(k / 0.2) : 1;
      c.save();
      c.globalAlpha = Math.min(1, (1 - k) * 2.2);
      c.translate(boom.x, boom.y - k * 26);
      c.scale(sc, sc);
      c.font = '800 20px "Space Grotesk", system-ui, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 5; c.strokeStyle = '#5844d9'; c.strokeText('bụp!', 0, 0);
      c.fillStyle = e.n > 0.5 ? '#ffe9a8' : '#fff8e7'; c.fillText('bụp!', 0, 0);
      c.restore();
    }
  }

  // Vẽ sau lớp mây thường. e: môi trường (n = độ tối, rain, cloud), t: giây, W/H: kích thước trời.
  function draw(c, e, t, W, H) {
    now = t; lastW = W; lastH = H;
    box = null;
    if (!fl && !reduce && !isOff() && e.rain <= 0.55 && t >= nextAuto) { start(null); nextAuto = t + 50 + Math.random() * 60; }

    if (fl) {
      const pw = Math.round(170 * Math.min(1.2, Math.max(0.78, W / 1440)));
      const s = pw / 200, ph = 110 * s;
      const age = t - fl.t0;
      const k = age / CROSS;
      if (k >= 1 && !fl.out) { fl = null; drawParts(c, e); return; } // bay ra khỏi mép phải
      const x = -pw + (W + pw) * Math.min(k, 1);
      const y = H * fl.y + Math.sin(age * 2.1 + fl.ph) * 6 * s * 2;
      const rot = Math.cos(age * 2.1 + fl.ph) * 0.05;
      let sc = 1;
      if (fl.out) {
        const q = (t - fl.out) / POOF;
        if (q >= 1) { burst(x + pw * 0.55, y + ph * 0.5, 9 * s * 2, e.cloud.getStyle()); fl = null; drawParts(c, e); return; }
        sc = q < 0.35 ? 1 + q * 0.4 : Math.max(0.01, ((1 - q) / 0.65) * 1.14);
      }

      // vệt khói nhỏ phía sau đuôi
      c.fillStyle = e.cloud.getStyle();
      for (let i = 1; i <= 3; i++) {
        c.globalAlpha = (0.65 - i * 0.17) * (1 - 0.3 * e.rain);
        c.beginPath(); c.arc(x + 14 * s - i * 16 * s, y + 64 * s + Math.sin(t * 5 + i) * 3 * s, (11 - i * 2.2) * s, 0, 6.283); c.fill();
      }

      c.save();
      c.globalAlpha = 1 - 0.25 * e.rain;
      c.translate(x + pw / 2, y + ph / 2);
      c.rotate(rot);
      c.scale(sc * s, sc * s);
      c.translate(-100, -55);
      if (e.n > 0.5) c.filter = `brightness(${1 - 0.25 * e.n})`;
      // Lumi ngồi trong buồng lái (vẽ trước thân máy bay -> thân che nửa dưới)
      const blink = Math.sin(t * 1.7) > 0.985;
      const talking = fl.text && !fl.out && age > 0.5 && k < 0.85;
      const im = fl.out ? img.wow : blink ? img.blink : talking ? img.big : img.happy;
      if (im.complete && im.naturalWidth) c.drawImage(im, 113 - 27.5, -3 + Math.sin(t * 6) * 1.2, 55, 62);
      if (plane.complete && plane.naturalWidth) c.drawImage(plane, 0, 0, 200, 110);
      c.filter = 'none';
      // cánh quạt quay
      const pr = 4 + 20 * Math.abs(Math.sin(t * 38));
      c.fillStyle = 'rgba(60,50,95,.6)';
      c.beginPath(); c.ellipse(193, 64, 2.6, pr, 0, 0, 6.283); c.fill();
      // ban đêm: đèn đuôi nhấp nháy
      if (e.n > 0.4 && Math.sin(t * 5) > 0) {
        c.fillStyle = '#ff5a6a'; c.globalAlpha = e.n;
        c.beginPath(); c.arc(15, 22, 3.5, 0, 6.283); c.fill();
      }
      c.restore();

      if (!fl.out) box = { x0: x, x1: x + pw, y0: y - ph * 0.1, y1: y + ph };
      if (talking) {
        const a = Math.min(1, (age - 0.5) * 5, (0.85 - k) * CROSS * 5);
        bubble(c, Math.min(W - 110, Math.max(110, x + 113 * s)), y - 2 * s, fl.text, a);
      }
    }
    drawParts(c, e);
  }

  return { draw, fly, hit, poof: () => poof(true), busy: () => !!fl };
}
