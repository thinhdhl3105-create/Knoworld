// v62: Lumi cưỡi mây bay trên bầu trời — vẽ thẳng lên lớp trời 2D (nằm SAU thành phố 3D),
// nên toà nhà luôn che Lumi, Lumi không bao giờ che thành phố.
// Mây khối voxel cùng kiểu với mây của thành phố. Bay nhanh hơn mây thường, nhấp nhô, lâu lâu lộn một vòng,
// lắc lư, vẫy tay; có thể nói 1 câu trong bong bóng nhỏ (LumiPeek gửi qua window.__kwSkyLumi.fly(text)).
// Tự bay ngang mỗi 50–110 giây (tắt được bằng "Tắt Lumi tự ghé ngang").
import { lumiStaticSvg } from '../onboarding/lumiArt';

const BLOCKS = [
  { dx: -2.3, dy: -0.15, w: 1.9, h: 0.9, d: 1.0 },
  { dx: -0.9, dy: -0.75, w: 2.4, h: 1.1, d: 1.2 },
  { dx: 0.9, dy: -0.35, w: 2.1, h: 1.0, d: 1.1 },
  { dx: -1.4, dy: 0.25, w: 3.6, h: 0.8, d: 1.0 },
].sort((p, q) => q.dy - p.dy || p.dx - q.dx);

const LINES = ['Wiii~ ✨', 'Lumi bay ngang thôi nè 👋', 'Trên này gió mát ghê!', 'Chào cả thành phố! 🏙️', 'Bắt kịp Lumi hông? 💨'];

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

export function createSkyLumi({ THREE, isOff, reduce }) {
  const img = { happy: loadImg({ mood: 'happy' }), big: loadImg({ mood: 'big' }), blink: loadImg({ mood: 'happy', blink: true }) };
  const white = new THREE.Color('#ffffff');
  let fl = null; // chuyến bay hiện tại
  let nextAuto = 18 + Math.random() * 30; // giây (theo đồng hồ của thành phố)
  let now = 0;
  let queued = null;

  function start(text) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    fl = {
      t0: now, dur: 13 + Math.random() * 4, dir,
      y: 0.24 + Math.random() * 0.14, amp: 0.018 + Math.random() * 0.02, wav: 1.6 + Math.random() * 1.2,
      loopAt: Math.random() < 0.6 ? 0.25 + Math.random() * 0.45 : -1,
      text: text || (Math.random() < 0.5 ? LINES[(Math.random() * LINES.length) | 0] : ''),
      sayFrom: 0.3 + Math.random() * 0.12,
    };
  }

  // LumiPeek gọi: bay ngay nếu đang rảnh (trả về true nếu nhận).
  function fly(text) {
    if (fl) { if (!fl.text) fl.text = text; return true; }
    if (reduce) return false;
    start(text);
    nextAuto = now + 60 + Math.random() * 50;
    return true;
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

  // Vẽ sau lớp mây thường. e: môi trường (n = độ tối, rain, cloud color), t: giây, W/H: kích thước trời.
  function draw(c, e, t, W, H) {
    now = t;
    if (!fl) {
      if (reduce || isOff() || e.rain > 0.55) return;
      if (t >= nextAuto) { start(queued); queued = null; nextAuto = t + 50 + Math.random() * 60; } else return;
    }
    const p = (t - fl.t0) / fl.dur;
    if (p >= 1) { fl = null; return; }

    const unit = 22 * Math.min(1.3, Math.max(0.7, W / 1440));
    const u = unit * 0.95;
    // Đường bay: ngang qua cả bầu trời, nhấp nhô; lộn một vòng ở giữa đường (nếu có).
    const span = W + 340;
    let x = fl.dir > 0 ? -170 + span * p : W + 170 - span * p;
    let y = fl.y * H + Math.sin(p * Math.PI * 2 * fl.wav) * fl.amp * H;
    let rot = Math.cos(p * Math.PI * 2 * fl.wav) * 0.06 * fl.dir;
    if (fl.loopAt > 0) {
      const lp = (p - fl.loopAt) / 0.09;
      if (lp > 0 && lp < 1) {
        const a = lp * Math.PI * 2;
        x += Math.sin(a) * 46 * fl.dir;
        y -= (1 - Math.cos(a)) * 34;
        rot += a * fl.dir;
      }
    }

    // Màu mây theo trời (giống mây thành phố), Lumi hơi tối đi khi đêm xuống.
    const col = e.cloud;
    const top = col.clone().lerp(white, 0.35 * (1 - e.n)).getStyle(), front = col.getStyle(), side = col.clone().multiplyScalar(0.78).getStyle();
    const fade = Math.min(1, p * 12, (1 - p) * 12);

    c.save();
    c.globalAlpha = fade * (1 - 0.25 * e.rain);
    c.translate(x, y);
    c.rotate(rot);

    // Lumi (ngồi lọt trong mây)
    const lh = u * 3.3, lw = lh * (100 / 112);
    const blink = Math.sin(t * 1.7) > 0.985;
    const talking = fl.text && p > fl.sayFrom && p < fl.sayFrom + 0.3;
    const im = blink ? img.blink : talking ? img.big : img.happy;
    if (e.n > 0.4) { // ban đêm: ngôi sao trên đầu toả sáng
      const g = c.createRadialGradient(lw * 0.07, -lh * 0.98 - u * 0.6, 0, lw * 0.07, -lh * 0.98 - u * 0.6, lh * 0.5);
      g.addColorStop(0, `rgba(255,214,110,${0.55 * e.n})`); g.addColorStop(1, 'rgba(255,214,110,0)');
      c.fillStyle = g; c.fillRect(-lh, -lh * 1.6, lh * 2, lh * 1.4);
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
      c.fillStyle = front; c.fillRect(bx, by, w, h);
      c.fillStyle = top; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + ox, by - oy); c.lineTo(bx + w + ox, by - oy); c.lineTo(bx + w, by); c.closePath(); c.fill();
      c.fillStyle = side; c.beginPath(); c.moveTo(bx + w, by); c.lineTo(bx + w + ox, by - oy); c.lineTo(bx + w + ox, by + h - oy); c.lineTo(bx + w, by + h); c.closePath(); c.fill();
    }
    // Vệt mây nhỏ bay theo sau
    c.fillStyle = front;
    for (let i = 1; i <= 3; i++) {
      const s = u * (0.55 - i * 0.12);
      const tx = -fl.dir * (u * 2.6 + i * u * 0.9);
      const ty = u * 0.6 + Math.sin(t * 4 + i) * u * 0.15;
      c.globalAlpha = fade * (0.7 - i * 0.18);
      c.fillRect(tx - s / 2, ty - s / 2, s, s);
    }
    c.restore();

    if (talking) {
      const k = (p - fl.sayFrom) / 0.3;
      bubble(c, x, y - lh * 0.8 - u * 0.95, fl.text, fade * Math.min(1, k * 8, (1 - k) * 8));
    }
  }

  return { draw, fly, busy: () => !!fl };
}
