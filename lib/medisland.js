// ---------------------------------------------------------------------------
// v44: MEDISLAND — dữ liệu (Supabase). Chạy supabase/migration_v44_medisland.sql trước.
//   • Game chạy trong iframe /medisland/game.html (cùng domain) và gọi các hàm ở đây qua window.__kwMedis.
//   • Sinh viên: medis_login (MSSV + mã vào đảo → đúng nhóm) / medis_act / medis_board / medis_now.
//   • Giảng viên (đăng nhập email admin): đọc/sửa trực tiếp medis_classes, medis_groups, medis_state;
//     kênh truyền thông thêm vào lưu ở site_content key 'medis_channels'.
//   • Nhiều người chơi: mỗi nhóm một kênh Realtime riêng 'kw-medis-<groupId>' (connectRoom của Temple).
// ---------------------------------------------------------------------------
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { loadSiteContent, saveSiteContent } from './siteContent';
import { connectRoom } from './templeOnline';
import { getVisitor } from './visitor';

export const MEDIS_ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';
const ok = () => isSupabaseConfigured && !!supabase;
const need = () => { if (!ok()) throw new Error('Supabase chưa được cấu hình'); };

export function createMedisApi({ getUser, onExit }) {
  return {
    isAdmin: () => getUser()?.email === MEDIS_ADMIN_EMAIL,
    studentId: () => { const v = getVisitor(); return String(v?.student_id || v?.studentId || ''); },
    exit: () => onExit && onExit(),
    async now() { if (!ok()) return Date.now(); const { data, error } = await supabase.rpc('medis_now'); return error ? Date.now() : Number(data); },
    async login(mssv, code) {
      if (!ok()) return { ok: false, err: 'offline' };
      const { data, error } = await supabase.rpc('medis_login', { p_mssv: String(mssv || ''), p_code: String(code || '') });
      if (error) return { ok: false, err: 'offline', message: error.message };
      return data;
    },
    async act(group, mssv, code, op, payload = {}) {
      if (!ok()) return { ok: false, err: 'offline' };
      const { data, error } = await supabase.rpc('medis_act', { p_group: group, p_mssv: String(mssv || ''), p_code: String(code || ''), p_op: op, p_data: payload || {} });
      if (error) return { ok: false, err: 'offline', message: error.message };
      return data;
    },
    async board(classId) { if (!ok()) return []; const { data, error } = await supabase.rpc('medis_board', { p_class: classId }); return error ? [] : data || []; },
    async channels() { const d = await loadSiteContent('medis_channels'); return { list: Array.isArray(d?.list) ? d.list : [], off: Array.isArray(d?.off) ? d.off : [], price: d?.price && typeof d.price === 'object' ? d.price : {}, fees: d?.fees && typeof d.fees === 'object' ? d.fees : {} }; },
    async saveChannels({ list, off, price, fees }) { const { error } = await saveSiteContent('medis_channels', { list: list || [], off: off || [], price: price || {}, fees: fees || {} }); if (error) throw new Error(error); },
    connect(channel, getMe, handlers) { return connectRoom(channel, getMe, handlers); },

    /* ---- giảng viên ---- */
    async adminList() {
      need();
      const [c, g, s] = await Promise.all([
        supabase.from('medis_classes').select('*').order('created_at', { ascending: false }),
        supabase.from('medis_groups').select('*').order('sort', { ascending: true }).order('created_at', { ascending: true }),
        supabase.from('medis_state').select('group_id,state'),
      ]);
      if (c.error) throw c.error; if (g.error) throw g.error;
      const st = Object.fromEntries((s.data || []).map((r) => [r.group_id, r.state]));
      return (c.data || []).map((cl) => ({ ...cl, groups: (g.data || []).filter((x) => x.class_id === cl.id).map((x) => ({ ...x, run_hours: Number(x.run_hours), state: st[x.id] || {} })) }));
    },
    /* giảng viên vào thẳng một đảo (chỉ xem): đọc trực tiếp nhóm + trạng thái, cùng định dạng với medis_act 'get' */
    async adminGet(groupId) {
      need();
      const [g, s, n] = await Promise.all([
        supabase.from('medis_groups').select('*').eq('id', groupId).single(),
        supabase.from('medis_state').select('state').eq('group_id', groupId).maybeSingle(),
        supabase.rpc('medis_now'),
      ]);
      if (g.error || !g.data) return { ok: false, err: 'nogroup' };
      const c = await supabase.from('medis_classes').select('*').eq('id', g.data.class_id).maybeSingle();
      const x = g.data;
      return {
        ok: true, me: -1, now: Number(n.data) || Date.now(), state: (s.data && s.data.state) || {},
        group: { id: x.id, name: x.name, color: x.color, brief: x.brief, run_hours: Number(x.run_hours), class_id: x.class_id, class_code: (c.data && c.data.code) || '', class_settings: (c.data && c.data.settings) || {},
          members: (x.members || []).map((m) => ({ name: m.name, out: !!m.out })) },
      };
    },
    async adminUpdateClass(id, patch) { need(); const { error } = await supabase.from('medis_classes').update(patch).eq('id', id); if (error) throw error; },
    async adminCreateClass({ code, term }) { need(); const { error } = await supabase.from('medis_classes').insert({ code, term }); if (error) throw error; },
    async adminAddGroup(row) { need(); const { error } = await supabase.from('medis_groups').insert(row); if (error) throw error; },
    async adminUpdateGroup(id, patch) { need(); const { error } = await supabase.from('medis_groups').update(patch).eq('id', id); if (error) throw error; },
    async adminDeleteGroup(id) { need(); const { error } = await supabase.from('medis_groups').delete().eq('id', id); if (error) throw error; },
  };
}
