// Knoworld City — isometric 3D home scene (three.js r128).
// createCity(root, opts) builds the scene inside `root` and returns { destroy, setNews }.
// opts: { mode: 'hero' | 'backdrop', isAdmin, news: string[], onNavigate(route) }
import * as THREE_NS from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { cityTemplate } from './template';

const THREE = { ...THREE_NS, OrbitControls };

export function createCity(root, opts = {}) {
  const backdrop = opts.mode === 'backdrop';
  const HAS_ADMIN = !!opts.isAdmin;
  root.innerHTML = cityTemplate(HAS_ADMIN);
  const $ = (id) => root.querySelector(`[data-id="${id}"]`);
  const cleanups = [];
  let gl;
  try { const c = document.createElement('canvas'); gl = c.getContext('webgl2') || c.getContext('webgl'); } catch (e) {}
  if (!gl) { $('fail').hidden = false; return { destroy: () => { root.innerHTML = ''; }, setNews: () => {} }; }

  const RW = () => root.clientWidth || window.innerWidth;
  const RH = () => root.clientHeight || window.innerHeight;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;

  let seed = 20261110;
  const rand = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = (a) => a[(rand() * a.length) | 0];

  // ================= renderer / camera =================
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $('stage').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 600);
  const CAM_DIR = new THREE.Vector3(54, 38, 22).normalize().multiplyScalar(90);
  const HOME_T = HAS_ADMIN ? new THREE.Vector3(20, 0, 20) : new THREE.Vector3(24, 0, 6);
  camera.position.copy(HOME_T).add(CAM_DIR);
  let vBase = 100, aspect = 1;
  function fit() {
    aspect = RW() / RH();
    vBase = Math.max(100, 170 / aspect);
    camera.left = -vBase * aspect / 2; camera.right = vBase * aspect / 2; camera.top = vBase / 2; camera.bottom = -vBase / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(RW(), RH());
    sizeSky();
  }
  // zoom needed so that a footprint of `size` world units fills the view
  const zoomFor = (size) => Math.min(vBase * aspect / (size * 1.25), vBase / (size * 0.9));

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.copy(HOME_T);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = false; controls.minZoom = 0.8; controls.maxZoom = 9;
  controls.minPolarAngle = 0.55; controls.maxPolarAngle = 1.15;

  // ================= lights =================
  const hemi = new THREE.HemisphereLight('#dbeeff', '#6b6660', 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4e0', 1.2);
  sun.castShadow = true; sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -78, right: 78, top: 78, bottom: -78, near: 1, far: 260 });
  sun.shadow.bias = -0.0008;
  sun.target.position.copy(HOME_T);
  scene.add(sun, sun.target);
  const moon = new THREE.DirectionalLight('#8fa6ff', 0); moon.position.set(-30, 60, -20); scene.add(moon);

  // ================= helpers =================
  const boxG = new THREE.BoxGeometry(1, 1, 1);
  const planeG = new THREE.PlaneGeometry(1, 1);
  const mats = {};
  const mat = (c) => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));
  function box(x, y, z, w, h, d, c, parent, opt) {
    const m = new THREE.Mesh(boxG, typeof c === 'string' ? mat(c) : c);
    m.scale.set(w, h, d); m.position.set(x, y + h / 2, z);
    if (!opt || opt.shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
    (parent || scene).add(m); return m;
  }
  function cyl(x, y, z, r, h, c, parent, seg, r2) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r2 == null ? r : r2, r, h, seg || 10), typeof c === 'string' ? mat(c) : c);
    m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; (parent || scene).add(m); return m;
  }
  const neons = [];
  function neonMat(night, day, extra) {
    const m = new THREE.MeshBasicMaterial(Object.assign({ color: night }, extra || {}));
    neons.push({ m, night: new THREE.Color(night), day: new THREE.Color(day || '#5f5a69') });
    return m;
  }
  const neonBox = (x, y, z, w, h, d, night, parent, day) => box(x, y, z, w, h, d, neonMat(night, day), parent, { shadow: false });

  function canvasTex(cw, ch, draw) {
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    draw(c.getContext('2d'), cw, ch);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  function fitText(x, text, maxW, size, weight) {
    let s = size; const set = () => { x.font = `${weight || 700} ${s}px "Space Grotesk", ui-sans-serif, sans-serif`; };
    set(); while (x.measureText(text).width > maxW && s > 12) { s -= 2; set(); } return s;
  }
  function textTex(text, w, h, fg, bg, border) {
    const cw = 1024, ch = Math.max(96, Math.round(1024 * h / w));
    return canvasTex(cw, ch, (x) => {
      x.fillStyle = bg; x.fillRect(0, 0, cw, ch);
      if (border) { x.strokeStyle = border; const lw = Math.max(6, ch * 0.06); x.lineWidth = lw; x.strokeRect(lw, lw, cw - 2 * lw, ch - 2 * lw); }
      const s = fitText(x, text, cw * 0.88, Math.round(ch * 0.52));
      x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, cw / 2, ch / 2 + s * 0.04);
    });
  }
  function sign(text, x, y, z, w, h, face, parent, o) {
    o = o || {};
    const m = new THREE.Mesh(planeG, new THREE.MeshBasicMaterial({ map: textTex(text, w, h, o.fg || '#ffe3a3', o.bg || '#15121c', o.border) }));
    neons.push({ m: m.material, night: new THREE.Color('#ffffff'), day: new THREE.Color(o.day || '#d6d1c8') });
    m.scale.set(w, h, 1); m.position.set(x, y, z);
    if (face === 'x') m.rotation.y = Math.PI / 2;
    (parent || scene).add(m); return m;
  }
  const glowTex = canvasTex(128, 128, (x) => {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  });
  const glowMat = (c) => new THREE.MeshBasicMaterial({ map: glowTex, color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const lampGlow = glowMat('#ffbf6b'), beamGlow = glowMat('#fff1c8'), bridgeGlow = glowMat('#7ee8ff');
  function decal(x, y, z, w, d, m, parent) {
    const p = new THREE.Mesh(planeG, m); p.rotation.x = -Math.PI / 2;
    p.scale.set(w, d, 1); p.position.set(x, y, z); (parent || scene).add(p); return p;
  }
  const Y0 = 0.2;
  function tree(x, z, parent, y) {
    y = y == null ? Y0 : y;
    cyl(x, y, z, 0.12, 0.8, '#5b4636', parent, 6);
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 0), mat(pick(['#3f6b4a', '#4f7d4f', '#356049'])));
    c.position.set(x, y + 1.4, z); c.castShadow = true; (parent || scene).add(c);
  }

  // ================= windows (one instanced mesh) =================
  const WIN_MAX = 16000;
  const winMesh = new THREE.InstancedMesh(boxG, new THREE.MeshBasicMaterial(), WIN_MAX);
  winMesh.count = 0; scene.add(winMesh);
  const winLit = [], winCol = [];
  const PAL = { warm: ['#ffd27a', '#ffc76b', '#ffe4a8', '#ffd27a'], cool: ['#9be7ff', '#c9a7ff', '#ffd27a', '#e8f6ff'], neon: ['#c9a7ff', '#9be7ff', '#ff9bd2'] };
  const dummy = new THREE.Object3D();
  function addWin(x, y, z, sx, sy, sz, pal, p) {
    if (winMesh.count >= WIN_MAX) return;
    dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
    const i = winMesh.count++; winMesh.setMatrixAt(i, dummy.matrix);
    winCol[i] = new THREE.Color(pick(PAL[pal] || PAL.warm)); winLit[i] = rand() < p;
  }
  function windows(x, y0, z, w, h, d, o) {
    o = o || {};
    const pal = o.pal || 'warm', p = o.p == null ? 0.55 : o.p, step = o.step || 1.0;
    const cols = (len) => Math.max(1, Math.floor((len - 0.4) / 0.85));
    for (let fy = y0 + (o.bottom || 0.75); fy + 0.25 < y0 + h - 0.3; fy += step) {
      let n = cols(w), sp = w / n;
      for (let i = 0; i < n; i++) { const xx = x - w / 2 + sp * (i + 0.5);
        addWin(xx, fy, z + d / 2 + 0.03, 0.42, 0.5, 0.06, pal, p); addWin(xx, fy, z - d / 2 - 0.03, 0.42, 0.5, 0.06, pal, p); }
      n = cols(d); sp = d / n;
      for (let i = 0; i < n; i++) { const zz = z - d / 2 + sp * (i + 0.5);
        addWin(x + w / 2 + 0.03, fy, zz, 0.06, 0.5, 0.42, pal, p); addWin(x - w / 2 - 0.03, fy, zz, 0.06, 0.5, 0.42, pal, p); }
    }
  }

  // ================= islands =================
  const SP = 15; // block pitch
  const ISL_ALL = [
    { id: 'main', name: 'Main City', cx: 0, cz: 0, n: 4, walk: '#5a5860', color: '#c6bfff', size: 64,
      desc: 'Open to everyone: Knowledge Hub, Research Archive, case studies, News and Discussion.' },
    { id: 'admin', name: 'Admin City', cx: 0, cz: 57, n: 2, walk: '#4e5866', color: '#7ee8ff', size: 40, lock: true,
      desc: 'The admin district, linked to Main City by the cable-stayed bridge. Only visible to the admin account.' },
    { id: 'profile', name: 'Profile City', cx: 57, cz: 0, n: 2, walk: '#625a5c', color: '#ff9bd2', size: 40,
      desc: 'Your own district: the Profile house, the Upload studio and the My Journey tower, linked to Main City by the arch bridge.' },
    // v31: Game Island — đảo trò chơi công khai (đua thuyền, bốc thương hiệu). Nối Profile City bằng phà.
    { id: 'games', name: 'Game Island', cx: 57, cz: 57, n: 1, walk: '#4f4a6a', color: '#5ee0a0', size: 24,
      desc: 'The island of class games: the Harbour Cup boat race and the Billboard Draw. Reached by ferry from Profile City.' },
    // v30: đảo riêng của admin — lịch dạy, lịch họp, ngày quan trọng. Nối Profile City bằng phà.
    { id: 'island', name: "Thinh's Island", cx: 40, cz: 40, n: 1, walk: '#4f6a52', color: '#ffd27a', size: 24, lock: true,
      desc: 'Your private island, reached by ferry from Profile City: the Lecture Hall, the Lighthouse and your home. Only visible to the admin account.' },
  ];
  const ISL = ISL_ALL.filter((I) => !I.lock || HAS_ADMIN);
  for (const I of ISL) {
    I.off = Array.from({ length: I.n }, (_, i) => (i - (I.n - 1) / 2) * SP);
    I.roads = I.off.slice(1).map((o, i) => (o + I.off[i]) / 2);
    I.half = (I.n - 1) * SP / 2 + 6.5;
    const W = I.half * 2;
    box(I.cx, -3.2, I.cz, W, 3.2, W, '#34333b');
    box(I.cx, -3.6, I.cz, W + 1.4, 2.5, W + 1.4, '#25242b');
    for (const ox of I.off) for (const oz of I.off) box(I.cx + ox, 0, I.cz + oz, 11, Y0, 11, I.walk);
  }

  // ================= roads, lanes, markings =================
  const ROADS = [];
  const M = ISL.find((I) => I.id === 'main'), A = ISL.find((I) => I.id === 'admin'), P = ISL.find((I) => I.id === 'profile');
  for (const r of M.roads) {
    ROADS.push({ axis: 'x', fixed: M.cz + r, a: -M.half, b: r === 0 ? P.cx + P.half : M.half });
    ROADS.push({ axis: 'z', fixed: M.cx + r, a: -M.half, b: r === 0 && A ? A.cz + A.half : M.half });
  }
  if (A) ROADS.push({ axis: 'x', fixed: A.cz, a: A.cx - A.half, b: A.cx + A.half });
  ROADS.push({ axis: 'z', fixed: P.cx, a: P.cz - P.half, b: P.cz + P.half });
  const crossings = [];
  for (const I of ISL) for (const rx of I.roads) for (const rz of I.roads) crossings.push([I.cx + rx, I.cz + rz]);
  const nearCross = (x, z) => crossings.some(([cx, cz]) => Math.abs(cx - x) < 2.7 && Math.abs(cz - z) < 2.7);
  const onLand = (x, z) => ISL.some((I) => Math.abs(x - I.cx) < I.half - 0.5 && Math.abs(z - I.cz) < I.half - 0.5);

  for (const R of ROADS) {
    for (let t = R.a + 1; t <= R.b - 1; t += 1.6) {
      const x = R.axis === 'x' ? t : R.fixed, z = R.axis === 'x' ? R.fixed : t;
      if (nearCross(x, z)) continue;
      box(x, 0, z, R.axis === 'x' ? 0.8 : 0.12, 0.025, R.axis === 'x' ? 0.12 : 0.8, '#d8d4c4', null, { shadow: false });
    }
  }
  for (const [ix, iz] of crossings) {
    for (let k = -1.6; k <= 1.61; k += 0.8) for (const s of [-1, 1]) {
      box(ix + s * 2.75, 0, iz + k, 0.9, 0.025, 0.42, '#e6e3d6', null, { shadow: false });
      box(ix + k, 0, iz + s * 2.75, 0.42, 0.025, 0.9, '#e6e3d6', null, { shadow: false });
    }
  }

  // ================= bridges =================
  const cableMat = new THREE.LineBasicMaterial({ color: '#cfd8e0' });
  neons.push({ m: cableMat, night: new THREE.Color('#7ee8ff'), day: new THREE.Color('#cfd6de') });
  function bridgeDeck(x0, z0, x1, z1) {
    const alongX = z0 === z1, len = Math.abs(alongX ? x1 - x0 : z1 - z0) + 2;
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    box(mx, -0.7, mz, alongX ? len : 5.4, 0.7, alongX ? 5.4 : len, '#3a3942');
    for (const s of [-1, 1]) {
      box(mx + (alongX ? 0 : s * 2.65), 0, mz + (alongX ? s * 2.65 : 0), alongX ? len : 0.14, 0.55, alongX ? 0.14 : len, '#8b8794');
      neonBox(mx + (alongX ? 0 : s * 2.72), -0.62, mz + (alongX ? s * 2.72 : 0), alongX ? len : 0.06, 0.08, alongX ? 0.06 : len, '#7ee8ff', null, '#4a5560');
    }
    for (const f of [0.3, 0.7]) cyl(x0 + (x1 - x0) * f, -3.4, z0 + (z1 - z0) * f, 0.6, 2.8, '#2f2e35', null, 10);
    decal(mx, -1.3, mz, alongX ? len : 9, alongX ? 9 : len, bridgeGlow);
    return { mx, mz, len, alongX };
  }
  if (A) { // cable-stayed bridge: main -> admin
    const b = bridgeDeck(0, M.half, 0, A.cz - A.half);
    const pos = [];
    for (const s of [-1, 1]) {
      box(s * 3.1, -0.7, b.mz, 0.5, 11, 0.5, '#d9d6de');
      neonBox(s * 3.1, 10.3, b.mz, 0.55, 0.25, 0.55, '#ff4a5a', null, '#7a3a40');
      for (let k = 1; k <= 5; k++) for (const d of [-1, 1]) pos.push(s * 3.1, 9.8 - k * 0.5, b.mz, s * 2.65, 0.4, b.mz + d * k * 1.25);
    }
    box(0, 9.6, b.mz, 6.7, 0.4, 0.5, '#d9d6de');
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    scene.add(new THREE.LineSegments(g, cableMat));
  }
  { // arch bridge: main -> profile
    const b = bridgeDeck(M.half, 0, P.cx - P.half, 0);
    const archMat = neonMat('#ff9bd2', '#b9b4c2');
    const pos = [], R2 = (b.len - 2) / 2;
    for (const s of [-1, 1]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(R2, 0.22, 8, 40, Math.PI), archMat);
      arch.position.set(b.mx, 0, s * 2.75); arch.scale.y = 0.6; scene.add(arch);
      for (let k = -4; k <= 4; k++) { const x = b.mx + k * (R2 / 5); const yy = Math.sqrt(Math.max(0, R2 * R2 - (x - b.mx) ** 2)) * 0.6; pos.push(x, 0.4, s * 2.75, x, yy, s * 2.75); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    scene.add(new THREE.LineSegments(g, cableMat));
  }

  // ================= water =================
  const SEA = 112, SEA_C = 21;
  const waterGeo = new THREE.PlaneGeometry(SEA, SEA, small ? 36 : 56, small ? 36 : 56);
  waterGeo.rotateX(-Math.PI / 2);
  const waterBase = waterGeo.attributes.position.array.slice();
  const waterMat = new THREE.MeshPhongMaterial({ color: '#256c94', flatShading: true, shininess: 24, specular: '#2f4658', transparent: true, opacity: 0.95 });
  const water = new THREE.Mesh(waterGeo, waterMat); water.position.set(SEA_C, -1.4, SEA_C); water.receiveShadow = true; scene.add(water);
  const seaBedMat = new THREE.MeshLambertMaterial({ color: '#173a55' });
  box(SEA_C, -9, SEA_C, SEA, 6.4, SEA, seaBedMat, null, { shadow: false });
  box(SEA_C, -9.8, SEA_C, SEA + 1.6, 1.2, SEA + 1.6, '#1f1c2a', null, { shadow: false });

  // ================= biomes: the land around the islands =================
  const BIOMES = { sea: 'Biển', desert: 'Sa mạc', rocky: 'Núi đá', forest: 'Rừng' };
  const BED = { desert: new THREE.Color('#9c7444'), rocky: new THREE.Color('#5a524b'), forest: new THREE.Color('#5a4330') };
  const bio = {};
  for (const k in BIOMES) { bio[k] = { g: new THREE.Group(), walkers: [], flocks: [], fish: [], h: () => 0 }; scene.add(bio[k].g); }
  scene.remove(water); bio.sea.g.add(water);
  const G0 = -1.4, HALF = SEA / 2 - 2.5;
  const LOOPS = [{ cx: 57, cz: 57, rx: 14, rz: 12 }, // v31: vòng quanh Game Island
   { cx: 28, cz: 58, rx: 8, rz: 8 }, { cx: 58, cz: 28, rx: 9, rz: 7 }];
  function blocked(x, z, pad) {
    if (Math.abs(x - SEA_C) > HALF || Math.abs(z - SEA_C) > HALF) return true;
    for (const I of ISL) if (Math.abs(x - I.cx) < I.half + pad && Math.abs(z - I.cz) < I.half + pad) return true;
    if (Math.abs(x) < 3 + pad && z > 27 && z < 45) return true;
    if (Math.abs(z) < 3 + pad && x > 27 && x < 45) return true;
    return false;
  }
  const nearLoop = (x, z, pad) => LOOPS.some((L) => Math.abs(Math.hypot((x - L.cx) / L.rx, (z - L.cz) / L.rz) - 1) * Math.min(L.rx, L.rz) < pad);
  function scatter(n, pad, loopPad, cb) {
    let made = 0, tries = 0;
    while (made < n && tries < n * 60) {
      tries++;
      const x = SEA_C + (rand() * 2 - 1) * HALF, z = SEA_C + (rand() * 2 - 1) * HALF;
      if (blocked(x, z, pad) || (loopPad && nearLoop(x, z, loopPad))) continue;
      cb(x, z, made++);
    }
  }
  function ground(k, color, hFn, seg) {
    const geo = new THREE.PlaneGeometry(SEA, SEA, seg, seg); geo.rotateX(-Math.PI / 2);
    const a = geo.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) a[i + 1] = hFn(a[i] + SEA_C, a[i + 2] + SEA_C);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color, flatShading: true, shininess: 0, specular: '#000000' }));
    m.position.set(SEA_C, G0, SEA_C); m.receiveShadow = true; bio[k].g.add(m); bio[k].h = hFn;
  }
  const gy = (k, x, z) => G0 + bio[k].h(x, z);

  // ---- small voxel models (all face +x, feet at y = 0) ----
  function legsOn(g, pts, hip, len, color, w) {
    const legs = [];
    for (const [lx, lz] of pts) { const p = new THREE.Group(); p.position.set(lx, hip, lz); box(0, -len, 0, w || 0.14, len, w || 0.14, color, p); g.add(p); legs.push(p); }
    g.userData.legs = legs;
  }
  function camel() {
    const g = new THREE.Group(), c = '#c8955a';
    box(0, 1.1, 0, 1.6, 0.65, 0.62, c, g); box(-0.25, 1.75, 0, 0.6, 0.42, 0.5, c, g); box(0.4, 1.7, 0, 0.42, 0.3, 0.45, c, g);
    const neck = box(1.0, 1.25, 0, 0.3, 0.95, 0.3, c, g); neck.rotation.z = -0.45;
    box(1.38, 2.0, 0, 0.6, 0.3, 0.32, c, g);
    box(-0.4, 1.55, 0, 0.9, 0.12, 0.66, '#b0413e', g);
    legsOn(g, [[0.6, 0.2], [0.6, -0.2], [-0.6, 0.2], [-0.6, -0.2]], 1.1, 1.1, '#a87843');
    return g;
  }
  function deer() {
    const g = new THREE.Group(), c = '#9a6438';
    box(0, 0.9, 0, 1.25, 0.5, 0.45, c, g);
    const neck = box(0.55, 1.15, 0, 0.22, 0.6, 0.22, c, g); neck.rotation.z = -0.3;
    box(0.82, 1.62, 0, 0.45, 0.26, 0.26, c, g);
    box(-0.66, 1.15, 0, 0.12, 0.2, 0.18, '#f1e6d6', g);
    for (const s of [-1, 1]) { box(0.72, 1.86, s * 0.12, 0.05, 0.42, 0.05, '#e8dcc0', g); box(0.62, 2.05, s * 0.2, 0.25, 0.05, 0.05, '#e8dcc0', g); }
    legsOn(g, [[0.45, 0.15], [0.45, -0.15], [-0.45, 0.15], [-0.45, -0.15]], 0.9, 0.9, '#7a4c2a', 0.1);
    return g;
  }
  function fox() {
    const g = new THREE.Group(), c = '#e07a2e';
    box(0, 0.42, 0, 0.8, 0.3, 0.3, c, g); box(0.5, 0.52, 0, 0.32, 0.26, 0.26, c, g); box(0.7, 0.55, 0, 0.14, 0.12, 0.14, '#2a2020', g);
    for (const s of [-1, 1]) box(0.46, 0.78, s * 0.08, 0.06, 0.12, 0.06, c, g);
    box(-0.62, 0.5, 0, 0.6, 0.18, 0.18, c, g); box(-0.98, 0.5, 0, 0.18, 0.16, 0.16, '#f6efe6', g);
    legsOn(g, [[0.28, 0.1], [0.28, -0.1], [-0.28, 0.1], [-0.28, -0.1]], 0.42, 0.42, '#3a2a22', 0.08);
    return g;
  }
  function goat() {
    const g = new THREE.Group(), c = '#e9e4da';
    box(0, 0.7, 0, 0.95, 0.42, 0.38, c, g); box(0.55, 0.95, 0, 0.32, 0.28, 0.26, c, g);
    for (const s of [-1, 1]) { const h = box(0.5, 1.2, s * 0.09, 0.06, 0.28, 0.06, '#6b5f55', g); h.rotation.z = 0.5; }
    legsOn(g, [[0.32, 0.12], [0.32, -0.12], [-0.32, 0.12], [-0.32, -0.12]], 0.7, 0.7, '#cfc8bc', 0.09);
    return g;
  }
  function boat(sail) {
    const g = new THREE.Group();
    box(0, 0, 0, 2.4, 0.42, 0.95, '#f2efe8', g); box(0, 0.1, 0, 2.42, 0.1, 0.97, '#c0413a', g);
    box(-0.5, 0.42, 0, 0.8, 0.4, 0.6, '#d9d4cc', g);
    cyl(0.35, 0.42, 0, 0.05, 2.6, '#8b8794', g, 6);
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0, 2.2); sh.lineTo(1.4, 0); sh.closePath();
    const s = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshLambertMaterial({ color: sail, side: THREE.DoubleSide }));
    s.position.set(0.4, 0.75, 0); s.castShadow = true; g.add(s);
    neonBox(0.35, 3.0, 0, 0.14, 0.14, 0.14, '#ffd27a', g, '#8d8a80');
    return g;
  }
  function bird(color, scale) {
    const g = new THREE.Group(), m = mat(color), wings = [];
    const b = new THREE.Mesh(boxG, m); b.scale.set(0.38, 0.12, 0.13); g.add(b);
    for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.z = s * 0.06; const w = new THREE.Mesh(boxG, m); w.scale.set(0.26, 0.03, 0.5); w.position.z = s * 0.25; p.add(w); g.add(p); wings.push({ p, s }); }
    g.scale.setScalar(scale || 1); g.userData.wings = wings; return g;
  }
  function addWalker(k, o, L, th, v, float) { o.scale.setScalar(float ? 1.35 : 1.5); bio[k].g.add(o); bio[k].walkers.push({ o, L, th, v, float }); }
  function addFlock(k, color, n, cx, cz, r, y, v, scale) {
    const f = new THREE.Group();
    for (let i = 0; i < n; i++) { const b = bird(color, scale); const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1; b.position.set(-row * 0.9, (rand() - 0.5) * 0.3, i ? side * row * 0.8 : 0); b.userData.ph = rand() * 6; f.add(b); }
    bio[k].g.add(f); bio[k].flocks.push({ f, cx, cz, r, y, v, th: rand() * 6.28 });
  }

  // ---- Biển: sóng, thuyền buồm, hải âu, cá nhảy, hải đăng ----
  LOOPS.forEach((L, i) => { addWalker('sea', boat(['#ffffff', '#ffd27a', '#c6bfff'][i]), L, i * 2, i % 2 ? -2.2 : 2.4, true); });
  addWalker('sea', boat('#ff9bd2'), LOOPS[0], 3.4, 2.4, true);
  addWalker('sea', boat('#5ee0a0'), { cx: 62, cz: 32, rx: 2, rz: 17.5 }, 1.2, 1.5, true); // v31: phà ra Game Island
  if (HAS_ADMIN) addWalker('sea', boat('#ffd27a'), { cx: 39.5, cz: 22, rx: 2.4, rz: 10.5 }, 0, 1.4, true); // phà ra đảo riêng
  addFlock('sea', '#f4f4f2', 5, 30, 30, 26, 16, 0.25, 1.2); addFlock('sea', '#f4f4f2', 3, 56, 52, 12, 11, -0.35, 1.2); addFlock('sea', '#e8e8e4', 4, -10, 40, 14, 14, 0.3, 1.1);
  scatter(8, 3, 1.5, (x, z) => { const f = new THREE.Mesh(boxG, mat(rand() < 0.5 ? '#ff9a3d' : '#ffd24d')); f.scale.set(0.55, 0.2, 0.16); f.visible = false; bio.sea.g.add(f); bio.sea.fish.push({ f, x, z, t: -rand() * 4, a: rand() * 6.28 }); });
  const beams = [];
  {
    const lx = 40, lz = -27;
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4, 0), mat('#6b645d')); rock.position.set(lx, -1.2, lz); rock.scale.y = 0.6; rock.castShadow = true; bio.sea.g.add(rock);
    cyl(lx, -0.2, lz, 0.75, 6, '#f2efe8', bio.sea.g, 12, 0.5);
    cyl(lx, 1.6, lz, 0.69, 0.9, '#c0413a', bio.sea.g, 12, 0.64); cyl(lx, 3.6, lz, 0.6, 0.8, '#c0413a', bio.sea.g, 12, 0.56);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 10), neonMat('#fff2b0', '#cfcab8')); lamp.position.set(lx, 6.15, lz); bio.sea.g.add(lamp);
    cyl(lx, 6.5, lz, 0.6, 0.25, '#2a2930', bio.sea.g, 10);
    const pivot = new THREE.Group(); pivot.position.set(lx, 6.15, lz); bio.sea.g.add(pivot);
    const bm = new THREE.MeshBasicMaterial({ color: '#fff2b0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 16, 16, 1, true), bm); cone.rotation.z = Math.PI / 2; cone.position.x = -8; pivot.add(cone);
    beams.push({ pivot, bm });
  }

  // ---- Sa mạc: đồi cát, xương rồng, lạc đà, ốc đảo, kim tự tháp ----
  ground('desert', '#cf9f5a', (x, z) => Math.max(0.15, 0.6 + 0.45 * Math.sin(x * 0.19 + z * 0.06) + 0.3 * Math.sin(z * 0.27 - x * 0.08)), small ? 40 : 64);
  scatter(46, 2, 1.2, (x, z) => {
    const y = gy('desert', x, z), h = 1.2 + rand() * 1.2;
    cyl(x, y, z, 0.22, h, '#5f8f4a', bio.desert.g, 8);
    if (rand() < 0.8) { box(x + 0.35, y + h * 0.45, z, 0.5, 0.16, 0.16, '#5f8f4a', bio.desert.g); box(x + 0.55, y + h * 0.45, z, 0.16, 0.5, 0.16, '#5f8f4a', bio.desert.g); }
    if (rand() < 0.5) { box(x - 0.3, y + h * 0.6, z, 0.4, 0.14, 0.14, '#5f8f4a', bio.desert.g); box(x - 0.45, y + h * 0.6, z, 0.14, 0.4, 0.14, '#5f8f4a', bio.desert.g); }
  });
  scatter(7, 3.5, 3.5, (x, z) => {
    const y = gy('desert', x, z) - 0.3, w = 3 + rand() * 2.5, d = 2.5 + rand() * 2;
    box(x, y, z, w, 1.4, d, '#b5713f', bio.desert.g); box(x + 0.2, y + 1.4, z, w * 0.82, 1.1, d * 0.85, '#c98a52', bio.desert.g);
    if (rand() < 0.6) box(x - 0.3, y + 2.5, z + 0.2, w * 0.5, 0.9, d * 0.6, '#b5713f', bio.desert.g);
  });
  for (const [px, pz, s] of [[70, 71, 5], [62, 74, 3.6]]) {
    for (let i = 0; i < 5; i++) { const w = s * 2 * (1 - i / 5); box(px, gy('desert', px, pz) - 0.2 + i * s * 0.28, pz, w, s * 0.28, w, i % 2 ? '#d9b373' : '#cfa865', bio.desert.g); }
  }
  {
    const ox = HAS_ADMIN ? 37 : 40, oz = HAS_ADMIN ? -25 : 40, y = gy('desert', ox, oz); // v30: nhường chỗ cho đảo riêng
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.2, 18), neonMat('#3fb7d6', '#3a9cc0')); pool.position.set(ox, y + 0.05, oz); bio.desert.g.add(pool);
    for (const [dx, dz] of [[3.2, 0.5], [-2.6, 2], [0.8, -3.3], [-1.2, -2.8]]) {
      for (let i = 0; i < 5; i++) cyl(ox + dx + i * 0.1, y + i * 0.6, oz + dz, 0.12, 0.65, '#8a6a4c', bio.desert.g, 6);
      for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(boxG, mat('#4f8a52')); l.scale.set(1.4, 0.07, 0.36); const a = i / 6 * 6.283; l.position.set(ox + dx + 0.5 + Math.cos(a) * 0.6, y + 3.1, oz + dz + Math.sin(a) * 0.6); l.rotation.y = -a; l.rotation.z = -0.35; l.castShadow = true; bio.desert.g.add(l); }
    }
  }
  LOOPS.forEach((L, i) => { const n = i === 0 ? 4 : 3, v = i % 2 ? -1.1 : 1.1; for (let k = 0; k < n; k++) addWalker('desert', camel(), L, i * 2 - k * 0.32 * Math.sign(v), v); });
  addFlock('desert', '#3a2e2a', 3, 40, 30, 22, 17, 0.15, 1.6);

  // ---- Núi đá: núi bậc thang có tuyết, đá tảng, dê núi, đại bàng ----
  ground('rocky', '#7d736a', (x, z) => 0.5 + 0.55 * Math.abs(Math.sin(x * 0.33) * Math.cos(z * 0.29)) + 0.2 * Math.sin(x * 0.9 + z * 0.7), small ? 40 : 70);
  const GREY = ['#8a8178', '#7b736b', '#6b645d', '#948a7f'];
  function mountain(x, z, hMax) {
    const levels = 4 + ((rand() * 3) | 0), base = 4.5 + rand() * 4, lh = hMax / levels, y0 = gy('rocky', x, z) - 0.3;
    let ox = 0, oz = 0;
    for (let i = 0; i < levels; i++) {
      const s = base * (1 - (i / levels) * 0.82), snow = hMax > 8 && i >= levels - 2 + (hMax > 12 ? -1 : 0);
      ox += (rand() - 0.5) * 0.5; oz += (rand() - 0.5) * 0.5;
      box(x + ox, y0 + i * lh, z + oz, s, lh, s * (0.8 + rand() * 0.35), snow ? (i === levels - 1 ? '#ffffff' : '#e8ebef') : pick(GREY), bio.rocky.g);
    }
  }
  scatter(26, 3.5, 2.5, (x, z) => mountain(x, z, x + z > 74 ? 4 + rand() * 4 : 7 + rand() * 9));
  scatter(60, 1.5, 1, (x, z) => { const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + rand() * 0.6, 0), mat(pick(GREY))); r.position.set(x, gy('rocky', x, z) + 0.1, z); r.rotation.set(rand() * 3, rand() * 3, 0); r.castShadow = true; bio.rocky.g.add(r); });
  LOOPS.forEach((L, i) => { for (let k = 0; k < 2; k++) addWalker('rocky', goat(), L, i * 2 + k * 0.5, i % 2 ? -0.9 : 0.9); });
  addFlock('rocky', '#5a4632', 1, 30, 30, 24, 20, 0.2, 2.4); addFlock('rocky', '#5a4632', 2, 56, 56, 12, 16, -0.25, 2.0);

  // ---- Rừng: cây dày, hươu, cáo, chim ----
  ground('forest', '#557f3f', (x, z) => 0.9 + 0.2 * Math.sin(x * 0.21) * Math.cos(z * 0.26), small ? 30 : 48);
  {
    const TREES = small ? 260 : 460;
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 1, 5), mat('#5b4636'), TREES);
    const pine = new THREE.InstancedMesh(new THREE.ConeGeometry(0.95, 2.4, 6), new THREE.MeshLambertMaterial(), TREES);
    const round = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.95, 0), new THREE.MeshLambertMaterial(), TREES);
    let np = 0, nr = 0, nt = 0; const d = new THREE.Object3D(), c = new THREE.Color();
    const GREENS = ['#2f5e3a', '#3f6b4a', '#4f7d4f', '#356049', '#5c8a45', '#2a4f33'];
    scatter(TREES, 1.4, 1.3, (x, z) => {
      const y = gy('forest', x, z), s = 0.8 + rand() * 0.7;
      d.position.set(x, y + 0.5 * s, z); d.scale.set(s, s, s); d.rotation.set(0, rand() * 6, 0); d.updateMatrix(); trunk.setMatrixAt(nt++, d.matrix);
      c.set(pick(GREENS));
      if (rand() < 0.55) { d.position.set(x, y + 1.0 * s + 1.1 * s, z); d.updateMatrix(); pine.setMatrixAt(np, d.matrix); pine.setColorAt(np++, c); }
      else { d.position.set(x, y + 1.0 * s + 0.7 * s, z); d.updateMatrix(); round.setMatrixAt(nr, d.matrix); round.setColorAt(nr++, c); }
    });
    trunk.count = nt; pine.count = np; round.count = nr;
    for (const m of [trunk, pine, round]) { m.castShadow = true; m.receiveShadow = true; bio.forest.g.add(m); }
  }
  {
    const lx = HAS_ADMIN ? 37 : 44, lz = HAS_ADMIN ? -25 : 44, y = gy('forest', lx, lz);
    const lake = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.2, 20), neonMat('#3f9ec0', '#3a88aa')); lake.position.set(lx, y + 0.02, lz); lake.scale.z = 0.7; bio.forest.g.add(lake);
  }
  addWalker('forest', deer(), LOOPS[0], 0, 1.2); addWalker('forest', deer(), LOOPS[0], -0.35, 1.2); addWalker('forest', deer(), LOOPS[2], 1, -1.1);
  addWalker('forest', fox(), LOOPS[1], 0, 1.8); addWalker('forest', fox(), LOOPS[0], 3, -1.6); addWalker('forest', deer(), LOOPS[1], 3, 1.0);
  addFlock('forest', '#2a2f3a', 5, 30, 30, 26, 15, 0.3, 1); addFlock('forest', '#d95a4a', 3, 56, 54, 10, 10, -0.45, 0.9); addFlock('forest', '#ffd24d', 3, 26, 60, 7, 9, 0.5, 0.8);

  // ---- switching ----
  let biome = 'sea';
  try { const saved = localStorage.getItem('kwcity-biome'); if (saved && BIOMES[saved]) biome = saved; } catch (e) {}
  function setBiome(k) {
    biome = k;
    for (const b in bio) bio[b].g.visible = b === k;
    root.querySelectorAll('[data-b]').forEach((x) => x.classList.toggle('on', x.dataset.b === k));
    try { localStorage.setItem('kwcity-biome', k); } catch (e) {}
  }
  function updateBiome(dt, t) {
    const B = bio[biome];
    for (const w of B.walkers) {
      const L = w.L; w.th += (w.v * dt) / ((L.rx + L.rz) / 2);
      const x = L.cx + L.rx * Math.cos(w.th), z = L.cz + L.rz * Math.sin(w.th);
      const s = Math.sign(w.v) || 1, tx = -L.rx * Math.sin(w.th) * s, tz = L.rz * Math.cos(w.th) * s;
      w.o.rotation.y = -Math.atan2(tz, tx);
      if (w.float) { w.o.position.set(x, G0 + 0.02 + Math.sin(t * 2 + w.th) * 0.06, z); w.o.rotation.x = Math.sin(t * 1.6 + w.th) * 0.05; }
      else w.o.position.set(x, gy(biome, x, z), z);
      const legs = w.o.userData.legs;
      if (legs) legs.forEach((p, i) => { p.rotation.z = Math.sin(t * 7 * Math.abs(w.v) + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.45; });
    }
    for (const F of B.flocks) {
      F.th += F.v * dt * (12 / F.r);
      const x = F.cx + Math.cos(F.th) * F.r, z = F.cz + Math.sin(F.th) * F.r, s = Math.sign(F.v);
      F.f.position.set(x, F.y + Math.sin(t * 0.8 + F.th) * 0.6, z);
      F.f.rotation.y = -Math.atan2(Math.cos(F.th) * s, -Math.sin(F.th) * s);
      for (const b of F.f.children) for (const wg of b.userData.wings) wg.p.rotation.x = wg.s * Math.sin(t * 9 + b.userData.ph) * 0.6;
    }
    for (const f of B.fish) {
      f.t += dt;
      if (f.t < 0) { f.f.visible = false; continue; }
      const u = f.t / 1.1;
      if (u >= 1) { f.t = -(2 + Math.random() * 5); f.a = Math.random() * 6.28; continue; }
      f.f.visible = true;
      f.f.position.set(f.x + Math.cos(f.a) * (u - 0.5) * 2.2, G0 + 2.4 * 4 * u * (1 - u) - 0.1, f.z + Math.sin(f.a) * (u - 0.5) * 2.2);
      f.f.rotation.set(0, -f.a, (0.5 - u) * 2.2);
    }
    if (biome === 'sea') for (const b of beams) { b.pivot.rotation.y += dt * 0.9; b.bm.opacity = N * 0.32; }
  }

  // ================= main buildings =================
  const MAIN_ALL = [
    { key: 'hub', city: 'main', name: 'Knowledge Hub', route: '/knowledge-hub', dot: '#c6bfff', cx: -7.5, cz: -7.5,
      desc: 'The tallest tower in town: the map of concepts and how they connect.' },
    { key: 'research', city: 'main', name: 'Research Archive', route: '/research', dot: '#ffd27a', cx: -22.5, cz: 7.5,
      desc: 'The library of ongoing research and theoretical foundations (members only).' },
    { key: 'news', city: 'main', name: 'News', route: '/news', dot: '#7ef0ff', cx: 7.5, cz: -22.5,
      desc: 'The tower with the LED ticker, running the latest market news.' },
    { key: 'discussion', city: 'main', name: 'Discussion', route: '/discussion', dot: '#ff9a7a', cx: 7.5, cz: 7.5,
      desc: 'The café on the central square: questions, answers and debate.' },
    { key: 'videos', city: 'main', name: 'Video Case Studies', route: '/videos', dot: '#ffcc4d', cx: -22.5, cz: 22.5,
      desc: 'The cinema: video case studies.' },
    { key: 'students', city: 'main', name: 'Student Case Studies', route: '/students', dot: '#e46b5f', cx: -7.5, cz: 22.5,
      desc: 'The school: student case studies, with "Think first, then reveal".' },
    { key: 'images', city: 'main', name: 'Image Case Studies', route: '/images', dot: '#ff9bd2', cx: 22.5, cz: 22.5,
      desc: 'The glass gallery: image case studies.' },
    { key: 'dashboard', city: 'admin', name: 'Dashboard', route: '/dashboard', dot: '#ffe4a8', cx: -7.5, cz: 49.5,
      desc: 'City hall with the clock tower: overall numbers and the most viewed content.' },
    { key: 'visitors', city: 'admin', name: 'Visitors', route: '/admin/visitors', dot: '#7ee8ff', cx: 7.5, cz: 49.5,
      desc: 'The control tower: who comes and goes, visit counts, access on/off.' },
    { key: 'reviews', city: 'admin', name: 'Reviews', route: '/admin/reviews', dot: '#ffd24d', cx: -7.5, cz: 64.5,
      desc: 'The round hall with the spinning star: every rating and comment.' },
    { key: 'import', city: 'admin', name: 'Concept Import', route: '/knowledge-hub/import', dot: '#b7f07e', cx: 7.5, cz: 64.5,
      desc: 'The factory: bulk-import concepts from pptx, docx and xlsx files.' },
    { key: 'profile', city: 'profile', name: 'Profile', route: '/profile', dot: '#ff9bd2', cx: 64.5, cz: 7.5,
      desc: 'Your house with the pool: your profile.' },
    { key: 'upload', city: 'profile', name: 'Upload', route: '/upload', dot: '#c6bfff', cx: 49.5, cz: -7.5,
      desc: 'The studio with the glowing arrow: publish new content.' },
    { key: 'journey', city: 'profile', name: 'My Journey', route: '/journey', dot: '#ff8a3d', cx: 64.5, cz: -7.5,
      desc: 'The tower with the streak flame: your journey, 12-week calendar and badges.' },
    { key: 'games', city: 'games', name: 'Game Island', route: '/games', dot: '#5ee0a0', cx: 57, cz: 57,
      desc: 'Harbour Cup boat race for the presenting order, and the Billboard Draw for brands. Tap to play.' },
    { key: 'island', city: 'island', name: "Thinh's Island", route: '/island', dot: '#ffd27a', cx: 40, cz: 40,
      desc: 'The Lecture Hall keeps your teaching timetable, City Hall your meetings, the Lighthouse the dates you must not miss.' },
  ];
  const LOCKED = new Set(ISL_ALL.filter((I) => I.lock).map((I) => I.id));
  const MAIN = MAIN_ALL.filter((b) => !LOCKED.has(b.city) || HAS_ADMIN);
  const PARKS = [[22.5, -7.5], [-7.5, 7.5], [49.5, 7.5]];
  const byKey = {}; const pickables = [];
  const blinkers = [], flames = [], bulbs = [], flags = [], fairy = [], spinners = [], smoke = [], bobbers = [];
  let billboard = null;

  const BUILD = {
    hub(b, g, cx, cz) {
      box(cx, Y0, cz, 6, 1.7, 6, '#4a4652', g);
      neonBox(cx, Y0 + 1.7, cz, 6.06, 0.14, 6.06, '#b388ff', g);
      box(cx, Y0 + 1.84, cz, 4, 15, 4, '#3d3946', g);
      windows(cx, Y0 + 1.84, cz, 4, 15, 4, { pal: 'cool', p: 0.62 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) neonBox(cx + sx * 2.02, Y0 + 1.84, cz + sz * 2.02, 0.12, 15, 0.12, '#7ee8ff', g);
      box(cx, Y0 + 16.84, cz, 2.8, 3, 2.8, '#4c4757', g);
      windows(cx, Y0 + 16.84, cz, 2.8, 3, 2.8, { pal: 'neon', p: 0.8 });
      cyl(cx, Y0 + 19.84, cz, 0.12, 4, '#8b8794', g);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), neonMat('#ff4a5a', '#7a3a40'));
      tip.position.set(cx, Y0 + 24, cz); g.add(tip); blinkers.push(tip);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.09, 8, 64), neonMat('#b388ff', '#6a6080'));
      ring.rotation.x = Math.PI / 2; ring.position.set(cx, Y0 + 12, cz); g.add(ring); spinners.push({ o: ring, ax: 'z', v: 0.4 });
      b.top = Y0 + 24.6;
    },
    research(b, g, cx, cz) {
      box(cx, Y0, cz - 0.6, 7, 3.4, 5, '#5a5260', g);
      windows(cx, Y0, cz - 0.6, 7, 3.4, 5, { p: 0.72, step: 1.1 });
      box(cx, Y0 + 3.4, cz - 0.6, 5.2, 2.6, 3.6, '#675d6c', g);
      windows(cx, Y0 + 3.4, cz - 0.6, 5.2, 2.6, 3.6, { p: 0.6 });
      box(cx, Y0 + 6.0, cz - 0.6, 5.6, 0.3, 4, '#3f3946', g);
      box(cx - 0.8, Y0, cz + 2.55, 5.6, 0.22, 1.5, '#8a8288', g);
      for (let i = 0; i < 5; i++) cyl(cx - 3.0 + i * 1.12, Y0 + 0.22, cz + 2.35, 0.18, 2.9, '#d8cfc6', g, 8);
      box(cx - 0.8, Y0 + 3.12, cz + 2.35, 5.6, 0.35, 0.8, '#cfc6bd', g);
      sign('RESEARCH ARCHIVE', cx, Y0 + 4.7, cz + 1.22, 4.6, 0.75, 'z', g);
      b.top = Y0 + 6.6;
    },
    dashboard(b, g, cx, cz) {
      box(cx, Y0, cz, 6.4, 3.6, 4.4, '#6a6170', g);
      windows(cx, Y0, cz, 6.4, 3.6, 4.4, { p: 0.66, step: 1.1 });
      box(cx, Y0 + 3.6, cz, 6.8, 0.3, 4.8, '#4a4450', g);
      box(cx, Y0 + 3.9, cz, 1.9, 6, 1.9, '#7a7080', g);
      for (const f of ['z', 'x']) {
        const face = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), neonMat('#fff1c2', '#e9e2cf'));
        if (f === 'z') face.position.set(cx, Y0 + 8.6, cz + 0.97); else { face.position.set(cx + 0.97, Y0 + 8.6, cz); face.rotation.y = Math.PI / 2; }
        g.add(face);
        const hand = new THREE.Mesh(boxG, mat('#2a2630')); hand.scale.set(0.06, 0.48, 0.02);
        hand.position.copy(face.position).add(f === 'z' ? new THREE.Vector3(0, 0.18, 0.02) : new THREE.Vector3(0.02, 0.18, 0));
        if (f === 'x') hand.rotation.y = Math.PI / 2; g.add(hand);
      }
      const spire = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.2, 4), mat('#4a4450'));
      spire.rotation.y = Math.PI / 4; spire.position.set(cx, Y0 + 11, cz); spire.castShadow = true; g.add(spire);
      b.top = Y0 + 12.4;
    },
    news(b, g, cx, cz) {
      box(cx, Y0, cz, 4, 12, 4, '#3a3744', g);
      windows(cx, Y0, cz, 4, 7.6, 4, { pal: 'cool', p: 0.55 });
      const c = document.createElement('canvas'); c.width = 768; c.height = 256;
      const tex = new THREE.CanvasTexture(c);
      const lm = new THREE.MeshBasicMaterial({ map: tex });
      neons.push({ m: lm, night: new THREE.Color('#ffffff'), day: new THREE.Color('#bfc6cc') });
      for (const f of ['z', 'x']) {
        const p = new THREE.Mesh(planeG, lm); p.scale.set(3.7, 1.9, 1);
        if (f === 'z') p.position.set(cx, Y0 + 9.6, cz + 2.06); else { p.position.set(cx + 2.06, Y0 + 9.6, cz); p.rotation.y = Math.PI / 2; }
        g.add(p);
      }
      billboard = { c, tex, x: 0, text: newsText(opts.news) };
      neonBox(cx, Y0 + 12, cz, 4.05, 0.12, 4.05, '#7ef0ff', g);
      cyl(cx - 0.8, Y0 + 12, cz - 0.8, 0.08, 1.8, '#8b8794', g);
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), mat('#cfcad6'));
      dish.position.set(cx + 0.7, Y0 + 12.3, cz + 0.6); dish.rotation.set(-0.7, 0.6, 0); g.add(dish);
      b.top = Y0 + 14;
    },
    discussion(b, g, cx, cz) {
      box(cx - 1, Y0, cz - 1.2, 4.6, 2.8, 3.4, '#7a5f58', g);
      windows(cx - 1, Y0, cz - 1.2, 4.6, 2.8, 3.4, { p: 0.85, step: 1.2 });
      box(cx - 1, Y0 + 2.8, cz - 1.2, 4.9, 0.25, 3.7, '#4c3a36', g);
      box(cx - 1, Y0 + 1.85, cz + 0.95, 4.8, 0.14, 1.0, '#c96a5a', g);
      box(cx + 1.75, Y0 + 1.85, cz - 1.2, 1.0, 0.14, 3.6, '#c96a5a', g);
      sign('CAFÉ · DISCUSSION', cx - 1, Y0 + 2.35, cz + 0.53, 3.6, 0.55, 'z', g, { fg: '#ffd9b8' });
      for (const [tx, tz] of [[1.4, 2.2], [-0.8, 3.4], [2.6, -0.4], [-3.0, 3.6]]) {
        cyl(cx + tx, Y0, cz + tz, 0.38, 0.7, '#d9cfc4', g, 12);
        const um = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.5, 10), mat(pick(['#e0705f', '#f2c14e', '#5fb3a6'])));
        um.position.set(cx + tx, Y0 + 1.6, cz + tz); um.castShadow = true; g.add(um);
        cyl(cx + tx, Y0 + 0.7, cz + tz, 0.04, 0.7, '#3a3540', g, 6);
      }
      tree(cx + 4.4, cz - 0.5, g);
      cyl(cx - 3.6, Y0, cz + 1.4, 0.05, 2.6, '#2a2930', g, 6);
      cyl(cx + 3.6, Y0, cz + 1.6, 0.05, 2.6, '#2a2930', g, 6);
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const bl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), neonMat('#ffd27a', '#8a8070'));
        bl.position.set(cx - 3.6 + 7.2 * t, Y0 + 2.5 - Math.sin(t * Math.PI) * 0.5, cz + 1.4 + 0.2 * t); g.add(bl); fairy.push(bl);
      }
      b.top = Y0 + 3.6;
    },
    games(b, g, cx, cz) {
      // Vòng đu quay
      const wx = cx - 2.2, wz = cz - 1.8, wy = Y0 + 5.2, R = 3.6;
      for (const s of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 6, 6), mat('#e9e4f5'));
        leg.position.set(wx + s * 1.3, Y0 + 2.6, wz); leg.rotation.z = s * 0.24; g.add(leg);
      }
      const wheel = new THREE.Group(); wheel.position.set(wx, wy, wz); g.add(wheel);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 6, 40), neonMat('#ff9bd2', '#c96fa3')); wheel.add(rim);
      const cols = ['#c6bfff', '#ffd27a', '#5ee0a0', '#7ef0ff', '#ff8a6a', '#ff9bd2', '#ffb347', '#a8d8ff'];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.08, R * 2, 0.08), mat('#e9e4f5')); sp.rotation.z = a; wheel.add(sp);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.6), mat(cols[i])); cab.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); wheel.add(cab);
      }
      spinners.push({ o: wheel, ax: 'z', v: 0.35 });
      // Bể đua thuyền
      box(cx + 2.2, Y0, cz + 1.5, 4.8, 0.25, 6.6, '#2a5f7a', g);
      for (let i = 0; i < 3; i++) {
        box(cx + 0.9 + i * 1.3, Y0 + 0.25, cz + 1.2 - i * 0.9, 0.45, 0.3, 1.1, cols[i * 2], g);
        box(cx + 0.9 + i * 1.3, Y0 + 0.55, cz + 1.3 - i * 0.9, 0.3, 0.25, 0.5, '#ece9f5', g);
      }
      for (let k = 0; k < 6; k++) box(cx + 2.2 + (k % 2 ? 0.25 : -0.25) * 0 - 2.2 + k * 0.8, Y0 + 0.26, cz + 4.6, 0.4, 0.04, 0.4, k % 2 ? '#ece9f5' : '#1a1720', g);
      // Biển quảng cáo
      cyl(cx + 3.6, Y0, cz - 3.8, 0.12, 3.2, '#4a4458', g, 6);
      cyl(cx + 1.0, Y0, cz - 3.8, 0.12, 3.2, '#4a4458', g, 6);
      box(cx + 2.3, Y0 + 3.1, cz - 3.8, 3.6, 1.8, 0.2, '#15121c', g);
      neonBox(cx + 2.3, Y0 + 3.3, cz - 3.68, 3.2, 1.4, 0.04, '#7ef0ff', g, '#4a7f8a');
      b.top = Y0 + 9.2;
    },
    island(b, g, cx, cz) {
      // Lecture Hall (mái dốc, cột)
      box(cx + 1.3, Y0, cz - 2.2, 5, 2.4, 3.2, '#3d3858', g);
      windows(cx + 1.3, Y0, cz - 2.2, 5, 2.4, 3.2, { pal: 'warm', p: 0.6 });
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.4, 4), mat('#5b5390'));
      roof.rotation.y = Math.PI / 4; roof.scale.set(1.05, 1, 0.68); roof.position.set(cx + 1.3, Y0 + 3.1, cz - 2.2); roof.castShadow = true; g.add(roof);
      for (let i = 0; i < 4; i++) box(cx - 0.6 + i * 1.25, Y0, cz - 0.5, 0.28, 2.3, 0.28, '#e9e4f5', g);
      // Nhà riêng
      box(cx + 2.2, Y0, cz + 2.4, 2.6, 1.7, 2.2, '#5a3a50', g);
      neonBox(cx + 2.2, Y0 + 0.6, cz + 3.52, 1.6, 0.6, 0.04, '#ffd27a', g, '#8a6a50');
      const hr = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.2, 4), mat('#ff9bd2'));
      hr.rotation.y = Math.PI / 4; hr.position.set(cx + 2.2, Y0 + 2.3, cz + 2.4); hr.castShadow = true; g.add(hr);
      // Hải đăng
      const lx = cx - 2.6, lz = cz + 1.6;
      cyl(lx, Y0, lz, 0.85, 7.5, '#f2efe8', g, 12, 0.55);
      cyl(lx, Y0 + 2.2, lz, 0.75, 0.8, '#ff9bd2', g, 12, 0.68);
      cyl(lx, Y0 + 4.8, lz, 0.66, 0.8, '#ff9bd2', g, 12, 0.6);
      const lampM = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 10), neonMat('#fff2b0', '#cfcab8')); lampM.position.set(lx, Y0 + 7.9, lz); g.add(lampM);
      cyl(lx, Y0 + 8.3, lz, 0.68, 0.3, '#2a2930', g, 10);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), neonMat('#ff4a5a', '#7a3a40')); tip.position.set(lx, Y0 + 8.75, lz); g.add(tip); blinkers.push(tip);
      const pivot = new THREE.Group(); pivot.position.set(lx, Y0 + 7.9, lz); g.add(pivot);
      const bm = new THREE.MeshBasicMaterial({ color: '#fff2b0', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.2, 11, 14, 1, true), bm); cone.rotation.z = Math.PI / 2; cone.position.x = -5.5; pivot.add(cone);
      spinners.push({ o: pivot, ax: 'y', v: 0.9 });
      // Bến phà
      box(cx - 1.5, -0.6, cz - 7.4, 1.4, 0.6, 3, '#6b5b4a', g);
      for (const s of [-1, 1]) cyl(cx - 1.5 + s * 0.6, -1.4, cz - 8.6, 0.1, 1.5, '#4a3c30', g, 6);
      b.top = Y0 + 9;
    },
    journey(b, g, cx, cz) {
      box(cx, Y0, cz, 4.2, 2, 4.2, '#4d4756', g);
      box(cx, Y0 + 2, cz, 2.7, 11, 2.7, '#5a5263', g);
      windows(cx, Y0 + 2, cz, 2.7, 11, 2.7, { p: 0.5 });
      box(cx, Y0 + 13, cz, 3.2, 0.4, 3.2, '#3a3542', g);
      neonBox(cx, Y0 + 13.4, cz, 3.25, 0.1, 3.25, '#ff8a3d', g);
      const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.2, 10), neonMat('#ff7a2e', '#c86a3a'));
      const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 10), neonMat('#ffd27a', '#e0b070'));
      f1.position.set(cx, Y0 + 14.5, cz); f2.position.set(cx, Y0 + 14.15, cz); g.add(f1, f2); flames.push(f1, f2);
      const fl = new THREE.PointLight('#ff8a3d', 0, 10); fl.position.set(cx, Y0 + 15, cz); g.add(fl); b.light = fl;
      b.top = Y0 + 16.2;
    },
    videos(b, g, cx, cz) {
      box(cx, Y0, cz - 0.3, 6.2, 4.2, 4.6, '#4a3f55', g);
      windows(cx, Y0 + 2.6, cz - 0.3, 6.2, 1.6, 4.6, { pal: 'neon', p: 0.5, bottom: 0.3 });
      box(cx, Y0 + 2.2, cz + 2.4, 5.2, 1.1, 0.8, '#1d1924', g);
      sign('CINEMA · VIDEO CASES', cx, Y0 + 2.75, cz + 2.81, 4.8, 0.7, 'z', g, { fg: '#ffd84d', bg: '#120f18' });
      for (let i = 0; i < 16; i++) bulbs.push(neonBox(cx - 2.5 + i * (5 / 15), Y0 + 2.12, cz + 2.82, 0.12, 0.12, 0.06, '#ffd84d', g, '#6a6050'));
      box(cx + 3.15, Y0 + 1.2, cz + 0.2, 0.25, 2.8, 0.9, '#1d1924', g);
      sign('VIDEO', cx + 3.29, Y0 + 2.6, cz + 0.2, 0.85, 2.4, 'x', g, { fg: '#ff9bd2', bg: '#120f18' });
      b.top = Y0 + 5;
    },
    students(b, g, cx, cz) {
      box(cx, Y0, cz - 0.6, 6.2, 4.2, 3.8, '#8a6d5e', g);
      windows(cx, Y0, cz - 0.6, 6.2, 4.2, 3.8, { p: 0.6, step: 1.3 });
      box(cx, Y0 + 4.2, cz - 0.6, 6.6, 0.3, 4.2, '#5b463d', g);
      box(cx, Y0 + 4.5, cz - 0.6, 2, 1.2, 1.6, '#9a7d6e', g);
      box(cx - 1, Y0, cz + 1.6, 1.8, 2.2, 0.8, '#6e554a', g);
      sign('STUDENT CASES', cx, Y0 + 3.55, cz + 1.34, 3.6, 0.6, 'z', g, { fg: '#ffe4c4' });
      cyl(cx + 1.4, Y0, cz + 3.4, 0.06, 6, '#c9c4cc', g, 6);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9, 8, 1), new THREE.MeshLambertMaterial({ color: '#d94a4a', side: THREE.DoubleSide }));
      flag.position.set(cx + 2.1, Y0 + 5.4, cz + 3.4); g.add(flag); flags.push(flag);
      flag.userData.base = flag.geometry.attributes.position.array.slice();
      b.top = Y0 + 6.4;
    },
    images(b, g, cx, cz) {
      box(cx, Y0, cz, 3.0, 4.6, 3.0, '#2d2b35', g);
      const art = ['#ff9bd2', '#7ef0ff', '#ffd27a', '#c9a7ff'];
      art.forEach((c, i) => {
        neonBox(cx - 0.6 + (i % 2) * 1.2, Y0 + 1.2 + Math.floor(i / 2) * 1.8, cz + 1.53, 0.9, 1.1, 0.04, c, g, '#8c8494');
        neonBox(cx + 1.53, Y0 + 1.2 + Math.floor(i / 2) * 1.8, cz - 0.6 + (i % 2) * 1.2, 0.04, 1.1, 0.9, art[3 - i], g, '#8c8494');
      });
      const glass = new THREE.MeshLambertMaterial({ color: '#a9cfe0', transparent: true, opacity: 0.28, depthWrite: false });
      box(cx, Y0, cz, 5, 5.2, 5, glass, g, { shadow: false });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(cx + sx * 2.5, Y0, cz + sz * 2.5, 0.14, 5.2, 0.14, '#24222b', g);
      box(cx, Y0 + 5.2, cz, 5.2, 0.2, 5.2, '#24222b', g);
      neonBox(cx, Y0 + 5.4, cz, 5.25, 0.08, 5.25, '#ff9bd2', g);
      b.top = Y0 + 6;
    },
    visitors(b, g, cx, cz) {
      box(cx - 0.6, Y0, cz - 0.8, 5.2, 2.2, 4, '#4a5260', g);
      windows(cx - 0.6, Y0, cz - 0.8, 5.2, 2.2, 4, { pal: 'cool', p: 0.7 });
      sign('VISITORS', cx - 0.6, Y0 + 1.6, cz + 1.24, 2.8, 0.55, 'z', g, { fg: '#bff6ff' });
      cyl(cx + 1.2, Y0, cz - 0.6, 0.9, 9.5, '#cfd6de', g, 16, 0.7);
      const cab = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 1.4, 1.6, 12), neonMat('#7ee8ff', '#5d7d8c'));
      cab.position.set(cx + 1.2, Y0 + 10.3, cz - 0.6); g.add(cab);
      cyl(cx + 1.2, Y0 + 11.1, cz - 0.6, 2.2, 0.25, '#3a4050', g, 12);
      const radar = new THREE.Group(); radar.position.set(cx + 1.2, Y0 + 11.6, cz - 0.6); g.add(radar);
      cyl(0, 0, 0, 0.08, 0.6, '#8b8794', radar, 6);
      const arm = new THREE.Mesh(boxG, mat('#e6e3ea')); arm.scale.set(2.2, 0.3, 0.12); arm.position.y = 0.7; radar.add(arm);
      spinners.push({ o: radar, ax: 'y', v: 1.6 });
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), neonMat('#ff4a5a', '#7a3a40'));
      tip.position.set(cx + 1.2, Y0 + 12.6, cz - 0.6); g.add(tip); blinkers.push(tip);
      b.top = Y0 + 13;
    },
    reviews(b, g, cx, cz) {
      cyl(cx, Y0, cz - 0.4, 3.2, 3.2, '#5b5466', g, 28);
      sign('REVIEWS', cx, Y0 + 1.55, cz + 2.86, 2.4, 0.5, 'z', g, { fg: '#ffe08a' });
      const band = new THREE.Mesh(new THREE.TorusGeometry(3.22, 0.08, 6, 48), neonMat('#ffd24d', '#7a6a50'));
      band.rotation.x = Math.PI / 2; band.position.set(cx, Y0 + 3.2, cz - 0.4); g.add(band);
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.7 : 1.6, a = i / 10 * Math.PI * 2 + Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? shape.lineTo(x, y) : shape.moveTo(x, y); }
      const star = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false }), neonMat('#ffd24d', '#d8b850'));
      star.position.set(cx, Y0 + 5.2, cz - 0.4); g.add(star); spinners.push({ o: star, ax: 'y', v: 0.8 });
      cyl(cx, Y0 + 3.2, cz - 0.4, 0.08, 0.6, '#8b8794', g, 6);
      b.top = Y0 + 7;
    },
    import(b, g, cx, cz) {
      box(cx, Y0, cz - 0.4, 6.4, 3, 4.2, '#56505c', g);
      windows(cx, Y0, cz - 0.4, 6.4, 3, 4.2, { p: 0.75, step: 1.2 });
      for (let i = 0; i < 3; i++) {
        const t = box(cx - 2.1 + i * 2.1, Y0 + 3.3, cz - 0.4, 2.0, 0.9, 4.2, '#6d6474', g);
        t.rotation.z = 0.42;
        neonBox(cx - 1.65 + i * 2.1, Y0 + 3.0, cz - 0.4, 0.08, 0.7, 4.0, '#b7f07e', g, '#6a7a60');
      }
      cyl(cx - 2.4, Y0, cz - 2.0, 0.45, 7.5, '#7a6a64', g, 12);
      neonBox(cx - 2.4, Y0 + 6.6, cz - 2.0, 0.95, 0.15, 0.95, '#ff4a5a', g, '#7a3a40');
      const smat = new THREE.MeshLambertMaterial({ color: '#c9c6cf', transparent: true, opacity: 0.7, depthWrite: false });
      for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), smat); s.userData.t = i / 6; g.add(s); smoke.push({ s, x: cx - 2.4, z: cz - 2.0, y: Y0 + 7.5 }); }
      sign('CONCEPT IMPORT', cx, Y0 + 2.4, cz + 1.74, 3.8, 0.6, 'z', g, { fg: '#dcffc0' });
      b.top = Y0 + 9;
    },
    profile(b, g, cx, cz) {
      box(cx - 0.4, Y0, cz - 1.2, 6, 2.3, 3.6, '#e8e2d8', g);
      neonBox(cx - 0.4, Y0 + 0.4, cz + 0.62, 5, 1.5, 0.04, '#ffd8a0', g, '#9fb4c4');
      neonBox(cx + 2.62, Y0 + 0.4, cz - 1.2, 0.04, 1.5, 2.8, '#ffd8a0', g, '#9fb4c4');
      box(cx - 1.2, Y0 + 2.3, cz - 1.6, 4.4, 2.1, 3, '#d4ccc0', g);
      neonBox(cx - 1.2, Y0 + 2.7, cz - 0.08, 3.4, 1.3, 0.04, '#ffcf8a', g, '#9fb4c4');
      box(cx - 1.0, Y0 + 4.4, cz - 1.4, 5.4, 0.2, 3.8, '#3a363d', g);
      box(cx - 0.4, Y0 + 2.3, cz - 1.0, 6.4, 0.15, 4.2, '#3a363d', g);
      box(cx - 0.6, Y0, cz + 2.6, 4.6, 0.08, 2.2, '#cfc8bc', g);
      neonBox(cx - 0.6, Y0, cz + 2.6, 4.2, 0.12, 1.8, '#38d6e8', g, '#4aaecc');
      sign('PROFILE', cx - 1.2, Y0 + 3.0, cz + 0.0, 2.2, 0.45, 'z', g, { fg: '#ffd0ea', bg: '#2a2530' });
      for (let i = 0; i < 5; i++) cyl(cx - 4.0 + i * 0.12, Y0 + i * 0.7, cz + 2.0, 0.13, 0.75, '#8a6a4c', g, 6);
      for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(boxG, mat('#4f8a52')); l.scale.set(1.6, 0.08, 0.4); const a = i / 6 * Math.PI * 2; l.position.set(cx - 3.4 + Math.cos(a) * 0.7, Y0 + 3.6, cz + 2.0 + Math.sin(a) * 0.7); l.rotation.y = -a; l.rotation.z = -0.35; l.castShadow = true; g.add(l); }
      b.top = Y0 + 5;
    },
    upload(b, g, cx, cz) {
      box(cx, Y0, cz - 0.4, 6, 3.6, 4.4, '#5c6470', g);
      windows(cx, Y0 + 2.2, cz - 0.4, 6, 1.4, 4.4, { pal: 'cool', p: 0.7, bottom: 0.3 });
      box(cx - 1, Y0, cz + 1.82, 2.6, 2.0, 0.08, '#3a3f48', g);
      for (let i = 0; i < 5; i++) box(cx - 1, Y0 + 0.3 + i * 0.35, cz + 1.87, 2.5, 0.05, 0.02, '#5a606a', g, { shadow: false });
      sign('UPLOAD', cx + 1.6, Y0 + 1.6, cz + 1.84, 2.0, 0.5, 'z', g, { fg: '#e5dcff' });
      const shape = new THREE.Shape();
      shape.moveTo(0, 1.4); shape.lineTo(1.1, 0.2); shape.lineTo(0.4, 0.2); shape.lineTo(0.4, -1.0); shape.lineTo(-0.4, -1.0); shape.lineTo(-0.4, 0.2); shape.lineTo(-1.1, 0.2); shape.closePath();
      const arrow = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }), neonMat('#c6bfff', '#a9a2d8'));
      arrow.position.set(cx, Y0 + 5.4, cz - 0.4); g.add(arrow); bobbers.push({ o: arrow, y: Y0 + 5.4 }); spinners.push({ o: arrow, ax: 'y', v: 0.6 });
      b.top = Y0 + 7.2;
    },
  };

  // Name board on a pylon at the block's front corner, turned towards the default camera
  const BOARD_ROT = Math.atan2(CAM_DIR.x, CAM_DIR.z);
  function board(b, g) {
    const x = b.cx + 3.6, z = b.cz + 3.6;
    for (const s of [-1, 1]) box(x + Math.cos(BOARD_ROT) * s * 1.9, Y0, z - Math.sin(BOARD_ROT) * s * 1.9, 0.16, 2.6, 0.16, '#2a2930', g);
    const tex = canvasTex(1024, 360, (c, w, h) => {
      c.fillStyle = '#15121c'; c.fillRect(0, 0, w, h);
      c.fillStyle = b.dot; c.fillRect(0, 0, w, 22);
      c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillStyle = '#ffffff'; const s = fitText(c, b.name, w - 110, 132);
      c.fillText(b.name, 56, 60 + s);
      c.font = '500 54px ui-monospace, Menlo, monospace'; c.fillStyle = b.dot;
      c.fillText('knoworld' + b.route, 58, h - 58);
    });
    const m = new THREE.Mesh(planeG, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    neons.push({ m: m.material, night: new THREE.Color('#ffffff'), day: new THREE.Color('#e4e0d8') });
    m.scale.set(4.6, 1.62, 1); m.position.set(x, Y0 + 3.2, z); m.rotation.y = BOARD_ROT; g.add(m);
    const strip = neonBox(x, Y0 + 4.02, z, 4.6, 0.08, 0.08, b.dot, g, '#6a6676'); strip.rotation.y = BOARD_ROT;
  }

  const FILL = ['#3b3640', '#4a4450', '#2e2b33', '#5a5260', '#6b5f68', '#444054', '#524a58'];
  function filler(x, z, hMax, wMin) {
    const w = (wMin || 2.0) + rand() * 0.5, d = (wMin || 2.0) + rand() * 0.5, h = 2.4 + rand() * (hMax - 2.4);
    box(x, Y0, z, w, h, d, pick(FILL));
    windows(x, Y0, z, w, h, d, { pal: rand() < 0.35 ? 'cool' : 'warm', p: 0.45 + rand() * 0.25 });
    const r = rand();
    if (r < 0.35) box(x + (rand() - 0.5) * 0.8, Y0 + h, z + (rand() - 0.5) * 0.8, 0.7, 0.45, 0.6, '#7d7884');
    else if (r < 0.6) cyl(x, Y0 + h, z, 0.45, 0.8, '#6d5e58');
    else if (r < 0.8) neonBox(x, Y0 + h, z, w + 0.04, 0.08, d + 0.04, pick(['#7ef0ff', '#b388ff', '#ff9bd2']));
  }
  function park(cx, cz) {
    box(cx, Y0, cz, 10.6, 0.12, 10.6, '#557a4e');
    box(cx, Y0 + 0.12, cz, 10.6, 0.02, 1.2, '#cdbf9e', null, { shadow: false });
    box(cx, Y0 + 0.12, cz, 1.2, 0.02, 10.6, '#cdbf9e', null, { shadow: false });
    neonBox(cx + 2.8, Y0 + 0.1, cz - 2.8, 3.2, 0.06, 2.6, '#4fc3e0', null, '#4f9cbf');
    for (const [tx, tz] of [[-3.5, -3.5], [-2, -4.2], [-4.2, -1.8], [3.6, 3.6], [-3.6, 3.4], [-2, 4.2], [4.2, 1.6], [1.8, 4.3], [-4.3, 1.6]]) tree(cx + tx, cz + tz, null, Y0 + 0.12);
    for (const s of [-1, 1]) box(cx + s * 1.5, Y0 + 0.12, cz + 2.6, 0.4, 0.35, 1.2, '#8a6a4c');
  }

  const used = new Set();
  for (const b of MAIN) {
    const g = new THREE.Group(); scene.add(g);
    BUILD[b.key](b, g, b.cx, b.cz);
    board(b, g);
    b.group = g; byKey[b.key] = b; used.add(b.cx + ',' + b.cz);
    g.traverse((o) => { if (o.isMesh) { o.userData.key = b.key; pickables.push(o); } });
    const helper = new THREE.BoxHelper(g, '#c6bfff'); helper.visible = false; scene.add(helper); b.helper = helper;
    if (b.key === 'island' || b.key === 'games') continue; // đảo: chỉ có các công trình của đảo
    filler(b.cx - 4.2, b.cz - 4.2, b.key === 'hub' ? 11 : 9);
    filler(b.cx + 4.2, b.cz - 4.2, 7);
    filler(b.cx - 4.2, b.cz + 4.2, 6);
  }
  for (const [x, z] of PARKS) { park(x, z); used.add(x + ',' + z); }
  for (const I of ISL) for (const ox of I.off) for (const oz of I.off) {
    const x = I.cx + ox, z = I.cz + oz; if (used.has(x + ',' + z)) continue;
    filler(x - 3.8, z - 3.8, 13, 2.6); filler(x + 3.8, z - 3.8, 10, 2.6); filler(x - 3.8, z + 3.8, 9, 2.6);
    filler(x + 3.8, z + 3.8, 5, 2.6); filler(x, z, 8, 2.2);
  }

  // ================= street lamps =================
  function lamp(x, z, ax, az) {
    cyl(x, Y0, z, 0.06, 2.1, '#2a2930');
    box(x + ax * 0.3, Y0 + 2.0, z + az * 0.3, ax ? 0.7 : 0.08, 0.08, az ? 0.7 : 0.08, '#2a2930');
    neonBox(x + ax * 0.6, Y0 + 1.92, z + az * 0.6, 0.28, 0.08, 0.28, '#fff0c0', null, '#8d8a80');
    decal(x + ax * 0.9, 0.04, z + az * 0.9, 4.2, 4.2, lampGlow);
  }
  for (const R of ROADS) {
    let side = 1;
    for (let t = R.a + 3; t <= R.b - 3; t += 7.4) {
      const x = R.axis === 'x' ? t : R.fixed, z = R.axis === 'x' ? R.fixed : t;
      if (nearCross(x, z) || !onLand(x, z)) continue;
      if (R.axis === 'x') lamp(x, z + side * 2.35, 0, -side); else lamp(x - side * 2.35, z, side, 0);
      side = -side;
    }
  }
  const crossLights = crossings.map(([x, z]) => { const p = new THREE.PointLight('#ffcf8a', 0, 15, 1.6); p.position.set(x, 2.6, z); scene.add(p); return p; });

  // ================= vehicles =================
  const cars = [];
  const CAR_COL = ['#f2c14e', '#f2c14e', '#3fb3a6', '#4a7bd1', '#d9d9de', '#7a5bd1', '#e0705f'];
  function vehicle(kind, color) {
    const g = new THREE.Group();
    const tail = neonMat('#ff3b3b', '#7a2a2a');
    if (kind === 'bus') {
      box(0, 0.18, 0, 3.4, 1.15, 0.95, '#e8e6ea', g);
      neonBox(0, 0.85, 0.48, 3.0, 0.3, 0.02, '#9be7ff', g, '#7d8a96'); neonBox(0, 0.85, -0.48, 3.0, 0.3, 0.02, '#9be7ff', g, '#7d8a96');
      box(0, 1.33, 0, 3.2, 0.06, 0.8, '#3fb3a6', g);
      neonBox(1.71, 0.35, 0.3, 0.04, 0.14, 0.18, '#fff6d0', g, '#cfc8b4'); neonBox(1.71, 0.35, -0.3, 0.04, 0.14, 0.18, '#fff6d0', g, '#cfc8b4');
      box(-1.71, 0.35, 0.3, 0.04, 0.14, 0.18, tail, g); box(-1.71, 0.35, -0.3, 0.04, 0.14, 0.18, tail, g);
      decal(3.4, 0.05, 0, 3.6, 1.6, beamGlow, g);
    } else if (kind === 'truck') {
      box(0.95, 0.18, 0, 0.9, 0.85, 0.9, color, g);
      box(-0.45, 0.18, 0, 1.9, 1.1, 0.95, '#cfcad6', g);
      neonBox(1.41, 0.32, 0.28, 0.04, 0.12, 0.16, '#fff6d0', g, '#cfc8b4'); neonBox(1.41, 0.32, -0.28, 0.04, 0.12, 0.16, '#fff6d0', g, '#cfc8b4');
      box(-1.41, 0.32, 0.3, 0.04, 0.12, 0.16, tail, g); box(-1.41, 0.32, -0.3, 0.04, 0.12, 0.16, tail, g);
      decal(3.0, 0.05, 0, 3.4, 1.5, beamGlow, g);
    } else {
      box(0, 0.14, 0, 1.7, 0.5, 0.85, color, g);
      box(-0.12, 0.64, 0, 0.95, 0.4, 0.78, '#25232c', g);
      if (color === '#f2c14e') neonBox(-0.12, 1.04, 0, 0.35, 0.14, 0.2, '#fff1a8', g, '#d9c98a');
      neonBox(0.86, 0.3, 0.27, 0.04, 0.12, 0.16, '#fff6d0', g, '#cfc8b4'); neonBox(0.86, 0.3, -0.27, 0.04, 0.12, 0.16, '#fff6d0', g, '#cfc8b4');
      box(-0.86, 0.3, 0.28, 0.04, 0.12, 0.16, tail, g); box(-0.86, 0.3, -0.28, 0.04, 0.12, 0.16, tail, g);
      decal(2.4, 0.05, 0, 3.0, 1.3, beamGlow, g);
    }
    for (const wx of [-0.55, 0.55]) for (const wz of [-0.42, 0.42]) box(wx * (kind === 'bus' ? 2.2 : 1), 0, wz, 0.34, 0.26, 0.1, '#15141a', g, { shadow: false });
    scene.add(g); return g;
  }
  ROADS.forEach((R) => {
    for (const dir of [1, -1]) {
      const lane = { axis: R.axis, fixed: R.fixed + (R.axis === 'x' ? dir : -dir), dir, a: R.a, b: R.b };
      const len = R.b - R.a, speed = 3.2 + rand() * 2.8;
      const n = Math.max(1, Math.round(len / (small ? 26 : 17)));
      for (let k = 0; k < n; k++) {
        const r = rand(), kind = r < 0.14 ? 'bus' : r < 0.26 ? 'truck' : 'car';
        const g = vehicle(kind, pick(CAR_COL));
        g.rotation.y = R.axis === 'x' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? -Math.PI / 2 : Math.PI / 2);
        cars.push({ g, lane, s: R.a + (len / n) * k + rand() * 4, speed });
      }
    }
  });

  // ================= clouds & rain =================
  const DROPS = small ? 900 : 2600;
  const rainPos = new Float32Array(DROPS * 6);
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: '#b9d2ea', transparent: true, opacity: 0 });
  const rainLines = new THREE.LineSegments(rainGeo, rainMat); rainLines.frustumCulled = false; scene.add(rainLines);
  function seedDrop(i, anyY) {
    const x = controls.target.x + (Math.random() - 0.5) * 120, z = controls.target.z + (Math.random() - 0.5) * 120;
    const y = anyY ? Math.random() * 40 : 38 + Math.random() * 4;
    rainPos.set([x, y, z, x + 0.25, y + 1.4, z + 0.1], i * 6);
  }
  for (let i = 0; i < DROPS; i++) seedDrop(i, true);

  // ================= sky (2D canvas behind the city) =================
  const sky = $('sky'), sctx = sky.getContext('2d');
  let skyDpr = 1;
  function sizeSky() {
    skyDpr = Math.min(devicePixelRatio || 1, 1.5);
    sky.width = Math.round(RW() * skyDpr); sky.height = Math.round(RH() * skyDpr);
    sky.style.width = RW() + 'px'; sky.style.height = RH() + 'px';
  }
  const STARS = Array.from({ length: 320 }, () => ({ x: Math.random(), y: Math.random() * 0.75, r: Math.random() < 0.12 ? 1.6 : 0.5 + Math.random() * 0.8, sp: 0.5 + Math.random() * 2.5, ph: Math.random() * 6.28 }));
  // Moon phase from a known new moon (6 Jan 2000 18:14 UTC), synodic month 29.53 days
  const moonAge = (((Date.now() / 86400000 - 10962.76) % 29.530589) + 29.530589) % 29.530589;
  const moonF = moonAge / 29.530589;
  const moonImg = document.createElement('canvas');
  {
    const r = 17; moonImg.width = moonImg.height = 2 * r + 2; const m = moonImg.getContext('2d'), x = r + 1, y = r + 1;
    const waxing = moonF < 0.5, k = (1 - Math.cos(moonF * 2 * Math.PI)) / 2;
    m.fillStyle = '#f3efe2';
    m.beginPath(); m.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !waxing); m.closePath(); m.fill();
    m.beginPath(); m.ellipse(x, y, Math.max(0.01, r * Math.abs(1 - 2 * k)), r, 0, 0, 6.283);
    if (k < 0.5) { m.globalCompositeOperation = 'destination-out'; m.fill(); m.globalCompositeOperation = 'source-over'; } else m.fill();
  }
  // Voxel clouds: stacks of boxes drawn with a lit top, a front and a shaded side (same look as the 3D city)
  const CLOUDS = Array.from({ length: 30 }, (_, i) => {
    const n = 3 + ((Math.random() * 4) | 0), blocks = [];
    for (let k = 0; k < n; k++) blocks.push({ dx: (k - n / 2) * 1.5 + (Math.random() - 0.5) * 0.5, dy: -Math.random() * 0.9, w: 1.6 + Math.random() * 1.6, h: 0.8 + Math.random() * 0.7, d: 0.9 + Math.random() * 0.8 });
    blocks.sort((p, q) => q.dy - p.dy || p.dx - q.dx);
    return { x: Math.random() * 1.2, y: 0.05 + Math.random() * 0.88, s: 0.6 + Math.random() * 0.8, v: 0.006 + Math.random() * 0.01, rain: i >= 18, blocks };
  });
  // Each group is drawn opaque on its own layer, then laid over the sky at the group's opacity (no seams between boxes)
  const cloudLayer = document.createElement('canvas'), cl2 = cloudLayer.getContext('2d');
  function drawClouds(c, e, t, W, H) {
    if (cloudLayer.width !== sky.width || cloudLayer.height !== sky.height) { cloudLayer.width = sky.width; cloudLayer.height = sky.height; }
    const unit = 26 * Math.min(1.4, Math.max(0.6, W / 1440));
    const white = new THREE.Color('#ffffff');
    for (const rainGroup of [false, true]) {
      const a = rainGroup ? e.rain * 0.95 : (0.95 - 0.4 * e.n) * (1 - 0.2 * e.rain) + e.rain * 0.05;
      if (a < 0.02) continue;
      const col = rainGroup ? e.rcloud : e.cloud;
      const top = col.clone().lerp(white, 0.35 * (1 - e.n)).getStyle(), front = col.getStyle(), side = col.clone().multiplyScalar(0.78).getStyle();
      const k = cl2; k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(0, 0, cloudLayer.width, cloudLayer.height); k.setTransform(skyDpr, 0, 0, skyDpr, 0, 0);
      for (const cl of CLOUDS) {
        if (cl.rain !== rainGroup) continue;
        const x0 = (((cl.x + t * cl.v * (1 + e.rain)) % 1.3) - 0.15) * W, y0 = cl.y * H, u = unit * cl.s * (cl.rain ? 1.4 : 1);
        for (const bk of cl.blocks) {
          const x = x0 + bk.dx * u, y = y0 + bk.dy * u, w = bk.w * u, h = bk.h * u, ox = bk.d * u * 0.55, oy = bk.d * u * 0.32;
          k.fillStyle = front; k.fillRect(x, y, w, h);
          k.fillStyle = top; k.beginPath(); k.moveTo(x, y); k.lineTo(x + ox, y - oy); k.lineTo(x + w + ox, y - oy); k.lineTo(x + w, y); k.closePath(); k.fill();
          k.fillStyle = side; k.beginPath(); k.moveTo(x + w, y); k.lineTo(x + w + ox, y - oy); k.lineTo(x + w + ox, y + h - oy); k.lineTo(x + w, y + h); k.closePath(); k.fill();
        }
      }
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a; c.drawImage(cloudLayer, 0, 0); c.restore();
    }
  }
  function drawSky(e, hrs, t, fl) {
    const W = RW(), H = RH(), c = sctx;
    c.setTransform(skyDpr, 0, 0, skyDpr, 0, 0);
    const gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, e.top.getStyle()); gr.addColorStop(0.62, e.bot.getStyle()); gr.addColorStop(1, e.bot.getStyle());
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    const topY = 70 + H * 0.06, horY = H * 0.62;
    const vis = 1 - 0.85 * e.rain;
    const sa = Math.max(0, e.n - 0.35) * 1.55 * vis;
    if (sa > 0.01) for (const s of STARS) {
      c.globalAlpha = Math.min(1, sa * (0.55 + 0.45 * Math.sin(t * s.sp + s.ph))); c.fillStyle = '#ffffff';
      c.beginPath(); c.arc(s.x * W, s.y * H, s.r, 0, 6.283); c.fill();
    }
    c.globalAlpha = 1;
    const arc = (p) => [W * 0.08 + W * 0.84 * p, horY - Math.sin(p * Math.PI) * (horY - topY)];
    const ps = (hrs - 5.7) / (17.95 - 5.7);
    if (ps > -0.03 && ps < 1.03) {
      const pc = Math.min(1, Math.max(0, ps));
      const [x, y] = arc(pc);
      const low = 1 - Math.sin(pc * Math.PI);
      const g = c.createRadialGradient(x, y, 0, x, y, 130);
      g.addColorStop(0, `rgba(255,${Math.round(230 - 70 * low)},${Math.round(170 - 90 * low)},${0.55 * vis})`); g.addColorStop(1, 'rgba(255,200,120,0)');
      c.fillStyle = g; c.fillRect(x - 130, y - 130, 260, 260);
      c.globalAlpha = vis; c.fillStyle = low > 0.6 ? '#ffb27a' : '#fff4d8';
      c.beginPath(); c.arc(x, y, 22, 0, 6.283); c.fill(); c.globalAlpha = 1;
    }
    const pm = ((((hrs - 18) % 24) + 24) % 24) / 12.2;
    if (pm < 1.02) {
      const [x, y] = arc(Math.min(1, pm)), r = 17, a = vis * Math.min(1, e.n * 1.3);
      const g = c.createRadialGradient(x, y, 0, x, y, 70);
      g.addColorStop(0, `rgba(200,210,255,${0.28 * a})`); g.addColorStop(1, 'rgba(200,210,255,0)');
      c.fillStyle = g; c.fillRect(x - 70, y - 70, 140, 140);
      c.save(); c.globalAlpha = a;
      c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fillStyle = 'rgba(60,64,90,0.35)'; c.fill();
      c.drawImage(moonImg, x - r - 1, y - r - 1);
      c.restore();
    }
    drawClouds(c, e, t, W, H);
    if (fl > 0) { c.fillStyle = `rgba(230,236,255,${fl * 0.55})`; c.fillRect(0, 0, W, H); }
  }

  // ================= environment keyframes (HCMC: sunrise ~5:40, sunset ~17:55) =================
  const NIGHT = { top: '#04051a', bot: '#1d1a46', water: '#0d1632', hs: '#4b5193', hg: '#17141f', hi: 0.5, si: 0, sc: '#ffb07a', n: 1 };
  const DAY = { top: '#4f9ee6', bot: '#cbe7f8', water: '#1b5378', hs: '#dbeeff', hg: '#6b6660', hi: 0.95, si: 1.35, sc: '#fff4e0', n: 0 };
  const KF = [
    [0, NIGHT], [5.0, NIGHT],
    [5.8, { top: '#2b2d6b', bot: '#c9837e', water: '#4a4a7a', hs: '#8c79b8', hg: '#2a1f2a', hi: 0.6, si: 0.25, sc: '#ff9a6b', n: 0.85 }],
    [6.6, { top: '#6a9ad8', bot: '#f7c39a', water: '#36587a', hs: '#ffd2b0', hg: '#5a4a4a', hi: 0.78, si: 0.9, sc: '#ffc08a', n: 0.22 }],
    [8.2, DAY], [15.8, DAY],
    [17.2, { top: '#5a7fc8', bot: '#f6b080', water: '#3a5578', hs: '#ffd0a8', hg: '#5a4848', hi: 0.8, si: 1.0, sc: '#ff9f5e', n: 0.25 }],
    [18.0, { top: '#2f2766', bot: '#e07a6a', water: '#3b3a66', hs: '#9a72b0', hg: '#2a1d2a', hi: 0.62, si: 0.28, sc: '#ff7a55', n: 0.82 }],
    [18.9, NIGHT], [24, NIGHT],
  ];
  const RAIN = { top: new THREE.Color('#4b5260'), bot: new THREE.Color('#8a929c'), water: new THREE.Color('#4a5664') };
  const cb = new THREE.Color();
  function envAt(h, rain) {
    let i = 0; while (i < KF.length - 2 && KF[i + 1][0] <= h) i++;
    const [h0, A2] = KF[i], [h1, B2] = KF[i + 1];
    const t = h1 === h0 ? 0 : Math.min(1, Math.max(0, (h - h0) / (h1 - h0)));
    const col = (k) => new THREE.Color(A2[k]).lerp(cb.set(B2[k]), t);
    const num = (k) => A2[k] + (B2[k] - A2[k]) * t;
    const e = { top: col('top'), bot: col('bot'), water: col('water'), hs: col('hs'), hg: col('hg'), sc: col('sc'), hi: num('hi'), si: num('si'), n: num('n'), rain };
    const mix = rain * (0.8 - 0.5 * e.n);
    e.top.lerp(RAIN.top.clone().multiplyScalar(1 - 0.7 * e.n), mix); e.bot.lerp(RAIN.bot.clone().multiplyScalar(1 - 0.6 * e.n), mix); e.water.lerp(RAIN.water, mix);
    e.si *= 1 - 0.8 * rain; e.hi *= 1 - 0.25 * rain;
    return e;
  }

  const glassDay = new THREE.Color('#8ea2b6'), winDark = new THREE.Color('#1c1a25'), tmp = new THREE.Color();
  let N = -1;
  function paintWin(i) { tmp.copy(glassDay).lerp(winLit[i] ? winCol[i] : winDark, N); winMesh.setColorAt(i, tmp); }
  function paintWindows() { for (let i = 0; i < winMesh.count; i++) paintWin(i); winMesh.instanceColor.needsUpdate = true; }

  const SCREEN_R = new THREE.Vector3(CAM_DIR.z, 0, -CAM_DIR.x).normalize();
  const BACK = new THREE.Vector3(-CAM_DIR.x, 0, -CAM_DIR.z).normalize();
  const cloudNight = new THREE.Color('#2e3352'), cloudRain = new THREE.Color('#646b78');
  let flash = 0;
  function applyEnv(h, rain) {
    const e = envAt(h, rain);
    hemi.color.copy(e.hs); hemi.groundColor.copy(e.hg); hemi.intensity = e.hi + flash * 1.4;
    sun.color.copy(e.sc); sun.intensity = e.si;
    const a = Math.min(Math.PI, Math.max(0, (h - 5.7) / (17.95 - 5.7) * Math.PI));
    sun.position.copy(HOME_T).addScaledVector(SCREEN_R, -Math.cos(a) * 60).addScaledVector(BACK, 30).setY(Math.max(Math.sin(a), 0.15) * 70 + 6);
    sun.castShadow = renderer.shadowMap.enabled && e.si > 0.15;
    moon.intensity = e.n * 0.45 * (1 - 0.6 * rain);
    const n = Math.max(e.n, rain * 0.45);
    if (Math.abs(n - N) > 0.004) { N = n; paintWindows(); }
    const f = Math.min(1, 0.12 + n * 0.95);
    for (const o of neons) o.m.color.copy(o.day).lerp(o.night, f);
    lampGlow.opacity = n * 0.8; beamGlow.opacity = n * 0.6; bridgeGlow.opacity = n * 0.7;
    for (const p of crossLights) p.intensity = n * 1.3;
    waterMat.color.copy(e.water); if (biome === 'sea') seaBedMat.color.copy(e.water).multiplyScalar(0.5); else seaBedMat.color.copy(BED[biome]).multiplyScalar(1 - 0.65 * e.n);
    e.cloud = new THREE.Color('#ffffff').lerp(e.sc, 0.3 * (1 - e.n)).lerp(cloudNight, e.n * 0.85).lerp(cloudRain, rain * 0.75);
    e.rcloud = cloudRain.clone().lerp(cloudNight, e.n * 0.7);
    rainMat.opacity = rain * 0.7;
    byKey.journey.light.intensity = n * 1.4;
    return e;
  }

  // ================= time & weather state =================
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', month: 'numeric', hour12: false });
  function vnNow() {
    const p = {}; for (const x of fmt.formatToParts(new Date())) p[x.type] = x.value;
    return { h: (+p.hour % 24) + (+p.minute) / 60 + (+p.second) / 3600, month: +p.month };
  }
  const VN_MONTH = vnNow().month;
  let mode = 'real', hours = vnNow().h, weather = 'auto', rainNow = 0;
  const slider = $('hour'), elTime = $('time'), elPhase = $('phase'), elWx = $('wx');
  // Saigon's rainy season (May–Nov) brings short afternoon showers
  const autoRain = (h) => (VN_MONTH >= 5 && VN_MONTH <= 11 && h >= 14.5 && h <= 16.8 ? 1 : 0);
  function phaseName(h) {
    if (h >= 5 && h < 6.6) return 'Sunrise';
    if (h >= 6.6 && h < 16.8) return 'Daytime';
    if (h >= 16.8 && h < 18.9) return 'Sunset';
    return 'Night';
  }
  function setMode(m) {
    mode = m;
    $('real').classList.toggle('on', m === 'real');
    $('play').classList.toggle('on', m === 'play');
    $('play').textContent = m === 'play' ? 'Stop' : 'Fast-forward 24h';
  }
  slider.addEventListener('input', () => { setMode('manual'); hours = +slider.value; });
  $('real').addEventListener('click', () => setMode('real'));
  $('play').addEventListener('click', () => setMode(mode === 'play' ? 'manual' : 'play'));
  root.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => {
    weather = b.dataset.w; root.querySelectorAll('[data-w]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  $('clockHead').addEventListener('click', () => $('clock').classList.toggle('open'));
  root.querySelectorAll('[data-b]').forEach((b) => b.addEventListener('click', () => setBiome(b.dataset.b)));
  setBiome(biome);
  let lastLabel = '';
  function updateClock() {
    const hh = Math.floor(hours) % 24, mm = Math.floor((hours % 1) * 60);
    const txt = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    const wx = rainNow > 0.35 ? '🌧 Showers' : N > 0.6 ? (moonF > 0.43 && moonF < 0.57 ? '🌕 Full moon' : '🌙 Clear') : '☀️ Sunny';
    const ph = phaseName(hours) + (mode === 'real' ? ' · <em>Vietnam time</em>' : mode === 'play' ? ' · fast-forward' : ' · picked time');
    const key = txt + ph + wx;
    if (key !== lastLabel) { elTime.textContent = txt; elPhase.innerHTML = ph; elWx.textContent = wx; lastLabel = key; }
    if (mode !== 'manual') slider.value = hours.toFixed(2);
  }

  // ================= nav, labels, hover, select =================
  const labelsEl = $('labels'), tip = $('tip');
  for (const b of MAIN) { const l = document.createElement('div'); l.className = 'lbl'; l.textContent = b.name; labelsEl.appendChild(l); b.lbl = l; }
  const v3 = new THREE.Vector3();
  for (const I of ISL) {
    const l = document.createElement('button'); l.type = 'button'; l.className = 'clbl';
    l.innerHTML = `<span class="dot" style="background:${I.color}"></span>${I.name}${I.lock ? ' 🔒' : ''}`;
    l.addEventListener('click', () => selectCity(I.id)); labelsEl.appendChild(l); I.lbl = l;
  }
  function placeCityLabels() {
    for (const I of ISL) {
      v3.set(I.cx + I.half, -1.4, I.cz + I.half).project(camera);
      I.lbl.style.left = ((v3.x + 1) / 2 * RW()) + 'px';
      I.lbl.style.top = ((1 - v3.y) / 2 * RH()) + 'px';
    }
  }
  function placeLabels() {
    placeCityLabels();
    for (const b of MAIN) {
      if (!b.lbl.classList.contains('on')) continue;
      v3.set(b.cx, b.top + 0.6, b.cz).project(camera);
      b.lbl.style.left = ((v3.x + 1) / 2 * RW()) + 'px';
      b.lbl.style.top = ((1 - v3.y) / 2 * RH()) + 'px';
    }
  }
  let hovered = null, selected = null, selectedCity = null, navT = 0;
  function refreshMarks() {
    for (const b of MAIN) {
      const on = b.key === hovered || b.key === selected;
      b.helper.visible = on; b.lbl.classList.toggle('on', on);
    }
    root.querySelectorAll('[data-city]').forEach((el) => el.classList.toggle('on', el.dataset.city === selectedCity));
  }
  function setHover(key) {
    if (hovered === key) return;
    hovered = key; refreshMarks();
    renderer.domElement.style.cursor = key ? 'pointer' : 'grab';
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function hit(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(pickables, false)[0];
    return h ? h.object.userData.key : null;
  }
  const cv = renderer.domElement;
  let down = null;
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const k = hit(e); setHover(k);
    if (k && !down) {
      const b = byKey[k];
      tip.hidden = false; tip.innerHTML = `<b>${b.name}</b><br><span>${b.city === 'main' ? '' : (cityOf(b.city)?.name || '') + ' · '}Click to enter</span>`;
      const rr = root.getBoundingClientRect();
      tip.style.left = Math.min(e.clientX - rr.left + 14, RW() - 190) + 'px'; tip.style.top = (e.clientY - rr.top + 14) + 'px';
    } else tip.hidden = true;
  });
  cv.addEventListener('pointerleave', () => { setHover(null); tip.hidden = true; });
  cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; tip.hidden = true; closeMenus(); });
  cv.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
    if (moved > 6) return;
    const k = hit(e); if (k) select(k);
  });

  let fly = null;
  function flyTo(target, zoom) {
    const fromT = controls.target.clone(), fromP = camera.position.clone();
    fly = { t: 0, fromT, toT: target.clone(), fromP, toP: target.clone().add(fromP.clone().sub(fromT)), fromZ: camera.zoom, toZ: zoom };
  }
  const card = $('card');
  const cityOf = (id) => ISL.find((I) => I.id === id);
  function showCard(o) {
    $('cEyebrow').innerHTML = o.eyebrow; $('cName').textContent = o.name; $('cDesc').textContent = o.desc;
    $('cRoute').hidden = !o.route; $('cRoute').textContent = o.route ? 'knoworld.vercel.app' + o.route : '';
    $('cOpen').hidden = !o.route; if (o.route) $('cOpen').href = o.route;
    const list = $('cList'); list.innerHTML = ''; list.hidden = !o.list;
    (o.list || []).forEach((b) => { const x = document.createElement('button'); x.type = 'button'; x.innerHTML = `<span class="dot" style="background:${b.dot}"></span>${b.name}`; x.onclick = () => select(b.key); list.appendChild(x); });
    $('cNote').textContent = o.note || ''; $('cNote').hidden = !o.note;
    card.hidden = false;
  }
  function select(key, nav = true) {
    const b = byKey[key]; selected = key; selectedCity = null; hovered = null; refreshMarks(); closeMenus();
    flyTo(new THREE.Vector3(b.cx, Math.min(b.top * 0.4, 7), b.cz), zoomFor(b.top > 12 ? 28 : 21));
    const I = cityOf(b.city);
    showCard({
      eyebrow: `<span class="dot" style="background:${I.color}"></span>${I.name}`,
      name: b.name, desc: b.desc, route: b.route,
      note: opts.onNavigate && nav ? 'Opening the page…' : '',
    });
    clearTimeout(navT);
    if (opts.onNavigate && nav) navT = setTimeout(() => opts.onNavigate(b.route), reduce ? 300 : 1150);
  }
  function selectCity(id) {
    clearTimeout(navT);
    const I = cityOf(id); selected = null; selectedCity = id; hovered = null; refreshMarks(); closeMenus();
    flyTo(new THREE.Vector3(I.cx, 2, I.cz), zoomFor(I.size));
    showCard({
      eyebrow: `<span class="dot" style="background:${I.color}"></span>District${I.lock ? ' · 🔒 admin only' : ''}`,
      name: I.name, desc: I.desc, list: MAIN.filter((b) => b.city === id),
    });
  }
  function home() {
    clearTimeout(navT);
    selected = null; selectedCity = null; card.hidden = true; hovered = '__'; setHover(null); refreshMarks(); closeMenus();
    flyTo(HOME_T.clone(), small ? zoomFor(64) : 1);
  }
  $('cBack').addEventListener('click', home);
  $('cOpen').addEventListener('click', (e) => { if (opts.onNavigate && selected) { e.preventDefault(); clearTimeout(navT); opts.onNavigate(byKey[selected].route); } });
  root.querySelectorAll('[data-city]').forEach((el) => el.addEventListener('click', () => (el.dataset.city === 'home' ? home() : selectCity(el.dataset.city))));
  const onKey = (e) => { if (e.key === 'Escape' && (selected || selectedCity)) home(); };
  window.addEventListener('keydown', onKey); cleanups.push(() => window.removeEventListener('keydown', onKey));
  function closeMenus() {}

  // ================= billboard =================
  function drawBillboard(dt) {
    const { c, tex } = billboard; const x = c.getContext('2d');
    x.fillStyle = '#07070d'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = 'rgba(126,240,255,0.07)';
    for (let yy = 0; yy < c.height; yy += 8) x.fillRect(0, yy, c.width, 3);
    x.font = '700 92px "Space Grotesk", ui-sans-serif, sans-serif'; x.textBaseline = 'middle';
    const w = x.measureText(billboard.text).width;
    billboard.x = (billboard.x + dt * 160) % w;
    x.fillStyle = '#7ef0ff';
    x.fillText(billboard.text, -billboard.x, c.height / 2 + 4);
    x.fillText(billboard.text, -billboard.x + w, c.height / 2 + 4);
    x.strokeStyle = '#7ef0ff'; x.lineWidth = 6; x.strokeRect(3, 3, c.width - 6, c.height - 6);
    tex.needsUpdate = true;
  }

  // ================= loop =================
  const clock = new THREE.Clock();
  let flickT = 0, frame = 0, elapsed = 0, envE = null, boltT = 2;
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  renderer.domElement.style.cursor = 'grab';

  let alive = true, raf = 0, onScreen = true;
  const io = new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; }); io.observe(root); cleanups.push(() => io.disconnect());
  function tick() {
    if (!alive) return;
    if (!onScreen || document.hidden) { clock.getDelta(); raf = requestAnimationFrame(tick); return; }
    const dt = Math.min(clock.getDelta(), 0.05); elapsed += dt; frame++;
    if (mode === 'real') hours = vnNow().h;
    else if (mode === 'play') hours = (hours + dt * 24 / 40) % 24;
    const target = weather === 'rain' ? 1 : weather === 'clear' ? 0 : autoRain(hours);
    rainNow += (target - rainNow) * Math.min(1, dt * (mode === 'play' ? 1.6 : 0.7));
    if (rainNow < 0.001) rainNow = 0;
    flash = Math.max(0, flash - dt * 5);
    if (!reduce && rainNow > 0.85) { boltT -= dt; if (boltT <= 0) { flash = 1; boltT = 3 + Math.random() * 6; } }
    envE = applyEnv(hours, rainNow); updateClock();
    if (frame % 2 === 0) drawSky(envE, hours, elapsed, flash);

    const sMul = reduce ? 0.4 : 1;
    for (const c of cars) {
      const L = c.lane;
      c.s += c.speed * L.dir * dt * sMul;
      if (c.s > L.b) c.s = L.a; if (c.s < L.a) c.s = L.b;
      const e = Math.min(1, Math.max(0, Math.min(L.b - c.s, c.s - L.a) / 1.4));
      c.g.scale.setScalar(e);
      if (L.axis === 'x') c.g.position.set(c.s, 0, L.fixed); else c.g.position.set(L.fixed, 0, c.s);
    }
    flickT += dt;
    if (!reduce && N > 0.3 && flickT > 0.1) {
      flickT = 0;
      for (let k = 0; k < 8; k++) { const i = (Math.random() * winMesh.count) | 0; winLit[i] = !winLit[i]; paintWin(i); }
      winMesh.instanceColor.needsUpdate = true;
    }
    for (const b of blinkers) b.visible = Math.sin(elapsed * 4) > -0.2;
    flames.forEach((f, i) => { const s = 1 + Math.sin(elapsed * (9 + i * 3)) * 0.12 + Math.sin(elapsed * 23) * 0.05; f.scale.set(1 / s, s, 1 / s); });
    bulbs.forEach((bl, i) => { bl.visible = N < 0.3 || ((i + Math.floor(elapsed * 8)) % 3 !== 0); });
    fairy.forEach((bl, i) => { bl.scale.setScalar(N > 0.3 ? 0.85 + 0.3 * Math.sin(elapsed * 3 + i) : 1); });
    for (const s of spinners) s.o.rotation[s.ax] += dt * s.v;
    for (const b of bobbers) b.o.position.y = b.y + Math.sin(elapsed * 2) * 0.25;
    for (const p of smoke) {
      const t = (elapsed * 0.25 + p.s.userData.t) % 1;
      p.s.position.set(p.x + t * 1.6, p.y + t * 5, p.z + t * 0.8); p.s.scale.setScalar(0.6 + t * 1.8);
    }
    for (const f of flags) {
      const pos = f.geometry.attributes.position, base = f.userData.base;
      for (let i = 0; i < pos.count; i++) { const x = base[i * 3]; pos.array[i * 3 + 2] = Math.sin(elapsed * 5 + x * 3) * 0.12 * (x + 0.7); }
      pos.needsUpdate = true;
    }
    if (billboard && frame % 2 === 0) drawBillboard(dt * 2);
    updateBiome(dt, elapsed);
    if (biome === 'sea' && frame % 2 === 0) {
      const arr = waterGeo.attributes.position.array, tt = elapsed * 0.9;
      for (let i = 0; i < arr.length; i += 3) arr[i + 1] = Math.sin(waterBase[i] * 0.45 + waterBase[i + 2] * 0.2 + tt) * 0.07 + Math.cos(waterBase[i + 2] * 0.5 - waterBase[i] * 0.15 + tt * 1.3) * 0.07;
      waterGeo.attributes.position.needsUpdate = true;
    }
    if (rainNow > 0.01) {
      const fall = 32 * dt;
      for (let i = 0; i < DROPS; i++) {
        const o = i * 6; rainPos[o + 1] -= fall; rainPos[o + 4] -= fall; rainPos[o] -= fall * 0.18; rainPos[o + 3] -= fall * 0.18;
        if (rainPos[o + 1] < -1.4) seedDrop(i, false);
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
    rainLines.visible = rainNow > 0.01;

    if (fly) {
      fly.t = Math.min(1, fly.t + dt / 1.0); const e = ease(fly.t);
      controls.target.lerpVectors(fly.fromT, fly.toT, e);
      camera.position.lerpVectors(fly.fromP, fly.toP, e);
      camera.zoom = fly.fromZ + (fly.toZ - fly.fromZ) * e; camera.updateProjectionMatrix();
      if (fly.t >= 1) fly = null;
    }
    controls.update();
    placeLabels();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  fit();
  const ro = new ResizeObserver(() => fit()); ro.observe(root); cleanups.push(() => ro.disconnect());
  if (backdrop) { controls.enabled = false; controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.35; }
  if (small) { camera.zoom = zoomFor(64); camera.updateProjectionMatrix(); }
  controls.update();
  envE = applyEnv(hours, 0); updateClock(); drawSky(envE, hours, 0, 0); placeCityLabels();
  const go = () => { if (!alive) return; if (billboard) drawBillboard(0); raf = requestAnimationFrame(tick); };
  // v28: quay lại từ trang con (/?b=news) -> bay tới đúng tòa nhà đó, không tự mở trang.
  if (!backdrop && opts.focus && byKey[opts.focus]) setTimeout(() => { if (alive) select(opts.focus, false); }, 500);
  (document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]) : Promise.resolve()).then(go);

  return {
    setNews(list) { if (billboard) { billboard.text = newsText(list); billboard.x = 0; } },
    destroy() {
      alive = false; cancelAnimationFrame(raf); clearTimeout(navT);
      cleanups.forEach((f) => f());
      controls.dispose(); renderer.dispose(); renderer.forceContextLoss();
      root.innerHTML = '';
    },
  };
}

function newsText(list) {
  const titles = (list || []).filter(Boolean).slice(0, 6);
  return 'NEWS  ·  ' + (titles.length ? titles.join('  ·  ') : 'Market updates on Knoworld') + '  ·  ';
}
