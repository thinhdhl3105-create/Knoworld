import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getAnonId } from './reviews';
import { getVisitor } from './visitor';

// ---------------------------------------------------------------------------
// Discussion — sinh viên đặt câu hỏi, mọi người trả lời.
// Người đăng chọn hiển thị TÊN THẬT (từ tài khoản đăng nhập hoặc cổng đăng ký)
// hoặc ANONYMOUS. Luôn lưu anon_id để tự xoá bài của mình.
// ---------------------------------------------------------------------------

// Tên hiển thị mặc định của người đang dùng web.
// user: từ useAuth() (có thể null). Ưu tiên: profile đăng nhập > cổng đăng ký.
export function getDisplayName(user) {
  if (user) {
    return (
      user.user_metadata?.full_name ||
      (user.email ? user.email.split('@')[0] : null) ||
      'Member'
    );
  }
  const v = getVisitor();
  return v?.full_name || null; // null -> chưa có tên, buộc chọn Anonymous
}

function authorPayload({ user, anonymous }) {
  const v = getVisitor();
  return {
    anon_id: getAnonId(),
    is_anonymous: !!anonymous,
    author_name: anonymous ? null : getDisplayName(user),
    author_email: user?.email || v?.email || null, // chỉ admin đọc được, không hiển thị
  };
}

// Danh sách câu hỏi (mới nhất trước) + số câu trả lời của từng câu hỏi.
export async function fetchQuestions() {
  if (!isSupabaseConfigured) return { data: [], source: 'sample' };
  const [{ data: qs, error }, { data: ans }] = await Promise.all([
    supabase.from('discussion_questions').select('*').order('created_at', { ascending: false }),
    supabase.from('discussion_answers').select('id, question_id'),
  ]);
  if (error) return { data: [], error: error.message };
  const counts = {};
  (ans || []).forEach((a) => {
    counts[a.question_id] = (counts[a.question_id] || 0) + 1;
  });
  const data = (qs || []).map((q) => ({ ...q, answer_count: counts[q.id] || 0 }));
  return { data, source: 'supabase' };
}

// Câu trả lời của 1 câu hỏi (cũ trước, như luồng hội thoại).
export async function fetchAnswers(questionId) {
  if (!isSupabaseConfigured) return { data: [] };
  const { data, error } = await supabase
    .from('discussion_answers')
    .select('*')
    .eq('question_id', questionId)
    .order('created_at', { ascending: true });
  if (error) return { data: [], error: error.message };
  return { data: data || [] };
}

export async function postQuestion({ title, body, anonymous, user }) {
  const t = (title || '').trim();
  if (!t) return { ok: false, error: 'Please enter your question.' };
  if (!isSupabaseConfigured) return { ok: false, error: 'Supabase is not configured.' };
  const payload = { title: t, body: (body || '').trim() || null, ...authorPayload({ user, anonymous }) };
  const { data, error } = await supabase.from('discussion_questions').insert(payload).select().single();
  if (error) {
    // Anon không có quyền select-back thì vẫn coi như thành công.
    if (error.code === 'PGRST116' || /select/i.test(error.message || '')) return { ok: true };
    return { ok: false, error: error.message };
  }
  return { ok: true, question: data };
}

export async function postAnswer({ questionId, body, anonymous, user }) {
  const b = (body || '').trim();
  if (!b) return { ok: false, error: 'Please write an answer.' };
  if (!isSupabaseConfigured) return { ok: false, error: 'Supabase is not configured.' };
  const payload = { question_id: questionId, body: b, ...authorPayload({ user, anonymous }) };
  const { data, error } = await supabase.from('discussion_answers').insert(payload).select().single();
  if (error) {
    if (error.code === 'PGRST116' || /select/i.test(error.message || '')) return { ok: true };
    return { ok: false, error: error.message };
  }
  return { ok: true, answer: data };
}

// Bài của chính mình? (khớp anon_id trình duyệt)
export function isMine(row) {
  return !!row?.anon_id && row.anon_id === getAnonId();
}

// Xoá: admin xoá thẳng (RLS), người thường xoá bài mình qua RPC.
export async function deleteQuestion(id, { isAdmin } = {}) {
  if (!isSupabaseConfigured) return { ok: false };
  if (isAdmin) {
    const { error } = await supabase.from('discussion_questions').delete().eq('id', id);
    return { ok: !error, error: error?.message };
  }
  const { data, error } = await supabase.rpc('delete_own_question', { p_id: id, p_anon_id: getAnonId() });
  return { ok: !error && !!data, error: error?.message };
}

export async function deleteAnswer(id, { isAdmin } = {}) {
  if (!isSupabaseConfigured) return { ok: false };
  if (isAdmin) {
    const { error } = await supabase.from('discussion_answers').delete().eq('id', id);
    return { ok: !error, error: error?.message };
  }
  const { data, error } = await supabase.rpc('delete_own_answer', { p_id: id, p_anon_id: getAnonId() });
  return { ok: !error && !!data, error: error?.message };
}

// "2h ago" / "3d ago" đơn giản cho UI.
export function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
