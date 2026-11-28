// v66: Creative City — thành phố 3D isometric (three.js r128), cùng phong cách đêm với Knoworld City.
// createCreativeCity(root, { onSelect(id) }) -> { focus(id), destroy() }
// Bố cục: một khối đất lơ lửng; Trung tâm Sáng tạo ở giữa (gom toàn bộ hoạt động),
// 4 khu chức năng ở 4 góc nối bằng đường vành đai + 4 trục đường có cổng vòm neon.
import * as THREE_NS from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CC_DISTRICTS } from './ccDistricts';
import { fetchLiveWeather } from '@/lib/liveWeather';
import { lumiStaticSvg } from '../onboarding/lumiArt';

const THREE = { ...THREE_NS, OrbitControls };

export function createCreativeCity(root, opts = {}) {
  root.innerHTML = '<div class="ccx-stage" data-id="stage"></div><div class="ccx-labels" data-id="labels"></div><div class="ccx-tip" data-id="tip" hidden></div><div class="ccx-wx" data-id="wx" aria-live="off"></div>';
  const $ = (id) => root.querySelector(`[data-id="${id}"]`);
  const cleanups = [];
  let gl;
  try { const c = document.createElement('canvas'); gl = c.getContext('webgl2') || c.getContext('webgl'); } catch (e) { /* ignore */ }
  if (!gl) {
    root.innerHTML = '<div class="ccx-fail">Trình duyệt không hiển thị được thành phố 3D (WebGL đang tắt). Dùng các nút khu bên trên nhé.</div>';
    return { focus() {}, destroy() { root.innerHTML = ''; } };
  }

  const RW = () => root.clientWidth || window.innerWidth;
  const RH = () => root.clientHeight || window.innerHeight;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  let seed = 20261127;
  const rand = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = (a) => a[(rand() * a.length) | 0];
  const D = Object.fromEntries(CC_DISTRICTS.map((d) => [d.id, d]));

  // ================= renderer / camera =================
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $('stage').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1200);
  const CAM_DIR = new THREE.Vector3(48, 40, 30).normalize().multiplyScalar(300);
  const HOME_T = new THREE.Vector3(0, -2, 0);
  camera.position.copy(HOME_T).add(CAM_DIR);
  let vBase = 100, aspect = 1;
  const homeZoom = () => Math.min(vBase * aspect / 150, vBase / 118) * (RW() < 500 ? 1.35 : 1);
  function fit() {
    aspect = RW() / RH();
    vBase = Math.max(100, 170 / aspect);
    camera.left = -vBase * aspect / 2; camera.right = vBase * aspect / 2; camera.top = vBase / 2; camera.bottom = -vBase / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(RW(), RH());
  }
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.copy(HOME_T);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = false; controls.minZoom = 0.35; controls.maxZoom = 7;
  controls.minPolarAngle = 0.55; controls.maxPolarAngle = 1.2;

  // ================= lights — v69: ngày/đêm theo giờ Việt Nam + thời tiết thật (như Knoworld City) =================
  const hemi = new THREE.HemisphereLight('#8d8fd8', '#211d38', 0.75); scene.add(hemi);
  const amb = new THREE.AmbientLight('#3a3560', 0.35); scene.add(amb);
  const moon = new THREE.DirectionalLight('#b9c2ff', 0.75);
  moon.position.set(-40, 90, 30); moon.castShadow = !small;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 300 });
  moon.shadow.bias = -0.0008;
  scene.add(moon, moon.target);
  const sun = new THREE.DirectionalLight('#fff4e0', 0);
  sun.position.set(60, 80, 20);
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 300 });
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);
  const warm = new THREE.PointLight('#ffcf7a', 1.2, 46, 2); warm.position.set(0, 16, 0); scene.add(warm);

  // ================= helpers =================
  const boxG = new THREE.BoxGeometry(1, 1, 1);
  const planeG = new THREE.PlaneGeometry(1, 1);
  const mats = {};
  const mat = (c) => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));
  const bmats = {};
  const neon = (c, o) => (o ? new THREE.MeshBasicMaterial(Object.assign({ color: c }, o)) : (bmats[c] || (bmats[c] = new THREE.MeshBasicMaterial({ color: c }))));
  function box(x, y, z, w, h, d, c, parent, noShadow) {
    const m = new THREE.Mesh(boxG, typeof c === 'string' ? mat(c) : c);
    m.scale.set(w, h, d); m.position.set(x, y + h / 2, z);
    if (!noShadow) { m.castShadow = true; m.receiveShadow = true; }
    (parent || scene).add(m); return m;
  }
  const nbox = (x, y, z, w, h, d, c, parent) => box(x, y, z, w, h, d, neon(c), parent, true);
  function cyl(x, y, z, r, h, c, parent, seg, r2) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r2 == null ? r : r2, r, h, seg || 16), typeof c === 'string' ? mat(c) : c);
    m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; (parent || scene).add(m); return m;
  }
  function canvasTex(cw, ch, draw) {
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    draw(c.getContext('2d'), cw, ch);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  const glows = [];
  const glowTex = canvasTex(128, 128, (x) => {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  });
  function glow(x, y, z, s, c, parent, op) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, opacity: op == null ? 0.8 : op, blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.position.set(x, y, z); sp.scale.set(s, s, 1); (parent || scene).add(sp); glows.push({ m: sp.material, o: sp.material.opacity }); return sp;
  }
  function floorGlow(x, y, z, w, d, c, op, parent) {
    const p = new THREE.Mesh(planeG, new THREE.MeshBasicMaterial({ map: glowTex, color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
    p.rotation.x = -Math.PI / 2; p.scale.set(w, d, 1); p.position.set(x, y, z); (parent || scene).add(p); glows.push({ m: p.material, o: op }); return p;
  }
  function textSprite(text, color, h, parent) {
    const t = canvasTex(512, 128, (x, w, hh) => {
      x.font = '700 64px "Space Grotesk", ui-sans-serif, sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = color; x.shadowBlur = 18; x.fillStyle = color; x.fillText(text, w / 2, hh / 2);
      x.shadowBlur = 0; x.fillStyle = '#ffffff'; x.globalAlpha = 0.85; x.fillText(text, w / 2, hh / 2);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    sp.scale.set(h * 4, h, 1); (parent || scene).add(sp); return sp;
  }
  function signPlane(text, w, h, fg, bg, parent) {
    const t = canvasTex(1024, Math.round(1024 * h / w), (x, cw, ch) => {
      x.fillStyle = bg; x.fillRect(0, 0, cw, ch);
      x.strokeStyle = fg; x.lineWidth = Math.max(6, ch * 0.06); x.strokeRect(x.lineWidth, x.lineWidth, cw - 2 * x.lineWidth, ch - 2 * x.lineWidth);
      let s = Math.round(ch * 0.5); x.font = `700 ${s}px "Space Grotesk", sans-serif`;
      while (x.measureText(text).width > cw * 0.86 && s > 14) { s -= 2; x.font = `700 ${s}px "Space Grotesk", sans-serif`; }
      x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = fg; x.shadowBlur = 16; x.fillText(text, cw / 2, ch / 2);
    });
    const m = new THREE.Mesh(planeG, new THREE.MeshBasicMaterial({ map: t }));
    m.scale.set(w, h, 1); (parent || scene).add(m); return m;
  }
  const TREE_C = ['#3f6b5a', '#4a7a62', '#365e55', '#4e6f8a'];
  function tree(x, y, z, parent, s) {
    s = s || 1;
    cyl(x, y, z, 0.12 * s, 0.7 * s, '#4b3c40', parent, 6);
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 * s, 0), mat(pick(TREE_C)));
    c.position.set(x, y + 1.25 * s, z); c.castShadow = true; (parent || scene).add(c);
  }
  const lamps = [];
  function lamp(x, y, z, c, parent) {
    cyl(x, y, z, 0.07, 2.2, '#5d5a78', parent, 6);
    nbox(x, y + 2.2, z, 0.3, 0.18, 0.3, c || '#ffd9a0', parent);
    lamps.push(glow(x, y + 2.3, z, 2.2, c || '#ffbf6b', parent, 0.55));
  }

  // ================= windows (một InstancedMesh) =================
  const WIN_MAX = 9000;
  const winMesh = new THREE.InstancedMesh(boxG, new THREE.MeshBasicMaterial(), WIN_MAX);
  winMesh.count = 0; scene.add(winMesh);
  const winLit = [], winCol = [];
  const DIM = new THREE.Color('#202238');
  const PAL = { warm: ['#ffd27a', '#ffc76b', '#ffe4a8'], cyan: ['#9be7ff', '#ffd27a', '#e8f6ff'], pink: ['#ffb3cc', '#ffd27a', '#ffe4a8'], mint: ['#a8f5cf', '#ffd27a', '#e8fff4'], lav: ['#d6ccff', '#ffd27a', '#9be7ff'] };
  const dummy = new THREE.Object3D();
  function addWin(x, y, z, sx, sy, sz, pal, p) {
    if (winMesh.count >= WIN_MAX) return;
    dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
    const i = winMesh.count++; winMesh.setMatrixAt(i, dummy.matrix);
    winCol[i] = new THREE.Color(pick(PAL[pal] || PAL.warm)); winLit[i] = rand() < p;
  }
  function windows(x, y0, z, w, h, d, pal, p) {
    p = p == null ? 0.6 : p;
    const cols = (len) => Math.max(1, Math.floor((len - 0.4) / 0.8));
    for (let fy = y0 + 0.75; fy + 0.25 < y0 + h - 0.35; fy += 0.95) {
      let n = cols(w), sp = w / n;
      for (let i = 0; i < n; i++) { const xx = x - w / 2 + sp * (i + 0.5); addWin(xx, fy, z + d / 2 + 0.03, 0.38, 0.48, 0.05, pal, p); addWin(xx, fy, z - d / 2 - 0.03, 0.38, 0.48, 0.05, pal, p); }
      n = cols(d); sp = d / n;
      for (let i = 0; i < n; i++) { const zz = z - d / 2 + sp * (i + 0.5); addWin(x + w / 2 + 0.03, fy, zz, 0.05, 0.48, 0.38, pal, p); addWin(x - w / 2 - 0.03, fy, zz, 0.05, 0.48, 0.38, pal, p); }
    }
  }
  const BODY = ['#2a2c48', '#30324f', '#272943', '#35304f', '#2c2f4d'];
  function bldg(x, y, z, w, d, h, cap, pal, parent) {
    box(x, y, z, w, h, d, pick(BODY), parent);
    windows(x, y, z, w, h, d, pal);
    if (cap) nbox(x, y + h, z, w * 0.98, 0.14, d * 0.98, cap, parent);
    else box(x, y + h, z, w * 0.8, 0.5, d * 0.8, '#3b3d5a', parent);
    if (h > 7 && rand() < 0.5) { cyl(x + w * 0.2, y + h, z - d * 0.2, 0.05, 1.6, '#8b8aa6', parent, 4); blinkers.push(nbox(x + w * 0.2, y + h + 1.6, z - d * 0.2, 0.18, 0.18, 0.18, '#ff4a5a', parent)); }
  }
  const blinkers = [], spinners = [], bobbers = [];

  // ================= khối đất lơ lửng =================
  const HALF = 58, Y0 = 0.35;
  box(0, -3.2, 0, HALF * 2, 3.2, HALF * 2, '#232540');
  box(0, -4.6, 0, HALF * 2 + 3, 1.6, HALF * 2 + 3, '#1a1b30');
  box(0, -7.2, 0, HALF * 2 - 10, 2.6, HALF * 2 - 10, '#15162a');
  for (const s of [-1, 1]) {
    nbox(0, -3.05, s * (HALF + 1.55), HALF * 2 + 3, 0.08, 0.06, '#6f63d9');
    nbox(s * (HALF + 1.55), -3.05, 0, 0.06, 0.08, HALF * 2 + 3, '#6f63d9');
  }
  floorGlow(0, -9, 0, 170, 170, '#5844d9', 0.35);

  // ================= đường: vành đai + 4 trục =================
  const RING = 16, RW2 = 2.3;
  const road = (x, z, w, d) => box(x, 0, z, w, 0.06, d, '#15162a', null, true);
  for (const s of [-1, 1]) { road(0, s * RING, RING * 2 + RW2 * 2, RW2 * 2); road(s * RING, 0, RW2 * 2, RING * 2 + RW2 * 2); }
  for (const s of [-1, 1]) { road(s * (RING + HALF) / 2, 0, HALF - RING, RW2 * 2); road(0, s * (RING + HALF) / 2, RW2 * 2, HALF - RING); }
  const dash = (x, z, alongX) => box(x, 0.06, z, alongX ? 0.8 : 0.1, 0.02, alongX ? 0.1 : 0.8, '#d8d4c4', null, true);
  for (let t = -RING + 1.5; t < RING - 1; t += 1.7) for (const s of [-1, 1]) { dash(t, s * RING, true); dash(s * RING, t, false); }
  for (let t = RING + 3; t < HALF - 0.6; t += 1.7) for (const s of [-1, 1]) { dash(s * t, 0, true); dash(0, s * t, false); }

  // cổng vòm neon trên 4 trục (giống cầu vòm của Knoworld City)
  for (const [ax, s] of [['x', 1], ['x', -1], ['z', 1], ['z', -1]]) {
    for (const off of [0, 1.4]) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.12, 6, 36, Math.PI), neon('#ff8fb1'));
      const d = (RING + 4.5 + off) * s;
      if (ax === 'x') { arc.position.set(d, 0, 0); arc.rotation.y = Math.PI / 2; } else arc.position.set(0, 0, d);
      scene.add(arc);
    }
  }

  // ================= các khu =================
  const groups = {};
  for (const d of CC_DISTRICTS) {
    const g = new THREE.Group(); g.userData.key = d.id; scene.add(g); groups[d.id] = g;
    const hs = d.size / 2;
    box(d.cx, 0, d.cz, d.size, Y0, d.size, '#' + new THREE.Color('#2c2e4c').lerp(new THREE.Color(d.color), d.id === 'hub' ? 0.2 : 0.14).getHexString(), g);
    // viền neon màu khu
    for (const s of [-1, 1]) {
      nbox(d.cx, Y0 - 0.06, d.cz + s * (hs + 0.04), d.size, 0.06, 0.06, d.color, g);
      nbox(d.cx + s * (hs + 0.04), Y0 - 0.06, d.cz, 0.06, 0.06, d.size, d.color, g);
    }
    floorGlow(d.cx, Y0 + 0.02, d.cz, d.size * 1.1, d.size * 1.1, d.color, 0.08, g);
  }
  const Y = Y0;

  // ---------- Trung tâm Sáng tạo (gom toàn bộ) ----------
  {
    const g = groups.hub, c = D.hub.color;
    cyl(0, Y, 0, 8.5, 0.3, '#3d3868', g, 40);
    const ringPlaza = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.08, 6, 64), neon(c)); ringPlaza.rotation.x = -Math.PI / 2; ringPlaza.position.y = Y + 0.32; g.add(ringPlaza);
    // 4 lối đi tô màu theo 4 khu
    for (const id of ['guess', 'draw', 'wall', 'plaza']) {
      const t = D[id]; const a = Math.atan2(t.cz, t.cx);
      for (let k = 0; k < 5; k++) { const r = 3.8 + k * 1.05; nbox(Math.cos(a) * r, Y + 0.3, Math.sin(a) * r, 0.5, 0.04, 0.5, t.color, g); }
    }
    // tháp trung tâm
    cyl(0, Y + 0.3, 0, 3.6, 1.2, '#2b2a4a', g, 24);
    cyl(0, Y + 1.5, 0, 2.6, 11, '#2e2c50', g, 20, 2.1);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; nbox(Math.cos(a) * 2.45, Y + 2, Math.sin(a) * 2.45, 0.12, 9.5, 0.12, i % 2 ? c : '#fff1c8', g); }
    for (let fy = Y + 2.4; fy < Y + 12; fy += 1.1) for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + 0.3; const r = 2.6 - (fy - Y - 1.5) / 11 * 0.5 + 0.03;
      dummy.rotation.set(0, -a, 0); addWin(Math.cos(a) * r, fy, Math.sin(a) * r, 0.05, 0.45, 0.36, 'warm', 0.7); dummy.rotation.set(0, 0, 0);
    }
    const rings = [];
    for (const [hy, r, col] of [[Y + 5, 3.6, D.guess.color], [Y + 7.5, 3.3, D.draw.color], [Y + 10, 3.0, D.wall.color], [Y + 12.2, 2.7, D.plaza.color]]) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 6, 48), neon(col)); t.position.y = hy; t.rotation.x = Math.PI / 2 + (rand() - 0.5) * 0.4; g.add(t); rings.push(t);
      spinners.push({ o: t, ax: 'z', v: 0.4 + rand() * 0.5 });
    }
    // bóng đèn ý tưởng trên đỉnh
    cyl(0, Y + 12.5, 0, 1.0, 1.4, '#9a98b5', g, 14, 1.2);
    for (let k = 0; k < 3; k++) nbox(0, Y + 12.7 + k * 0.42, 0, 2.35 - k * 0.1, 0.06, 2.35 - k * 0.1, '#6f6d8f', g);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(2.1, 24, 18), neon('#ffe9a8')); bulb.position.set(0, Y + 15.6, 0); bulb.scale.set(1, 1.12, 1); g.add(bulb);
    const fil = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 6, 20, Math.PI), neon('#ff9a3c')); fil.position.set(0, Y + 15.3, 0); g.add(fil);
    const bulbGlow = glow(0, Y + 15.6, 0, 16, '#ffd27a', g, 0.7);
    bobbers.push({ o: bulbGlow, y: Y + 15.6, amp: 0.0, pulse: true });
    // 4 khối màu bay quanh bóng đèn = 4 khu
    const orbit = new THREE.Group(); orbit.position.set(0, Y + 15.6, 0); g.add(orbit);
    ['guess', 'draw', 'wall', 'plaza'].forEach((id, i) => {
      const a = i / 4 * Math.PI * 2; const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), neon(D[id].color));
      m.position.set(Math.cos(a) * 3.6, Math.sin(a * 2) * 0.6, Math.sin(a) * 3.6); orbit.add(m); spinners.push({ o: m, ax: 'y', v: 2 });
    });
    spinners.push({ o: orbit, ax: 'y', v: 0.5 });
    // 4 mô hình thu nhỏ của 4 khu ở 4 góc trung tâm
    const mini = (id, x, z) => {
      const col = D[id].color;
      cyl(x, Y, z, 1.6, 0.5, '#24223e', g, 16); nbox(x, Y + 0.5, z, 2.6, 0.05, 0.05, col, g);
      if (id === 'guess') { box(x, Y + 0.5, z, 1.8, 1.2, 1.2, '#2b2f4a', g); const l = cyl(x, Y + 0.6, z + 0.9, 0.45, 0.6, '#1c2236', g); l.rotation.x = Math.PI / 2; l.position.y = Y + 1.1; nbox(x, Y + 1.1, z + 1.21, 0.6, 0.6, 0.02, col, g); }
      if (id === 'draw') { cyl(x, Y + 0.5, z, 0.35, 2.6, '#ffc94a', g, 6); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 6), mat('#f3d2a2')); tip.position.set(x, Y + 3.5, z); g.add(tip); cyl(x, Y + 0.5, z, 0.36, 0.35, col, g, 6); }
      if (id === 'wall') { box(x, Y + 0.5, z, 2.2, 1.8, 0.2, '#e8e3d6', g); nbox(x - 0.45, Y + 1.0, z + 0.11, 0.8, 1.0, 0.02, col, g); nbox(x + 0.55, Y + 0.95, z + 0.11, 0.7, 0.6, 0.02, '#ffd27a', g); nbox(x + 0.55, Y + 1.7, z + 0.11, 0.7, 0.4, 0.02, '#7ee8ff', g); }
      if (id === 'plaza') { const cl = new THREE.Group(); cl.position.set(x, Y + 2.2, z); g.add(cl); for (const [ox, oy, r] of [[-0.6, 0, 0.6], [0.3, 0.2, 0.8], [0.95, -0.1, 0.5]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), neon(col)); s.position.set(ox, oy, 0); cl.add(s); } bobbers.push({ o: cl, y: Y + 2.2, amp: 0.25 }); }
      glow(x, Y + 1.6, z, 4.5, col, g, 0.35);
    };
    mini('guess', -9.6, -9.6); mini('draw', 9.6, -9.6); mini('wall', -9.6, 9.6); mini('plaza', 9.6, 9.6);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.26; if (i % 3 === 1) lamp(Math.cos(a) * 7.4, Y + 0.3, Math.sin(a) * 7.4, '#ffd9a0', g); }
    const s = signPlane('CREATIVE HUB', 7, 1.2, '#ffd27a', '#15121c', g); s.position.set(0, Y + 3.0, 3.65);
    const s2 = signPlane('CREATIVE HUB', 7, 1.2, '#ffd27a', '#15121c', g); s2.position.set(3.65, Y + 3.0, 0); s2.rotation.y = Math.PI / 2;
  }

  // ---------- Phòng Ảnh Lạ (máy ảnh khổng lồ) ----------
  {
    const d = D.guess, g = groups.guess, x0 = d.cx, z0 = d.cz, c = d.color;
    const bx = x0 + 2, bz = z0 + 1;
    box(bx, Y, bz, 13, 7.5, 8, '#2a2d48', g);
    windows(bx, Y, bz, 13, 7.5, 8, 'cyan', 0.35);
    box(bx - 3.5, Y + 7.5, bz, 4, 1.6, 4.5, '#33375a', g);           // ống ngắm
    nbox(bx - 3.5, Y + 8.1, bz + 2.28, 2.2, 0.7, 0.04, '#bfefff', g);
    box(bx + 3.8, Y + 7.5, bz + 1.2, 1.6, 0.7, 1.6, '#3b3f63', g);     // nút chụp
    nbox(bx + 3.8, Y + 8.2, bz + 1.2, 1.2, 0.12, 1.2, '#ff5a6e', g);
    nbox(bx + 5.2, Y + 6.1, bz + 4.02, 1.8, 0.9, 0.04, '#ffffff', g);  // đèn flash
    const lensZ = bz + 4;
    for (const [r, len, col] of [[3.4, 1.0, '#1f2238'], [3.0, 2.2, '#262a45'], [2.6, 3.2, '#1c1f36']]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 36), mat(col)); l.rotation.x = Math.PI / 2; l.position.set(bx, Y + 3.8, lensZ + len / 2); l.castShadow = true; g.add(l);
    }
    for (const [r, zz] of [[3.4, lensZ + 1.0], [3.0, lensZ + 2.2], [2.6, lensZ + 3.2]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.08, 6, 48), neon(c)); t.position.set(bx, Y + 3.8, zz); g.add(t); }
    const glass = new THREE.Mesh(new THREE.CircleGeometry(2.3, 36), neon('#123a5a')); glass.position.set(bx, Y + 3.8, lensZ + 3.22); g.add(glass);
    const iris = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.2, 6), neon('#7ee8ff', { transparent: true, opacity: 0.8 })); iris.position.set(bx, Y + 3.8, lensZ + 3.24); g.add(iris);
    spinners.push({ o: iris, ax: 'z', v: 0.6 });
    glow(bx, Y + 3.8, lensZ + 3.6, 9, c, g, 0.5);
    const s = signPlane('ẢNH LẠ', 6, 1.2, c, '#0e1220', g); s.position.set(bx + 6.53, Y + 5.5, bz); s.rotation.y = Math.PI / 2;
    // dấu ? bay lơ lửng
    for (const [qx, qz, qh] of [[x0 - 9, z0 + 9, 6], [x0 + 10, z0 - 9, 8], [x0 - 10, z0 - 3, 5]]) { const q = textSprite('?', c, 2.4, g); q.position.set(qx, Y + qh, qz); bobbers.push({ o: q, y: Y + qh, amp: 0.5 }); }
    // nhà xung quanh
    for (const [px, pz, w, dd, h] of [[-11, -11, 5, 5, 9], [-4, -11.5, 4, 4, 5], [5, -11, 5, 4, 12], [11.5, -10.5, 4, 5, 7], [-11.5, -3, 4, 5, 6], [-11, 6, 5, 4, 10], [11.5, -2, 4, 4, 5]])
      bldg(x0 + px, Y, z0 + pz, w, dd, h, c, 'cyan', g);
    for (let i = 0; i < 6; i++) tree(x0 - 6 + i * 3.4, Y, z0 + 12, g);
    lamp(x0 - 3, Y, z0 + 10.5, null, g); lamp(x0 + 7, Y, z0 + 10.5, null, g);
  }

  // ---------- Xưởng Vẽ Thương Hiệu (bút chì + bảng màu) ----------
  {
    const d = D.draw, g = groups.draw, x0 = d.cx, z0 = d.cz, c = d.color;
    const px = x0 - 4, pz = z0 - 2;
    cyl(px, Y, pz, 2.4, 1.8, '#ff8fb1', g, 6);                       // tẩy
    cyl(px, Y + 1.8, pz, 2.45, 0.9, '#c9c9d6', g, 6);                // đai kim loại
    cyl(px, Y + 2.7, pz, 2.4, 14, '#ffc94a', g, 6);                  // thân bút
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; nbox(px + Math.cos(a) * 2.1, Y + 2.9, pz + Math.sin(a) * 2.1, 0.08, 13.5, 0.08, '#e0a92c', g); }
    for (let fy = Y + 3.6; fy < Y + 16; fy += 1.2) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; addWin(px + Math.cos(a) * 2.12, fy, pz + Math.sin(a) * 2.12, 0.3, 0.45, 0.3, 'pink', 0.6); }
    const wood = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4, 6), mat('#f3d2a2')); wood.position.set(px, Y + 18.7, pz); wood.castShadow = true; g.add(wood);
    const lead = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.25, 6), neon('#3a2f4a')); lead.position.set(px, Y + 20.15, pz); g.add(lead);
    blinkers.push(nbox(px, Y + 20.8, pz, 0.2, 0.2, 0.2, '#ff8fb1', g));
    // bảng màu
    const pal = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.5, 40), mat('#e8c89a')); pal.scale.set(1, 1, 0.75); pal.position.set(x0 + 6, Y + 0.25, z0 + 6); pal.castShadow = true; pal.receiveShadow = true; g.add(pal);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.52, 20), mat('#2c2e4c')); hole.position.set(x0 + 8.8, Y + 0.25, z0 + 7.6); g.add(hole);
    ['#ff5a6e', '#ffd27a', '#5ee0a0', '#7ee8ff', '#c6bfff', '#ff8fb1'].forEach((col, i) => {
      const a = -0.6 + i * 0.62; const b = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 10), neon(col)); b.scale.set(1, 0.45, 1);
      b.position.set(x0 + 6 + Math.cos(a) * 3.4, Y + 0.6, z0 + 6 + Math.sin(a) * 2.4); g.add(b); glow(b.position.x, Y + 1, b.position.z, 2.4, col, g, 0.4);
    });
    // cọ vẽ nghiêng
    const brush = new THREE.Group(); brush.position.set(x0 + 2.5, Y, z0 + 9.5); brush.rotation.z = -0.5; brush.rotation.y = 0.6; g.add(brush);
    cyl(0, 0, 0, 0.22, 7, '#7b4a3a', brush, 10, 0.16); cyl(0, 7, 0, 0.3, 0.9, '#c9c9d6', brush, 10);
    const bristle = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.6, 10), neon(c)); bristle.position.set(0, 8.7, 0); brush.add(bristle);
    // xưởng + nhà xung quanh
    box(x0 + 7, Y, z0 - 8, 9, 4.5, 7, '#2f2c4c', g); windows(x0 + 7, Y, z0 - 8, 9, 4.5, 7, 'pink', 0.65);
    for (let k = 0; k < 4; k++) { const r = box(x0 + 3.5 + k * 2.3, Y + 4.5, z0 - 8, 2.2, 1.4, 7, '#3b3760', g); r.rotation.z = 0.5; nbox(x0 + 3.0 + k * 2.3, Y + 4.7, z0 - 4.48, 1.6, 0.9, 0.04, '#ffd6e4', g); }
    const s = signPlane('XƯỞNG VẼ', 6, 1.2, c, '#1a0f18', g); s.position.set(x0 + 11.53, Y + 3, z0 - 8); s.rotation.y = Math.PI / 2;
    for (const [bx, bz, w, dd, h] of [[-11, -11, 5, 5, 8], [-11.5, 4, 4, 5, 6], [-11, 11, 5, 4, 10], [12, 3, 4, 5, 7], [12, 10, 4, 4, 5]])
      bldg(x0 + bx, Y, z0 + bz, w, dd, h, c, 'pink', g);
    for (let i = 0; i < 4; i++) tree(x0 - 6 + i * 3, Y, z0 + 12.2, g);
    lamp(x0 + 1, Y, z0 + 2, null, g);
  }

  // ---------- Phòng Tranh (gallery + tường Pinterest) ----------
  {
    const d = D.wall, g = groups.wall, x0 = d.cx, z0 = d.cz, c = d.color;
    const ART = ['#ff8fb1', '#ffd27a', '#7ee8ff', '#5ee0a0', '#c6bfff', '#ffb876', '#ff5a6e'];
    const artTex = (sd) => canvasTex(128, 160, (x, w, h) => {
      let s = sd; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
      x.fillStyle = '#f4efe4'; x.fillRect(0, 0, w, h);
      for (let k = 0; k < 6; k++) { x.fillStyle = ART[(r() * ART.length) | 0]; x.globalAlpha = 0.85; x.beginPath();
        if (r() < 0.5) x.arc(r() * w, r() * h, 12 + r() * 36, 0, Math.PI * 2); else x.rect(r() * w * 0.8, r() * h * 0.8, 20 + r() * 60, 14 + r() * 50); x.fill(); }
      x.globalAlpha = 1; x.strokeStyle = '#2a2440'; x.lineWidth = 5; x.beginPath(); x.moveTo(10, h * r()); x.bezierCurveTo(w * 0.3, h * r(), w * 0.6, h * r(), w - 10, h * r()); x.stroke();
    });
    // nhà gallery mái răng cưa
    const gx = x0 - 1, gz = z0 - 2;
    box(gx, Y, gz, 16, 5, 9, '#ece6d8', g);
    for (let k = 0; k < 5; k++) { const r = box(gx - 6.4 + k * 3.2, Y + 5, gz, 3, 1.6, 9.2, '#cfc7b6', g); r.rotation.z = 0.45; nbox(gx - 7.0 + k * 3.2, Y + 5.3, gz + 4.62, 2.2, 1.0, 0.04, '#fff3c8', g); }
    // tranh trên mặt tiền
    for (let k = 0; k < 4; k++) {
      const fx = gx - 5.4 + k * 3.6;
      box(fx, Y + 1.0, gz + 4.52, 2.7, 3.2, 0.12, '#2a2440', g, true);
      const p = new THREE.Mesh(planeG, new THREE.MeshBasicMaterial({ map: artTex(17 + k * 31) })); p.scale.set(2.3, 2.8, 1); p.position.set(fx, Y + 2.6, gz + 4.6); g.add(p);
    }
    const s = signPlane('PHÒNG TRANH', 7, 1.1, c, '#0d1a14', g); s.position.set(gx + 8.03, Y + 3.6, gz); s.rotation.y = Math.PI / 2;
    // tường Pinterest (toà cao, mặt tiền là lưới ảnh)
    const tx = x0 + 9, tz = z0 + 6;
    box(tx, Y, tz, 6, 13, 6, '#2b3a3a', g);
    const pin = canvasTex(256, 512, (x, w, h) => {
      x.fillStyle = '#132420'; x.fillRect(0, 0, w, h);
      const cols = 3, gw = (w - 16) / cols; let ys = [8, 8, 8]; let k = 0;
      while (Math.min(...ys) < h) { const ci = ys.indexOf(Math.min(...ys)); const hh = 40 + ((k * 37) % 70); x.fillStyle = ART[k % ART.length]; x.globalAlpha = 0.9;
        x.fillRect(8 + ci * gw + 3, ys[ci], gw - 6, hh); ys[ci] += hh + 6; k++; }
    });
    for (const [px, pz, ry] of [[tx, tz + 3.02, 0], [tx + 3.02, tz, Math.PI / 2]]) { const p = new THREE.Mesh(planeG, new THREE.MeshBasicMaterial({ map: pin })); p.scale.set(5.4, 12, 1); p.position.set(px, Y + 6.8, pz); p.rotation.y = ry; g.add(p); }
    nbox(tx, Y + 13, tz, 6, 0.14, 6, c, g);
    const heart = textSprite('♥', '#ff5a6e', 2.2, g); heart.position.set(tx, Y + 15, tz); bobbers.push({ o: heart, y: Y + 15, amp: 0.4 });
    // giá vẽ ngoài sân
    for (let k = 0; k < 3; k++) {
      const ex = x0 - 8 + k * 4.2, ez = z0 + 8;
      for (const s2 of [-1, 1]) { const leg = box(ex + s2 * 0.6, Y, ez, 0.12, 3, 0.12, '#8a6a52', g); leg.rotation.z = s2 * 0.15; }
      const p = new THREE.Mesh(planeG, new THREE.MeshBasicMaterial({ map: artTex(101 + k * 13) })); p.scale.set(1.9, 2.3, 1); p.position.set(ex, Y + 2.4, ez + 0.1); p.rotation.x = -0.12; g.add(p);
    }
    for (const [bx, bz, w, dd, h] of [[-11, -11.5, 5, 4, 7], [2, -11.5, 5, 4, 10], [11.5, -10, 4, 5, 6], [11.5, -3, 4, 4, 8], [-11.5, 11, 4, 4, 5]])
      bldg(x0 + bx, Y, z0 + bz, w, dd, h, c, 'mint', g);
    for (let i = 0; i < 5; i++) tree(x0 - 12 + i * 3, Y, z0 + 4.5, g, 0.9);
    lamp(x0 - 3, Y, z0 + 11, null, g); lamp(x0 + 4, Y, z0 + 11, null, g);
  }

  // ---------- Quảng trường (word cloud + sân khấu) ----------
  {
    const d = D.plaza, g = groups.plaza, x0 = d.cx, z0 = d.cz, c = d.color;
    const tiles = canvasTex(256, 256, (x, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#3a3660' : '#322e55'; x.fillRect(i * 32, j * 32, 32, 32); } });
    tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(4, 4);
    const fl = new THREE.Mesh(planeG, new THREE.MeshLambertMaterial({ map: tiles })); fl.rotation.x = -Math.PI / 2; fl.scale.set(20, 20, 1); fl.position.set(x0 - 1, Y + 0.02, z0 - 1); fl.receiveShadow = true; g.add(fl);
    // đài phun nước
    cyl(x0 - 1, Y, z0 - 1, 3.2, 0.6, '#4a4672', g, 32); cyl(x0 - 1, Y + 0.6, z0 - 1, 2.8, 0.05, neon('#7ee8ff', { transparent: true, opacity: 0.6 }), g, 32);
    cyl(x0 - 1, Y + 0.6, z0 - 1, 0.5, 1.8, '#5a5688', g, 12);
    const jet = glow(x0 - 1, Y + 3, z0 - 1, 5, '#9be7ff', g, 0.6); bobbers.push({ o: jet, y: Y + 3, amp: 0.3 });
    // sân khấu + màn LED
    box(x0 - 8, Y, z0 - 9, 9, 1.0, 5, '#2a2748', g);
    nbox(x0 - 8, Y + 1.0, z0 - 6.48, 9, 0.08, 0.06, c, g);
    box(x0 - 8, Y + 1, z0 - 11, 9.5, 6.5, 0.6, '#1d1b33', g);
    const led = canvasTex(512, 320, (x, w, h) => {
      x.fillStyle = '#0d0b1c'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#c6bfff'; x.font = '600 34px "Space Grotesk", sans-serif'; x.textAlign = 'center'; x.fillText('Sáng tạo với em là…', w / 2, 56);
      const W = [['góc nhìn', 54, '#ffd27a'], ['tự do', 40, '#ff8fb1'], ['màu sắc', 46, '#7ee8ff'], ['ý tưởng', 62, '#5ee0a0'], ['vui', 36, '#ffb876'], ['khác biệt', 38, '#c6bfff']];
      const P = [[w / 2, 160], [130, 130], [380, 120], [250, 230], [100, 230], [400, 230]];
      W.forEach(([t, s, col], i) => { x.font = `700 ${s}px "Space Grotesk", sans-serif`; x.fillStyle = col; x.fillText(t, P[i][0], P[i][1] + s / 3); });
    });
    const scr = new THREE.Mesh(planeG, new THREE.MeshBasicMaterial({ map: led })); scr.scale.set(8.6, 5.4, 1); scr.position.set(x0 - 8, Y + 4.4, z0 - 10.68); g.add(scr);
    glow(x0 - 8, Y + 4.4, z0 - 9.8, 14, c, g, 0.25);
    // chữ bay lơ lửng (word cloud 3D)
    const WORDS = [['SÁNG TẠO', '#ffd27a', 1.6], ['Ý TƯỞNG', '#5ee0a0', 1.2], ['GÓC NHÌN', '#7ee8ff', 1.2], ['MÀU SẮC', '#ff8fb1', 1.1], ['CẢM HỨNG', '#c6bfff', 1.1], ['VUI', '#ffb876', 1.0], ['TỰ DO', '#9be7ff', 0.9]];
    WORDS.forEach(([t, col, h], i) => {
      const a = i / WORDS.length * Math.PI * 2; const sp = textSprite(t, col, h, g);
      const yy = Y + 6 + (i % 3) * 1.8; sp.position.set(x0 - 1 + Math.cos(a) * 5.5, yy, z0 - 1 + Math.sin(a) * 5.5);
      bobbers.push({ o: sp, y: yy, amp: 0.45, ph: i });
    });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; tree(x0 - 1 + Math.cos(a) * 9.5, Y, z0 - 1 + Math.sin(a) * 9.5, g, 1.1); }
    for (const [lx, lz] of [[-5, 4], [3, 4], [4, -5], [-5, -5]]) lamp(x0 - 1 + lx, Y, z0 - 1 + lz, '#d6ccff', g);
    for (const [bx, bz, w, dd, h] of [[11.5, -11, 4, 5, 11], [11.5, -3, 4, 4, 6], [11.5, 5, 4, 4, 8], [4, 12, 5, 4, 5], [-11, 12, 5, 4, 7]])
      bldg(x0 + bx, Y, z0 + bz, w, dd, h, c, 'lav', g);
  }

  // ================= khu phố nền giữa các khu =================
  const FILL = new THREE.Group(); scene.add(FILL);
  for (const [ax, s, side] of [['x', 1, 1], ['x', 1, -1], ['x', -1, 1], ['x', -1, -1], ['z', 1, 1], ['z', 1, -1], ['z', -1, 1], ['z', -1, -1]]) {
    for (let t = 21; t < 55; t += 5.6) {
      const a = t * s, b = side * (3.8 + rand() * 0.6);
      const w = 3 + rand() * 1.6, dd = 3 + rand() * 1.6, h = 1.6 + rand() * 3.6;
      for (const k of [0, 1]) {
        const off = b + side * k * 6.2;
        if (Math.abs(off) > 16.5) continue;
        const x = ax === 'x' ? a : off, z = ax === 'x' ? off : a;
        box(x, 0, z, w + 1.2, 0.2, dd + 1.2, '#2a2b44', FILL, true);
        if (rand() < 0.38) { tree(x, 0.2, z, FILL); tree(x + 1, 0.2, z + 1, FILL, 0.8); continue; }
        bldg(x, 0.2, z, w, dd, h + k * 1.2, rand() < 0.2 ? pick(['#7ee8ff', '#ff8fb1', '#c6bfff', '#5ee0a0']) : null, 'warm', FILL);
      }
    }
  }

  // ================= xe chạy (đường vành đai + trục) =================
  const cars = [];
  function makeCar(col) {
    const g = new THREE.Group();
    box(0, 0.1, 0, 1.5, 0.55, 0.8, col, g); box(-0.1, 0.65, 0, 0.8, 0.35, 0.7, '#22243a', g);
    nbox(0.76, 0.3, 0.22, 0.04, 0.12, 0.16, '#fff3c8', g); nbox(0.76, 0.3, -0.22, 0.04, 0.12, 0.16, '#fff3c8', g);
    nbox(-0.76, 0.3, 0.22, 0.04, 0.12, 0.16, '#ff4a5a', g); nbox(-0.76, 0.3, -0.22, 0.04, 0.12, 0.16, '#ff4a5a', g);
    scene.add(g); return g;
  }
  const loopPath = (pts) => { const seg = []; let L = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push({ a, b, l, s: L }); L += l; } return { seg, L }; };
  const r1 = RING - 1.1, r2 = RING + 1.1;
  const PATHS = [loopPath([[-r1, -r1], [r1, -r1], [r1, r1], [-r1, r1]]), loopPath([[r2, -r2], [-r2, -r2], [-r2, r2], [r2, r2]])];
  for (const [ax, s] of [['x', 1], ['x', -1], ['z', 1], ['z', -1]]) {
    const p = (t, o) => (ax === 'x' ? [t * s, o] : [o, t * s]);
    PATHS.push(loopPath([p(RING + 2.5, -1.1), p(HALF - 1.5, -1.1), p(HALF - 1.5, 1.1), p(RING + 2.5, 1.1)]));
  }
  const CAR_C = ['#ff8fb1', '#7ee8ff', '#ffd27a', '#c6bfff', '#e9e6f5', '#5ee0a0', '#ff8f6b'];
  PATHS.forEach((P, pi) => { const n = pi < 2 ? 4 : 2; for (let i = 0; i < n; i++) cars.push({ g: makeCar(pick(CAR_C)), P, s: (i / n) * P.L + rand() * 3, v: 5 + rand() * 3 }); });
  function placeCar(c) {
    const { seg, L } = c.P; c.s = (c.s + L) % L;
    const sg = seg.find((q) => c.s >= q.s && c.s < q.s + q.l) || seg[0];
    const f = (c.s - sg.s) / sg.l; const x = sg.a[0] + (sg.b[0] - sg.a[0]) * f, z = sg.a[1] + (sg.b[1] - sg.a[1]) * f;
    c.g.position.set(x, 0.06, z); c.g.rotation.y = -Math.atan2(sg.b[1] - sg.a[1], sg.b[0] - sg.a[0]);
  }

  // ================= mây khối quanh thành phố =================
  const clouds = [];
  const cloudMat = new THREE.MeshLambertMaterial({ color: '#3a3a5e' });
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group(); const n = 2 + ((rand() * 3) | 0);
    for (let k = 0; k < n; k++) box(k * 3.4 - n * 1.6, rand() * 1.4, (rand() - 0.5) * 3, 4 + rand() * 3, 2.4 + rand() * 1.6, 3.5 + rand() * 2, cloudMat, g, true);
    const a = i / 9 * Math.PI * 2 + rand() * 0.4, r = 78 + rand() * 18;
    g.position.set(Math.cos(a) * r, -6 + rand() * 26, Math.sin(a) * r); scene.add(g); clouds.push({ g, a, r, v: 0.006 + rand() * 0.008 });
  }

  // ================= v71: Lumi lái máy bay bay vòng quanh thành phố =================
  // Vài khối hộp + 1 sprite Lumi, không đổ bóng -> rất nhẹ. Bay vòng tròn hơi lượn, nghiêng cánh khi rẽ.
  const lumiPlane = (() => {
    const g = new THREE.Group(); g.rotation.order = 'YXZ';
    const body = new THREE.Group(); g.add(body); // mũi hướng +x
    box(0, -0.7, 0, 5.2, 1.4, 1.5, '#ff8f6b', body, true); // thân
    box(0.2, -0.15, 0, 5.0, 0.22, 1.54, '#fff4e0', body, true); // sọc
    box(2.9, -0.55, 0, 0.7, 1.1, 1.2, '#ffd27a', body, true); // mũi
    box(-2.6, -0.4, 0, 0.9, 0.9, 1.1, '#ff7a8a', body, true); // đuôi
    box(-2.8, 0.4, 0, 0.8, 1.5, 0.22, '#ff7a8a', body, true); // cánh đuôi đứng
    box(-2.7, -0.15, 0, 0.8, 0.18, 3.0, '#e0566b', body, true); // cánh đuôi ngang
    box(0.3, -0.75, 0, 1.6, 0.22, 8.2, '#e0566b', body, true); // cánh chính
    box(1.4, 0.65, 0, 0.12, 0.6, 1.1, neon('#cdeaff', { transparent: true, opacity: 0.55 }), body, true); // kính chắn gió
    nbox(0.3, -0.72, 4.15, 0.3, 0.25, 0.12, '#5ee0a0', body); nbox(0.3, -0.72, -4.15, 0.3, 0.25, 0.12, '#ff4a5a', body); // đèn mút cánh
    const prop = new THREE.Group(); prop.position.set(3.3, 0, 0); body.add(prop);
    box(0, -0.12, 0, 0.1, 0.24, 3.0, '#3a3157', prop, true); box(0, -1.5, 0, 0.1, 3.0, 0.24, '#3a3157', prop, true);
    const ptex = new THREE.CanvasTexture(document.createElement('canvas'));
    const im = new Image();
    im.onload = () => { const c = document.createElement('canvas'); c.width = 200; c.height = 224; c.getContext('2d').drawImage(im, 0, 0, 200, 224); ptex.image = c; ptex.needsUpdate = true; spr.visible = true; };
    im.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(lumiStaticSvg({ mood: 'happy' }))}`;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: ptex, transparent: true, depthWrite: false }));
    spr.scale.set(2.4, 2.7, 1); spr.position.set(0.2, 0.9, 0); spr.visible = false; spr.renderOrder = 2; body.add(spr);
    scene.add(g);
    return { g, body, prop, a: rand() * Math.PI * 2 };
  })();
  function moveLumiPlane(dt, m) {
    const P = lumiPlane; P.a += dt * 0.16 * m;
    const a = P.a, r = 46 + Math.sin(a * 2) * 6, y = 24 + Math.sin(a * 1.5 + 1) * 3;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const vx = -Math.sin(a) * r + Math.cos(a) * 12 * Math.cos(a * 2), vz = Math.cos(a) * r + Math.sin(a) * 12 * Math.cos(a * 2);
    P.g.position.set(x, y, z);
    P.g.rotation.y = -Math.atan2(vz, vx);
    P.g.rotation.x = -0.28 + Math.sin(a * 2) * 0.08; // nghiêng cánh vào tâm vòng
    P.body.position.y = Math.sin(elapsed * 2) * 0.25;
    P.prop.rotation.x += dt * 30;
  }

  // ================= màu cửa sổ =================
  winMesh.instanceMatrix.needsUpdate = true;
  winMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(WIN_MAX * 3), 3);
  const GLASS_DAY = new THREE.Color('#8ea2b6'), wtmp = new THREE.Color();
  let N = 1; // 1 = đêm, 0 = ban ngày
  const paintWin = (i) => winMesh.setColorAt(i, wtmp.copy(GLASS_DAY).lerp(winLit[i] ? winCol[i] : DIM, N));
  for (let i = 0; i < winMesh.count; i++) paintWin(i);
  winMesh.instanceColor.needsUpdate = true;

  // ================= v69: thời gian & thời tiết thật =================
  // Bảng màu giống Knoworld City (TP.HCM: bình minh ~5:40, hoàng hôn ~17:55).
  const NIGHT = { top: '#04051a', bot: '#1d1a46', hs: '#8d8fd8', hg: '#211d38', hi: 0.75, si: 0, sc: '#ffb07a', n: 1 };
  const DAY = { top: '#4f9ee6', bot: '#cbe7f8', hs: '#dbe8fb', hg: '#5e5a62', hi: 0.8, si: 0.95, sc: '#fff1da', n: 0 };
  const KF = [
    [0, NIGHT], [5.0, NIGHT],
    [5.8, { top: '#2b2d6b', bot: '#c9837e', hs: '#9c89c8', hg: '#2a1f2a', hi: 0.7, si: 0.25, sc: '#ff9a6b', n: 0.85 }],
    [6.6, { top: '#6a9ad8', bot: '#f7c39a', hs: '#ffd2b0', hg: '#5a4a4a', hi: 0.85, si: 0.85, sc: '#ffc08a', n: 0.22 }],
    [8.2, DAY], [15.8, DAY],
    [17.2, { top: '#5a7fc8', bot: '#f6b080', hs: '#ffd0a8', hg: '#5a4848', hi: 0.85, si: 0.95, sc: '#ff9f5e', n: 0.25 }],
    [18.0, { top: '#2f2766', bot: '#e07a6a', hs: '#9a72b0', hg: '#2a1d2a', hi: 0.7, si: 0.28, sc: '#ff7a55', n: 0.82 }],
    [18.9, NIGHT], [24, NIGHT],
  ];
  const RAIN_TOP = new THREE.Color('#4b5260'), RAIN_BOT = new THREE.Color('#8a929c');
  const cb = new THREE.Color();
  function envAt(h, rain) {
    let i = 0; while (i < KF.length - 2 && KF[i + 1][0] <= h) i++;
    const [h0, A] = KF[i], [h1, B] = KF[i + 1];
    const t = h1 === h0 ? 0 : Math.min(1, Math.max(0, (h - h0) / (h1 - h0)));
    const col = (k) => new THREE.Color(A[k]).lerp(cb.set(B[k]), t);
    const num = (k) => A[k] + (B[k] - A[k]) * t;
    const e = { top: col('top'), bot: col('bot'), hs: col('hs'), hg: col('hg'), sc: col('sc'), hi: num('hi'), si: num('si'), n: num('n') };
    const mix = rain * (0.8 - 0.5 * e.n);
    e.top.lerp(RAIN_TOP.clone().multiplyScalar(1 - 0.7 * e.n), mix); e.bot.lerp(RAIN_BOT.clone().multiplyScalar(1 - 0.6 * e.n), mix);
    e.si *= 1 - 0.8 * rain; e.hi *= 1 - 0.25 * rain;
    return e;
  }
  // ban ngày: thân nhà sáng lên (màu đêm -> màu pastel), đêm giữ tông tím than như cũ
  const PASTEL = new THREE.Color('#c9c4e0');
  const matBase = Object.values(mats).filter((m) => m !== cloudMat).map((m) => {
    const hsl = {}; m.color.getHSL(hsl);
    return { m, night: m.color.clone(), day: m.color.clone().lerp(PASTEL, hsl.l > 0.45 ? 0.08 : 0.38) }; // màu sáng (đường, nền) giữ gần như cũ
  });
  const CLOUD_NIGHT = new THREE.Color('#3a3a5e'), CLOUD_DAY = new THREE.Color('#ffffff'), CLOUD_RAIN = new THREE.Color('#6d7482');

  // mưa
  const DROPS = small ? 700 : 1800;
  const rainPos = new Float32Array(DROPS * 6);
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: '#b9d2ea', transparent: true, opacity: 0 });
  const rainLines = new THREE.LineSegments(rainGeo, rainMat); rainLines.frustumCulled = false; rainLines.visible = false; scene.add(rainLines);
  function seedDrop(i, anyY) {
    const x = controls.target.x + (Math.random() - 0.5) * 140, z = controls.target.z + (Math.random() - 0.5) * 140;
    const y = anyY ? Math.random() * 46 : 44 + Math.random() * 4;
    rainPos.set([x, y, z, x + 0.25, y + 1.4, z + 0.1], i * 6);
  }
  for (let i = 0; i < DROPS; i++) seedDrop(i, true);

  const fmtVN = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', month: 'numeric', hour12: false });
  function vnNow() {
    const p = {}; for (const x of fmtVN.formatToParts(new Date())) p[x.type] = x.value;
    return { h: (+p.hour % 24) + (+p.minute) / 60 + (+p.second) / 3600, month: +p.month };
  }
  const VN_MONTH = vnNow().month;
  const autoRain = (h) => (VN_MONTH >= 5 && VN_MONTH <= 11 && h >= 14.5 && h <= 16.8 ? 1 : 0);
  let live = null, rainNow = 0, flash = 0, boltT = 4, hours = vnNow().h;
  {
    let on = true;
    const pull = () => fetchLiveWeather().then((w) => { if (on && w) live = w; }).catch(() => {});
    pull(); const wxT = setInterval(pull, 10 * 60 * 1000); cleanups.push(() => { on = false; clearInterval(wxT); });
  }
  const host = root.parentElement;
  const wxEl = $('wx');
  let lastWx = '';
  function applyEnv(dt) {
    hours = vnNow().h;
    const target = live ? live.rain : autoRain(hours);
    rainNow += (target - rainNow) * Math.min(1, dt * 0.7);
    if (rainNow < 0.001) rainNow = 0;
    flash = Math.max(0, flash - dt * 5);
    const thunder = live ? live.thunder : true;
    if (!reduce && rainNow > 0.85 && thunder) { boltT -= dt; if (boltT <= 0) { flash = 1; boltT = 3 + Math.random() * 6; } }
    const e = envAt(hours, rainNow);
    hemi.color.copy(e.hs); hemi.groundColor.copy(e.hg); hemi.intensity = e.hi + flash * 1.4;
    amb.intensity = 0.35 * (0.6 + 0.4 * e.n);
    sun.color.copy(e.sc); sun.intensity = e.si;
    const a = Math.min(Math.PI, Math.max(0, (hours - 5.7) / (17.95 - 5.7) * Math.PI));
    sun.position.set(-Math.cos(a) * 70, Math.max(Math.sin(a), 0.15) * 80 + 8, 30);
    sun.castShadow = !small && e.si > 0.15;
    moon.intensity = 0.75 * e.n * (1 - 0.6 * rainNow);
    moon.castShadow = !small && !sun.castShadow;
    const n = Math.max(e.n, rainNow * 0.45);
    if (Math.abs(n - N) > 0.004) {
      N = n;
      for (let i = 0; i < winMesh.count; i++) paintWin(i);
      winMesh.instanceColor.needsUpdate = true;
      for (const b of matBase) b.m.color.copy(b.day).lerp(b.night, n);
    }
    warm.intensity = 1.2 * n;
    for (const g of glows) g.m.opacity = g.o * (0.18 + 0.82 * n);
    cloudMat.color.copy(CLOUD_DAY).lerp(e.sc, 0.25 * (1 - e.n)).lerp(CLOUD_NIGHT, e.n).lerp(CLOUD_RAIN, rainNow * 0.75);
    rainMat.opacity = rainNow * 0.7;
    // bầu trời (nền CSS phía sau canvas trong suốt)
    if (host) {
      const st = host.style;
      st.setProperty('--ccsky-top', `#${e.top.getHexString()}`);
      st.setProperty('--ccsky-bot', `#${e.bot.getHexString()}`);
      st.setProperty('--ccstar', String(Math.max(0, e.n - 0.25) * (1 - rainNow) * 1.2));
      st.setProperty('--ccmoon', String(e.n * (1 - 0.8 * rainNow)));
      st.setProperty('--ccsun', String((1 - e.n) * (1 - 0.85 * rainNow)));
      st.setProperty('--ccflash', String(flash * 0.5));
      host.dataset.daylight = e.n < 0.5 ? 'day' : 'night';
    }
    // nhãn giờ & thời tiết
    const hh = Math.floor(hours) % 24, mm = Math.floor((hours % 1) * 60);
    const night = e.n > 0.6;
    let wx;
    if (live) {
      const k = live.kind, tC = live.temp != null ? ` ${Math.round(live.temp)}°C` : '';
      wx = (k === 'storm' ? '⛈ Giông' : k === 'rain' ? '🌧 Mưa' : k === 'drizzle' ? '🌦 Mưa phùn' : k === 'fog' ? '🌫 Sương mù'
        : k === 'overcast' ? '☁️ Nhiều mây' : k === 'cloudy' ? (night ? '☁️ Có mây' : '⛅ Ít mây') : night ? '🌙 Trời quang' : '☀️ Nắng') + tC;
    } else wx = rainNow > 0.35 ? '🌧 Mưa rào' : night ? '🌙 Trời quang' : '☀️ Nắng';
    const txt = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · ${wx}`;
    if (txt !== lastWx) { lastWx = txt; wxEl.textContent = txt; wxEl.title = 'Giờ và thời tiết thật ở TP.HCM'; }
  }
  let envT = 1;

  // ================= nhãn khu, chọn, bay tới =================
  const labelsEl = $('labels'), tip = $('tip');
  const LBL_Y = { hub: 19.5, guess: 11.5, draw: 22.5, wall: 17.5, plaza: 11 };
  const v3 = new THREE.Vector3();
  for (const d of CC_DISTRICTS) {
    const l = document.createElement('button'); l.type = 'button'; l.className = 'ccx-lbl' + (d.id === 'hub' ? ' hub' : '');
    l.innerHTML = `<span class="dot" style="background:${d.color}"></span><span class="nm">${d.name}</span>`;
    l.setAttribute('aria-label', d.name);
    l.addEventListener('click', () => select(d.id));
    labelsEl.appendChild(l); d.lbl = l;
  }
  function placeLabels() {
    const w = RW(), h = RH();
    for (const d of CC_DISTRICTS) {
      v3.set(d.cx, Y + LBL_Y[d.id], d.cz);
      v3.project(camera);
      d.lbl.style.left = ((v3.x + 1) / 2 * w) + 'px';
      d.lbl.style.top = ((1 - v3.y) / 2 * h) + 'px';
      d.lbl.classList.toggle('on', selected === d.id || hovered === d.id);
    }
  }
  let selected = null, hovered = null, fly = null;
  // chừa chỗ cho thẻ thông tin (phải trên máy tính / dưới trên điện thoại) để khu đang xem không bị che
  const pad = { right: 0, bottom: 0 };
  const camUp = new THREE.Vector3(), camRight = new THREE.Vector3();
  function flyTo(t, z) {
    const ppu = RH() * z / vBase; // pixel trên mỗi đơn vị thế giới
    camUp.set(0, 1, 0).applyQuaternion(camera.quaternion); camRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    t = t.clone().addScaledVector(camRight, pad.right / 2 / ppu).addScaledVector(camUp, -pad.bottom / 2 / ppu);
    fly = { t: 0, t0: performance.now(), fromT: controls.target.clone(), toT: t, fromZ: camera.zoom, toZ: z, fromP: camera.position.clone(), toP: t.clone().add(CAM_DIR) };
  }
  function focus(id, notify) {
    const d = CC_DISTRICTS.find((x) => x.id === id);
    selected = d ? d.id : null;
    if (!d) flyTo(HOME_T.clone(), homeZoom());
    else flyTo(new THREE.Vector3(d.cx, d.id === 'hub' ? 4 : 1, d.cz), Math.min(vBase * aspect / ((d.size + 10) * 1.5), vBase / ((d.size + 10) * 1.05)) * (d.id === 'hub' ? 0.7 : 1));
    if (notify !== false) opts.onSelect?.(selected);
  }
  const select = (id) => focus(id, true);
  const pickables = Object.values(groups);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function hit(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(pickables, true).find((q) => q.object.type !== 'Sprite');
    let o = h && h.object; while (o && !o.userData.key) o = o.parent;
    return o ? o.userData.key : null;
  }
  const cv = renderer.domElement; cv.style.cursor = 'grab';
  let down = null;
  const onMove = (e) => {
    if (e.pointerType !== 'mouse' || down) return;
    const k = hit(e); hovered = k; cv.style.cursor = k ? 'pointer' : 'grab';
    if (k) {
      const d = D[k]; tip.hidden = false; tip.innerHTML = `<b>${d.name}</b><span>Bấm để xem</span>`;
      const rr = root.getBoundingClientRect();
      tip.style.left = Math.min(e.clientX - rr.left + 14, RW() - 190) + 'px'; tip.style.top = (e.clientY - rr.top + 14) + 'px';
    } else tip.hidden = true;
  };
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerleave', () => { hovered = null; tip.hidden = true; });
  cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; tip.hidden = true; fly = null; });
  cv.addEventListener('pointerup', (e) => {
    if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
    if (moved > 6) return;
    const k = hit(e); if (k) select(k);
  });

  // ================= vòng lặp =================
  const clock = new THREE.Clock();
  let alive = true, raf = 0, onScreen = true, elapsed = 0, flickT = 0;
  const io = new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; }); io.observe(root); cleanups.push(() => io.disconnect());
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function tick() {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    if (!onScreen || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05); elapsed += dt;
    const m = reduce ? 0.3 : 1;
    for (const c of cars) { c.s += c.v * dt * m; placeCar(c); }
    for (const s of spinners) s.o.rotation[s.ax] += dt * s.v * m;
    for (const b of bobbers) {
      if (b.pulse) { const k = 14 + Math.sin(elapsed * 2.2) * 2.5; b.o.scale.set(k, k, 1); continue; }
      b.o.position.y = b.y + Math.sin(elapsed * 1.6 + (b.ph || 0)) * b.amp * m;
    }
    for (const b of blinkers) b.visible = Math.sin(elapsed * 4) > -0.2;
    for (const c of clouds) { c.a += c.v * dt * m; c.g.position.x = Math.cos(c.a) * c.r; c.g.position.z = Math.sin(c.a) * c.r; }
    moveLumiPlane(dt, m);
    envT += dt; if (envT > 0.25 || flash > 0) { applyEnv(envT); envT = 0; }
    if (rainNow > 0.01) {
      const fall = 32 * dt;
      for (let i = 0; i < DROPS; i++) {
        const o = i * 6; rainPos[o + 1] -= fall; rainPos[o + 4] -= fall; rainPos[o] -= fall * 0.18; rainPos[o + 3] -= fall * 0.18;
        if (rainPos[o + 1] < -8) seedDrop(i, false);
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
    rainLines.visible = rainNow > 0.01;
    flickT += dt;
    if (!reduce && flickT > 0.12) { flickT = 0; for (let k = 0; k < 6; k++) { const i = (Math.random() * winMesh.count) | 0; winLit[i] = !winLit[i]; paintWin(i); } winMesh.instanceColor.needsUpdate = true; }
    if (fly) {
      fly.t = Math.min(1, (performance.now() - fly.t0) / 1000); const e = ease(fly.t);
      controls.target.lerpVectors(fly.fromT, fly.toT, e);
      camera.position.lerpVectors(fly.fromP, fly.toP, e);
      camera.zoom = fly.fromZ + (fly.toZ - fly.fromZ) * e; camera.updateProjectionMatrix();
      if (fly.t >= 1) fly = null;
    }
    controls.update();
    placeLabels();
    renderer.render(scene, camera);
  }

  fit();
  camera.zoom = homeZoom(); camera.updateProjectionMatrix();
  const ro = new ResizeObserver(() => fit()); ro.observe(root); cleanups.push(() => ro.disconnect());
  controls.update(); placeLabels(); applyEnv(1);
  raf = requestAnimationFrame(tick);

  return {
    focus: (id) => focus(id, false),
    setPad(p) { pad.right = p.right || 0; pad.bottom = p.bottom || 0; focus(selected, false); },
    destroy() {
      alive = false; cancelAnimationFrame(raf);
      if (host) ['--ccsky-top', '--ccsky-bot', '--ccstar', '--ccmoon', '--ccsun', '--ccflash'].forEach((k) => host.style.removeProperty(k));
      cleanups.forEach((f) => f());
      controls.dispose(); renderer.dispose(); renderer.forceContextLoss();
      root.innerHTML = '';
    },
  };
}
