// v59: Lumi đi dạo trong Main City — đi trên vỉa hè quanh các khối nhà, qua đường ở vạch kẻ,
// tới góc phố thì hay "thập thò" (lùi vào, ngó ra), thỉnh thoảng đứng nhìn quanh.
// Nhà cao che khuất Lumi thật (sprite có depthTest), nên lúc thấy lúc không.
// Bấm vào Lumi -> nhảy lên + nói một câu. Ban đêm ngôi sao trên đầu toả sáng.
// Chỉ dùng Math.random (không đụng tới rand() có seed của thành phố).
import { lumiStaticSvg } from '../onboarding/lumiArt';

const POKE = [
  'Hihi, bị bắt gặp rồi! 🙈',
  'Lumi đang đi thắp đèn cho thành phố nè ✨',
  'Suỵt… Lumi đang trốn tìm với mấy chiếc xe buýt.',
  'Bấm vào toà nhà nào cũng vào được đó!',
  'Dưới chân mình có 2 tầng tàu điện ngầm đó, biết hông?',
  'Đi dạo với Lumi một vòng không? 🏙️',
  'Nhột quá! 😆',
  'Toà News có chữ chạy là tin thật của thành phố đó.',
];
const PEEK_EMO = ['👀', '🙈', '✨', '👋'];

export function createCityLumi({ THREE, scene, camera, root, M, Y0, glowTex, small }) {
  const H = small ? 3.6 : 3.1; // chiều cao Lumi (đơn vị thế giới; xe hơi ≈ 1.2)
  const W = H * (100 / 112);

  // ---------------- textures (8 biến thể: biểu cảm × nhìn trái/phải) ----------------
  const VARS = { happy: { mood: 'happy' }, blink: { mood: 'happy', blink: true }, wow: { mood: 'wow' }, big: { mood: 'big' } };
  const tex = {};
  let ready = false;
  const mkCanvas = () => { const c = document.createElement('canvas'); c.width = 200; c.height = 224; return c; };
  let pending = 0;
  for (const [k, v] of Object.entries(VARS)) {
    const img = new Image();
    pending += 1;
    img.onload = () => {
      for (const flip of [false, true]) {
        const c = mkCanvas(), x = c.getContext('2d');
        if (flip) { x.translate(200, 0); x.scale(-1, 1); }
        x.drawImage(img, 0, 0, 200, 224);
        const t = new THREE.CanvasTexture(c);
        t.anisotropy = 2;
        tex[k + (flip ? 'L' : 'R')] = t;
      }
      pending -= 1;
      if (!pending) { ready = true; setTex('happyR'); }
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(lumiStaticSvg(v));
  }

  const mat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.08, depthWrite: true });
  const sprite = new THREE.Sprite(mat);
  sprite.center.set(0.5, 0.03);
  sprite.scale.set(W, H, 1);
  sprite.renderOrder = 2;
  sprite.visible = false;
  scene.add(sprite);
  let curTex = '';
  function setTex(k) { if (k === curTex || !tex[k]) return; curTex = k; mat.map = tex[k]; mat.needsUpdate = true; }

  // Ánh sáng ngôi sao (ban đêm)
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffd66e', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(H * 1.5, H * 1.5, 1);
  scene.add(glow);
  const light = new THREE.PointLight('#ffd27a', 0, 9, 1.8);
  scene.add(light);

  // Bóng thoại (HTML trên khung 3D)
  const say = document.createElement('div');
  say.className = 'kwc-lumi-say';
  say.setAttribute('aria-live', 'polite');
  root.appendChild(say);
  let sayT = 0;

  // ---------------- lưới vỉa hè ----------------
  // Đường trong Main City nằm ở M.cx + r (r ∈ M.roads); vỉa hè cách tim đường ±2.55.
  // Thêm 2 đường viền mép đảo -> mọi nút đều là ngã tư, không có ngõ cụt.
  const edge = M.half - 1.25;
  const lines = (c) => {
    const v = [c - edge, c + edge];
    for (const r of M.roads) v.push(c + r - 2.55, c + r + 2.55);
    return v.sort((a, b) => a - b);
  };
  const LX = lines(M.cx); // các đường dọc (x cố định)
  const LZ = lines(M.cz); // các đường ngang (z cố định)
  const rnd = (a) => a[(Math.random() * a.length) | 0];

  // Trạng thái: đang đi trên đường axis ('x': chạy theo trục x, z cố định = fixed)
  const st = {
    axis: Math.random() < 0.5 ? 'x' : 'z', fixed: 0, s: 0, dir: Math.random() < 0.5 ? 1 : -1,
    mode: 'walk', // walk | peek | look | pause
    seq: [], wait: 0, target: null, face: 'R', lean: 0, hop: 0, blinkT: 2 + Math.random() * 3, blink: 0, mood: 'happy', moodT: 0,
  };
  st.fixed = st.axis === 'x' ? rnd(LZ) : rnd(LX);
  st.s = rnd(st.axis === 'x' ? LX : LZ);
  const nodes = () => (st.axis === 'x' ? LX : LZ);
  function nextNode() {
    const ns = nodes();
    if (st.dir > 0) { for (const n of ns) if (n > st.s + 0.01) return n; } else { for (let i = ns.length - 1; i >= 0; i--) if (ns[i] < st.s - 0.01) return ns[i]; }
    return null;
  }
  function pos(out) {
    if (st.axis === 'x') out.set(st.s, Y0, st.fixed); else out.set(st.fixed, Y0, st.s);
    return out;
  }

  // Tới một ngã tư: chọn hướng tiếp theo, có khi thập thò trước khi đi tiếp.
  function atNode() {
    const opts = [];
    const ns = nodes();
    const canFwd = st.dir > 0 ? st.s < ns[ns.length - 1] - 0.01 : st.s > ns[0] + 0.01;
    if (canFwd) opts.push('fwd', 'fwd');
    const other = st.axis === 'x' ? LZ : LX;
    const here = st.fixed; // vị trí trên trục kia
    if (here > other[0] + 0.01) opts.push('turnNeg');
    if (here < other[other.length - 1] - 0.01) opts.push('turnPos');
    if (!opts.length) opts.push('back');
    const r = Math.random();
    if (r < 0.32) {
      // thập thò: lùi vào 1.3, đợi, ngó ra, đợi… 1–2 lần
      const back = st.s - st.dir * 1.4, home = st.s, n = Math.random() < 0.5 ? 1 : 2;
      st.seq = [];
      for (let i = 0; i < n; i++) st.seq.push({ to: back, v: 3.2 }, { wait: 0.5 + Math.random() * 0.5 }, { to: home, v: 2.4, emo: i === n - 1 }, { wait: 0.7 + Math.random() * 0.6, lean: true });
      st.mode = 'peek';
    } else if (r < 0.42) {
      st.mode = 'look'; st.wait = 1.6 + Math.random() * 1.6;
    }
    const pickO = rnd(opts);
    st.after = pickO;
  }
  function applyChoice(c) {
    if (c === 'turnNeg' || c === 'turnPos') {
      const s = st.fixed;
      st.fixed = st.s; st.s = s;
      st.axis = st.axis === 'x' ? 'z' : 'x';
      st.dir = c === 'turnPos' ? 1 : -1;
    } else if (c === 'back') st.dir = -st.dir;
    st.target = nextNode();
  }
  st.target = nextNode();
  if (st.target == null) { st.dir = -st.dir; st.target = nextNode(); }

  // ---------------- điều khiển ----------------
  const P = new THREE.Vector3(), V = new THREE.Vector3(), R = new THREE.Vector3(), HEAD = new THREE.Vector3();
  let wasVisible = false;

  function speak(text, ms = 3600) {
    say.textContent = '';
    const b = document.createElement('b'); b.textContent = 'Lumi';
    say.append(b, ' ', text);
    say.classList.add('is-show');
    sayT = ms / 1000;
  }

  function poke() {
    st.hop = 1; st.mood = Math.random() < 0.5 ? 'big' : 'wow'; st.moodT = 1.6;
    if (st.mode === 'walk') { st.mode = 'pause'; st.wait = 2.2; }
    speak(rnd(POKE));
  }

  function moveToward(to, v, dt) {
    const d = to - st.s;
    const step = Math.sign(d) * Math.min(Math.abs(d), v * dt);
    st.s += step;
    return Math.abs(to - st.s) < 0.001;
  }

  function update(dt, t, N, visible) {
    const show = visible && ready;
    sprite.visible = show; glow.visible = show;
    light.intensity = show ? N * 1.1 : 0;
    if (!show) { if (wasVisible) say.classList.remove('is-show'); wasVisible = false; return; }
    wasVisible = true;

    let walking = false, dirSign = st.dir;
    if (st.mode === 'walk') {
      walking = true;
      if (st.target == null) { st.dir = -st.dir; st.target = nextNode(); }
      if (st.target != null && moveToward(st.target, 2.0, dt)) { atNode(); if (st.mode === 'walk') { applyChoice(st.after); } }
    } else if (st.mode === 'peek') {
      const cur = st.seq[0];
      if (!cur) { st.mode = 'walk'; applyChoice(st.after); }
      else if (cur.wait != null) {
        st.lean = cur.lean ? 1 : 0;
        cur.wait -= dt; if (cur.wait <= 0) st.seq.shift();
      } else {
        walking = true; st.lean = 0;
        dirSign = Math.sign(cur.to - st.s) || st.dir;
        if (moveToward(cur.to, cur.v, dt)) {
          if (cur.emo && Math.random() < 0.55 && sayT <= 0) speak(rnd(PEEK_EMO), 1400);
          st.seq.shift();
        }
      }
    } else if (st.mode === 'look' || st.mode === 'pause') {
      st.wait -= dt;
      if (st.mode === 'look') dirSign = Math.sin(t * 2.4) > 0 ? 1 : -1;
      if (st.wait <= 0) { const m = st.mode; st.mode = 'walk'; if (m === 'look') applyChoice(st.after); }
    }
    if (st.mode !== 'peek') st.lean = 0;

    // hướng nhìn theo màn hình
    if (st.axis === 'x') V.set(dirSign, 0, 0); else V.set(0, 0, dirSign);
    R.set(1, 0, 0).applyQuaternion(camera.quaternion);
    const faceR = V.dot(R) >= 0;

    // chớp mắt / biểu cảm
    st.blinkT -= dt;
    if (st.blinkT <= 0) { st.blink = 0.13; st.blinkT = 2.5 + Math.random() * 3.5; }
    if (st.blink > 0) st.blink -= dt;
    if (st.moodT > 0) { st.moodT -= dt; if (st.moodT <= 0) st.mood = 'happy'; }
    const base = st.mood !== 'happy' ? st.mood : st.blink > 0 ? 'blink' : 'happy';
    setTex(base + (faceR ? 'R' : 'L'));

    // vị trí + dáng
    pos(P);
    let y = 0;
    if (walking) y = Math.abs(Math.sin(t * 9)) * 0.22;
    if (st.hop > 0) { st.hop = Math.max(0, st.hop - dt * 1.6); y += Math.sin((1 - st.hop) * Math.PI) * 1.6; }
    sprite.position.set(P.x, P.y + y, P.z);
    const lean = st.lean ? (faceR ? -0.24 : 0.24) : 0;
    mat.rotation += ((walking ? Math.sin(t * 9) * 0.09 : lean) - mat.rotation) * Math.min(1, dt * 12);

    // ngôi sao toả sáng ban đêm
    HEAD.set(P.x, P.y + y + H * 0.93, P.z);
    glow.position.copy(HEAD);
    glow.material.opacity = 0.12 + N * 0.75 * (0.85 + Math.sin(t * 3.4) * 0.15);
    light.position.copy(HEAD);

    // bóng thoại bám theo đầu Lumi
    if (sayT > 0) {
      sayT -= dt;
      if (sayT <= 0) say.classList.remove('is-show');
      HEAD.project(camera);
      const w = root.clientWidth, h = root.clientHeight;
      const sx = (HEAD.x + 1) / 2 * w, sy = (1 - HEAD.y) / 2 * h;
      say.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy - 10)}px) translate(-50%, -100%)`;
    }
  }

  return {
    sprite,
    update,
    poke,
    dispose() {
      scene.remove(sprite, glow, light);
      mat.dispose(); glow.material.dispose();
      Object.values(tex).forEach((x) => x.dispose());
      say.remove();
    },
  };
}
