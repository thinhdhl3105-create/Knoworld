// ---------------------------------------------------------------------------
// v39: CHÙA NHIỀU NGƯỜI CHƠI — mọi người đang mở /temple thấy nhau.
// Dùng Supabase Realtime (Presence + Broadcast) trên kênh 'kw-temple':
//   • Presence: ai đang ở chùa (tên gọi, màu nhân vật, huy hiệu GV).
//   • Broadcast: vị trí, lạy Phật, câu nói nhanh (chỉ gửi số thứ tự câu có sẵn,
//     không gửi chữ tự gõ). Không lưu gì vào database, không cần chạy SQL.
// Chưa cấu hình Supabase hoặc Realtime bị tắt -> game vẫn chơi một mình bình thường.
// ---------------------------------------------------------------------------
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getVisitor } from './visitor';
import { getSavedAvatar, OUTFITS } from './citizenAvatar';
import { getAnonId } from './reviews';

const CHANNEL = 'kw-temple';

// Tên hiển thị: chỉ lấy TÊN (chữ cuối của họ tên), không lộ họ tên đầy đủ.
export function templeIdentity(isLecturer) {
  const v = getVisitor();
  const full = String(v?.full_name || v?.fullName || '').trim();
  const given = full ? full.split(/\s+/).pop() : '';
  const anon = String(getAnonId() || '').replace(/-/g, '').slice(0, 4).toUpperCase();
  const a = getSavedAvatar();
  const outfit = a ? OUTFITS.find((o) => o.id === a.outfit) : null;
  return {
    name: (given || `Khách ${anon}`).slice(0, 18),
    badge: isLecturer ? 'GV' : '',
    look: a ? { skin: a.skin, hair: a.hair, shirt: outfit?.main || '#8b7cf6' } : null,
  };
}

// connectTempleRoom(getMe, handlers) -> { sid, send(type, data), retrack(), leave() } | null
// handlers: snapshot() -> {tx,ty,dir}, onPeers(list), onJoin(sid), onEvent(payload), onStatus('online'|'offline')
export function connectTempleRoom(getMe, h) {
  if (!isSupabaseConfigured || !supabase || typeof supabase.channel !== 'function') return null;
  const sid = Math.random().toString(36).slice(2, 10); // mỗi tab một mã
  let ch = null, closed = false, joined = false;
  try {
    ch = supabase.channel(CHANNEL, { config: { presence: { key: sid }, broadcast: { self: false, ack: false } } });
  } catch {
    return null;
  }
  const peers = () => {
    const s = ch.presenceState() || {};
    return Object.entries(s).filter(([k]) => k !== sid).map(([k, arr]) => ({ sid: k, ...(arr && arr[0] ? arr[0] : {}) }));
  };
  const track = () => {
    if (!joined || closed) return;
    const me = getMe() || {};
    ch.track({ name: me.name, badge: me.badge, look: me.look, ...(h.snapshot ? h.snapshot() : {}) }).catch(() => {});
  };
  ch.on('presence', { event: 'sync' }, () => { if (!closed) h.onPeers(peers()); });
  ch.on('presence', { event: 'join' }, ({ key }) => { if (!closed && key !== sid && h.onJoin) h.onJoin(key); });
  ch.on('broadcast', { event: 'ev' }, ({ payload }) => { if (!closed && payload && payload.sid && payload.sid !== sid) h.onEvent(payload); });
  ch.subscribe((status) => {
    if (closed) return;
    if (status === 'SUBSCRIBED') { joined = true; track(); if (h.onStatus) h.onStatus('online'); }
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { joined = false; if (h.onStatus) h.onStatus('offline'); }
  });
  return {
    sid,
    send(type, data = {}) {
      if (!joined || closed) return;
      ch.send({ type: 'broadcast', event: 'ev', payload: { ...data, sid, type } }).catch(() => {});
    },
    retrack: track,
    leave() { closed = true; joined = false; try { supabase.removeChannel(ch); } catch { /* ignore */ } },
  };
}
