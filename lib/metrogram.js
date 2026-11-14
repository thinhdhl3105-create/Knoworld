// ---------------------------------------------------------------------------
// v52: METROGRAM — mạng xã hội dưới ga B1 Main City Central (môn Social Media Marketing).
//   • Trò chơi chạy trong iframe /metrogram/game.html (cùng domain), gọi các hàm ở đây qua window.__kwGram.
//   • Chạy supabase/migration_v52_metrogram.sql trước.
//   • Sinh viên: mg_login (MSSV + mã nhóm) → mg_me / mg_post. Bảng tin: mg_feed / mg_react (thành viên hoặc khách).
//   • Kết quả khách đi tàu do máy chủ tính; điểm giảng viên (sao) không bao giờ gửi về máy sinh viên.
//   • Giảng viên (đăng nhập email admin): đọc/sửa trực tiếp mg_classes, mg_groups, mg_posts + mg_admin_posts.
// ---------------------------------------------------------------------------
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getVisitor } from './visitor';
import { getAnonId } from './reviews';

export const MG_ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';
const ok = () => isSupabaseConfigured && !!supabase;
const need = () => { if (!ok()) throw new Error('Supabase chưa được cấu hình'); };

async function rpc(fn, args = {}) {
  if (!ok()) return { ok: false, err: 'offline' };
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, err: 'offline', message: error.message };
  return data;
}

export function createGramApi({ getUser, onExit }) {
  return {
    isAdmin: () => getUser()?.email === MG_ADMIN_EMAIL,
    visitor: () => {
      const v = getVisitor() || {};
      const mssv = String(v.student_id || v.studentId || '').trim().toUpperCase();
      return { role: v.role === 'stranger' ? 'stranger' : (mssv ? 'student' : 'stranger'), mssv, name: v.full_name || '' };
    },
    anon: () => getAnonId() || '',
    exit: () => onExit && onExit(),

    login: (mssv, code) => rpc('mg_login', { p_mssv: String(mssv || ''), p_code: String(code || '') }),
    me: (group, mssv, code) => rpc('mg_me', { p_group: group, p_mssv: String(mssv || ''), p_code: String(code || '') }),
    post: (group, mssv, code, d) => rpc('mg_post', {
      p_group: group, p_mssv: String(mssv || ''), p_code: String(code || ''),
      p_text: d.text, p_tone: d.tone, p_tech: d.tech || [], p_extra: d.extra || [], p_slot: d.slot,
    }),
    feed: (mssv, code) => rpc('mg_feed', { p_mssv: String(mssv || ''), p_code: String(code || ''), p_anon: getAnonId() || '' }),
    react: (post, op, mssv) => rpc('mg_react', { p_post: post, p_op: op, p_mssv: String(mssv || ''), p_anon: getAnonId() || '' }),
    board: (classId) => rpc('mg_board', { p_class: classId }),
    async live() { const d = await rpc('mg_classes_live'); return Array.isArray(d) ? d : []; },
    async featured() { const d = await rpc('mg_featured'); return Array.isArray(d) ? d : []; },

    /* ---- giảng viên ---- */
    async adminList() {
      need();
      const [c, g] = await Promise.all([
        supabase.from('mg_classes').select('*').order('created_at', { ascending: false }),
        supabase.from('mg_groups').select('*').order('sort', { ascending: true }).order('created_at', { ascending: true }),
      ]);
      if (c.error) throw c.error; if (g.error) throw g.error;
      return (c.data || []).map((cl) => ({ ...cl, groups: (g.data || []).filter((x) => x.class_id === cl.id) }));
    },
    async adminPosts(classId) { need(); const { data, error } = await supabase.rpc('mg_admin_posts', { p_class: classId }); if (error) throw error; return data || []; },
    async adminCreateClass(row) { need(); const { error } = await supabase.from('mg_classes').insert(row); if (error) throw error; },
    async adminUpdateClass(id, patch) { need(); const { error } = await supabase.from('mg_classes').update(patch).eq('id', id); if (error) throw error; },
    async adminDeleteClass(id) { need(); const { error } = await supabase.from('mg_classes').delete().eq('id', id); if (error) throw error; },
    async adminAddGroup(row) { need(); const { error } = await supabase.from('mg_groups').insert(row); if (error) throw error; },
    async adminUpdateGroup(id, patch) {
      need();
      const { error } = await supabase.from('mg_groups').update(patch).eq('id', id); if (error) throw error;
      const r = await supabase.rpc('mg_admin_resim', { p_group: id }); if (r.error) throw r.error;
    },
    async adminDeleteGroup(id) { need(); const { error } = await supabase.from('mg_groups').delete().eq('id', id); if (error) throw error; },
    async adminUpdatePost(id, patch) { need(); const { error } = await supabase.from('mg_posts').update(patch).eq('id', id); if (error) throw error; },
  };
}
