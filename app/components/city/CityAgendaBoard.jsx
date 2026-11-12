'use client';

// v42: Today's Schedule — bảng lịch hằng ngày ở góc trái trang chủ (chỉ admin thấy).
// Đọc lịch dạy / họp / ngày quan trọng từ Harbour board (bảng private_events trên Supabase),
// cùng kiểu với City Notice Board bên phải.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  KINDS, vnNow, ymd, parseYmd, addDays, toMin, fetchEvents,
} from '@/lib/island';

const DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (d) => `${DAYN[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`;

function fmtIn(mins) {
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60); const m = mins % 60;
  return m ? `in ${h}h ${String(m).padStart(2, '0')}` : `in ${h}h`;
}

// Trạng thái của một buổi so với giờ hiện tại (chỉ tính cho hôm nay).
function stateOf(ev, isToday, nowMin) {
  if (ev.status === 'cancelled') return { key: 'off', label: 'Cancelled' };
  if (!isToday) return null;
  const s = toMin(ev.start); const e = Math.max(toMin(ev.end), s + 1);
  if (nowMin >= e) return { key: 'done', label: 'Done' };
  if (nowMin >= s) return { key: 'now', label: `Now · ${e - nowMin} min left` };
  return { key: 'soon', label: fmtIn(s - nowMin) };
}

export default function CityAgendaBoard({ anchorRef }) {
  const [now, setNow] = useState(null);
  const [offset, setOffset] = useState(0); // 0 = hôm nay, -1 = hôm qua, 1 = ngày mai…
  const [events, setEvents] = useState([]);
  const [range, setRange] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | missing | error
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(null);
  const [hidden, setHidden] = useState(false);

  // Đồng hồ giờ Việt Nam, cập nhật mỗi 30 giây.
  useEffect(() => {
    setNow(vnNow());
    setOpen(window.innerWidth >= 900 && window.innerHeight >= 640);
    const id = setInterval(() => setNow(vnNow()), 30000);
    return () => clearInterval(id);
  }, []);

  const todayKey = now ? ymd(now) : '';
  const today = useMemo(() => (todayKey ? parseYmd(todayKey) : null), [todayKey]);
  const day = today ? addDays(today, offset) : null;
  const dayKey = day ? ymd(day) : '';
  const nextKey = day ? ymd(addDays(day, 1)) : '';

  // Tải 7 ngày quanh ngày đang xem một lần, chuyển ngày trong khoảng đó không cần tải lại.
  const load = useCallback(async (center) => {
    const from = ymd(addDays(center, -3)); const to = ymd(addDays(center, 4));
    const res = await fetchEvents(from, to);
    if (!res.ok) { setState(res.missing ? 'missing' : 'error'); return; }
    setEvents(res.data); setRange({ from, to }); setState('ok');
  }, []);

  useEffect(() => {
    if (!day) return;
    if (range && dayKey >= range.from && nextKey <= range.to) return;
    load(day);
  }, [dayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Làm mới khi quay lại tab và mỗi 5 phút (lịch có thể vừa sửa trên /island).
  useEffect(() => {
    if (!today) return undefined;
    const refresh = () => { if (document.visibilityState === 'visible') load(addDays(today, offset)); };
    const id = setInterval(refresh, 5 * 60000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', refresh); };
  }, [today, offset, load]);

  // Desktop: đặt bảng ngay dưới hàng nút quận (Main City, Game Island…) bên trái.
  // Khi thẻ toà nhà (góc dưới trái) mở thì tạm ẩn bảng để không chồng lên nhau.
  useEffect(() => {
    const root = anchorRef?.current;
    if (!root) return undefined;
    let ro = null; let mo = null; let t = null;
    const attach = () => {
      const bar = root.querySelector('.kwc-cities');
      const card = root.querySelector('.kwc-card');
      if (!bar) { t = setTimeout(attach, 300); return; }
      const place = () => {
        const r = root.getBoundingClientRect(); const c = bar.getBoundingClientRect();
        if (c.height) setTop(Math.round(c.bottom - r.top + 10));
      };
      place();
      if ('ResizeObserver' in window) { ro = new ResizeObserver(place); ro.observe(bar); ro.observe(root); }
      if (card) {
        const sync = () => setHidden(!card.hidden);
        sync();
        mo = new MutationObserver(sync);
        mo.observe(card, { attributes: true, attributeFilter: ['hidden'] });
      }
    };
    attach();
    return () => { clearTimeout(t); ro?.disconnect(); mo?.disconnect(); };
  }, [anchorRef]);

  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : 0;
  const isToday = offset === 0;
  const list = events.filter((e) => e.date === dayKey);
  const tomorrow = events.filter((e) => e.date === nextKey && e.status !== 'cancelled');
  const remaining = isToday
    ? list.filter((e) => e.status !== 'cancelled' && Math.max(toMin(e.end), toMin(e.start) + 1) > nowMin).length
    : 0;
  const counts = Object.keys(KINDS).map((k) => [k, list.filter((e) => e.kind === k && e.status !== 'cancelled').length]).filter(([, n]) => n);

  if (!now) return null;

  const dayLabel = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : offset === -1 ? 'Yesterday' : DAYN[day.getDay()];

  return (
    <aside
      className={`kwb kwa ${open ? 'is-open' : ''} ${hidden ? 'is-away' : ''}`}
      style={top != null ? { '--kwa-top': `${top}px` } : undefined}
      aria-label="Today's schedule"
    >
      <button type="button" className="kwb-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="kwb-icon kwa-icon material-symbols-outlined" aria-hidden="true">event_note</span>
        <span className="kwb-title"><span className="full">Today&apos;s Schedule</span><span className="short">Today</span></span>
        {state === 'ok' && remaining > 0 && <span className="kwb-badge kwa-badge">{remaining}<span className="full"> left</span></span>}
        <span className={`kwb-chev material-symbols-outlined ${open ? 'up' : ''}`} aria-hidden="true">expand_more</span>
      </button>

      {open && (
        <div className="kwb-body">
          <div className="kwa-nav">
            <button type="button" onClick={() => setOffset((o) => o - 1)} aria-label="Previous day">
              <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
            </button>
            <div className="kwa-day">
              <b>{dayLabel}</b>
              <span>{fmtDay(day)}</span>
            </div>
            <button type="button" onClick={() => setOffset((o) => o + 1)} aria-label="Next day">
              <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
          </div>
          {offset !== 0 && (
            <button type="button" className="kwa-back" onClick={() => setOffset(0)}>Back to today</button>
          )}

          {counts.length > 0 && (
            <div className="kwa-sum">
              {counts.map(([k, n]) => (
                <span key={k} style={{ '--c': KINDS[k].color }}><i />{n} {KINDS[k].short.toLowerCase()}{n > 1 && k !== 'key' ? 's' : ''}</span>
              ))}
            </div>
          )}

          {state === 'loading' && <p className="kwb-empty">Loading your schedule…</p>}
          {state === 'missing' && (
            <p className="kwb-hint">Run <code>migration_v30_island.sql</code> on Supabase to turn on your schedule.</p>
          )}
          {state === 'error' && <p className="kwb-hint">Could not load the schedule. Check that you are signed in, then reload.</p>}
          {state === 'ok' && list.length === 0 && (
            <p className="kwb-empty">{isToday ? 'Nothing on the calendar today. A free day!' : 'Nothing on the calendar this day.'}</p>
          )}

          <ul className="kwb-list">
            {list.map((ev) => {
              const k = KINDS[ev.kind] || KINDS.teach;
              const st = stateOf(ev, isToday, nowMin);
              const where = [ev.school, ev.place].filter(Boolean).join(' · ');
              return (
                <li key={ev.id} className={`kwb-item kwa-item ${st ? `is-${st.key}` : ''}`} style={{ '--c': k.color }}>
                  <div className="kwb-meta">
                    <span className="kwb-tag" style={{ '--c': k.color }}>{k.short}</span>
                    {ev.status === 'makeup' && <span className="kwa-flag">MAKE-UP</span>}
                    {st && <span className={`kwa-state ${st.key}`}>{st.label}</span>}
                  </div>
                  <div className="kwa-row">
                    <span className="kwa-time">{ev.start}<em>{ev.end && ev.end !== ev.start ? ev.end : ''}</em></span>
                    <div className="kwb-text">
                      <b>{ev.title}</b>
                      {where && <span className="kwa-where"><span className="material-symbols-outlined" aria-hidden="true">location_on</span>{where}</span>}
                      {ev.status === 'cancelled' && ev.cancel_reason && <span className="kwa-note">{ev.cancel_reason}</span>}
                      {ev.status !== 'cancelled' && ev.note && <span className="kwa-note clamp">{ev.note}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {state === 'ok' && (
            <p className="kwa-next">
              <span className="material-symbols-outlined" aria-hidden="true">wb_twilight</span>
              <span>{tomorrow.length
                ? <>{offset === 0 ? 'Tomorrow' : fmtDay(addDays(day, 1))}: {tomorrow.length} item{tomorrow.length > 1 ? 's' : ''}, first at <b>{tomorrow[0].start}</b> · {tomorrow[0].title}</>
                : <>{offset === 0 ? 'Tomorrow' : fmtDay(addDays(day, 1))} is clear.</>}</span>
            </p>
          )}

          <Link href="/island" className="kwa-open">
            <span className="material-symbols-outlined" aria-hidden="true">sailing</span>
            Open Harbour board to add or edit
          </Link>
          <p className="kwb-auto"><span className="material-symbols-outlined" aria-hidden="true">lock</span>Only you can see this board.</p>
        </div>
      )}
    </aside>
  );
}

