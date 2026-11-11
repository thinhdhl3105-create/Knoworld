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
  return {
    ...r,
    start: hhmm(r.start_time) || '08:00',
    end: hhmm(r.end_time) || hhmm(r.start_time) || '09:00',
    date: r.event_date,
    status: r.status || 'active',
  };
}

export async function fetchEvents(from, to) {
  if (!isSupabaseConfigured) return { data: [], ok: false, missing: false, error: 'Supabase is not configured.' };
  const { data, error } = await supabase
    .from('private_events').select('*')
    .gte('event_date', from).lte('event_date', to)
    .order('event_date', { ascending: true }).order('start_time', { ascending: true })
    .limit(1000);
  if (error) return { data: [], ok: false, missing: isMissingTable(error), error: error.message };
  const rows = data || [];
  // v37 = đã có cột status (null khi chưa có dữ liệu để kiểm tra).
  return { data: rows.map(normalize), ok: true, v37: rows.length ? 'status' in rows[0] : null };
}

// v37: lặp theo thứ trong tuần (vd Mon + Wed) từ ngày A đến ngày B; trường dạy; nghỉ lớp + dạy bù.
export const WEEKDAYS = [
  { v: 1, short: 'Mon' }, { v: 2, short: 'Tue' }, { v: 3, short: 'Wed' }, { v: 4, short: 'Thu' },
  { v: 5, short: 'Fri' }, { v: 6, short: 'Sat' }, { v: 0, short: 'Sun' },
];
export const SCHOOLS = ['HSU', 'VLU', 'UEH'];
export const MAX_SESSIONS = 200;

// Mọi ngày trong [from, until] rơi vào các thứ đã chọn (weekdays: 0 = CN … 6 = T7).
export function datesOnWeekdays(from, until, weekdays) {
  if (!from || !until || !weekdays || !weekdays.length) return [];
  const a = parseYmd(from); const b = parseYmd(until);
  if (b < a) return [];
  const set = new Set(weekdays.map(Number));
  const out = [];
  for (let d = a; d <= b && out.length <= MAX_SESSIONS; d = addDays(d, 1)) if (set.has(d.getDay())) out.push(ymd(d));
  return out;
}

const V37_HINT = 'Run supabase/migration_v37_island_teaching.sql in the Supabase SQL Editor first (adds school, cancelled classes and make-up classes).';
const friendly = (msg) => {
  const m = msg || '';
  return /school|status|cancel_reason|makeup_for/.test(m) && /column|schema cache/.test(m) ? V37_HINT : m;
};
const newSeriesId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null);

export async function addEvents({ title, kind, date, start, end, place, note, school, repeatMode = 'once', weekdays = [], until }) {
  const t = (title || '').trim();
  if (!t) return { ok: false, error: 'Please give the event a name.' };
  if (!date) return { ok: false, error: 'Please pick a date.' };
  if (start && end && toMin(end) <= toMin(start)) return { ok: false, error: 'The end time must be after the start time.' };
  let dates = [date];
  if (repeatMode === 'days') {
    if (!weekdays.length) return { ok: false, error: 'Pick at least one weekday.' };
    if (!until) return { ok: false, error: 'Pick the last date (Until).' };
    if (until < date) return { ok: false, error: 'The Until date must be on or after the start date.' };
    dates = datesOnWeekdays(date, until, weekdays);
    if (!dates.length) return { ok: false, error: 'No sessions fall on those weekdays in that date range.' };
    if (dates.length > MAX_SESSIONS) return { ok: false, error: `That is more than ${MAX_SESSIONS} sessions. Shorten the date range.` };
  }
  const k = KINDS[kind] ? kind : 'teach';
  const sch = k === 'teach' ? (school || '').trim() : '';
  const series = dates.length > 1 ? newSeriesId() : null;
  const rows = dates.map((d) => {
    const r = {
      title: t,
      kind: k,
      event_date: d,
      start_time: start || null,
      end_time: end || null,
      place: (place || '').trim() || null,
      note: (note || '').trim() || null,
      series_id: series,
    };
    if (sch) r.school = sch; // chỉ gửi khi có, để bản chưa chạy v37 vẫn lưu được
    return r;
  });
  const { error } = await supabase.from('private_events').insert(rows);
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true, count: rows.length, first: dates[0] };
}

// Cho nghỉ một buổi (vẫn giữ trên lịch, gạch ngang).
export async function cancelEvent(id, reason) {
  const { error } = await supabase.from('private_events')
    .update({ status: 'cancelled', cancel_reason: (reason || '').trim() || null }).eq('id', id);
  return { ok: !error, error: friendly(error?.message) };
}

// Huỷ việc cho nghỉ: buổi học diễn ra lại như bình thường.
export async function restoreEvent(id) {
  const { error } = await supabase.from('private_events').update({ status: 'active', cancel_reason: null }).eq('id', id);
  return { ok: !error, error: friendly(error?.message) };
}

// Thêm buổi dạy bù cho buổi `orig`.
export async function addMakeup(orig, { date, start, end, place }) {
  if (!orig) return { ok: false, error: 'Pick the class to make up for.' };
  if (!date) return { ok: false, error: 'Pick a date for the make-up class.' };
  if (start && end && toMin(end) <= toMin(start)) return { ok: false, error: 'The make-up end time must be after its start time.' };
  const row = {
    title: orig.title,
    kind: orig.kind,
    event_date: date,
    start_time: start || null,
    end_time: end || null,
    place: (place || '').trim() || orig.place || null,
    note: orig.note || null,
    status: 'makeup',
    makeup_for: orig.id,
  };
  if (orig.school) row.school = orig.school;
  const { error } = await supabase.from('private_events').insert(row);
  return { ok: !error, error: friendly(error?.message) };
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
    .from('private_events').select('*')
    .eq('kind', 'key').gte('event_date', ymd(t0)).lte('event_date', ymd(addDays(t0, days)))
    .order('event_date', { ascending: true }).limit(5);
  if (error || !data) return [];
  return data.filter((r) => r.status !== 'cancelled').map((r) => {
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
