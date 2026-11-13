'use client';

// v50: Metro Ad Wall — poster & chiến dịch hay nhất của sinh viên, chiếu xoay vòng trên tường các ga B1/B2.
// Ai cũng xem được thư viện. Admin: tải poster lên, ghi tên chiến dịch / nhóm / môn, bật-tắt, xếp thứ tự, đổi tốc độ xoay.
import { useEffect, useState } from 'react';
import CityPage from '../../components/city/CityPage';
import { useAuth } from '../../components/AuthProvider';
import { loadMetroAds, saveMetroAds, uploadMetroAdImage, removeMetroAdImage, activeAds, METRO_ADS_ADMIN } from '@/lib/metroAds';
import './ads.css';

export default function MetroAdsPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === METRO_ADS_ADMIN;
  const [list, setList] = useState([]);
  const [every, setEvery] = useState(9);
  const [state, setState] = useState('loading');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState(null);
  const [meta, setMeta] = useState({ title: '', team: '', course: '' });

  useEffect(() => {
    loadMetroAds().then((d) => { setList(d.list); setEvery(d.every); setState('ok'); }).catch(() => setState('error'));
  }, []);
  useEffect(() => {
    if (!view) return undefined;
    const k = (e) => { if (e.key === 'Escape') setView(null); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [view]);

  const edit = (i, patch) => { setList((l) => l.map((a, j) => (j === i ? { ...a, ...patch } : a))); setDirty(true); };
  const move = (i, d) => { setList((l) => { const n = l.slice(); const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; }); setDirty(true); };

  async function save(next = list, ev = every) {
    setBusy(true); setMsg('Đang lưu…');
    try { await saveMetroAds(next, ev); setDirty(false); setMsg('Đã lưu ✓ — các ga sẽ chiếu poster mới khi tải lại trang chủ.'); }
    catch (e) { setMsg('Không lưu được: ' + (e.message || e)); }
    setBusy(false);
  }
  async function upload(files) {
    if (!files?.length) return;
    setBusy(true);
    const added = [];
    for (const [i, f] of [...files].entries()) {
      setMsg(`Đang tải ${i + 1}/${files.length}…`);
      try {
        const up = await uploadMetroAdImage(f);
        added.push({ ...up, title: meta.title || f.name.replace(/\.\w+$/, ''), team: meta.team, course: meta.course, on: true, at: new Date().toISOString() });
      } catch (e) { setMsg('Lỗi tải ảnh: ' + (e.message || e)); }
    }
    const next = [...added, ...list];
    setList(next); setBusy(false);
    if (added.length) await save(next);
  }
  async function del(i) {
    const a = list[i]; if (!a) return;
    const next = list.filter((_, j) => j !== i); setList(next);
    await save(next); removeMetroAdImage(a.path);
  }

  const shown = activeAds(list);
  return (
    <CityPage place="metro" title="Metro Ad Wall"
      subtitle="Out-of-home advertising, underground. The best posters and campaigns made by students rotate on the lightboxes of every B1 and B2 metro station. Walk the platforms on the city map, or browse them all here.">
      {isAdmin && (
        <section className="mad-admin glass-card">
          <h2>Admin · quản lý poster</h2>
          <p className="mad-hint">Chọn nhiều ảnh cùng lúc được. Ảnh tự thu nhỏ, lưu vào kho ảnh Museum (thư mục metro-ads). Poster được chiếu xoay vòng — mỗi ga 2 hộp đèn.</p>
          <div className="mad-row">
            <input placeholder="Tên chiến dịch (mặc định = tên file)" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
            <input placeholder="Nhóm / sinh viên" value={meta.team} onChange={(e) => setMeta({ ...meta, team: e.target.value })} />
            <input placeholder="Môn · lớp · học kỳ" value={meta.course} onChange={(e) => setMeta({ ...meta, course: e.target.value })} />
            <label className="mad-btn primary">{busy ? 'Đang xử lý…' : '＋ Tải poster lên'}
              <input type="file" accept="image/*" multiple hidden disabled={busy} onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
            </label>
          </div>
          <div className="mad-row">
            <span>Đổi poster mỗi</span>
            <input type="number" min={4} max={120} value={every} style={{ width: 70 }} onChange={(e) => { setEvery(Math.max(4, +e.target.value || 9)); setDirty(true); }} />
            <span>giây</span>
            <button type="button" className="mad-btn primary" disabled={busy || !dirty} onClick={() => save()}>Lưu thay đổi</button>
            <span className="mad-msg">{msg}</span>
          </div>
          {list.length > 0 && (
            <ul className="mad-list">
              {list.map((a, i) => (
                <li key={a.id || a.url} className={a.on === false ? 'off' : ''}>
                  <img src={a.url} alt="" loading="lazy" />
                  <div className="mad-fields">
                    <input value={a.title || ''} placeholder="Tên chiến dịch" onChange={(e) => edit(i, { title: e.target.value })} />
                    <input value={a.team || ''} placeholder="Nhóm / sinh viên" onChange={(e) => edit(i, { team: e.target.value })} />
                    <input value={a.course || ''} placeholder="Môn · lớp" onChange={(e) => edit(i, { course: e.target.value })} />
                  </div>
                  <div className="mad-acts">
                    <button type="button" onClick={() => edit(i, { on: a.on === false })}>{a.on === false ? '○ Đang ẩn' : '● Đang chiếu'}</button>
                    <button type="button" onClick={() => move(i, -1)} title="Lên">↑</button>
                    <button type="button" onClick={() => move(i, 1)} title="Xuống">↓</button>
                    <button type="button" className="danger" onClick={() => { if (window.confirm('Xoá poster này?')) del(i); }}>Xoá</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mad-gallery">
        <div className="mad-head"><h2>Now showing</h2><span>{shown.length} poster{shown.length === 1 ? '' : 's'} · rotating every {every}s in the stations</span></div>
        {state === 'loading' && <p className="mad-empty">Loading…</p>}
        {state === 'error' && <p className="mad-empty">Could not load the posters. Try again later.</p>}
        {state === 'ok' && shown.length === 0 && <p className="mad-empty">The lightboxes are waiting for the first campaign. Great student work will be shown here soon.</p>}
        <div className="mad-grid">
          {shown.map((a) => (
            <button type="button" key={a.id || a.url} className="mad-card" onClick={() => setView(a)}>
              <span className="mad-img"><img src={a.url} alt={a.title || 'Student campaign'} loading="lazy" /></span>
              <b>{a.title || 'Student campaign'}</b>
              <small>{[a.team, a.course].filter(Boolean).join(' · ')}</small>
            </button>
          ))}
        </div>
      </section>

      {view && (
        <div className="mad-lightbox" role="dialog" aria-modal="true" onClick={() => setView(null)}>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={view.url} alt={view.title || ''} />
            <figcaption><b>{view.title}</b>{[view.team, view.course].filter(Boolean).length > 0 && <span>{[view.team, view.course].filter(Boolean).join(' · ')}</span>}</figcaption>
            <button type="button" onClick={() => setView(null)} aria-label="Đóng">✕</button>
          </figure>
        </div>
      )}
    </CityPage>
  );
}
