// v62–v63: Lumi cưỡi mây trên bầu trời — vẽ thẳng lên lớp trời 2D (nằm SAU thành phố 3D),
// nên toà nhà luôn che Lumi, Lumi không bao giờ che thành phố.
// v63: Lumi "bụp" hiện ra ở một chỗ trên trời, bay lượn ~5 giây rồi tự "bụp" biến mất.
//      Bấm vào Lumi -> "bụp!" ngay: mây vỡ thành các khối nhỏ + lấp lánh bay tung ra.
// Có thể nói 1 câu trong bong bóng nhỏ (LumiPeek gửi qua window.__kwSkyLumi.fly(text)).
// Tự xuất hiện mỗi 50–110 giây (tắt được bằng "Tắt Lumi tự ghé ngang").
import { lumiStaticSvg } from '../onboarding/lumiArt';

const LIFE = 5; // giây Lumi ở trên trời trước khi tự bụp
const POP_IN = 0.4;
const POOF = 0.28;

const BLOCKS = [
  { dx: -2.3, dy: -0.15, w: 1.9, h: 0.9, d: 1.0 },
  { dx: -0.9, dy: -0.75, w: 2.4, h: 1.1, d: 1.2 },
  { dx: 0.9, dy: -0.35, w: 2.1, h: 1.0, d: 1.1 },
  { dx: -1.4, dy: 0.25, w: 3.6, h: 0.8, d: 1.0 },
].sort((p, q) => q.dy - p.dy || p.dx - q.dx);

const LINES = ['Wiii~ ✨', 'Lumi bay ngang thôi nè 👋', 'Trên này gió mát ghê!', 'Chào cả thành phố! 🏙️', 'Bắt được Lumi hông? 💨'];

function loadImg(opts) {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(lumiStaticSvg(opts))}`;
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

function star(c, x, y, R, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r : R;
    c.lineTo(x + q * Math.cos(a), y + q * Math.sin(a));
  }
  c.closePath(); c.fill();
}

const easeBack = (k) => { const s = 1.9; return 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2; };

export function createSkyLumi({ THREE, isOff, reduce }) {
  const img = { happy: loadImg({ mood: 'happy' }), big: loadImg({ mood: 'big' }), wow: loadImg({ mood: 'wow' }), blink: loadImg({ mood: 'happy', blink: true }) };
  const white = new THREE.Color('#ffffff');
  let fl = null; // lần xuất hiện hiện tại
  let parts = []; // mảnh mây / lấp lánh khi bụp
  let boom = null; // chữ "bụp!" + vòng sáng
  let nextAuto = 18 + Math.random() * 30; // giây (theo đồng hồ của thành phố)
  let now = 0;
  let box = null; // vùng bấm trúng Lumi (toạ độ lớp trời, px CSS)

  function start(text, W, H) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    fl = {
      t0: now, dir, out: 0,
      x: W * (0.18 + Math.random() * 0.62), y: 0.24 + Math.random() * 0.14,
      speed: 34 + Math.random() * 22,
      amp: 0.012 + Math.random() * 0.012, wav: 0.9 + Math.random() * 0.5,
      loopAt: Math.random() < 0.55 ? 1.3 + Math.random() * 1.8 : -1,
      text: text || (Math.random() < 0.5 ? LINES[(Math.random() * LINES.length) | 0] : ''),
      poked: false,
    };
  }

  let lastW = 1280, lastH = 720;
  // LumiPeek gọi: xuất hiện ngay nếu đang rảnh (trả về true nếu nhận).
  function fly(text) {
    if (fl) { if (!fl.text && !fl.out) fl.text = text; return true; }
    if (reduce) return false;
    start(text, lastW, lastH);
    nextAuto = now + 60 + Math.random() * 50;
    return true;
  }

  // Bụp! (khi bấm vào hoặc hết 5 giây)
  function poof(byClick) {
    if (!fl || fl.out) return false;
    fl.out = now;
    fl.poked = !!byClick;
    return true;
  }
  function burst(x, y, u, cols, big) {
    const n = big ? 16 : 11;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const sp = (big ? 150 : 110) * (0.6 + Math.random() * 0.7);
      parts.push({ k: 'cube', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, s: u * (0.35 + Math.random() * 0.45), r: Math.random() * 6, vr: (Math.random() - 0.5) * 8, t0: now, life: 0.75 + Math.random() * 0.35, cols });
    }
    for (let i = 0; i < (big ? 9 : 6); i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 120;
      parts.push({ k: 'star', x, y: y - u, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, s: 4 + Math.random() * 5, r: 0, vr: (Math.random() - 0.5) * 6, t0: now, life: 0.6 + Math.random() * 0.4, col: Math.random() < 0.5 ? '#ffd66e' : '#c6bfff' });
    }
    boom = { x, y: y - u * 2.2, t0: now, big };
  }

  // Bấm trúng Lumi? (toạ độ trong lớp trời, px CSS)
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
    c.fillStyle = 'rgba(0,0,0,.18)';
    c.beginPath(); rr(c, bx + 2, by + 4, w, h, 12); c.fill();
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
      const x = p.x + p.vx * dt, y = p.y + p.vy * dt + 160 * dt * dt * (p.k === 'cube' ? 1 : 0.4);
      c.save();
      c.globalAlpha = (1 - k) * (1 - k * 0.3);
      c.translate(x, y); c.rotate(p.r + p.vr * dt);
      if (p.k === 'cube') {
        const s = p.s * (1 - k * 0.5), o = s * 0.4;
        c.fillStyle = p.cols.front; c.fillRect(-s / 2, -s / 2, s, s);
        c.fillStyle = p.cols.top; c.beginPath(); c.moveTo(-s / 2, -s / 2); c.lineTo(-s / 2 + o, -s / 2 - o * 0.6); c.lineTo(s / 2 + o, -s / 2 - o * 0.6); c.lineTo(s / 2, -s / 2); c.closePath(); c.fill();
        c.fillStyle = p.cols.side; c.beginPath(); c.moveTo(s / 2, -s / 2); c.lineTo(s / 2 + o, -s / 2 - o * 0.6); c.lineTo(s / 2 + o, s / 2 - o * 0.6); c.lineTo(s / 2, s / 2); c.closePath(); c.fill();
      } else {
        c.fillStyle = p.col; star(c, 0, 0, p.s, p.s * 0.42);
      }
      c.restore();
    }
    if (boom) {
      const k = (now - boom.t0) / 0.8;
      if (k >= 1) { boom = null; return; }
      c.save();
      // vòng sáng tỏa ra
      c.globalAlpha = (1 - k) * 0.7;
      c.strokeStyle = e.n > 0.5 ? '#ffe9a8' : '#ffffff';
      c.lineWidth = 3 * (1 - k) + 0.5;
      c.beginPath(); c.arc(boom.x, boom.y + 30, 12 + k * (boom.big ? 70 : 50), 0, Math.PI * 2); c.stroke();
      // chữ "bụp!"
      const sc = k < 0.2 ? easeBack(k / 0.2) : 1;
      c.globalAlpha = Math.min(1, (1 - k) * 2.2);
      c.translate(boom.x, boom.y - k * 26);
      c.scale(sc, sc);
      c.font = '800 20px "Space Grotesk", system-ui, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 5; c.strokeStyle = '#5844d9'; c.strokeText('bụp!', 0, 0);
      c.fillStyle = '#fff8e7'; c.fillText('bụp!', 0, 0);
      c.restore();
    }
  }

  // Vẽ sau lớp mây thường. e: môi trường (n = độ tối, rain, cloud color), t: giây, W/H: kích thước trời.
  function draw(c, e, t, W, H) {
    now = t; lastW = W; lastH = H;
    box = null;
    if (!fl && !reduce && !isOff() && e.rain <= 0.55 && t >= nextAuto) { start(null, W, H); nextAuto = t + 50 + Math.random() * 60; }

    const unit = 22 * Math.min(1.3, Math.max(0.7, W / 1440));
    const u = unit * 0.95;
    const col = e.cloud;
    const cols = { top: col.clone().lerp(white, 0.35 * (1 - e.n)).getStyle(), front: col.getStyle(), side: col.clone().multiplyScalar(0.78).getStyle() };

    if (fl) {
      const age = t - fl.t0;
      if (!fl.out && age >= LIFE) poof(false);
      // Vị trí: trôi ngang nhẹ, nhấp nhô; lâu lâu lộn một vòng.
      let x = fl.x + fl.dir * fl.speed * age;
      let y = fl.y * H + Math.sin(age * Math.PI * 2 * fl.wav * 0.5) * fl.amp * H;
      let rot = Math.cos(age * Math.PI * fl.wav) * 0.06 * fl.dir;
      if (fl.loopAt > 0 && !fl.out) {
        const lp = (age - fl.loopAt) / 0.8;
        if (lp > 0 && lp < 1) {
          const a = lp * Math.PI * 2;
          x += Math.sin(a) * 40 * fl.dir;
          y -= (1 - Math.cos(a)) * 30;
          rot += a * fl.dir;
        }
      }
      // Hiện ra: phồng lên từ 0 (nảy); bụp: phồng nhẹ rồi teo lại
      let sc = 1;
      if (age < POP_IN) sc = Math.max(0.01, easeBack(age / POP_IN));
      if (fl.out) {
        const k = (t - fl.out) / POOF;
        if (k >= 1) {
          burst(x, y, u, cols, fl.poked);
          fl = null;
        } else sc = k < 0.35 ? 1 + k * 0.5 : Math.max(0.01, (1 - k) / 0.65 * 1.17);
      }
      if (fl) {
        const lh = u * 3.3, lw = lh * (100 / 112);
        c.save();
        c.globalAlpha = 1 - 0.25 * e.rain;
        c.translate(x, y);
        c.rotate(rot);
        c.scale(sc, sc);

        const blink = Math.sin(t * 1.7) > 0.985;
        const talking = fl.text && !fl.out && age > 0.6 && age < LIFE - 0.3;
        const im = fl.out ? img.wow : blink ? img.blink : talking ? img.big : img.happy;
        if (e.n > 0.4) { // ban đêm: ngôi sao trên đầu toả sáng
          const g = c.createRadialGradient(lw * 0.07, -lh * 0.98 - u * 0.6, 0, lw * 0.07, -lh * 0.98 - u * 0.6, lh * 0.5);
          g.addColorStop(0, `rgba(255,214,110,${0.55 * e.n})`); g.addColorStop(1, 'rgba(255,214,110,0)');
          c.fillStyle = g; c.fillRect(-lh, -lh * 1.8, lh * 2, lh * 1.5);
        }
        if (im.complete && im.naturalWidth) {
          c.save();
          c.translate(0, -u * 0.95);
          c.rotate(Math.sin(t * 3.2) * 0.07);
          if (fl.dir < 0) c.scale(-1, 1);
          if (e.n > 0.5) c.filter = `brightness(${1 - 0.25 * e.n})`;
          c.drawImage(im, -lw / 2, -lh * 0.78, lw, lh);
          c.restore();
        }
        // Mây voxel phía trước chân Lumi
        for (const bk of BLOCKS) {
          const bx = (bk.dx + 0.2) * u, by = bk.dy * u + u * 0.45, w = bk.w * u, h = bk.h * u, ox = bk.d * u * 0.55, oy = bk.d * u * 0.32;
          c.fillStyle = cols.front; c.fillRect(bx, by, w, h);
          c.fillStyle = cols.top; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + ox, by - oy); c.lineTo(bx + w + ox, by - oy); c.lineTo(bx + w, by); c.closePath(); c.fill();
          c.fillStyle = cols.side; c.beginPath(); c.moveTo(bx + w, by); c.lineTo(bx + w + ox, by - oy); c.lineTo(bx + w + ox, by + h - oy); c.lineTo(bx + w, by + h); c.closePath(); c.fill();
        }
        // Vệt mây nhỏ bay theo sau
        c.fillStyle = cols.front;
        for (let i = 1; i <= 3; i++) {
          const s = u * (0.55 - i * 0.12);
          const tx = -fl.dir * (u * 2.6 + i * u * 0.9);
          const ty = u * 0.6 + Math.sin(t * 4 + i) * u * 0.15;
          c.globalAlpha = 0.7 - i * 0.18;
          c.fillRect(tx - s / 2, ty - s / 2, s, s);
        }
        c.restore();

        if (!fl.out) box = { x0: x - u * 2.6, x1: x + u * 2.8, y0: y - lh * 0.8 - u * 1.1, y1: y + u * 1.3 };
        if (talking) {
          const k = Math.min(1, (age - 0.6) * 5, (LIFE - 0.3 - age) * 5);
          bubble(c, x, y - lh * 0.8 - u * 0.95, fl.text, k);
        }
      }
    }
    drawParts(c, e);
  }

  return { draw, fly, hit, poof: () => poof(true), busy: () => !!fl };
}
