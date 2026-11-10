'use client';

// v30: Thinh's Island — đảo riêng của admin: Lecture Hall (lịch dạy), City Hall (lịch họp),
// Lighthouse (ngày quan trọng). Dữ liệu ở bảng private_events (RLS: chỉ admin).
import { useCallback, useEffect, useMemo, useState } from 'react';
import RequireAuth from '../components/RequireAuth';
import { useAuth } from '../components/AuthProvider';
import CityPage from '../components/city/CityPage';
import {
  KINDS, vnNow, ymd, parseYmd, addDays, mondayOf, toMin,
  fetchEvents, addEvents, deleteEvent, deleteSeriesFrom,
} from '@/lib/island';
import { toast } from '@/lib/engagement';
import './island.css';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';
const DAYN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const H0 = 7; const H1 = 22; const PX = 44;
const dow = (d) => (d.getDay() + 6) % 7;
const fmtDay = (d) => `${DAYN[dow(d)]} ${d.getDate()} ${MON[d.getMonth()]}`;

function useNow() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(vnNow());
    const id = setInterval(() => setNow(vnNow()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function fmtLeft(mins) {
  if (mins < 1) return 'now';
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60); const m = mins % 60;
  if (h < 24) return `in ${h} h ${String(m).padStart(2, '0')} min`;
  const d = Math.floor(h / 24);
  return `in ${d} day${d > 1 ? 's' : ''} ${h % 24} h`;
}

export default function IslandPage() {
  return (
    <RequireAuth>
      <Gate />
    </RequireAuth>
  );
}

function Gate() {
  const { user } = useAuth();
  if (user?.email !== ADMIN_EMAIL) {
    return (
      <CityPage place="island" title="A private island" subtitle="This island belongs to the city administrator. There is nothing to see here.">
        <div className="glass-card rounded-card p-8 max-w-md">
          <span className="material-symbols-outlined text-[#ffd27a] text-4xl">lock</span>
          <p className="text-sm text-on-surface-variant mt-2">Only the administrator account can open Thinh&apos;s Island.</p>
        </div>
      </CityPage>
    );
  }
  return <Island />;
}

const EMPTY_FORM = { title: '', kind: 'teach', date: '', start: '07:30', end: '09:30', repeat: '1', place: '', note: '' };

function Island() {
  const now = useNow();
  const [weekStart, setWeekStart] = useState(null);
  const [events, setEvents] = useState([]);
  const [state, setState] = useState({ loading: true, missing: false, error: '' });
  const [visible, setVisible] = useState({ teach: true, meet: true, key: true });
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (now && !weekStart) setWeekStart(mondayOf(now)); }, [now, weekStart]);

  const load = useCallback(async () => {
    if (!weekStart) return;
    const today = vnNow();
    const from = ymd(weekStart < today ? weekStart : mondayOf(today));
    const lastWeek = addDays(weekStart, 6);
    const horizon = addDays(today, 120);
    const to = ymd(lastWeek > horizon ? lastWeek : horizon);
    const res = await fetchEvents(from, to);
    setEvents(res.data);
    setState({ loading: false, missing: res.missing, error: res.ok ? '' : res.error || '' });
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const days = useMemo(() => (weekStart ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : []), [weekStart]);
  const todayKey = now ? ymd(now) : '';
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : 0;

  const todays = events.filter((e) => e.date === todayKey).sort((a, b) => toMin(a.start) - toMin(b.start));
  const next = useMemo(() => {
    if (!now) return null;
    const t = now.getTime();
    return events
      .map((e) => ({ e, at: parseYmd(e.date).getTime() + toMin(e.start) * 60000 }))
      .filter((x) => x.at >= t - 60000)
      .sort((a, b) => a.at - b.at)[0] || null;
  }, [events, now]);
  const lighthouse = useMemo(() => {
    if (!now) return [];
    const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return events.filter((e) => e.kind === 'key' && parseYmd(e.date).getTime() >= t0).slice(0, 6)
      .map((e) => ({ e, left: Math.round((parseYmd(e.date).getTime() - t0) / 86400000) }));
  }, [events, now]);
  const selected = events.find((e) => e.id === selectedId) || null;

  const openForm = () => {
    setForm({ ...EMPTY_FORM, date: todayKey });
    setAdding((a) => !a);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await addEvents({ ...form, repeat: Number(form.repeat) });
    setBusy(false);
    if (!res.ok) { toast(res.error || 'Could not save', 'error'); return; }
    toast(res.count > 1 ? `Added ${res.count} weekly sessions to the island` : 'Added to the island', 'sailing');
    setAdding(false);
    setWeekStart(mondayOf(parseYmd(form.date)));
    setForm(EMPTY_FORM);
    load();
  };

  const remove = async (all) => {
    if (!selected) return;
    const res = all && selected.series_id ? await deleteSeriesFrom(selected.series_id, selected.date) : await deleteEvent(selected.id);
    if (!res.ok) { toast(res.error || 'Could not remove', 'error'); return; }
    toast(all ? 'Removed this and the following sessions' : 'Removed from the island', 'delete');
    setSelectedId(null);
    load();
  };

  const actions = (
    <>
      <button type="button" className="kw-pill" onClick={openForm}>
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>Add to island
      </button>
    </>
  );

  return (
    <CityPage
      place="island"
      title="Thinh's Island"
      subtitle="Your private district off the coast. The Lecture Hall keeps your teaching timetable, City Hall your meetings, and the Lighthouse the dates you must not miss."
      actions={actions}
    >
      {state.missing && (
        <div className="kwi-banner">
          <span className="material-symbols-outlined" aria-hidden="true">database</span>
          <div>
            <b>One step left:</b> run <code>supabase/migration_v30_island.sql</code> in the Supabase SQL Editor to create your private calendar.
          </div>
        </div>
      )}
      {!state.missing && state.error && <div className="kwi-banner is-error">{state.error}</div>}

      <div className="kwi-grid">
        <div className="kwi-col">
          <section className="glass-card rounded-card kwi-panel" aria-labelledby="kwiToday">
            <div className="kwi-h">
              <span className="material-symbols-outlined" style={{ color: KINDS.teach.color }} aria-hidden="true">schedule</span>
              <div><h2 id="kwiToday">Today on the island</h2><p>{now ? `${fmtDay(now)} · Vietnam time` : ''}</p></div>
            </div>
            {next && (
              <div className="kwi-next" style={{ '--c': KINDS[next.e.kind].color }}>
                <span className="kwi-eyebrow">Next up · {KINDS[next.e.kind].short}</span>
                <h3>{next.e.title}</h3>
                <p>
                  {next.e.date === todayKey ? 'Today' : fmtDay(parseYmd(next.e.date))}, {next.e.start}–{next.e.end}
                  {next.e.place ? ` · ${next.e.place}` : ''}
                </p>
                <span className="kwi-count">{fmtLeft(Math.round((next.at - now.getTime()) / 60000))}</span>
              </div>
            )}
            <ul className="kwi-timeline">
              {todays.length === 0 && <li className="kwi-empty">{state.loading ? 'Loading…' : 'Nothing scheduled today. A quiet day on the island.'}</li>}
              {todays.map((e) => (
                <li key={e.id} className={toMin(e.end) < nowMin ? 'past' : ''} style={{ '--c': KINDS[e.kind].color }}>
                  <span className="tm">{e.start}<br />{e.end}</span>
                  <span className="pin" />
                  <span><b>{e.title}</b><span className="where">{e.place || KINDS[e.kind].short}</span></span>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass-card rounded-card kwi-panel" aria-labelledby="kwiLight">
            <div className="kwi-h">
              <span className="material-symbols-outlined" style={{ color: KINDS.key.color }} aria-hidden="true">flare</span>
              <div><h2 id="kwiLight">Lighthouse</h2><p>Important dates, counted down in days</p></div>
            </div>
            <ul className="kwi-dates">
              {lighthouse.length === 0 && <li className="kwi-empty">No important dates ahead. Add one as “Important”.</li>}
              {lighthouse.map(({ e, left }) => {
                const d = parseYmd(e.date);
                return (
                  <li key={e.id}>
                    <span className="cal"><span className="m">{MON[d.getMonth()]}</span><span className="dd">{d.getDate()}</span></span>
                    <span className="txt"><b>{e.title}</b><span>{e.place || e.note || DAYN[dow(d)]}</span></span>
                    <span className={`days ${left <= 7 ? 'soon' : ''}`}>{left === 0 ? 'today' : left === 1 ? 'tomorrow' : `in ${left} days`}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <section className="glass-card rounded-card kwi-panel" aria-labelledby="kwiWeek">
          <div className="kwi-h kwi-h-wrap">
            <span className="material-symbols-outlined" style={{ color: KINDS.meet.color }} aria-hidden="true">calendar_month</span>
            <div className="grow">
              <h2 id="kwiWeek">Harbour board</h2>
              <p>{weekStart ? `Week of ${weekStart.getDate()} ${MON[weekStart.getMonth()]} – ${addDays(weekStart, 6).getDate()} ${MON[addDays(weekStart, 6).getMonth()]}` : ''}</p>
            </div>
            <div className="kwi-tools">
              <button type="button" className="kwi-btn" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}>‹</button>
              <button type="button" className="kwi-btn" onClick={() => setWeekStart(mondayOf(vnNow()))}>This week</button>
              <button type="button" className="kwi-btn" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}>›</button>
              <button type="button" className="kwi-btn primary" onClick={openForm}>+ Add to island</button>
            </div>
          </div>

          <div className="kwi-legend">
            {Object.entries(KINDS).map(([k, t]) => (
              <button key={k} type="button" className="kwi-chip" aria-pressed={visible[k]} style={{ '--c': t.color }}
                onClick={() => setVisible((v) => ({ ...v, [k]: !v[k] }))}><i />{t.label}</button>
            ))}
          </div>

          {adding && (
            <form className="kwi-form" onSubmit={submit}>
              <label className="s3">What
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={100} placeholder="E-Business · Lecture 9" autoFocus />
              </label>
              <div className="s3 kwi-flabel">Building
                <div className="kwi-types">
                  {Object.entries(KINDS).map(([k, t]) => (
                    <button key={k} type="button" aria-pressed={form.kind === k} style={{ '--c': t.color }} onClick={() => setForm({ ...form, kind: k })}><i />{t.short}</button>
                  ))}
                </div>
              </div>
              <label className="s2">Date <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></label>
              <label className="s1">Start <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required /></label>
              <label className="s1">End <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} required /></label>
              <label className="s2">Repeat
                <select value={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.value })}>
                  <option value="1">Just once</option>
                  <option value="5">Weekly · 5 weeks</option>
                  <option value="10">Weekly · 10 weeks</option>
                  <option value="15">Weekly · whole semester (15)</option>
                </select>
              </label>
              <label className="s3">Where <input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} placeholder="Room B402 · HSU" /></label>
              <label className="s3">Note <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Bring the case-study handout" /></label>
              <div className="kwi-row">
                <span className="hint">🔒 Saved to your private calendar. Only you can see it.</span>
                <button type="button" className="kwi-btn" onClick={() => setAdding(false)}>Cancel</button>
                <button type="submit" className="kwi-btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save to island'}</button>
              </div>
            </form>
          )}

          <div className="kwi-week-scroll">
            <div className="kwi-week">
              <div className="wh" />
              {days.map((d, i) => (
                <div key={i} className={`wh ${ymd(d) === todayKey ? 'today' : ''}`}><span className="dn">{DAYN[i]}</span><span className="dnum">{d.getDate()}</span></div>
              ))}
              <div className="hours">
                {Array.from({ length: H1 - H0 }, (_, i) => <div key={i}>{i ? `${String(H0 + i).padStart(2, '0')}:00` : ''}</div>)}
              </div>
              {days.map((d) => {
                const key = ymd(d);
                const list = events.filter((e) => e.date === key && visible[e.kind]);
                return (
                  <div key={key} className={`day ${key === todayKey ? 'today' : ''}`} style={{ height: (H1 - H0) * PX }}>
                    {list.map((e) => {
                      const top = Math.max(0, ((toMin(e.start) - H0 * 60) / 60) * PX);
                      const h = Math.max(24, ((toMin(e.end) - toMin(e.start)) / 60) * PX - 2);
                      return (
                        <button key={e.id} type="button" className={`ev ${selectedId === e.id ? 'on' : ''}`} style={{ '--c': KINDS[e.kind].color, top, height: h }}
                          onClick={() => setSelectedId(e.id)}>
                          <b>{e.title}</b><span>{e.start}–{e.end}</span>
                        </button>
                      );
                    })}
                    {key === todayKey && nowMin >= H0 * 60 && nowMin <= H1 * 60 && (
                      <div className="now-line" style={{ top: ((nowMin - H0 * 60) / 60) * PX }} aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {selected && (
            <div className="kwi-detail" style={{ '--c': KINDS[selected.kind].color }}>
              <span className="bar" />
              <div className="grow">
                <span className="kwi-eyebrow">{KINDS[selected.kind].label}</span>
                <h4>{selected.title}</h4>
                <p>{fmtDay(parseYmd(selected.date))} · {selected.start}–{selected.end}{selected.place ? ` · ${selected.place}` : ''}</p>
                {selected.note && <p>{selected.note}</p>}
              </div>
              <div className="kwi-detail-actions">
                <button type="button" className="kwi-btn" onClick={() => remove(false)}>Remove</button>
                {selected.series_id && <button type="button" className="kwi-btn" onClick={() => remove(true)}>Remove this &amp; later</button>}
                <button type="button" className="kwi-btn" aria-label="Close" onClick={() => setSelectedId(null)}>✕</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </CityPage>
  );
}
