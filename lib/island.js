import { supabase, isSupabaseConfigured } from './supabaseClient';

// ---------------------------------------------------------------------------
// v30: Thinh's Island — lịch riêng của admin (bảng private_events, RLS chỉ admin).
// ---------------------------------------------------------------------------

export const KINDS = {
  teach: { label: 'Lecture Hall · Teaching', short: 'Teaching', color: '#c6bfff' },
  meet: { label: 'City Hall · Meetings', short: 'Meeting', color: '#ffd27a' },
  key: { label: 'Lighthouse · Important', short: 'Important', color: '#ff9bd2' },
};

// ---- ngày giờ theo giờ Việt Nam ----
export function vnNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return new Date(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
}
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseYmd = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const mondayOf = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -((x.getDay() + 6) % 7)); };
export const hhmm = (t) => (t ? String(t).slice(0, 5) : '');
export const toMin = (t) => { if (!t) return 0; const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };

const isMissingTable = (error) =>
  !!error && (error.code === '42P01' || error.code === 'PGRST205' || /private_events/.test(error.message || '') && /does not exist|schema cache/.test(error.message || ''));

function normalize(r) {
  return { ...r, start: hhmm(r.start_time) || '08:00', end: hhmm(r.end_time) || hhmm(r.start_time) || '09:00', date: r.event_date };
}

export async function fetchEvents(from, to) {
  if (!isSupabaseConfigured) return { data: [], ok: false, missing: false, error: 'Supabase is not configured.' };
  const { data, error } = await supabase
    .from('private_events').select('*')
    .gte('event_date', from).lte('event_date', to)
    .order('event_date', { ascending: true }).order('start_time', { ascending: true })
    .limit(1000);
  if (error) return { data: [], ok: false, missing: isMissingTable(error), error: error.message };
  return { data: (data || []).map(normalize), ok: true };
}

export async function addEvents({ title, kind, date, start, end, place, note, repeat = 1 }) {
  const t = (title || '').trim();
  if (!t) return { ok: false, error: 'Please give the event a name.' };
  if (!date) return { ok: false, error: 'Please pick a date.' };
  if (start && end && toMin(end) <= toMin(start)) return { ok: false, error: 'The end time must be after the start time.' };
  const n = Math.max(1, Math.min(30, Number(repeat) || 1));
  const series = n > 1 && typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null;
  const base = parseYmd(date);
  const rows = Array.from({ length: n }, (_, i) => ({
    title: t,
    kind: KINDS[kind] ? kind : 'teach',
    event_date: ymd(addDays(base, i * 7)),
    start_time: start || null,
    end_time: end || null,
    place: (place || '').trim() || null,
    note: (note || '').trim() || null,
    series_id: series,
  }));
  const { error } = await supabase.from('private_events').insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true, count: n };
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('private_events').delete().eq('id', id);
  return { ok: !error, error: error?.message };
}

// Xoá buổi này và các buổi sau trong cùng chuỗi lặp.
export async function deleteSeriesFrom(seriesId, fromDate) {
  const { error } = await supabase.from('private_events').delete().eq('series_id', seriesId).gte('event_date', fromDate);
  return { ok: !error, error: error?.message };
}

// Cho City Notice Board của admin: ngày quan trọng trong `days` ngày tới.
export async function upcomingKeyNotices(days = 7) {
  if (!isSupabaseConfigured) return [];
  const today = vnNow();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const { data, error } = await supabase
    .from('private_events').select('id, title, event_date, start_time, place')
    .eq('kind', 'key').gte('event_date', ymd(t0)).lte('event_date', ymd(addDays(t0, days)))
    .order('event_date', { ascending: true }).limit(5);
  if (error || !data) return [];
  return data.map((r) => {
    const left = Math.round((parseYmd(r.event_date) - t0) / 86400000);
    const when = left === 0 ? 'Today' : left === 1 ? 'Tomorrow' : `In ${left} days`;
    return {
      id: `island-${r.id}`,
      tag: 'private',
      title: `${when}: ${r.title}`,
      body: [hhmm(r.start_time), r.place].filter(Boolean).join(' · ') || 'From the Lighthouse on your island.',
      link: '/island',
      pinned: true,
      auto: true,
      created_at: `${ymd(t0)}T00:00:00+07:00`, // NEW một lần mỗi ngày
    };
  });
}
