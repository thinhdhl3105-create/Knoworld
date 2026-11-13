// v50: METRO AD WALL — tường quảng cáo trong các ga tàu điện ngầm (OOH cho môn truyền thông).
//   • Danh sách poster lưu ở site_content key 'metro_ads' (ai cũng đọc được, chỉ admin ghi — RLS sẵn có).
//   • Ảnh tải lên bucket 'museum' (đã có từ v40, chỉ admin tải lên), thư mục metro-ads/.
//   => Không cần chạy SQL mới.
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { loadSiteContent, saveSiteContent } from './siteContent';
import { shrinkImage } from './home';

const MUSEUM_BUCKET = 'museum'; // bucket cũ của v40, nay chỉ còn chứa poster metro-ads/

export const METRO_ADS_ADMIN = 'thinh.dhl3105@gmail.com';
const KEY = 'metro_ads';

export async function loadMetroAds() {
  const d = await loadSiteContent(KEY);
  return { list: Array.isArray(d?.list) ? d.list : [], every: Math.max(4, +d?.every || 9) };
}
export const activeAds = (list) => (list || []).filter((a) => a && a.url && a.on !== false);

export async function saveMetroAds(list, every = 9) {
  const { error } = await saveSiteContent(KEY, { list, every });
  if (error) throw new Error(error);
}

const rid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export async function uploadMetroAdImage(file) {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase chưa được cấu hình.');
  const small = await shrinkImage(file, 1600, 0.86);
  const path = `metro-ads/${rid()}.jpg`;
  const { error } = await supabase.storage.from(MUSEUM_BUCKET).upload(path, small, { upsert: false, contentType: small.type || 'image/jpeg', cacheControl: '31536000' });
  if (error) throw error;
  return { id: rid(), path, url: supabase.storage.from(MUSEUM_BUCKET).getPublicUrl(path).data.publicUrl };
}
export async function removeMetroAdImage(path) {
  if (!path || !supabase) return;
  try { await supabase.storage.from(MUSEUM_BUCKET).remove([path]); } catch { /* ignore */ }
}
