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
export const fromMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
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

// v38: sửa thông tin một buổi / cả chuỗi; kéo-thả đổi ngày giờ.
function buildPatch({ title, kind, date, start, end, place, note, school }) {
  const out = {};
  if (title !== undefined) {
    const t = String(title || '').trim();
    if (!t) return { error: 'Please give the event a name.' };
    out.title = t;
  }
  if (kind !== undefined && KINDS[kind]) out.kind = kind;
  if (date !== undefined) {
    if (!date) return { error: 'Please pick a date.' };
    out.event_date = date;
  }
  if (start !== undefined) out.start_time = start || null;
  if (end !== undefined) out.end_time = end || null;
  if (start && end && toMin(end) <= toMin(start)) return { error: 'The end time must be after the start time.' };
  if (place !== undefined) out.place = String(place || '').trim() || null;
  if (note !== undefined) out.note = String(note || '').trim() || null;
  if (school !== undefined) out.school = String(school || '').trim() || null; // chỉ gửi khi thật sự đổi
  return { patch: out };
}

export async function updateEvent(id, fields) {
  const { patch, error: bad } = buildPatch(fields);
  if (bad) return { ok: false, error: bad };
  const { error } = await supabase.from('private_events').update(patch).eq('id', id);
  return { ok: !error, error: friendly(error?.message), count: 1 };
}

// Sửa buổi này và các buổi sau trong chuỗi. shiftDays ≠ 0: dời tất cả các buổi đó thêm N ngày.
export async function updateSeriesFrom(seriesId, fromDate, fields, shiftDays = 0) {
  const { date, ...rest } = fields; // eslint-disable-line no-unused-vars
  const { patch, error: bad } = buildPatch(rest);
  if (bad) return { ok: false, error: bad };
  const { data, error: e0 } = await supabase.from('private_events')
    .select('id, event_date').eq('series_id', seriesId).gte('event_date', fromDate);
  if (e0) return { ok: false, error: friendly(e0.message) };
  const rows = data || [];
  if (Object.keys(patch).length) {
    const { error } = await supabase.from('private_events').update(patch).eq('series_id', seriesId).gte('event_date', fromDate);
    if (error) return { ok: false, error: friendly(error.message) };
  }
  if (shiftDays) {
    for (let i = 0; i < rows.length; i += 20) {
      const chunk = rows.slice(i, i + 20);
      const res = await Promise.all(chunk.map((r) => supabase.from('private_events')
        .update({ event_date: ymd(addDays(parseYmd(r.event_date), shiftDays)) }).eq('id', r.id)));
      const failed = res.find((r) => r.error);
      if (failed) return { ok: false, error: friendly(failed.error.message) };
    }
  }
  return { ok: true, count: rows.length };
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

// v43: thống kê số lớp theo trường — lấy mọi buổi Teaching (phân trang 1000 dòng/lần).
export async function fetchTeachingRows() {
  if (!isSupabaseConfigured) return { data: [], ok: false, error: 'Supabase is not configured.' };
  const out = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await supabase
      .from('private_events')
      .select('id, title, school, event_date, start_time, end_time, status, series_id, makeup_for')
      .eq('kind', 'teach')
      .order('event_date', { ascending: true })
      .range(from, from + 999);
    if (error) return { data: [], ok: false, missing: isMissingTable(error), error: friendly(error.message) };
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return { data: out.map(normalize), ok: true };
}

// Gom buổi dạy thành "lớp": cùng chuỗi lặp (series_id) = 1 lớp; buổi lẻ gom theo tên + trường;
// buổi dạy bù tính vào lớp của buổi gốc. Trả về số liệu theo từng trường.
export function classStatsBySchool(rows, year = null) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const keyOf = (r, depth = 0) => {
    if (r.makeup_for && byId.has(r.makeup_for) && depth < 3) return keyOf(byId.get(r.makeup_for), depth + 1);
    return r.series_id ? `s:${r.series_id}` : `t:${(r.school || '').trim().toLowerCase()}|${r.title.trim().toLowerCase()}`;
  };
  const today = ymd(vnNow());
  const classes = new Map();
  rows.forEach((r) => {
    if (year && !String(r.date).startsWith(String(year))) return;
    const k = keyOf(r);
    const school = (r.school || '').trim() || 'No school set';
    let c = classes.get(k);
    if (!c) { c = { key: k, title: r.title, school, sessions: 0, done: 0, cancelled: 0, makeup: 0, minutes: 0, first: r.date, last: r.date }; classes.set(k, c); }
    if (r.status === 'cancelled') c.cancelled += 1;
    else {
      c.sessions += 1;
      if (r.date <= today) c.done += 1;
      c.minutes += Math.max(0, toMin(r.end) - toMin(r.start));
      if (r.status === 'makeup') c.makeup += 1;
    }
    if (r.date < c.first) c.first = r.date;
    if (r.date > c.last) c.last = r.date;
  });
  const schools = new Map();
  classes.forEach((c) => {
    let s = schools.get(c.school);
    if (!s) { s = { school: c.school, classes: [], sessions: 0, done: 0, cancelled: 0, minutes: 0 }; schools.set(c.school, s); }
    s.classes.push(c);
    s.sessions += c.sessions; s.done += c.done; s.cancelled += c.cancelled; s.minutes += c.minutes;
  });
  const list = Array.from(schools.values()).map((s) => ({
    ...s,
    classes: s.classes.sort((a, b) => (a.first < b.first ? 1 : -1)),
    active: s.classes.filter((c) => c.first <= today && c.last >= today).length,
  }));
  list.sort((a, b) => b.classes.length - a.classes.length || b.sessions - a.sessions);
  return { schools: list, totalClasses: classes.size };
}
