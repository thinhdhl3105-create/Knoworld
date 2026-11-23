import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getAnonId } from './reviews';
import { setCameoOff } from './lumiCameo';

// ---------------------------------------------------------------------------
// v58: Hướng dẫn cư dân mới (Lumi).
// Trạng thái lưu ở localStorage (kw_onboarding) + đồng bộ lên Supabase
// site_visitors.onboarding qua RPC set_visitor_onboarding (im lặng nếu chưa chạy SQL).
//   status: pending (chờ Lumi chào) | touring | quest (đang làm hộ chiếu) | done | closed
// ---------------------------------------------------------------------------

const KEY = 'kw_onboarding';
const hasWindow = () => typeof window !== 'undefined';

export const todayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

export function loadOnb() {
  if (!hasWindow()) return null;
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}

let syncTimer = null;
export function saveOnb(state) {
  if (!hasWindow()) return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncOnb(state), 800);
}

async function syncOnb(s) {
  if (!isSupabaseConfigured) return;
  const anon = getAnonId();
  if (!anon) return;
  try {
    await supabase.rpc('set_visitor_onboarding', {
      p_anon_id: anon,
      p_data: {
        status: s.status || null,
        path: s.path || null,
        stamps: Array.isArray(s.stamps) ? s.stamps.slice(0, 10) : [],
        lumi_off: !!s.lumi_off,
        skipped: !!s.skipped,
        first_day: s.first_day || null,
        done_at: s.done_at || null,
      },
    });
  } catch { /* ignore */ }
}

const notify = () => { if (hasWindow()) window.dispatchEvent(new CustomEvent('kw-onboarding')); };

// Gọi ngay khi người mới bấm "Enter the city" ở cổng đăng ký.
export function startOnboardingForNewCitizen() {
  saveOnb({ status: 'pending', stamps: [], first_day: todayKey() });
  // Tắt tour cũ (v24) để không chạy song song.
  try { localStorage.setItem('kw_tour_done', '1'); } catch { /* ignore */ }
  notify();
}

// Nút "Xem lại hướng dẫn" (My Journey). Giữ các dấu đã đóng.
export function replayOnboarding() {
  const s = loadOnb() || { stamps: [], first_day: todayKey() };
  saveOnb({ ...s, status: 'pending', lumi_off: false, min: false });
  setCameoOff(false); // v59: gọi cả Lumi lấp ló / Lumi trong city dậy
  notify();
}
