'use client';

// v27: City Notice Board — bảng thông báo nổi trên thành phố (trang chủ).
// Mọi người xem các cập nhật mới; admin đăng / ghim / xoá ngay trên bảng.
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  NOTICE_TAGS, tagMeta, fetchAnnouncements, addAnnouncement, deleteAnnouncement,
  setAnnouncementPinned, getBoardSeen, setBoardSeen,
} from '@/lib/announcements';
import { timeAgo } from '@/lib/discussion';
import { toast } from '@/lib/engagement';

const isInternal = (href) => href && href.startsWith('/');

function NoticeLink({ href }) {
  if (!href) return null;
  if (isInternal(href)) return <Link href={href} className="kwb-open">Open →</Link>;
  return <a href={href} target="_blank" rel="noreferrer" className="kwb-open">Open ↗</a>;
}

export default function CityNoticeBoard({ isAdmin = false, user = null, anchorRef }) {
  const [items, setItems] = useState([]);
  const [source, setSource] = useState('sample');
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [seenAt, setSeenAt] = useState('');
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', tag: 'update', link: '', pinned: false });
  const [busy, setBusy] = useState(false);
  const [top, setTop] = useState(null);
  const boxRef = useRef(null);

  const load = () => fetchAnnouncements().then(({ data, source: s }) => { setItems(data || []); setSource(s); });

  useEffect(() => {
    setSeenAt(getBoardSeen());
    // Mở sẵn trên màn hình đủ rộng/cao; điện thoại thì thu gọn thành nút.
    setOpen(window.innerWidth >= 900 && window.innerHeight >= 680);
    load();
  }, []);

  // Desktop: đặt bảng ngay dưới bảng đồng hồ của thành phố (bên phải).
  useEffect(() => {
    const root = anchorRef?.current;
    if (!root) return undefined;
    let ro = null;
    let t = null;
    const place = (clock) => {
      const r = root.getBoundingClientRect();
      const c = clock.getBoundingClientRect();
      if (c.height) setTop(Math.round(c.bottom - r.top + 10));
    };
    const attach = () => {
      const clock = root.querySelector('.kwc-clock');
      if (!clock) { t = setTimeout(attach, 300); return; }
      place(clock);
      if ('ResizeObserver' in window) { ro = new ResizeObserver(() => place(clock)); ro.observe(clock); ro.observe(root); }
    };
    attach();
    return () => { clearTimeout(t); ro?.disconnect(); };
  }, [anchorRef]);

  const unseen = useMemo(
    () => items.filter((n) => !seenAt || String(n.created_at) > seenAt).length,
    [items, seenAt],
  );
  const newest = items.reduce((m, n) => (String(n.created_at) > m ? String(n.created_at) : m), '');

  // Mở bảng = đã xem tới tin mới nhất (nhãn NEW vẫn giữ trong lần ghé này).
  useEffect(() => { if (open && newest) setBoardSeen(newest); }, [open, newest]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await addAnnouncement({ ...form, user });
    setBusy(false);
    if (!res.ok) { toast(res.error || 'Could not post', 'error'); return; }
    setForm({ title: '', body: '', tag: 'update', link: '', pinned: false });
    setComposing(false);
    toast('Posted to the city notice board', 'campaign');
    load();
  };

  const remove = async (id) => {
    if (!window.confirm || !window.confirm('Remove this notice?')) return;
    const res = await deleteAnnouncement(id);
    if (res.ok) load(); else toast(res.error || 'Could not remove', 'error');
  };

  const togglePin = async (n) => {
    const res = await setAnnouncementPinned(n.id, !n.pinned);
    if (res.ok) load(); else toast(res.error || 'Could not update', 'error');
  };

  const canEdit = isAdmin && source === 'supabase';

  return (
    <aside
      ref={boxRef}
      className={`kwb ${open ? 'is-open' : ''}`}
      style={top != null ? { '--kwb-top': `${top}px` } : undefined}
      aria-label="City notice board"
    >
      <button type="button" className="kwb-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="kwb-icon material-symbols-outlined" aria-hidden="true">campaign</span>
        <span className="kwb-title"><span className="full">City Notice Board</span><span className="short">Notices</span></span>
        {unseen > 0 && <span className="kwb-badge">{unseen}<span className="full"> new</span></span>}
        <span className={`kwb-chev material-symbols-outlined ${open ? 'up' : ''}`} aria-hidden="true">expand_more</span>
      </button>

      {open && (
        <div className="kwb-body">
          {items.length === 0 && <p className="kwb-empty">No announcements yet.</p>}
          <ul className="kwb-list">
            {items.map((n) => {
              const t = tagMeta(n.tag);
              const isNew = !seenAt || String(n.created_at) > seenAt;
              const isOpen = expanded === n.id;
              return (
                <li key={n.id} className="kwb-item">
                  <div className="kwb-meta">
                    <span className="kwb-tag" style={{ '--c': t.color }}>{t.label}</span>
                    {n.pinned && <span className="kwb-pin material-symbols-outlined" title="Pinned">keep</span>}
                    {isNew && <span className="kwb-new">NEW</span>}
                    <span className="kwb-time">{timeAgo(n.created_at)}</span>
                  </div>
                  <button type="button" className="kwb-text" onClick={() => setExpanded(isOpen ? null : n.id)}>
                    <b>{n.title}</b>
                    {n.body && <span className={isOpen ? '' : 'clamp'}>{n.body}</span>}
                  </button>
                  {(n.link || canEdit) && (
                    <div className="kwb-actions">
                      <NoticeLink href={n.link} />
                      {canEdit && (
                        <span className="kwb-admin">
                          <button type="button" onClick={() => togglePin(n)}>{n.pinned ? 'Unpin' : 'Pin'}</button>
                          <button type="button" onClick={() => remove(n.id)}>Remove</button>
                        </span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {isAdmin && (
            source !== 'supabase' ? (
              <p className="kwb-hint">Run <code>migration_v27_announcements.sql</code> on Supabase to post updates here.</p>
            ) : composing ? (
              <form className="kwb-form" onSubmit={submit}>
                <input
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Headline — what's new?" maxLength={120} required autoFocus
                />
                <textarea
                  value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="A line or two (optional)" rows={3} maxLength={600}
                />
                <input
                  value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="Link (optional) — /videos or https://…"
                />
                <div className="kwb-tags" role="group" aria-label="Label">
                  {NOTICE_TAGS.map((t) => (
                    <button
                      key={t.key} type="button" style={{ '--c': t.color }}
                      className={form.tag === t.key ? 'on' : ''} onClick={() => setForm({ ...form, tag: t.key })}
                    >{t.label}</button>
                  ))}
                </div>
                <label className="kwb-check">
                  <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
                  Pin to top
                </label>
                <div className="kwb-row">
                  <button type="button" onClick={() => setComposing(false)}>Cancel</button>
                  <button type="submit" className="primary" disabled={busy}>{busy ? 'Posting…' : 'Post'}</button>
                </div>
              </form>
            ) : (
              <button type="button" className="kwb-compose" onClick={() => setComposing(true)}>
                <span className="material-symbols-outlined" aria-hidden="true">add</span>Post an update
              </button>
            )
          )}
        </div>
      )}
    </aside>
  );
}
