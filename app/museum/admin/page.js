'use client';

// v40: Trang quản trị Knoworld Museum — chỉ admin.
// Chọn phòng -> chọn nhiều ảnh -> sửa tiêu đề/ngày/nơi/lời kể -> Tải lên.
// Ảnh mới tự treo vào khung trống kế tiếp của phòng (hết khung thì vào Album của phòng).
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RequireAuth from '../../components/RequireAuth';
import { useAuth } from '../../components/AuthProvider';
import CityPage from '../../components/city/CityPage';
import {
  MUSEUM_ADMIN_EMAIL, MUSEUM_ROOMS, loadRoomPhotosAdmin, countPhotosAdmin, uploadMuseumPhoto,
  updateMuseumPhoto, deleteMuseumPhoto, setLovePassword, loadGuestbook, deleteGuestbook,
} from '@/lib/museum';
import './admin.css';

export default function MuseumAdminPage() {
  return (
    <RequireAuth>
      <Gate />
    </RequireAuth>
  );
}

function Gate() {
  const { user } = useAuth();
  if (user?.email !== MUSEUM_ADMIN_EMAIL) {
    return (
      <CityPage place="museum" title="Museum storeroom" subtitle="Only the museum owner can hang new photos.">
        <div className="glass-card rounded-card p-8 max-w-md">
          <p className="text-sm text-on-surface-variant m-0">This page belongs to the administrator account.</p>
        </div>
      </CityPage>
    );
  }
  return <Admin />;
}

const todayVN = (ms) => { const d = new Date((ms || Date.now()) + 7 * 3600e3); return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`; };
const niceName = (n) => n.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);

function Admin() {
  const [room, setRoom] = useState('class');
  const [counts, setCounts] = useState({});
  const [list, setList] = useState([]);
  const [queue, setQueue] = useState([]); // { key, file, url, title, taken, place, caption, tag, status }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);
  const R = useMemo(() => MUSEUM_ROOMS.find((r) => r.id === room), [room]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('room');
    if (q && MUSEUM_ROOMS.some((r) => r.id === q)) setRoom(q);
  }, []);

  const refresh = useCallback(async () => {
    try { setList(await loadRoomPhotosAdmin(room)); setCounts(await countPhotosAdmin()); }
    catch (e) { setMsg(`Không tải được danh sách ảnh: ${e.message || e}. Bạn đã chạy migration_v40_museum.sql chưa?`); }
  }, [room]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => () => queue.forEach((q) => URL.revokeObjectURL(q.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function addFiles(files) {
    const arr = [...files].filter((f) => f.type.startsWith('image/'));
    if (!arr.length) return;
    setQueue((q) => [...q, ...arr.map((f) => ({
      key: `${f.name}-${f.size}-${Math.random()}`, file: f, url: URL.createObjectURL(f),
      title: niceName(f.name), taken: todayVN(f.lastModified), place: '', caption: '', tag: '', status: '',
    }))]);
  }
  const editQ = (key, patch) => setQueue((q) => q.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const dropQ = (key) => setQueue((q) => { const x = q.find((i) => i.key === key); if (x) URL.revokeObjectURL(x.url); return q.filter((i) => i.key !== key); });

  async function uploadAll() {
    if (!queue.length || busy) return;
    setBusy(true); setMsg('');
    let sort = list.reduce((m, p) => Math.max(m, p.sort || 0), 0) + 1, okN = 0;
    for (const it of queue) {
      if (it.status === 'done') continue;
      editQ(it.key, { status: 'up' });
      try {
        await uploadMuseumPhoto(room, it.file, it, sort++);
        editQ(it.key, { status: 'done' }); okN++;
      } catch (e) { editQ(it.key, { status: `Lỗi: ${e.message || e}` }); }
    }
    setBusy(false);
    setMsg(okN ? `Đã treo ${okN} ảnh vào ${R.name}.` : 'Chưa tải được ảnh nào.');
    setQueue((q) => { q.filter((x) => x.status === 'done').forEach((x) => URL.revokeObjectURL(x.url)); return q.filter((x) => x.status !== 'done'); });
    refresh();
  }

  async function move(i, d) {
    const j = i + d; if (j < 0 || j >= list.length) return;
    const arr = [...list]; [arr[i], arr[j]] = [arr[j], arr[i]];
    const next = arr.map((p, k) => ({ ...p, sort: k + 1 }));
    setList(next);
    try { await Promise.all(next.map((p) => updateMuseumPhoto(p.id, { sort: p.sort }))); } catch (e) { setMsg(`Lỗi: ${e.message || e}`); refresh(); }
  }
  async function del(p) {
    if (!window.confirm(`Gỡ ảnh “${p.title || 'không tên'}” khỏi bảo tàng?`)) return;
    try { await deleteMuseumPhoto(p); refresh(); } catch (e) { setMsg(`Lỗi: ${e.message || e}`); }
  }

  return (
    <CityPage
      place="museum"
      title="Museum storeroom"
      subtitle="Pick a room, choose as many photos as you like, then hang them. New photos fill the next empty frame on the walls; once the walls are full they go into the room's album."
      actions={<Link href="/museum" className="kw-pill">Open the museum →</Link>}
    >
      <div className="kwma">
        <div className="ma-tabs" role="tablist">
          {MUSEUM_ROOMS.map((r) => (
            <button key={r.id} type="button" role="tab" aria-selected={room === r.id} className={room === r.id ? 'on' : ''} onClick={() => setRoom(r.id)} style={{ '--c': r.color }}>
              <i style={{ background: r.color }} />{r.name}{r.private ? ' 🔒' : ''}<small>{counts[r.id] || 0} ảnh</small>
            </button>
          ))}
        </div>

        <section className="ma-card">
          <h2 style={{ color: R.color }}>Treo ảnh mới · {R.name}</h2>
          <p className="ma-sub">{R.sub}. Phòng có {R.slots} chỗ treo trên tường/vách/bệ; đang dùng {Math.min(list.length, R.slots)}/{R.slots}{list.length > R.slots ? `, ${list.length - R.slots} ảnh nằm trong Album` : ''}.{R.private ? ' Ảnh phòng này chỉ hiện khi nhập đúng mật khẩu.' : ''}</p>
          <div
            className="ma-drop"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            onClick={() => fileRef.current && fileRef.current.click()}
            role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current.click(); }}
          >
            <b>Kéo thả ảnh vào đây</b> hoặc bấm để chọn nhiều ảnh
            <small>Ảnh tự thu nhỏ còn tối đa 1800px trước khi tải lên.</small>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </div>

          {queue.length > 0 && (
            <>
              <div className="ma-queue">
                {queue.map((q) => (
                  <div key={q.key} className="ma-item">
                    <img src={q.url} alt="" />
                    <div className="ma-fields">
                      <input value={q.title} maxLength={120} placeholder="Tiêu đề" onChange={(e) => editQ(q.key, { title: e.target.value })} />
                      <div className="ma-2">
                        <input value={q.taken} maxLength={60} placeholder="Ngày / thời gian" onChange={(e) => editQ(q.key, { taken: e.target.value })} />
                        <input value={q.place} maxLength={120} placeholder="Nơi chụp" onChange={(e) => editQ(q.key, { place: e.target.value })} />
                      </div>
                      {room === 'award' && <input value={q.tag} maxLength={40} placeholder="Nhãn (vd. Nghiên cứu, Giảng dạy)" onChange={(e) => editQ(q.key, { tag: e.target.value })} />}
                      <textarea value={q.caption} maxLength={1000} rows={2} placeholder="Lời kể (không bắt buộc)" onChange={(e) => editQ(q.key, { caption: e.target.value })} />
                      {q.status && <span className={`ma-st ${q.status.startsWith('Lỗi') ? 'err' : ''}`}>{q.status === 'up' ? 'Đang tải…' : q.status === 'done' ? 'Xong ✓' : q.status}</span>}
                    </div>
                    <button type="button" className="ma-x" onClick={() => dropQ(q.key)} disabled={busy} aria-label="Bỏ ảnh này">✕</button>
                  </div>
                ))}
              </div>
              <div className="ma-row">
                <button type="button" className="ma-btn" onClick={() => { queue.forEach((q) => URL.revokeObjectURL(q.url)); setQueue([]); }} disabled={busy}>Bỏ hết</button>
                <button type="button" className="ma-btn gold" onClick={uploadAll} disabled={busy}>{busy ? 'Đang treo ảnh…' : `Treo ${queue.length} ảnh vào ${R.name}`}</button>
              </div>
            </>
          )}
          {msg && <p className="ma-msg">{msg}</p>}
        </section>

        <section className="ma-card">
          <h2>Ảnh đang có · {R.name} <small>({list.length})</small></h2>
          {!list.length && <p className="ma-sub">Phòng này chưa có ảnh thật — khách đang thấy ảnh minh họa.</p>}
          <div className="ma-list">
            {list.map((p, i) => <PhotoRow key={p.id} p={p} i={i} n={list.length} slots={R.slots} award={room === 'award'} onMove={move} onDel={del} onSaved={refresh} />)}
          </div>
        </section>

        {room === 'love' && <LovePass />}
        <Guestbook />
      </div>
    </CityPage>
  );
}

function PhotoRow({ p, i, n, slots, award, onMove, onDel, onSaved }) {
  const [f, setF] = useState(p);
  const [saving, setSaving] = useState(false);
  useEffect(() => setF(p), [p]);
  const dirty = ['title', 'taken', 'place', 'caption', 'tag'].some((k) => (f[k] || '') !== (p[k] || ''));
  async function save() {
    setSaving(true);
    try { await updateMuseumPhoto(p.id, { title: f.title, taken: f.taken, place: f.place, caption: f.caption, tag: f.tag }); onSaved(); }
    catch (e) { window.alert(`Lỗi: ${e.message || e}`); }
    setSaving(false);
  }
  return (
    <div className="ma-item">
      <a href={p.url} target="_blank" rel="noopener noreferrer"><img src={p.url} alt="" loading="lazy" /></a>
      <div className="ma-fields">
        <span className={`ma-slot ${i >= slots ? 'al' : ''}`}>{i < slots ? `Khung ${i + 1}` : 'Album'}</span>
        <input value={f.title} maxLength={120} placeholder="Tiêu đề" onChange={(e) => setF({ ...f, title: e.target.value })} />
        <div className="ma-2">
          <input value={f.taken} maxLength={60} placeholder="Ngày / thời gian" onChange={(e) => setF({ ...f, taken: e.target.value })} />
          <input value={f.place} maxLength={120} placeholder="Nơi chụp" onChange={(e) => setF({ ...f, place: e.target.value })} />
        </div>
        {award && <input value={f.tag} maxLength={40} placeholder="Nhãn" onChange={(e) => setF({ ...f, tag: e.target.value })} />}
        <textarea value={f.caption} maxLength={1000} rows={2} placeholder="Lời kể" onChange={(e) => setF({ ...f, caption: e.target.value })} />
        <div className="ma-row left">
          <button type="button" className="ma-btn sm" onClick={() => onMove(i, -1)} disabled={i === 0} title="Lên trước">↑</button>
          <button type="button" className="ma-btn sm" onClick={() => onMove(i, 1)} disabled={i === n - 1} title="Xuống sau">↓</button>
          {dirty && <button type="button" className="ma-btn sm gold" onClick={save} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button>}
          <button type="button" className="ma-btn sm danger" onClick={() => onDel(p)}>Gỡ ảnh</button>
        </div>
      </div>
    </div>
  );
}

function LovePass() {
  const [a, setA] = useState(''); const [b, setB] = useState(''); const [msg, setMsg] = useState('');
  async function submit(e) {
    e.preventDefault();
    if (a.length < 4) { setMsg('Mật khẩu tối thiểu 4 ký tự.'); return; }
    if (a !== b) { setMsg('Hai lần nhập không khớp.'); return; }
    try { const okk = await setLovePassword(a); setMsg(okk ? 'Đã đổi mật khẩu Phòng Riêng.' : 'Không đổi được.'); if (okk) { setA(''); setB(''); } }
    catch (err) { setMsg(`Lỗi: ${err.message || err}`); }
  }
  return (
    <section className="ma-card love">
      <h2>Mật khẩu Phòng Riêng</h2>
      <p className="ma-sub">Mặc định là <b>1402</b> — nên đổi sang mật khẩu dài hơn chỉ hai người biết. Nhập sai 8 lần trong 10 phút sẽ bị khóa tạm.</p>
      <form className="ma-row left" onSubmit={submit}>
        <input type="password" value={a} onChange={(e) => setA(e.target.value)} placeholder="Mật khẩu mới" autoComplete="new-password" maxLength={64} />
        <input type="password" value={b} onChange={(e) => setB(e.target.value)} placeholder="Nhập lại" autoComplete="new-password" maxLength={64} />
        <button type="submit" className="ma-btn pink">Đổi mật khẩu</button>
      </form>
      {msg && <p className="ma-msg">{msg}</p>}
    </section>
  );
}

function Guestbook() {
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => setRows(await loadGuestbook(60)), []);
  useEffect(() => { load(); }, [load]);
  return (
    <section className="ma-card">
      <h2>Sổ lưu bút <small>({rows.length})</small></h2>
      {!rows.length && <p className="ma-sub">Chưa có lời nhắn nào.</p>}
      <div className="ma-gb">
        {rows.map((g) => (
          <div key={g.id}>
            <b>{g.name}</b> <small>{String(g.created_at).slice(0, 16).replace('T', ' ')}</small>
            <p>{g.message}</p>
            <button type="button" className="ma-btn sm danger" onClick={async () => { if (window.confirm('Xoá lời nhắn này?')) { await deleteGuestbook(g.id); load(); } }}>Xoá</button>
          </div>
        ))}
      </div>
    </section>
  );
}
