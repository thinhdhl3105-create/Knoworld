// v31: Game Island — gắn 2 trò chơi vào một phần tử gốc. Trả về hàm dọn dẹp.
// opts: { groups, brands, isAdmin, onSaveGroups(list), onSaveBrands(list), onPublish(kind, data) }
export function mountCityGames(root, opts = {}) {

  const SAMPLE_BRANDS = ['Vinamilk','Highlands Coffee',"Biti's",'Phúc Long','VinFast','TH true MILK','Trung Nguyên Legend','Thế Giới Di Động','Shopee','Grab','Coca-Cola','Pepsi','Heineken','Sabeco','Kinh Đô','Acecook Hảo Hảo','Masan','Vietjet Air','Vietnam Airlines','MoMo','Tiki','Lazada','Bách Hóa Xanh','Circle K','The Coffee House','Pizza 4P\'s','KFC','Jollibee','Samsung','Apple','Nike','Adidas','Unilever','P&G','Dove','Closeup','Omo','Nescafé','Milo','Lavie'];
  const COLORS = ['#c6bfff','#ffd27a','#ff8a6a','#5ee0a0','#7ef0ff','#ff9bd2','#ffb347','#a8d8ff','#c9f27a','#e2a8ff','#ffa3a3','#8fb8ff'];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => root.querySelector(`#${id}`);
  const ac = new AbortController();
  const live = { raf: 0, timers: new Set() };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  const lines = (el) => [...new Set(el.value.split('\n').map((s) => s.trim()).filter(Boolean))];
  let tt; const toast = (m) => { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => (t.hidden = true), 2400); };
  async function copy(text) { try { await navigator.clipboard.writeText(text); toast('Copied. Paste it into Zalo, Excel or the LMS.'); } catch { toast('Copy is blocked here. Select the text and copy it by hand.'); } }

  // ---------- tabs ----------
  function show(which) {
    const a = which !== 'brands';
    $('order').hidden = !a; $('brands').hidden = a;
    $('tab-order').setAttribute('aria-selected', String(a)); $('tab-brands').setAttribute('aria-selected', String(!a));
    if (!a) syncTeams(); else requestAnimationFrame(() => { sizeCanvas(); drawScene(race && race.phase !== 'run' ? race.T + 5 : 0); });
  }
  $('tab-order').onclick = () => { history.replaceState(null, '', '#order'); show('order'); };
  $('tab-brands').onclick = () => { history.replaceState(null, '', '#brands'); show('brands'); };
  window.addEventListener('hashchange', () => show(location.hash.slice(1)), { signal: ac.signal });

  // ================= GAME 1: BOAT RACE =================
  const setGroups = (n) => { $('groups').value = Array.from({ length: n }, (_, i) => `Nhóm ${i + 1}`).join('\n'); onGroupsChanged(); };
  $('quick6').onclick = () => setGroups(6); $('quick8').onclick = () => setGroups(8); $('quick10').onclick = () => setGroups(10);
  const groupList = () => lines($('groups')).slice(0, 16);
  const colorOf = (name) => COLORS[Math.max(0, groupList().indexOf(name)) % COLORS.length];
  let order = [];           // finishing order = presenting order
  let finishAt = {};        // group -> seconds
  let raceLen = 20;
  let race = null;          // { boats, t0, T, raf }

  $('lengths').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || race) return;
    raceLen = +b.dataset.s;
    $('lengths').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('clock').textContent = fmtClock(raceLen);
  });
  const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.ceil(s)) % 60).padStart(2, '0')}`;

  // Each boat: random speed segments, scaled so it reaches the line at its own finish time.
  function planBoat(name, finish) {
    const K = 7 + Math.floor(Math.random() * 4);
    const w = Array.from({ length: K }, () => 0.35 + Math.random() * 1.5);
    const cum = [0]; w.forEach((v) => cum.push(cum[cum.length - 1] + v));
    const total = cum[K];
    return { name, c: colorOf(name), finish, K, cum: cum.map((v) => v / total), done: false, rank: 0, wake: [] };
  }
  function posAt(b, t) {
    if (t >= b.finish) return 1;
    const u = (t / b.finish) * b.K, i = Math.floor(u), f = u - i;
    const e = f * f * (3 - 2 * f) * 0.35 + f * 0.65; // soft change between segments
    return b.cum[i] + (b.cum[i + 1] - b.cum[i]) * e;
  }

  const cv = $('race'), cx = cv.getContext('2d');
  let W = 0, H = 0, lane = 46, top = 34;
  function sizeCanvas() {
    const n = Math.max(1, groupList().length);
    const dpr = window.devicePixelRatio || 1;
    W = cv.parentElement.clientWidth; lane = W < 520 ? 38 : 46; H = top + n * lane + 18;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = `${H}px`;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const startX = () => (W < 520 ? 74 : 112);
  const finishX = () => W - 46;

  function drawBoat(x, y, c, s) {
    cx.save(); cx.translate(x, y);
    cx.fillStyle = 'rgba(255,255,255,.18)';
    cx.beginPath(); cx.ellipse(-6, 9, 18 * s, 3, 0, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = c;
    cx.beginPath(); cx.moveTo(-22 * s, 2); cx.lineTo(16 * s, 2); cx.lineTo(24 * s, -4); cx.lineTo(18 * s, 9); cx.lineTo(-18 * s, 9); cx.closePath(); cx.fill();
    cx.fillStyle = '#ece9f5'; cx.fillRect(-12 * s, -7, 20 * s, 9);
    cx.fillStyle = '#1d2433'; for (let k = 0; k < 3; k++) cx.fillRect((-9 + k * 6) * s, -5, 3.5 * s, 4);
    cx.fillStyle = '#2a2440'; cx.fillRect(-2 * s, -15, 2.5, 8);
    cx.fillStyle = c; cx.beginPath(); cx.moveTo(0.5 * s, -15); cx.lineTo(9 * s, -12); cx.lineTo(0.5 * s, -9); cx.fill();
    cx.restore();
  }
  function drawScene(t) {
    const gs = race ? race.boats : groupList().map((g) => ({ name: g, c: colorOf(g) }));
    cx.clearRect(0, 0, W, H);
    // water
    const g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0f3a55'); g.addColorStop(1, '#0a2638');
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    // ripples
    cx.strokeStyle = 'rgba(255,255,255,.06)'; cx.lineWidth = 1;
    for (let r = 0; r < H; r += 14) { cx.beginPath(); for (let x = 0; x <= W; x += 12) { const yy = r + Math.sin((x + t * 40 + r * 7) / 30) * 2; x ? cx.lineTo(x, yy) : cx.moveTo(x, yy); } cx.stroke(); }
    // header: start + finish labels
    cx.font = '700 10px Inter, sans-serif'; cx.fillStyle = '#ffd27a'; cx.textAlign = 'center';
    cx.fillText('START', startX(), 20); cx.fillText('FINISH', finishX(), 20);
    // finish line chequered
    for (let y = top - 6, k = 0; y < H - 8; y += 8, k++) { cx.fillStyle = k % 2 ? '#ece9f5' : '#1a1720'; cx.fillRect(finishX() - 4, y, 4, 8); cx.fillStyle = k % 2 ? '#1a1720' : '#ece9f5'; cx.fillRect(finishX(), y, 4, 8); }
    cx.fillStyle = 'rgba(255,210,122,.5)'; cx.fillRect(startX() - 1, top - 6, 2, H - top - 2);
    gs.forEach((b, i) => {
      const y = top + i * lane + lane / 2;
      // lane rope with buoys
      if (i) { cx.strokeStyle = 'rgba(255,255,255,.12)'; cx.setLineDash([2, 6]); cx.beginPath(); cx.moveTo(0, y - lane / 2); cx.lineTo(W, y - lane / 2); cx.stroke(); cx.setLineDash([]); }
      // lane label
      cx.textAlign = 'left'; cx.font = `600 ${W < 520 ? 11 : 12.5}px "Space Grotesk", Inter, sans-serif`;
      cx.fillStyle = b.c; cx.beginPath(); cx.arc(10, y, 4, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#ece9f5';
      let label = b.name; const maxw = startX() - 34; while (cx.measureText(label).width > maxw && label.length > 3) label = label.slice(0, -2) + '…';
      cx.fillText(label, 20, y + 4);
      // boat
      const p = race ? posAt(b, Math.min(t, race.T + 5)) : 0;
      const x = startX() + (finishX() - startX() - 6) * p;
      if (race && p > 0 && p < 1) { cx.strokeStyle = 'rgba(255,255,255,.25)'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x - 24, y + 6); cx.quadraticCurveTo(x - 50, y + 2, x - 80, y + 9); cx.stroke(); }
      const bob = race && p < 1 ? Math.sin(t * 6 + i) * 1.4 : 0;
      drawBoat(x, y - 2 + bob, b.c, W < 520 ? 0.8 : 1);
      if (b.rank) {
        cx.fillStyle = '#ffd27a'; cx.beginPath(); cx.arc(finishX() + 26, y, 11, 0, Math.PI * 2); cx.fill();
        cx.fillStyle = '#2a1d00'; cx.textAlign = 'center'; cx.font = '700 12px "Space Grotesk", sans-serif'; cx.fillText(b.rank, finishX() + 26, y + 4);
      }
    });
  }

  const LINES_LEAD = ['{g} takes the lead!', '{g} surges ahead!', '{g} pulls in front!', 'What a move by {g}!', '{g} overtakes for first!'];
  function startRace() {
    const gs = groupList();
    if (gs.length < 2) { toast('Add at least two groups'); return; }
    if (race) return;
    order = []; finishAt = {}; renderBoard();
    const T = raceLen;
    // finish times: first boat around 80% of the race, last boat exactly at T
    const times = shuffle(gs).map((g, i, a) => ({ g, f: a.length === 1 ? T : T * 0.8 + (T * 0.2) * (i / (a.length - 1)) }));
    // jitter the middle a little, keep the last one at T
    times.forEach((x, i) => { if (i < times.length - 1) x.f = Math.min(T - 0.15, x.f + (Math.random() - 0.5) * T * 0.03); });
    const boats = gs.map((g) => planBoat(g, times.find((x) => x.g === g).f));
    race = { boats, T, t0: 0, lead: null, phase: 'count' };
    $('startRace').disabled = true; $('resetRace').disabled = true;
    lockSetup(true);
    countdown(3);
  }
  function countdown(n) {
    $('tickWho').textContent = n ? `${n}…` : 'GO!';
    $('tickSub').textContent = n ? 'Boats on the line' : `${race.boats.length} boats · ${race.T} seconds`;
    drawScene(0);
    if (n) setTimeout(() => countdown(n - 1), reduce ? 0 : 700);
    else { race.phase = 'run'; race.t0 = performance.now(); race.raf = live.raf = requestAnimationFrame(frame); }
  }
  function frame(now) {
    if (!race) return;
    const t = reduce ? race.T + 0.01 : (now - race.t0) / 1000;
    // finishes
    race.boats.forEach((b) => {
      if (!b.done && t >= b.finish) {
        b.done = true; order.push(b.name); b.rank = order.length; finishAt[b.name] = b.finish;
        $('tickWho').textContent = order.length === 1 ? `🏁 ${b.name} wins the Harbour Cup!` : `${b.name} crosses the line · #${order.length}`;
        $('tickSub').textContent = order.length === 1 ? 'First to finish presents first' : `${race.boats.length - order.length} boats still racing`;
        renderBoard();
      }
    });
    // leader commentary (while nobody has finished)
    if (!order.length) {
      const lead = [...race.boats].sort((a, b) => posAt(b, t) - posAt(a, t))[0];
      if (lead.name !== race.lead && t > 0.6) {
        race.lead = lead.name;
        $('tickWho').textContent = LINES_LEAD[Math.floor(Math.random() * LINES_LEAD.length)].replace('{g}', lead.name);
        $('tickSub').textContent = `${fmtClock(race.T - t)} left`;
      }
      $('leaderName').textContent = lead.name; $('leaderBox').style.setProperty('--c', lead.c);
    }
    $('clock').textContent = fmtClock(race.T - t);
    $('bar').style.width = `${Math.min(100, (t / race.T) * 100)}%`;
    drawScene(t);
    if (race.boats.every((b) => b.done)) { endRace(); return; }
    race.raf = live.raf = requestAnimationFrame(frame);
  }
  function endRace() {
    $('clock').textContent = '0:00';
    $('tickWho').textContent = `🏁 ${order[0]} presents first!`;
    $('tickSub').textContent = 'Final order is on the board below';
    $('leaderName').textContent = order[0]; $('leaderBox').style.setProperty('--c', colorOf(order[0]));
    $('startRace').disabled = false; $('resetRace').disabled = false;
    race.phase = 'done';
    confetti();
  }
  function resetRace() {
    if (race?.raf) cancelAnimationFrame(race.raf);
    race = null; order = []; finishAt = {};
    lockSetup(false);
    $('clock').textContent = fmtClock(raceLen); $('bar').style.width = '0';
    $('tickWho').textContent = 'Boats on the start line'; $('tickSub').textContent = 'Pick a race length and press “Start the race”';
    $('leaderName').textContent = '–';
    $('startRace').disabled = false; $('resetRace').disabled = false;
    renderBoard(); sizeCanvas(); drawScene(0);
  }
  function lockSetup(on) { ['groups', 'quick6', 'quick8', 'quick10'].forEach((id) => ($(id).disabled = on)); }
  $('startRace').onclick = () => { if (race && race.phase === 'done') { resetRace(); } startRace(); };
  $('resetRace').onclick = resetRace;
  function renderBoard() {
    const gs = groupList();
    $('groupCount').textContent = `${gs.length} group${gs.length === 1 ? '' : 's'} on the start line${lines($('groups')).length > 16 ? ' (max 16)' : ''}`;
    $('board').innerHTML = order.length ? order.map((g, i) => `<li style="--c:${colorOf(g)}"><span class="n">#${i + 1}</span><span class="g"><i></i>${esc(g)}</span><span class="s">${i === 0 ? 'WINNER · ' : ''}${finishAt[g].toFixed(1)} s</span></li>`).join('')
      : '<li class="empty" style="display:block">No one has finished yet.</li>';
  }
  function onGroupsChanged() { if (!race) { order = []; renderBoard(); sizeCanvas(); drawScene(0); } }
  $('groups').addEventListener('input', onGroupsChanged);
  window.addEventListener('resize', () => { sizeCanvas(); drawScene(race && race.phase === 'run' ? (performance.now() - race.t0) / 1000 : race ? race.T + 5 : 0); }, { signal: ac.signal });
  $('copyOrder').onclick = () => order.length ? copy(order.map((g, i) => `${i + 1}. ${g}`).join('\n')) : toast('Run the race first');

  // ================= GAME 2 =================
  $('brandList').value = SAMPLE_BRANDS.join('\n');
  let draws = {}; // group -> [brands]
  let busy2 = false;
  const teams = () => {
    const gs = groupList();
    return [...order.filter((g) => gs.includes(g)), ...gs.filter((g) => !order.includes(g))];
  };
  const per = () => Math.max(1, Math.min(10, +$('perGroup').value || 5));
  const used = () => new Set(Object.values(draws).flat());
  const available = () => { const u = used(); return lines($('brandList')).filter((b) => !u.has(b)); };
  function syncTeams() {
    for (const k of Object.keys(draws)) if (!groupList().includes(k)) delete draws[k];
    renderDraws();
  }
  function renderCounts() {
    const all = lines($('brandList')), ts = teams();
    $('brandCount').textContent = `${all.length} brands on the list`;
    const need = ts.length * per();
    $('capacity').textContent = all.length >= need ? `${ts.length} groups × ${per()} = ${need} brands needed · enough on the list` : `${ts.length} groups × ${per()} = ${need} brands needed, only ${all.length} on the list. Add ${need - all.length} more brands.`;
    $('capacity').style.color = all.length < need ? 'var(--coral)' : '';
  }
  function renderDraws(active, rollingIdx) {
    renderCounts();
    const ts = teams();
    $('draws').innerHTML = ts.map((g, i) => {
      const got = draws[g] || [];
      const c = colorOf(g);
      const cells = Array.from({ length: per() }, (_, k) => {
        if (g === active && rollingIdx && rollingIdx[k] !== undefined) return `<div class="bb rolling"><span>${esc(rollingIdx[k])}</span></div>`;
        return got[k] ? `<div class="bb ${g === active ? 'landed' : ''}"><span>${esc(got[k])}</span></div>` : '<div class="bb empty"><span>?</span></div>';
      }).join('');
      return `<div class="draw" style="--c:${c}"><div class="dh"><i></i><b>${order.includes(g) ? `#${order.indexOf(g) + 1} · ` : ''}${esc(g)}</b><span class="grow"></span>
        ${got.length ? `<button class="btn sm" data-redo="${esc(g)}">↻ Redraw</button>` : `<button class="btn sm" data-draw="${esc(g)}">Draw</button>`}</div>
        <div class="boards">${cells}</div></div>`;
    }).join('') || '<p class="note">Add groups in Game 1 first.</p>';
    const left = ts.filter((g) => !(draws[g] || []).length).length;
    $('brandNext').disabled = busy2 || !left; $('brandAll').disabled = busy2 || !left;
    $('poolNote').textContent = `${available().length} brands still unassigned`;
  }
  async function drawFor(g, fast) {
    const pool = available();
    const n = per();
    if (pool.length < n) { toast(`Only ${pool.length} unused brands left. Add more brands to the list.`); return false; }
    const pick = shuffle(pool).slice(0, n);
    draws[g] = [];
    const rounds = fast ? 6 : 16;
    for (let r = 0; r < rounds; r++) {
      const roll = {};
      for (let k = 0; k < n; k++) roll[k] = pool[Math.floor(Math.random() * pool.length)];
      // settle one billboard at a time towards the end
      const settled = Math.max(0, Math.floor((r - rounds + n + 1)));
      for (let k = 0; k < settled && k < n; k++) delete roll[k];
      draws[g] = pick.slice(0, settled);
      renderDraws(g, roll);
      await sleep(fast ? 45 : 55 + r * 6);
    }
    draws[g] = pick;
    renderDraws(g);
    return true;
  }
  async function next(fast) {
    const g = teams().find((t) => !(draws[t] || []).length);
    if (!g) return false;
    return drawFor(g, fast);
  }
  $('brandNext').onclick = async () => { if (busy2) return; busy2 = true; await next(false); busy2 = false; renderDraws(); if (teams().every((t) => (draws[t] || []).length)) confetti(); };
  $('brandAll').onclick = async () => { if (busy2) return; busy2 = true; while (await next(true)) await sleep(150); busy2 = false; renderDraws(); confetti(); };
  $('draws').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b || busy2) return;
    const g = b.dataset.redo || b.dataset.draw; if (!g) return;
    busy2 = true;
    if (b.dataset.redo) delete draws[g];
    await drawFor(g, false);
    busy2 = false; renderDraws();
  });
  $('resetBrands').onclick = () => { draws = {}; renderDraws(); };
  ['brandList', 'perGroup'].forEach((id) => $(id).addEventListener('input', () => renderDraws()));
  $('addGroupForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const existing = lines($('groups'));
    let name = $('newGroup').value.trim();
    if (!name) { let k = existing.length + 1; while (existing.includes(`Nhóm ${k}`)) k++; name = `Nhóm ${k}`; }
    if (existing.includes(name)) { toast(`${name} is already on the list`); return; }
    $('groups').value = [...existing, name].join('\n');
    $('newGroup').value = '';
    onGroupsChanged(); renderDraws();
    toast(`${name} added. It is shared with Game 1 too.`);
  });
  $('copyBrands').onclick = () => {
    const ts = teams().filter((g) => (draws[g] || []).length);
    if (!ts.length) { toast('Draw some brands first'); return; }
    copy(ts.map((g) => `${order.includes(g) ? `#${order.indexOf(g) + 1} ` : ''}${g}: ${draws[g].join(', ')}`).join('\n'));
  };

  // ---------- confetti ----------
  function confetti() {
    if (reduce) return;
    const c = $('confetti'), x = c.getContext('2d');
    c.width = innerWidth; c.height = innerHeight;
    const cols = ['#c6bfff', '#ffd27a', '#7ef0ff', '#ff9bd2', '#5ee0a0'];
    const ps = Array.from({ length: 120 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.4, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: Math.random() * 6, c: cols[(Math.random() * cols.length) | 0], s: 4 + Math.random() * 5 }));
    const t0 = performance.now();
    (function f(now) {
      x.clearRect(0, 0, c.width, c.height);
      for (const p of ps) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.r += 0.1; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); }
      if (now - t0 < 2200) requestAnimationFrame(f); else x.clearRect(0, 0, c.width, c.height);
    })(t0);
  }

  if (opts.groups && opts.groups.length) { $('groups').value = opts.groups.join('\n'); onGroupsChanged(); } else setGroups(8);
  if (opts.brands && opts.brands.length) $('brandList').value = opts.brands.join('\n');
  renderDraws();
  requestAnimationFrame(() => { sizeCanvas(); drawScene(0); });
  show(location.hash.slice(1) === 'brands' ? 'brands' : 'order');

  // ---------- giảng viên: lưu danh sách & công bố kết quả ----------
  root.querySelectorAll('[data-admin]').forEach((el) => { el.hidden = !opts.isAdmin; });
  const run = async (fn, okMsg) => { try { const r = await fn(); if (r && r.error) toast(r.error); else toast(okMsg); } catch (e) { toast(String(e.message || e)); } };
  if (opts.isAdmin) {
    $('saveGroups').onclick = () => run(() => opts.onSaveGroups?.(groupList()), 'Group list saved as the default');
    $('saveBrands').onclick = () => run(() => opts.onSaveBrands?.(lines($('brandList'))), 'Brand list saved as the default');
    $('publishOrder').onclick = () => {
      if (!order.length || order.length < groupList().length) { toast('Finish a race first'); return; }
      run(() => opts.onPublish?.('race', { order: [...order], times: { ...finishAt }, seconds: raceLen }), 'Presenting order published to the Notice Board');
    };
    $('publishBrands').onclick = () => {
      const ts = teams().filter((g) => (draws[g] || []).length);
      if (!ts.length) { toast('Draw some brands first'); return; }
      run(() => opts.onPublish?.('brands', { groups: ts.map((g) => ({ group: g, brands: draws[g] })) }), 'Brands published to the Notice Board');
    };
  }

  return () => {
    ac.abort();
    if (race && race.raf) cancelAnimationFrame(race.raf);
    race = null;
  };
}
