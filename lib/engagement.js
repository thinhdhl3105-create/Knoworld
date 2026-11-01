import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getAnonId } from './reviews';

// ---------------------------------------------------------------------------
// v24: Tương tác & hành trình học — không có quiz/kiểm tra.
// Mọi hàm đều "im lặng" khi chưa chạy migration_v24 (trả về rỗng), để web
// không bao giờ lỗi.
// ---------------------------------------------------------------------------

const hasWindow = () => typeof window !== 'undefined';

// ---- Ghi hoạt động ---------------------------------------------------------
// kind: 'concept' (mở 1 concept) | 'visit' (vào web trong ngày) | 'post' (đăng bài)
export function recordActivity(kind, targetId = null) {
  if (!isSupabaseConfigured || !hasWindow()) return;
  const anon = getAnonId();
  if (!anon) return;
  supabase
    .rpc('record_activity', { p_anon_id: anon, p_kind: kind, p_target_id: targetId })
    .then(() => notifyProgress(), () => {});
}

// Báo cho các widget (thanh hành trình, streak) tải lại tiến độ.
export function notifyProgress() {
  if (hasWindow()) window.dispatchEvent(new CustomEvent('kw-progress'));
}

// Ghi "đã ghé hôm nay" tối đa 1 lần / ngày / trình duyệt.
export function recordDailyVisit() {
  if (!hasWindow()) return;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  try {
    if (localStorage.getItem('kw_last_visit_day') === today) return;
    localStorage.setItem('kw_last_visit_day', today);
  } catch {
    /* ignore */
  }
  recordActivity('visit');
}

// ---- Tiến độ / streak / huy hiệu --------------------------------------------
const EMPTY = {
  cases_viewed: 0, concepts_explored: 0, hearts_given: 0, reactions_given: 0,
  questions: 0, answers: 0, best_answers: 0, days: [], today: null,
};

export async function fetchMyProgress() {
  if (!isSupabaseConfigured || !hasWindow()) return { ...EMPTY, available: false };
  const { data, error } = await supabase.rpc('my_progress', { p_anon_id: getAnonId() });
  if (error || !data) return { ...EMPTY, available: false };
  return { ...EMPTY, ...data, available: true };
}

const dayNum = (s) => Math.round(Date.parse(`${s}T00:00:00Z`) / 86400000);

// days: ['2026-10-31', '2026-10-30', …] (mới → cũ). today: 'YYYY-MM-DD'
export function computeStreak(days = [], today = null) {
  const nums = Array.from(new Set(days.map(dayNum))).sort((a, b) => b - a);
  if (!nums.length) return { current: 0, best: 0, activeToday: false };
  const t = today ? dayNum(today) : Math.round(Date.now() / 86400000);
  const activeToday = nums[0] === t;
  // Chuỗi hiện tại: tính từ hôm nay (hoặc hôm qua nếu hôm nay chưa hoạt động).
  let current = 0;
  if (nums[0] === t || nums[0] === t - 1) {
    current = 1;
    for (let i = 1; i < nums.length && nums[i] === nums[i - 1] - 1; i++) current++;
  }
  let best = 1;
  let run = 1;
  for (let i = 1; i < nums.length; i++) {
    run = nums[i] === nums[i - 1] - 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return { current, best: Math.max(best, current), activeToday };
}

// Huy hiệu khám phá — thưởng cho việc chủ động tìm hiểu, không chấm điểm.
export const BADGES = [
  { id: 'first-light', icon: 'flare', name: 'First Light', desc: 'Opened your first case study', test: (p) => p.cases_viewed >= 1 },
  { id: 'stargazer', icon: 'hub', name: 'Stargazer', desc: 'Explored 5 concepts on the map', test: (p) => p.concepts_explored >= 5 },
  { id: 'explorer', icon: 'explore', name: 'Explorer', desc: 'Opened 10 case studies', test: (p) => p.cases_viewed >= 10 },
  { id: 'navigator', icon: 'travel_explore', name: 'Navigator', desc: 'Explored 20 concepts', test: (p) => p.concepts_explored >= 20 },
  { id: 'spark', icon: 'emoji_objects', name: 'Spark', desc: 'Reacted to 10 pieces of work', test: (p) => p.hearts_given + p.reactions_given >= 10 },
  { id: 'voice', icon: 'forum', name: 'Voice', desc: 'Asked or answered in Discussion', test: (p) => p.questions + p.answers >= 1 },
  { id: 'mentor', icon: 'volunteer_activism', name: 'Mentor', desc: 'Posted 5 answers', test: (p) => p.answers >= 5 },
  { id: 'north-star', icon: 'star', name: 'North Star', desc: 'An answer pinned as best', test: (p) => p.best_answers >= 1 },
  { id: 'on-fire', icon: 'local_fire_department', name: 'On Fire', desc: '3-day learning streak', test: (p, s) => s.best >= 3 },
  { id: 'constellation', icon: 'auto_awesome', name: 'Constellation', desc: '7-day learning streak', test: (p, s) => s.best >= 7 },
];

export function earnedBadges(progress, streak) {
  return BADGES.map((b) => ({ ...b, earned: !!b.test(progress, streak) }));
}

// Hành trình 3 chặng (Active Learning Flux) — dựa trên việc đã làm.
export function journeyStages(p) {
  return [
    {
      key: 'origin', name: 'Origin Discovery', hint: 'Open your first case study or concept',
      progress: Math.min(1, (p.cases_viewed + p.concepts_explored) / 1),
    },
    {
      key: 'expansion', name: 'Knowledge Expansion', hint: 'Explore 5 concepts and 3 case studies',
      progress: (Math.min(1, p.concepts_explored / 5) + Math.min(1, p.cases_viewed / 3)) / 2,
    },
    {
      key: 'mastery', name: 'Universal Mastery', hint: 'Explore 15 concepts and share a thought in Discussion',
      progress: (Math.min(1, p.concepts_explored / 15) + Math.min(1, (p.questions + p.answers) / 1)) / 2,
    },
  ];
}

// ---- Reactions --------------------------------------------------------------
export const REACTIONS = [
  { key: 'insight', emoji: '💡', label: 'Insightful' },
  { key: 'debate', emoji: '🤔', label: 'Worth debating' },
  { key: 'fire', emoji: '🔥', label: 'Inspiring' },
];

// Trả về { [contentId]: { insight: {count, reacted}, … } }
export async function fetchReactionMap(ids = []) {
  const map = {};
  if (!isSupabaseConfigured || !ids.length) return map;
  const { data, error } = await supabase.rpc('get_reactions', {
    p_content_ids: ids,
    p_anon_id: getAnonId(),
  });
  if (error || !data) return map;
  data.forEach((r) => {
    (map[r.content_id] ||= {})[r.reaction] = { count: r.reaction_count || 0, reacted: !!r.reacted };
  });
  return map;
}

export async function toggleReaction(contentId, reaction) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('toggle_reaction', {
    p_content_id: contentId,
    p_reaction: reaction,
    p_anon_id: getAnonId(),
  });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  notifyProgress();
  return { count: row.reaction_count || 0, reacted: !!row.reacted };
}

// ---- Công khai: hoạt động gần đây & số liệu ---------------------------------
export async function fetchRecentActivity(limit = 12) {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc('recent_activity', { p_limit: limit });
  if (error || !data) return [];
  return data;
}

export async function fetchSiteStats() {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('public_site_stats');
  if (error || !data) return null;
  return data;
}

// Link tới 1 nội dung theo loại.
export function contentHref(kind, id) {
  if (!id) return '/discussion';
  if (kind === 'student') return `/students/${id}`;
  if (kind === 'video') return `/videos?v=${id}`;
  if (kind === 'image') return `/images?i=${id}`;
  return '/search';
}

// ---- Concept của ngày (ổn định trong ngày, giống nhau với mọi người) --------
export function conceptOfTheDay(concepts = []) {
  const usable = concepts.filter((c) => c.title && (c.summary || c.body));
  if (!usable.length) return null;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  let h = 0;
  for (const ch of today) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const sorted = [...usable].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return sorted[h % sorted.length];
}

// ---- Toast toàn cục ---------------------------------------------------------
export function toast(message, icon = 'check_circle') {
  if (hasWindow()) window.dispatchEvent(new CustomEvent('kw-toast', { detail: { message, icon } }));
}
