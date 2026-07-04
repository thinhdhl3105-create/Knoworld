import { supabase, isSupabaseConfigured } from './supabaseClient';
import { loadSiteContent, saveSiteContent } from './siteContent';
import { isLimitedVisitor, syncAccess } from './visitor';

// ---------------------------------------------------------------------------
// v18 — Quyền xem case study theo vai trò.
//
//   • Student / lecturer / stranger được allow access: xem tất cả.
//   • Stranger: video + image case study chỉ được xem 5 case do admin chọn
//     (lưu ở site_content, key 'stranger_featured_cases'); nếu admin chưa
//     chọn thì tự lấy 5 case mới nhất. Student case study xem bình thường.
// ---------------------------------------------------------------------------

export const FEATURED_KEY = 'stranger_featured_cases';
export const STRANGER_CASE_LIMIT = 5;

// Admin: lưu danh sách id case (video/image) cho stranger.
export async function saveFeaturedCaseIds(ids) {
  const clean = Array.from(new Set(ids)).slice(0, STRANGER_CASE_LIMIT);
  return saveSiteContent(FEATURED_KEY, { ids: clean });
}

// Đọc danh sách id case admin đã chọn (public read).
export async function loadFeaturedCaseIds() {
  const data = await loadSiteContent(FEATURED_KEY);
  const ids = Array.isArray(data?.ids) ? data.ids : [];
  return ids.slice(0, STRANGER_CASE_LIMIT);
}

// Fallback: 5 case (video + image) mới nhất khi admin chưa chọn.
async function newestCaseIds() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('content')
    .select('id')
    .in('kind', ['video', 'image'])
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(STRANGER_CASE_LIMIT);
  if (error || !data) return [];
  return data.map((r) => r.id);
}

// Trang video/image gọi hàm này 1 lần khi mount.
// Trả về { limited, allowedIds } — allowedIds = null nghĩa là không giới hạn.
export async function getCaseAccess() {
  // Đồng bộ quyền mới nhất (admin có thể vừa bật full access).
  const { role, fullAccess } = await syncAccess();
  const limited = role === 'stranger' && !fullAccess && isLimitedVisitor();
  if (!limited) return { limited: false, allowedIds: null };

  let ids = await loadFeaturedCaseIds();
  if (!ids.length) ids = await newestCaseIds();
  return { limited: true, allowedIds: new Set(ids.map(String)) };
}

// ---------------------------------------------------------------------------
// Danh sách MSSV được duyệt (admin quản lý — RLS chỉ cho admin).
// ---------------------------------------------------------------------------

export async function fetchApprovedStudents() {
  if (!isSupabaseConfigured) return { data: [], error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from('approved_students')
    .select('*')
    .order('student_id');
  return { data: data || [], error: error?.message ?? null };
}

// Thêm (upsert) nhiều MSSV: rows = [{ student_id, full_name? }]
export async function addApprovedStudents(rows) {
  if (!isSupabaseConfigured) return { ok: false, error: 'Supabase not configured' };
  const clean = rows
    .map((r) => ({
      student_id: (r.student_id || '').trim().toUpperCase(),
      full_name: (r.full_name || '').trim() || null,
    }))
    .filter((r) => r.student_id);
  if (!clean.length) return { ok: false, error: 'No valid student IDs found.' };
  const { error } = await supabase
    .from('approved_students')
    .upsert(clean, { onConflict: 'student_id' });
  if (error) return { ok: false, error: error.message };
  return { ok: true, count: clean.length };
}

export async function removeApprovedStudent(studentId) {
  if (!isSupabaseConfigured) return { ok: false, error: 'Supabase not configured' };
  const { error } = await supabase
    .from('approved_students')
    .delete()
    .eq('student_id', studentId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Parse text dán vào / nội dung file CSV thành [{ student_id, full_name }].
// Chấp nhận: mỗi dòng 1 MSSV, hoặc "MSSV,Họ tên" / "MSSV;Họ tên" / tab.
// Bỏ qua dòng tiêu đề kiểu "mssv", "student id"...
export function parseStudentList(text) {
  const rows = [];
  (text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim().replace(/^"|"$/g, ''));
      const id = (parts[0] || '').toUpperCase();
      if (!id) return;
      // Bỏ dòng header.
      if (/^(MSSV|MA\s*SO|STUDENT[\s_]*ID|ID)$/i.test(id)) return;
      rows.push({ student_id: id, full_name: parts[1] || '' });
    });
  return rows;
}
