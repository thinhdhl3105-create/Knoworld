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
  WEEKDAYS, SCHOOLS, MAX_SESSIONS, datesOnWeekdays, cancelEvent, restoreEvent, addMakeup,
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

const EMPTY_FORM = {
  title: '', kind: 'teach', date: '', start: '07:30', end: '09:30', place: '', note: '',
  school: '', repeatMode: 'once', weekdays: [], until: '',
};
const EMPTY_MK = { reason: '', withMakeup: false, date: '', start: '', end: '', place: '' };
const STATUS_TAG = { cancelled: 'Cancelled', makeup: 'Make-up' };

function Island() {
  const now = useNow();
  const [weekStart, setWeekStart] = useState(null);
  const [events, setEvents] = useState([]);
  const [state, setState] = useState({ loading: true, missing: false, error: '', v37: null });
  const [visible, setVisible] = useState({ teach: true, meet: true, key: true });
  const [showCancelled, setShowCancelled] = useState(true);
  const [mode, setMode] = useState(null); // 'cancel' | 'makeup' — form nhỏ trong ô chi tiết
  const [mk, setMk] = useState(EMPTY_MK);
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
    setState({ loading: false, missing: res.missing, error: res.ok ? '' : res.error || '', v37: res.v37 ?? null });
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
      .filter((e) => e.status !== 'cancelled')
      .map((e) => ({ e, at: parseYmd(e.date).getTime() + toMin(e.start) * 60000 }))
      .filter((x) => x.at >= t - 60000)
      .sort((a, b) => a.at - b.at)[0] || null;
  }, [events, now]);
  const lighthouse = useMemo(() => {
    if (!now) return [];
    const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return events.filter((e) => e.kind === 'key' && e.status !== 'cancelled' && parseYmd(e.date).getTime() >= t0).slice(0, 6)
      .map((e) => ({ e, left: Math.round((parseYmd(e.date).getTime() - t0) / 86400000) }));
  }, [events, now]);
  const selected = events.find((e) => e.id === selectedId) || null;
  const makeupOfSelected = selected ? events.find((e) => e.makeup_for === selected.id) || null : null;
  const originalOfSelected = selected?.makeup_for ? events.find((e) => e.id === selected.makeup_for) || null : null;
  const schoolOptions = useMemo(
    () => Array.from(new Set([...SCHOOLS, ...events.map((e) => e.school).filter(Boolean)])),
    [events],
  );
  const preview = form.repeatMode === 'days' ? datesOnWeekdays(form.date, form.until, form.weekdays) : null;

  useEffect(() => { setMode(null); setMk(EMPTY_MK); }, [selectedId]);

  const setRepeatMode = (v) => {
    if (v !== 'days') { setForm({ ...form, repeatMode: v }); return; }
    const base = form.date ? parseYmd(form.date) : vnNow();
    setForm({
      ...form,
      repeatMode: 'days',
      weekdays: form.weekdays.length ? form.weekdays : [base.getDay()],
      until: form.until || ymd(addDays(base, 7 * 15 - 1)),
    });
  };
  const toggleWeekday = (v) => {
    const has = form.weekdays.includes(v);
    setForm({ ...form, weekdays: has ? form.weekdays.filter((x) => x !== v) : [...form.weekdays, v] });
  };

  const openForm = () => {
    setForm({ ...EMPTY_FORM, date: todayKey });
    setAdding((a) => !a);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await addEvents(form);
    setBusy(false);
    if (!res.ok) { toast(res.error || 'Could not save', 'error'); return; }
    toast(res.count > 1 ? `Added ${res.count} sessions to the island` : 'Added to the island', 'sailing');
    setAdding(false);
    setWeekStart(mondayOf(parseYmd(res.first || form.date)));
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

  const startMode = (m) => {
    if (!selected) return;
    setMk({ ...EMPTY_MK, start: selected.start, end: selected.end, place: selected.place || '' });
    setMode(m);
  };

  const confirmMode = async (ev) => {
    ev.preventDefault();
    if (!selected) return;
    const wantMakeup = mode === 'makeup' || mk.withMakeup;
    setBusy(true);
    let res = { ok: true };
    if (mode === 'cancel') res = await cancelEvent(selected.id, mk.reason);
    if (res.ok && wantMakeup) res = await addMakeup(selected, mk);
    setBusy(false);
    if (!res.ok) { toast(res.error || 'Could not save', 'error'); load(); return; }
    if (mode === 'cancel') {
      toast(wantMakeup ? `Class cancelled · make-up on ${fmtDay(parseYmd(mk.date))}` : 'Class cancelled', 'event_busy');
    } else {
      toast(`Make-up class added on ${fmtDay(parseYmd(mk.date))}`, 'event_available');
    }
    setMode(null);
    load();
  };

  const restore = async () => {
    if (!selected) return;
    const res = await restoreEvent(selected.id);
    if (!res.ok) { toast(res.error || 'Could not restore', 'error'); return; }
    toast(makeupOfSelected ? 'Class restored. The make-up class is still on the board — remove it if not needed.' : 'Class restored', 'event_available');
    load();
  };

  const jumpTo = (e) => {
    setWeekStart(mondayOf(parseYmd(e.date)));
    setSelectedId(e.id);
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
      {!state.missing && state.v37 === false && (
        <div className="kwi-banner">
          <span className="material-symbols-outlined" aria-hidden="true">database</span>
          <div>
            <b>Update needed:</b> run <code>supabase/migration_v37_island_teaching.sql</code> in the Supabase SQL Editor to turn on schools, cancelled classes and make-up classes.
          </div>
        </div>
      )}

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
                <li key={e.id} className={[toMin(e.end) < nowMin ? 'past' : '', e.status].join(' ')} style={{ '--c': KINDS[e.kind].color }}>
                  <span className="tm">{e.start}<br />{e.end}</span>
                  <span className="pin" />
                  <span>
                    <b>{e.title}</b>
                    <span className="where">
                      {STATUS_TAG[e.status] ? `${STATUS_TAG[e.status]} · ` : ''}
                      {[e.school, e.place].filter(Boolean).join(' · ') || KINDS[e.kind].short}
                    </span>
                  </span>
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
            <button type="button" className="kwi-chip kwi-chip-off" aria-pressed={showCancelled} style={{ '--c': '#8f89a3' }}
              onClick={() => setShowCancelled((v) => !v)}><i />Cancelled classes</button>
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
              <label className="s2">{form.repeatMode === 'days' ? 'From' : 'Date'}
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </label>
              <label className="s1">Start <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required /></label>
              <label className="s1">End <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} required /></label>
              <label className="s2">Repeat
                <select value={form.repeatMode} onChange={(e) => setRepeatMode(e.target.value)}>
                  <option value="once">Just once</option>
                  <option value="days">Every week on chosen days…</option>
                </select>
              </label>
              {form.repeatMode === 'days' && (
                <>
                  <div className="s4 kwi-flabel">On these days
                    <div className="kwi-types kwi-days">
                      {WEEKDAYS.map((w) => (
                        <button key={w.v} type="button" aria-pressed={form.weekdays.includes(w.v)} style={{ '--c': KINDS[form.kind].color }}
                          onClick={() => toggleWeekday(w.v)}>{w.short}</button>
                      ))}
                    </div>
                  </div>
                  <label className="s2">Until (last day)
                    <input type="date" value={form.until} min={form.date || undefined} onChange={(e) => setForm({ ...form, until: e.target.value })} required />
                  </label>
                  <p className={`kwi-preview ${preview && preview.length > MAX_SESSIONS ? 'bad' : ''}`}>
                    {!preview || preview.length === 0
                      ? 'Pick the weekdays and a date range to see the sessions.'
                      : preview.length > MAX_SESSIONS
                        ? `More than ${MAX_SESSIONS} sessions — shorten the range.`
                        : `${preview.length} session${preview.length > 1 ? 's' : ''} · ${fmtDay(parseYmd(preview[0]))} → ${fmtDay(parseYmd(preview[preview.length - 1]))}`}
                  </p>
                </>
              )}
              {form.kind === 'teach' && (
                <label className="s2">School
                  <input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} list="kwiSchools" maxLength={60} placeholder="HSU" />
                  <datalist id="kwiSchools">{schoolOptions.map((x) => <option key={x} value={x} />)}</datalist>
                </label>
              )}
              <label className={form.kind === 'teach' ? 's2' : 's3'}>Where <input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} placeholder="Room B402" /></label>
              <label className={form.kind === 'teach' ? 's2' : 's3'}>Note <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Bring the case-study handout" /></label>
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
                const list = events.filter((e) => e.date === key && visible[e.kind] && (showCancelled || e.status !== 'cancelled'));
                return (
                  <div key={key} className={`day ${key === todayKey ? 'today' : ''}`} style={{ height: (H1 - H0) * PX }}>
                    {list.map((e) => {
                      const top = Math.max(0, ((toMin(e.start) - H0 * 60) / 60) * PX);
                      const h = Math.max(24, ((toMin(e.end) - toMin(e.start)) / 60) * PX - 2);
                      return (
                        <button key={e.id} type="button" className={`ev ${e.status} ${selectedId === e.id ? 'on' : ''}`} style={{ '--c': KINDS[e.kind].color, top, height: h }}
                          onClick={() => setSelectedId(e.id)} title={STATUS_TAG[e.status] ? `${STATUS_TAG[e.status]}: ${e.title}` : e.title}>
                          {STATUS_TAG[e.status] && <em className="tag">{STATUS_TAG[e.status]}</em>}
                          <b>{e.title}</b><span>{e.start}–{e.end}{e.school ? ` · ${e.school}` : ''}</span>
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
            <div className={`kwi-detail ${selected.status}`} style={{ '--c': KINDS[selected.kind].color }}>
              <span className="bar" />
              <div className="grow">
                <span className="kwi-eyebrow">
                  {KINDS[selected.kind].label}
                  {selected.status === 'cancelled' ? ' · Cancelled' : selected.status === 'makeup' ? ' · Make-up class' : ''}
                </span>
                <h4 className={selected.status === 'cancelled' ? 'struck' : ''}>{selected.title}</h4>
                <p>
                  {fmtDay(parseYmd(selected.date))} · {selected.start}–{selected.end}
                  {selected.school ? ` · ${selected.school}` : ''}{selected.place ? ` · ${selected.place}` : ''}
                </p>
                {selected.status === 'cancelled' && (
                  <p className="kwi-status-note">No class this day{selected.cancel_reason ? ` — ${selected.cancel_reason}` : ''}.</p>
                )}
                {makeupOfSelected && (
                  <p className="kwi-status-note">
                    Make-up class:{' '}
                    <button type="button" className="kwi-link" onClick={() => jumpTo(makeupOfSelected)}>
                      {fmtDay(parseYmd(makeupOfSelected.date))} · {makeupOfSelected.start}–{makeupOfSelected.end}
                    </button>
                  </p>
                )}
                {selected.status === 'makeup' && (
                  <p className="kwi-status-note">
                    Makes up for{' '}
                    {originalOfSelected ? (
                      <button type="button" className="kwi-link" onClick={() => jumpTo(originalOfSelected)}>
                        {fmtDay(parseYmd(originalOfSelected.date))} · {originalOfSelected.start}–{originalOfSelected.end}
                      </button>
                    ) : 'a cancelled class'}
                  </p>
                )}
                {selected.note && <p>{selected.note}</p>}
              </div>
              <div className="kwi-detail-actions">
                {selected.status !== 'cancelled' && (
                  <button type="button" className="kwi-btn" aria-pressed={mode === 'cancel'} onClick={() => (mode === 'cancel' ? setMode(null) : startMode('cancel'))}>
                    {selected.kind === 'teach' ? 'Cancel class' : 'Cancel'}
                  </button>
                )}
                {selected.status === 'cancelled' && !makeupOfSelected && (
                  <button type="button" className="kwi-btn" aria-pressed={mode === 'makeup'} onClick={() => (mode === 'makeup' ? setMode(null) : startMode('makeup'))}>Add make-up</button>
                )}
                {selected.status === 'cancelled' && <button type="button" className="kwi-btn" onClick={restore}>Restore class</button>}
                <button type="button" className="kwi-btn" onClick={() => remove(false)}>Remove</button>
                {selected.series_id && <button type="button" className="kwi-btn" onClick={() => remove(true)}>Remove this &amp; later</button>}
                <button type="button" className="kwi-btn" aria-label="Close" onClick={() => setSelectedId(null)}>✕</button>
              </div>

              {mode && (
                <form className="kwi-form kwi-subform" onSubmit={confirmMode}>
                  {mode === 'cancel' && (
                    <>
                      <label className="s3">Reason (optional)
                        <input value={mk.reason} onChange={(e) => setMk({ ...mk, reason: e.target.value })} maxLength={120} placeholder="Public holiday, conference…" autoFocus />
                      </label>
                      <label className="s3 kwi-check">
                        <input type="checkbox" checked={mk.withMakeup} onChange={(e) => setMk({ ...mk, withMakeup: e.target.checked })} />
                        Schedule a make-up class
                      </label>
                    </>
                  )}
                  {(mode === 'makeup' || mk.withMakeup) && (
                    <>
                      <label className="s2">Make-up date
                        <input type="date" value={mk.date} onChange={(e) => setMk({ ...mk, date: e.target.value })} required autoFocus={mode === 'makeup'} />
                      </label>
                      <label className="s1">Start <input type="time" value={mk.start} onChange={(e) => setMk({ ...mk, start: e.target.value })} required /></label>
                      <label className="s1">End <input type="time" value={mk.end} onChange={(e) => setMk({ ...mk, end: e.target.value })} required /></label>
                      <label className="s2">Where <input value={mk.place} onChange={(e) => setMk({ ...mk, place: e.target.value })} placeholder={selected.place || 'Room'} /></label>
                    </>
                  )}
                  <div className="kwi-row">
                    <span className="hint">
                      {mode === 'cancel'
                        ? 'The class stays on the board, crossed out, so you can see what was missed.'
                        : 'The make-up class shows with a dashed border and links back to this day.'}
                    </span>
                    <button type="button" className="kwi-btn" onClick={() => setMode(null)}>Back</button>
                    <button type="submit" className="kwi-btn primary" disabled={busy}>
                      {busy ? 'Saving…' : mode === 'cancel' ? (mk.withMakeup ? 'Cancel & add make-up' : 'Cancel this class') : 'Add make-up class'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      </div>
    </CityPage>
  );
}
