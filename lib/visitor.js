import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getAnonId } from './reviews';

// ---------------------------------------------------------------------------
// Visitor gate — cổng đăng ký trước khi vào web.
// Khách phải điền: họ tên, email, năm sinh, lĩnh vực muốn tìm hiểu.
// Lưu vào Supabase (site_visitors) + localStorage để lần sau không hỏi lại.
// ---------------------------------------------------------------------------

const KEY_VISITOR = 'kw_visitor'; // JSON: { id, full_name, email, birth_year, field }

// Suggested fields of interest ("Other" lets the visitor type their own).
export const FIELDS = [
  'IMC',
  'Creative',
  'Branding',
  'Strategy / Planning',
  'Media',
  'Content',
  'Digital / Performance',
  'PR / Communications',
  'Other',
];

const hasWindow = () => typeof window !== 'undefined';

// Đã đăng ký cổng chưa?
export function getVisitor() {
  if (!hasWindow()) return null;
  try {
    const raw = localStorage.getItem(KEY_VISITOR);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasRegistered() {
  return !!getVisitor();
}

function saveVisitorLocal(v) {
  if (hasWindow()) localStorage.setItem(KEY_VISITOR, JSON.stringify(v));
}

// Gửi thông tin đăng ký lên Supabase và lưu cục bộ.
// info: { fullName, email, birthYear, field }
export async function registerVisitor({ fullName, email, birthYear, field }) {
  const clean = {
    full_name: (fullName || '').trim(),
    email: (email || '').trim(),
    birth_year: birthYear ? parseInt(birthYear, 10) : null,
    field: (field || '').trim() || null,
  };

  if (!clean.full_name || !clean.email) {
    return { ok: false, error: 'Please enter your full name and email.' };
  }

  // Không có Supabase (demo): vẫn cho vào, chỉ lưu cục bộ.
  if (!isSupabaseConfigured) {
    const local = { id: null, ...clean };
    saveVisitorLocal(local);
    return { ok: true, source: 'local', visitor: local };
  }

  const payload = {
    anon_id: getAnonId(),
    ...clean,
    page_path: hasWindow() ? window.location.pathname : null,
    user_agent: hasWindow() ? navigator.userAgent.slice(0, 300) : null,
  };

  const { data, error } = await supabase
    .from('site_visitors')
    .insert(payload)
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  const local = { id: data?.id ?? null, ...clean };
  saveVisitorLocal(local);
  return { ok: true, source: 'supabase', visitor: local };
}

// Admin: lấy toàn bộ người ra vào (RLS chỉ cho admin đọc).
export async function fetchVisitors() {
  if (!isSupabaseConfigured) return { data: [], source: 'sample' };
  const { data, error } = await supabase
    .from('site_visitors')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: data || [], source: 'supabase' };
}
