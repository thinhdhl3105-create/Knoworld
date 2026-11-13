// v48: Knoworld Metro — 2 tầng hầm (B1, B2) bên dưới Skyline.
// createMetro(K) dựng toàn bộ phần ngầm bằng các helper của createCity và trả về
// { root, levels, pickables, stations, update }.
// Ga, tuyến, toạ độ: xem lib/metroStations.js (gắn chức năng cho ga ở đó).
import { METRO_LEVELS, METRO_LINES, METRO_STATIONS, METRO_FACILITIES } from '@/lib/metroStations';

const SEA = 112, C = 21;          // cùng khung với biển / đáy biển của thành phố
const ST_LEN = 15, ST_HALF_W = 4.5; // kích thước sảnh ga
const CAR = 3.0;                   // chiều dài 1 toa (kể cả khe nối)

export function createMetro(K) {
  const { THREE, box, cyl, sign, neonMat, neonBox, mat, HAS_ADMIN, islands } = K;
  const root = new THREE.Group();
  const levels = {}, pickables = [], stations = [], trains = [], blink = [], walkers = [];
  const sleeperG = new THREE.BoxGeometry(1, 1, 1);

  const tag = (g, key) => g.traverse((o) => { if (o.isMesh) { o.userData.key = key; pickables.push(o); } });

  // ---------- path helpers (axis-aligned polylines) ----------
  function makePath(pts, loop) {
    const P = loop ? pts.slice() : pts.concat(pts.slice(1, -1).reverse()); // tuyến con thoi: đi rồi về
    const segs = []; let L = 0;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      const len = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
      if (len < 1e-6) continue;
      segs.push({ a, b, len, s0: L, dx: Math.sign(b[0] - a[0]), dz: Math.sign(b[1] - a[1]) });
      L += len;
    }
    const at = (s) => {
      s = ((s % L) + L) % L;
      let i = 0; while (i < segs.length - 1 && segs[i].s0 + segs[i].len <= s) i++;
      const g = segs[i], u = s - g.s0;
      return { x: g.a[0] + g.dx * u, z: g.a[1] + g.dz * u, dx: g.dx, dz: g.dz };
    };
    const stopsFor = (pt) => segs.filter((g) => {
      const onX = g.dz === 0 && Math.abs(pt[1] - g.a[1]) < 0.01 && pt[0] >= Math.min(g.a[0], g.b[0]) - 0.01 && pt[0] <= Math.max(g.a[0], g.b[0]) + 0.01;
      const onZ = g.dx === 0 && Math.abs(pt[0] - g.a[0]) < 0.01 && pt[1] >= Math.min(g.a[1], g.b[1]) - 0.01 && pt[1] <= Math.max(g.a[1], g.b[1]) + 0.01;
      return onX || onZ;
    }).map((g) => ({ s: g.s0 + Math.abs(pt[0] - g.a[0]) + Math.abs(pt[1] - g.a[1]), dx: g.dx, dz: g.dz }));
    return { L, at, stopsFor, segs };
  }

  // ---------- earth slab, outlines of the islands above ----------
  for (const LV of METRO_LEVELS) {
    const g = new THREE.Group(); root.add(g);
    const y = LV.y;
    // v49: trần của tầng = đáy tầng phía trên (Skyline: đáy biển ≈ -10.4) — giếng thang cuốn kéo dài tới đó
    const iLv = METRO_LEVELS.indexOf(LV);
    const ceil = iLv === 0 ? -10.4 : METRO_LEVELS[iLv - 1].y - 5;
    levels[LV.id] = { ...LV, g, stations: [], ceil };
    let yy = y - 5;
    for (const [c, h] of [['#2b2320', 1.4], ['#3d3029', 1.3], ['#4e3e31', 1.3], ['#3a3540', 1.0]]) { box(C, yy, C, SEA, h, SEA, c, g, { shadow: false }); yy += h; }
    // gạch nền sàn: các ô ca-rô nhạt để có cảm giác không gian ngầm
    for (let i = 0; i < SEA / 8; i++) for (let j = 0; j < SEA / 8; j++) {
      if ((i + j) % 2 === 0) box(C - SEA / 2 + 4 + i * 8, y, C - SEA / 2 + 4 + j * 8, 7.9, 0.02, 7.9, '#423c48', g, { shadow: false });
    }
    neonBox(C, y - 0.02, C - SEA / 2, SEA, 0.1, 0.12, LV.color, g, '#5a5468');
    neonBox(C - SEA / 2, y - 0.02, C, 0.12, 0.1, SEA, LV.color, g, '#5a5468');
    neonBox(C, y - 0.02, C + SEA / 2, SEA, 0.1, 0.12, LV.color, g, '#5a5468');
    neonBox(C + SEA / 2, y - 0.02, C, 0.12, 0.1, SEA, LV.color, g, '#5a5468');
    // đường viền nét đứt của các đảo phía trên mặt đất
    for (const I of islands) {
      const h = I.half, p = [];
      const cs = [[-h, -h], [h, -h], [h, h], [-h, h]];
      for (let i = 0; i < 4; i++) { const a = cs[i], b = cs[(i + 1) % 4]; p.push(I.cx + a[0], y + 0.06, I.cz + a[1], I.cx + b[0], y + 0.06, I.cz + b[1]); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      const ln = new THREE.LineSegments(geo, new THREE.LineDashedMaterial({ color: I.color, dashSize: 1.2, gapSize: 0.8, transparent: true, opacity: 0.55 }));
      ln.computeLineDistances(); g.add(ln);
    }
    // ống kỹ thuật chạy dọc mép
    for (const [z, c, r] of [[C - SEA / 2 + 2, '#7d6a5a', 0.45], [C - SEA / 2 + 3.4, '#5f7a8a', 0.3]]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(r, r, SEA - 4, 10), mat(c));
      pipe.rotation.z = Math.PI / 2; pipe.position.set(C, y + 0.5 + r, z); g.add(pipe);
    }
    // đá & rễ cây (chỉ B1, gần mặt đất)
    let sd = LV.id === 'b1' ? 7 : 11;
    const rr = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
    for (let i = 0; i < 26; i++) {
      const x = C + (rr() - 0.5) * (SEA - 8), z = C + (rr() - 0.5) * (SEA - 8);
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + rr() * 1.1, 0), mat(['#5b4e44', '#4a4038', '#6a5c50'][i % 3]));
      rock.position.set(x, y + 0.2, z); rock.rotation.set(rr() * 3, rr() * 3, 0); rock.scale.y = 0.6; g.add(rock);
      rock.userData.free = { x, z, r: 1.6 };
    }
  }

  // ---------- tunnels, rails, sleepers ----------
  const sleepers = {};
  for (const LV of METRO_LEVELS) {
    const im = new THREE.InstancedMesh(sleeperG, mat('#5a4a3c'), 1600); im.count = 0; levels[LV.id].g.add(im); sleepers[LV.id] = im;
  }
  const dmy = new THREE.Object3D();
  function sleeper(lv, x, y, z, alongX) {
    const im = sleepers[lv]; if (im.count >= 1600) return;
    dmy.position.set(x, y, z); dmy.scale.set(alongX ? 0.22 : 1.7, 0.08, alongX ? 1.7 : 0.22); dmy.updateMatrix();
    im.setMatrixAt(im.count++, dmy.matrix);
  }
  const wallM = mat('#5c5866'), trenchM = mat('#24222b'), railM = mat('#b9b6c4');

  function tunnel(line, lv, a, b, holes, y, g) {
    const alongX = a[1] === b[1];
    const lo = alongX ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]);
    const hi = alongX ? Math.max(a[0], b[0]) : Math.max(a[1], b[1]);
    const fixed = alongX ? a[1] : a[0];
    const P = (t, o) => (alongX ? [t, fixed + o] : [fixed + o, t]);
    const piece = (t0, t1, o, w, h, yy, m) => {
      const len = t1 - t0; if (len <= 0.01) return;
      const [x, z] = P((t0 + t1) / 2, o);
      box(x, yy, z, alongX ? len : w, h, alongX ? w : len, m, g, { shadow: false });
    };
    const E = 2.25; // kéo dài để các góc khép kín
    piece(lo - E, hi + E, 0, 4.1, 0.14, y, trenchM);
    for (const o of [-0.55, 0.55]) piece(lo - 1.5, hi + 1.5, o, 0.12, 0.1, y + 0.14, railM);
    for (let t = lo - 1; t <= hi + 1; t += 1.1) { const [x, z] = P(t, 0); sleeper(lv, x, y + 0.14, z, alongX); }
    // tường hầm: bỏ trống chỗ có sảnh ga
    const cuts = holes.map(([c]) => [c - ST_LEN / 2, c + ST_LEN / 2]).sort((p, q) => p[0] - q[0]);
    let t = lo - E;
    const walls = [];
    for (const [c0, c1] of cuts) { walls.push([t, c0]); t = c1; }
    walls.push([t, hi + E]);
    for (const [w0, w1] of walls) for (const s of [-1, 1]) {
      piece(w0, w1, s * 2.05, 0.3, s > 0 ? 1.0 : 2.2, y, wallM);              // phía camera thấp hơn để nhìn vào
      piece(w0, w1, s * 1.88, 0.05, 0.07, y + (s > 0 ? 0.85 : 1.9), neonMat(line.color, '#6a6478'));
    }
    // đèn hầm
    for (let k = lo + 3; k < hi - 2; k += 6) {
      if (cuts.some(([c0, c1]) => k > c0 - 1 && k < c1 + 1)) continue;
      const [x, z] = P(k, -1.86);
      neonBox(x, y + 1.55, z, alongX ? 0.6 : 0.08, 0.14, alongX ? 0.08 : 0.6, '#fff1c8', g, '#8d8a80');
    }
  }

  // ---------- station halls ----------
  // v49: người đi bộ — nhóm (chân, thân, đầu) di chuyển qua lại; chân đánh nhịp khi bước
  const COLS = ['#ff9bd2', '#7ee8ff', '#ffd27a', '#b7f07e', '#c6bfff', '#ff8f6b', '#f5f1e8', '#8fb3ff'];
  let wsd = 3;
  const wr = () => { wsd = (wsd * 9301 + 49297) % 233280; return wsd / 233280; };
  function walker(g, o) {
    const w = new THREE.Group(); g.add(w);
    const l1 = box(0, 0, -0.09, 0.14, 0.55, 0.12, '#2a2a34', w, { shadow: false });
    const l2 = box(0, 0, 0.09, 0.14, 0.55, 0.12, '#2a2a34', w, { shadow: false });
    box(0, 0.55, 0, 0.26, 0.55, 0.36, COLS[Math.floor(wr() * COLS.length)], w, { shadow: false });
    box(0, 1.1, 0, 0.24, 0.24, 0.24, wr() < 0.15 ? '#8a5a3c' : '#e7c3a0', w, { shadow: false });
    if (wr() < 0.3) box(-0.2, 0.62, 0, 0.12, 0.34, 0.26, '#3a3442', w, { shadow: false }); // ba lô
    const p = { w, l1, l2, ph: wr() * 6, pause: wr() * 2, v: (0.55 + wr() * 0.6) * (wr() < 0.5 ? -1 : 1), ...o };
    p.t = p.min + wr() * (p.max - p.min);
    walkers.push(p); return p;
  }
  function placeWalker(p) {
    const along = p.alongX, x = along ? p.x0 + p.t : p.x0 + p.o, z = along ? p.z0 + p.o : p.z0 + p.t;
    p.w.position.set(x, p.y + (p.pause > 0 ? 0 : Math.abs(Math.sin(p.ph)) * 0.05), z);
    const dx = along ? Math.sign(p.v) : 0, dz = along ? 0 : Math.sign(p.v);
    p.w.rotation.y = -Math.atan2(dz, dx);
  }
  function hall(st, line, y, alongX, g, ceil) {
    const [px, pz] = st.at;
    const P = (t, o) => (alongX ? [px + t, pz + o] : [px + o, pz + t]);
    const B = (t, o, len, w, h, yy, c, opt) => { const [x, z] = P(t, o); return box(x, yy, z, alongX ? len : w, h, alongX ? w : len, c, g, opt); };
    B(0, 0, ST_LEN, ST_HALF_W * 2, 0.1, y, '#57535e', { shadow: false });
    for (const s of [-1, 1]) {
      B(0, s * 2.9, ST_LEN, 2.7, 0.72, y, '#ddd6ca');                        // sân ga
      B(0, s * 1.62, ST_LEN, 0.18, 0.02, y + 0.72, '#ffd24d', { shadow: false }); // vạch vàng
      for (const t of [-5, 0, 5]) { const [x, z] = P(t, s * 3.6); cyl(x, y + 0.72, z, 0.2, s < 0 ? 2.7 : 0.9, '#c9c2d2', g, 8); }
      for (const t of [-3, 3]) B(t, s * 3.5, 1.4, 0.4, 0.35, y + 0.72, '#8a6a4c');   // ghế
    }
    B(0, -ST_HALF_W, ST_LEN, 0.3, 3.4, y, '#e8e2d6');                          // tường sau (xa camera)
    B(0, -ST_HALF_W + 0.17, ST_LEN, 0.04, 0.22, y + 3.0, neonMat(line.color, '#6a6478'), { shadow: false });
    B(0, ST_HALF_W, ST_LEN, 0.3, 0.95, y, '#cfc9be');                          // lan can phía camera
    // biển tên ga
    const [sx, sz] = P(-1.4, -ST_HALF_W + 0.17);
    sign(st.name.toUpperCase(), sx, y + 2.05, sz, 7.2, 1.0, alongX ? 'z' : 'x', g, { fg: '#ffffff', bg: '#15121c', border: line.color, day: '#ece7f2' });
    const [rx, rz] = P(4.4, -ST_HALF_W + 0.2);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 20), neonMat(line.color, '#7a7090'));
    disc.rotation[alongX ? 'x' : 'z'] = Math.PI / 2; disc.position.set(rx, y + 2.05, rz); g.add(disc);
    // thang cuốn + giếng ánh sáng lên tầng trên
    for (let i = 0; i < 6; i++) B(-ST_LEN / 2 + 0.6 + i * 0.5, -3.4, 0.5, 1.1, 0.72 + i * 0.32, y, '#9c96a8');
    const [ex, ez] = P(-ST_LEN / 2 + 0.6, -3.4);
    const SH = Math.max(9, ceil - y); // v49: giếng sáng nối thẳng lên tầng trên
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 1.4 : 1.6, SH, alongX ? 1.6 : 1.4),
      new THREE.MeshBasicMaterial({ color: line.color, transparent: true, opacity: 0.16, depthWrite: false }));
    shaft.position.set(ex, y + SH / 2, ez); g.add(shaft);
    const cap = neonBox(ex, y + 3.4, ez, alongX ? 1.5 : 1.7, 0.08, alongX ? 1.7 : 1.5, line.color, g, '#6a6478');
    blink.push(cap);
    // hành khách đi lại trên sân ga (2 bên) — v49
    for (let i = 0; i < 6; i++) {
      const s = i % 2 ? 1 : -1;
      walker(g, { alongX, x0: px, z0: pz, o: s * (2.25 + wr() * 0.75), min: -ST_LEN / 2 + 1.1, max: ST_LEN / 2 - 0.9, y: y + 0.72 });
    }
  }

  // ---------- train cars ----------
  function trainCar(color, head) {
    const g = new THREE.Group();
    box(0, 0.22, 0, 2.75, 1.12, 1.15, '#e9e7ee', g, { shadow: false });
    box(0, 1.34, 0, 2.55, 0.1, 0.95, '#bdbac6', g, { shadow: false });
    for (const s of [-1, 1]) {
      neonBox(0, 0.5, s * 0.585, 2.75, 0.14, 0.02, color, g, '#7a7090');
      neonBox(0, 0.88, s * 0.586, 2.35, 0.3, 0.02, '#fff1c8', g, '#8ea2b6');
    }
    if (head) {
      neonBox(1.385, 0.88, 0, 0.02, 0.32, 0.9, '#cfe8ff', g, '#8ea2b6');
      for (const s of [-1, 1]) neonBox(1.39, 0.42, s * 0.36, 0.03, 0.12, 0.16, '#fff6d0', g, '#cfc8b4');
    }
    return g;
  }

  // ---------- lines ----------
  for (const line of METRO_LINES) {
    const LV = levels[line.level], g = LV.g, y = LV.y;
    const pts = (HAS_ADMIN && line.adminPath) || line.path;
    const path = makePath(pts, line.loop);
    const sts = METRO_STATIONS.filter((s) => s.line === line.id && (!s.lock || HAS_ADMIN));
    // vẽ từng đoạn của polyline gốc (không lặp đoạn đi-về)
    for (let i = 0; i < pts.length - (line.loop ? 0 : 1); i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const alongX = a[1] === b[1];
      const holes = sts.filter((s) => (alongX ? Math.abs(s.at[1] - a[1]) < 0.01 && s.at[0] >= Math.min(a[0], b[0]) && s.at[0] <= Math.max(a[0], b[0])
        : Math.abs(s.at[0] - a[0]) < 0.01 && s.at[1] >= Math.min(a[1], b[1]) && s.at[1] <= Math.max(a[1], b[1])))
        .map((s) => [alongX ? s.at[0] : s.at[1]]);
      tunnel(line, line.level, a, b, holes, y, g);
    }
    // đầu cuối tuyến con thoi: tường chặn
    if (!line.loop) for (const e of [pts[0], pts[pts.length - 1]]) box(e[0], y, e[1], 4.1, 1.6, 4.1, '#4a4652', g, { shadow: false });
    // ga
    const stops = [];
    for (const st of sts) {
      const sg = new THREE.Group(); g.add(sg);
      const seg = path.stopsFor(st.at)[0];
      hall(st, line, y, seg ? seg.dz === 0 : true, sg, LV.ceil);
      tag(sg, 'metro:' + st.id);
      const info = { ...st, kind: 'station', lineName: line.name, color: line.color, levelCode: LV.code, y, x: st.at[0], z: st.at[1] };
      stations.push(info); LV.stations.push(info);
      for (const s of path.stopsFor(st.at)) stops.push(s.s + 4.5); // đầu tàu dừng sao cho đoàn tàu nằm giữa ga
    }
    stops.sort((p, q) => p - q);
    // tàu
    for (let k = 0; k < line.trains; k++) {
      const cars = [];
      for (let i = 0; i < 4; i++) { const c = trainCar(line.color, i === 0); g.add(c); cars.push(c); }
      trains.push({ cars, path, stops, y, s: (path.L / line.trains) * k + 2, dwell: 0, vmax: line.id === 'l3' ? 11 : 7 });
    }
  }

  // ---------- B2 depot (bãi tàu) ----------
  for (const f of METRO_FACILITIES) {
    const LV = levels[f.level], y = LV.y, [fx, fz] = f.at;
    const fg = new THREE.Group(); LV.g.add(fg);
    box(fx, y, fz, 26, 0.12, 16, '#3b3742', fg, { shadow: false });
    for (const o of [-5, 0, 5]) {
      box(fx, y + 0.12, fz + o, 24, 0.06, 2.2, '#24222b', fg, { shadow: false });
      for (const r of [-0.55, 0.55]) box(fx, y + 0.18, fz + o + r, 24, 0.08, 0.1, '#b9b6c4', fg, { shadow: false });
      const n = o === 0 ? 3 : 4;
      for (let i = 0; i < n; i++) { const c = trainCar(o === 5 ? '#b388ff' : o === 0 ? '#ff8f6b' : '#4fd1c5', i === 0); c.position.set(fx - 6 + i * CAR, y + 0.18, fz + o); fg.add(c); }
    }
    // nhà xưởng: khung thép, cẩu trục
    for (const s of [-1, 1]) for (const t of [-12, -4, 4, 12]) box(fx + t, y, fz + s * 7.6, 0.4, 5.5, 0.4, '#e0a64a', fg);
    box(fx, y + 5.5, fz - 7.6, 24.4, 0.4, 0.4, '#e0a64a', fg); box(fx, y + 5.5, fz + 7.6, 24.4, 0.4, 0.4, '#e0a64a', fg);
    const crane = box(fx + 3, y + 5.0, fz, 0.6, 0.5, 15.6, '#ffd24d', fg); crane.userData.crane = true;
    sign(f.name.toUpperCase(), fx - 4, y + 4.4, fz - 7.35, 8, 1.0, 'z', fg, { fg: '#ffd24d', bg: '#15121c', border: '#ffd24d', day: '#ece7f2' });
    for (const o of [-2.5, 2.5, 7]) walker(fg, { alongX: true, x0: fx, z0: fz, o, min: -11, max: 11, y: y + 0.12 }); // thợ bảo trì
    tag(fg, 'metro:' + f.id);
    const info = { ...f, kind: 'facility', lineName: 'Depot', color: '#ffd24d', levelCode: LV.code, y, x: fx, z: fz };
    stations.push(info); LV.stations.push(info);
    trains.push({ crane, fx, t: 0 });
  }

  // giếng thang nối B1 <-> B2 dưới Main City
  {
    const y1 = levels.b1.y, y2 = levels.b2.y;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(3, y1 - y2 - 5, 3), new THREE.MeshBasicMaterial({ color: '#7ee8ff', transparent: true, opacity: 0.18, depthWrite: false }));
    shaft.position.set(-2, y2 + (y1 - 5 - y2) / 2, -22); levels.b2.g.add(shaft);
  }

  // ---------- animation ----------
  const tmp = { x: 0, z: 0 };
  function placeCar(c, p, y) { c.position.set(p.x, y + 0.18, p.z); c.rotation.y = -Math.atan2(p.dz, p.dx); }
  function update(dt, t) {
    for (const T of trains) {
      if (T.crane) { T.crane.position.x = T.fx + Math.sin(t * 0.35) * 9; continue; }
      const { path } = T;
      if (T.dwell > 0) T.dwell -= dt;
      else {
        let d = Infinity;
        for (const s of T.stops) { const dd = ((s - T.s) % path.L + path.L) % path.L; if (dd < d) d = dd; }
        const v = Math.min(T.vmax, Math.max(0.9, Math.sqrt(2 * 3.2 * d)));
        if (d < v * dt && d !== Infinity) { T.s += d; T.dwell = 3.2; } else T.s += v * dt;
      }
      T.s %= path.L;
      T.cars.forEach((c, i) => placeCar(c, path.at(T.s - i * CAR - CAR / 2), T.y));
    }
    for (const b of blink) b.visible = Math.sin(t * 3) > -0.6;
    // người đi bộ: đi tới cuối sân ga thì dừng một lát rồi quay lại
    for (const p of walkers) {
      if (p.pause > 0) { p.pause -= dt; p.l1.position.x = p.l2.position.x = 0; placeWalker(p); continue; }
      p.t += p.v * dt; p.ph += dt * 9 * Math.abs(p.v);
      if (p.t > p.max || p.t < p.min) { p.t = Math.max(p.min, Math.min(p.max, p.t)); p.v = -p.v; p.pause = 0.6 + Math.random() * 2.4; }
      else if (Math.random() < dt * 0.04) p.pause = 1 + Math.random() * 3; // đứng chờ tàu
      const sw = Math.sin(p.ph) * 0.11; p.l1.position.x = sw; p.l2.position.x = -sw;
      placeWalker(p);
    }
    void tmp;
  }

  walkers.forEach(placeWalker);
  return { root, levels, pickables, stations, update };
}
