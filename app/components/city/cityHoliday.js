// v48: trang trí ngày lễ trong thành phố 3D — công trình chính giữa công viên trung tâm,
// dây đèn lồng / cờ dọc các phố, pháo hoa, tuyết, cánh hoa, giấy màu, chữ chạy trên bảng LED.
const PARK = [-7.5, 7.5]; // công viên giữa Main City

export function createHolidayFx(K) {
  const { THREE, scene, box, cyl, sign, neonMat, neonBox, mat, ROADS, onLand, nearCross, Y0, small, reduce, holiday: h } = K;
  const g = new THREE.Group(); scene.add(g);
  const [px, pz] = PARK, py = Y0 + 0.12;
  const spin = [], twinkle = [], disposables = [];
  const C = h.colors;

  // băng-rôn quay mặt về phía camera, đặt phía sau công trình chính giữa công viên
  const ROT = Math.atan2(54, 22);
  const banner = (text, x, z, w, y = 4.2, fg = C.accent, bg = C.bg) => {
    const bgp = new THREE.Group(); bgp.position.set(x, 0, z); bgp.rotation.y = ROT; g.add(bgp);
    for (const s of [-1, 1]) cyl(s * (w / 2 - 0.1), py, 0, 0.07, y + 0.6, '#2a2930', bgp, 6);
    sign(text, 0, py + y, 0.08, w, w * 0.16, 'z', bgp, { fg, bg, border: fg, day: '#f4efe6' });
  };
  function flagTex(star) {
    const c = document.createElement('canvas'); c.width = 300; c.height = 200; const x = c.getContext('2d');
    x.fillStyle = '#da251d'; x.fillRect(0, 0, 300, 200);
    if (star) {
      x.fillStyle = '#ffde00'; x.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 26 : 64; x.lineTo(150 + Math.cos(a) * r, 104 + Math.sin(a) * r); }
      x.closePath(); x.fill();
    } else { x.fillStyle = '#ffde00'; x.font = '800 96px "Space Grotesk", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('1/5', 150, 104); }
    const t = new THREE.CanvasTexture(c); disposables.push(t); return t;
  }
  const flags = [];
  function flag(x, z, hgt, w, star) {
    cyl(x, py, z, 0.09, hgt, '#e8e2d0', g, 8);
    const geo = new THREE.PlaneGeometry(w, w * 0.66, 12, 4); geo.translate(w / 2, 0, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: flagTex(star), side: THREE.DoubleSide }));
    m.position.set(x, py + hgt - w * 0.36, z); m.rotation.y = -0.6; g.add(m);
    m.userData.base = geo.attributes.position.array.slice(); flags.push(m);
  }

  // ---------- dây trang trí dọc các phố Main City ----------
  function streetRow(kind) {
    const spots = [];
    for (const R of ROADS.slice(0, 6)) for (let t = R.a + 4.5; t <= R.b - 4; t += 4.6) {
      const x = R.axis === 'x' ? t : R.fixed, z = R.axis === 'x' ? R.fixed : t;
      if (nearCross(x, z) || !onLand(x, z) || Math.abs(x) > 30 || Math.abs(z) > 30) continue;
      spots.push([x, z, R.axis]);
    }
    const per = kind === 'bulb' ? 7 : 3, n = spots.length * per;
    const geo = kind === 'lantern' ? new THREE.SphereGeometry(0.3, 10, 8) : kind === 'flag' ? new THREE.BoxGeometry(0.46, 0.32, 0.03) : new THREE.SphereGeometry(0.12, 6, 5);
    const im = new THREE.InstancedMesh(geo, kind === 'lantern' ? neonMat('#ff3b30', '#c0261e') : new THREE.MeshBasicMaterial({ color: '#ffffff' }), n);
    const col = new THREE.Color(), d = new THREE.Object3D(); let i = 0;
    const lineP = [], poleAt = [];
    const BUL = ['#ff5a4e', '#ffd25e', '#7ee8ff', '#b7f07e', '#ff9bd2'];
    for (const [x, z, ax] of spots) {
      // dây giăng ngang qua phố, từ vỉa hè bên này sang bên kia
      const ox = ax === 'x' ? 0 : 2.5, oz = ax === 'x' ? 2.5 : 0;
      const at = (u) => [x - ox + 2 * ox * u, py + 3.3 - Math.sin(u * Math.PI) * 0.45, z - oz + 2 * oz * u];
      for (let k = 0; k < 8; k++) { lineP.push(...at(k / 8), ...at((k + 1) / 8)); }
      poleAt.push([x - ox, z - oz], [x + ox, z + oz]);
      for (let k = 1; k <= per; k++) {
        const [xx, yy, zz] = at(k / (per + 1));
        d.position.set(xx, yy - (kind === 'bulb' ? 0.05 : 0.32), zz); d.rotation.set(0, ax === 'x' ? 0 : Math.PI / 2, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
        if (kind === 'flag') im.setColorAt(i, col.set(k % 2 ? '#da251d' : '#ffde00'));
        else if (kind === 'bulb') im.setColorAt(i, col.set(BUL[(k + i) % 5]));
        i++;
      }
    }
    im.count = i; g.add(im); if (kind === 'bulb') twinkle.push(im);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lineP, 3));
    g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#2a2930' })));
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 5), mat('#2a2930'), poleAt.length);
    poleAt.forEach(([x, z], k) => { d.position.set(x, py + 1.7, z); d.rotation.set(0, 0, 0); d.updateMatrix(); poles.setMatrixAt(k, d.matrix); });
    g.add(poles);
  }

  // ---------- công trình trung tâm ----------
  function blossomTree(x, z, color, s = 1) {
    cyl(x, py, z, 0.32 * s, 2.6 * s, '#5a3520', g, 7, 0.22 * s);
    const br = [[0.9, 2.4, 0.3, -0.7], [-0.8, 2.6, -0.4, 0.8], [0.2, 2.9, -0.9, 0.5]];
    for (const [bx, by, bz, rz] of br) { const b = box(x + bx * 0.5 * s, py + by * s, z + bz * 0.5 * s, 0.16 * s, 1.6 * s, 0.16 * s, '#5a3520', g); b.rotation.z = rz; }
    const blooms = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.32 * s, 0), new THREE.MeshLambertMaterial({ color }), 70);
    const d = new THREE.Object3D();
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * 6.28, r = Math.random() * 2.1 * s, yy = py + (2.8 + Math.random() * 2.2) * s - r * 0.25;
      d.position.set(x + Math.cos(a) * r, yy, z + Math.sin(a) * r); d.rotation.set(Math.random() * 3, Math.random() * 3, 0); d.updateMatrix(); blooms.setMatrixAt(i, d.matrix);
    }
    blooms.castShadow = true; g.add(blooms);
  }
  function heart(x, z, color) {
    const H = ['01100110', '11111111', '11111111', '01111110', '00111100', '00011000'];
    const hg = new THREE.Group(); hg.position.set(x, py + 1.1, z); g.add(hg);
    H.forEach((row, r) => [...row].forEach((c, k) => { if (c === '1') box((k - 3.5) * 0.55, (5 - r) * 0.55, 0, 0.55, 0.55, 0.55, neonMat(color, color), hg, { shadow: false }); }));
    cyl(x, py, z, 0.08, 1.2, '#3f8a4a', g, 6);
    hg.rotation.y = Math.atan2(54, 22); spin.push({ o: hg, bob: true, y: py + 1.1 });
  }
  function xmasTree(x, z) {
    cyl(x, py, z, 0.35, 1.0, '#6b4226', g, 8);
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(2.6 - i * 0.45, 1.9, 9), mat(i % 2 ? '#2f7a47' : '#26683c'));
      c.position.set(x, py + 1.6 + i * 1.15, z); c.castShadow = true; g.add(c);
    }
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), neonMat('#ffd25e', '#e0b040')); star.position.set(x, py + 8.0, z); g.add(star); spin.push({ o: star, ax: 'y', v: 1.2 });
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 6, 5), new THREE.MeshBasicMaterial(), 60);
    const d = new THREE.Object3D(), col = new THREE.Color();
    for (let i = 0; i < 60; i++) {
      const t = i / 60, yy = 1.4 + t * 6.2, r = 2.5 * (1 - t * 0.85), a = t * 6.28 * 5;
      d.position.set(x + Math.cos(a) * r, py + yy, z + Math.sin(a) * r); d.updateMatrix(); bulbs.setMatrixAt(i, d.matrix);
      bulbs.setColorAt(i, col.set(['#ff4d4d', '#ffd25e', '#7ee8ff', '#ffffff'][i % 4]));
    }
    g.add(bulbs); twinkle.push(bulbs);
    for (const [gx, gz, c] of [[1.8, 1.4, '#ff4d4d'], [-1.6, 1.8, '#7ee8ff'], [2.2, -0.8, '#ffd25e']]) { box(x + gx, py, z + gz, 0.8, 0.7, 0.8, c, g); box(x + gx, py + 0.7, z + gz, 0.85, 0.12, 0.2, '#ffffff', g); }
  }
  function book(x, z) {
    const bg = new THREE.Group(); bg.position.set(x, py, z); bg.rotation.y = Math.atan2(54, 22) - Math.PI / 2; g.add(bg);
    box(0, 0, 0, 0.6, 1.2, 1.4, '#7a4c2a', bg); // bệ
    for (const s of [-1, 1]) { const p = box(s * 1.25, 1.2, 0, 2.5, 0.12, 3.2, '#fff8e6', bg); p.rotation.z = s * 0.22; const cv = box(s * 1.27, 1.12, 0, 2.6, 0.08, 3.3, '#1f5a3e', bg); cv.rotation.z = s * 0.22; }
    const flower = new THREE.Group(); flower.position.set(x + 2.6, py, z - 1.6); g.add(flower);
    cyl(0, 0, 0, 0.08, 3.2, '#3f8a4a', flower, 6);
    for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), mat('#ffd25e')); const a = (k / 6) * 6.28; p.scale.set(1, 0.5, 1.4); p.position.set(Math.cos(a) * 0.55, 3.3, Math.sin(a) * 0.55); p.rotation.y = -a; flower.add(p); }
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), mat('#e07b00')); core.position.y = 3.3; flower.add(core);
    spin.push({ o: flower, ax: 'y', v: 0.5 });
  }
  function yearSign(text, x, z) {
    sign(text, x, py + 3.4, z, 5.6, 2.2, 'z', g, { fg: C.accent, bg: '#0b0a14', border: C.accent, day: '#f4efe6' });
    for (const s of [-1, 1]) cyl(x + s * 2.6, py, z, 0.08, 3.4, '#2a2930', g, 6);
  }

  let fx = null, ticker = '';
  const title = (h.title || '').toUpperCase();
  switch (h.deco) {
    case 'tet':
      blossomTree(px, pz, '#ffd23f', 1.15); blossomTree(px + 3.3, pz - 3.1, '#ff9fb5', 0.7); streetRow('lantern');
      banner('CHÚC MỪNG NĂM MỚI', px - 3.2, pz - 3.2, 6.4, 5.4); fx = 'fireworks';
      ticker = `CHÚC MỪNG NĂM MỚI  ·  XUÂN ${(h.canchi || '').toUpperCase()} ${h.year}  ·  AN KHANG THỊNH VƯỢNG  ·  `; break;
    case 'newyear':
      yearSign(String(h.year), px, pz); streetRow('bulb'); fx = 'fireworks';
      ticker = `HAPPY NEW YEAR ${h.year}  ·  CHÚC MỪNG NĂM MỚI  ·  KNOWORLD CITY  ·  `; break;
    case 'flowers':
      heart(px, pz, C.soft); blossomTree(px + 3.2, pz - 3.2, C.accent, 0.6); blossomTree(px - 3.2, pz + 3.0, C.soft, 0.6); streetRow('bulb');
      banner(h.short === '8/3' ? 'CHÚC MỪNG 8/3' : 'CHÚC MỪNG 20/10', px - 3.2, pz - 3.2, 6.0, 5.4, '#ffffff', C.bg2); fx = 'petals';
      ticker = `${title}  ·  KNOWORLD CITY  ·  `; break;
    case 'flag':
      flag(px, pz, 9, 4.2, true); streetRow('flag'); banner('MỪNG NGÀY THỐNG NHẤT 30/4', px - 3.2, pz - 3.2, 7.6, 5.4, '#ffde00', '#b3121b'); fx = 'fireworks';
      ticker = `MỪNG ${h.year - 1975} NĂM NGÀY GIẢI PHÓNG MIỀN NAM, THỐNG NHẤT ĐẤT NƯỚC  ·  30/4/1975 – 30/4/${h.year}  ·  `; break;
    case 'labour':
      flag(px, pz, 8, 3.6, false); streetRow('flag'); banner('CHÚC MỪNG NGÀY QUỐC TẾ LAO ĐỘNG', px - 3.2, pz - 3.2, 8.4, 5.4, '#ffffff', '#1f5fa8'); fx = 'confetti';
      ticker = `CHÚC MỪNG NGÀY QUỐC TẾ LAO ĐỘNG 1/5  ·  KNOWORLD CITY  ·  `; break;
    case 'teachers':
      book(px, pz); streetRow('bulb'); banner('TRI ÂN THẦY CÔ 20/11', px - 3.2, pz - 3.2, 6.8, 5.4, '#ffd25e', '#123526'); fx = 'petals';
      ticker = `TRI ÂN NGÀY NHÀ GIÁO VIỆT NAM 20/11  ·  KÍNH CHÚC THẦY CÔ MẠNH KHOẺ, HẠNH PHÚC  ·  `; break;
    case 'christmas':
      xmasTree(px, pz); streetRow('bulb'); banner('MERRY CHRISTMAS', px - 3.2, pz - 3.2, 6.0, 5.4, '#ffffff', '#b3121b'); fx = 'snow';
      ticker = `MERRY CHRISTMAS  ·  GIÁNG SINH AN LÀNH  ·  KNOWORLD CITY  ·  `; break;
    default: break;
  }

  // ---------- hạt 3D ----------
  const PAL = {
    tet: ['#ffd23f', '#ff9fb5', '#ff3b30'], newyear: ['#ffd27a', '#9be7ff', '#ff9bd2', '#c6bfff'], flowers: [C.accent, C.soft, '#ffffff'],
    flag: ['#ffde00', '#ff4a3d', '#fff1c8'], labour: ['#ff5a4e', '#ffd27a', '#7ee8ff', '#ffffff'], teachers: ['#ffd25e', '#b7f07e', '#ffffff'], christmas: ['#ffffff'],
  }[h.deco] || ['#ffffff'];
  const col = new THREE.Color();
  let fall = null, bursts = [];
  if (fx === 'snow' || fx === 'petals' || fx === 'confetti') {
    const N = small ? 500 : 1200, pos = new Float32Array(N * 3), cols = new Float32Array(N * 3), vel = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos.set([-36 + Math.random() * 114, Math.random() * 42, -36 + Math.random() * 114], i * 3);
      col.set(PAL[i % PAL.length]); cols.set([col.r, col.g, col.b], i * 3); vel[i] = (fx === 'snow' ? 2.2 : 3.2) + Math.random() * 2.4;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: fx === 'snow' ? 3.2 : 4.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
    pts.frustumCulled = false; g.add(pts); fall = { pts, pos, vel, N, geo };
  }
  if (fx === 'fireworks') {
    const PER = 70;
    for (let b = 0; b < (small ? 4 : 7); b++) {
      const pos = new Float32Array(PER * 3), cols = new Float32Array(PER * 3), dir = new Float32Array(PER * 3);
      for (let i = 0; i < PER; i++) {
        const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u);
        dir.set([r * Math.cos(a), u, r * Math.sin(a)], i * 3);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      const m = new THREE.PointsMaterial({ size: 4, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const p = new THREE.Points(geo, m); p.frustumCulled = false; g.add(p);
      bursts.push({ p, m, pos, cols, dir, geo, t: -Math.random() * 3 - b * 0.6, c: new THREE.Vector3() });
    }
  }

  const d = new THREE.Object3D(); void d;
  function update(dt, t, N, onSky) {
    g.visible = onSky;
    if (!onSky) return;
    for (const s of spin) { if (s.bob) s.o.position.y = s.y + Math.sin(t * 1.6) * 0.25; else s.o.rotation[s.ax] += dt * s.v; }
    if (!reduce) for (const im of twinkle) { const k = (Math.sin(t * 2.2) + 1) / 2; im.material.opacity = 1; im.visible = N < 0.25 || k > 0.12; }
    for (const f of flags) {
      const pos = f.geometry.attributes.position, base = f.userData.base;
      for (let i = 0; i < pos.count; i++) { const x = base[i * 3]; pos.array[i * 3 + 2] = Math.sin(t * 4 + x * 1.4) * 0.18 * x; }
      pos.needsUpdate = true;
    }
    if (fall) {
      const { pos, vel, N: n } = fall;
      for (let i = 0; i < n; i++) {
        const o = i * 3; pos[o + 1] -= vel[i] * dt; pos[o] += Math.sin(t * 0.8 + i) * dt * 0.8;
        if (pos[o + 1] < 0) pos[o + 1] = 40 + Math.random() * 4;
      }
      fall.geo.attributes.position.needsUpdate = true;
    }
    for (const B of bursts) {
      B.t += dt;
      if (B.t < 0) { B.m.opacity = 0; continue; }
      if (B.t > 2.4) { B.t = -(0.6 + Math.random() * (N > 0.4 ? 1.6 : 3.5)); B.c.set(-26 + Math.random() * 70, 22 + Math.random() * 14, -26 + Math.random() * 70);
        const c1 = col.set(PAL[(Math.random() * PAL.length) | 0]).clone(), c2 = new THREE.Color(PAL[(Math.random() * PAL.length) | 0]);
        for (let i = 0; i < B.dir.length / 3; i++) { const c = i % 3 ? c1 : c2; B.cols.set([c.r, c.g, c.b], i * 3); }
        B.geo.attributes.color.needsUpdate = true; continue; }
      const e = 1 - Math.pow(1 - Math.min(1, B.t / 1.1), 3), R = e * 7, sag = B.t * B.t * 0.9;
      for (let i = 0; i < B.dir.length / 3; i++) { const o = i * 3; B.pos[o] = B.c.x + B.dir[o] * R; B.pos[o + 1] = B.c.y + B.dir[o + 1] * R - sag; B.pos[o + 2] = B.c.z + B.dir[o + 2] * R; }
      B.geo.attributes.position.needsUpdate = true;
      B.m.opacity = Math.max(0, 1 - B.t / 2.4) * (0.45 + 0.55 * N);
    }
  }
  function dispose() { disposables.forEach((x) => x.dispose()); }
  return { update, ticker, dispose };
}
