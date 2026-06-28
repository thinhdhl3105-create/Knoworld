import { supabase, isSupabaseConfigured } from './supabaseClient';

// Read an editable content blob (e.g. key = 'profile'). Returns the stored
// object or null when nothing is saved yet / Supabase is not configured.
export async function loadSiteContent(key) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('site_content').select('data').eq('key', key).maybeSingle();
  if (error) { console.warn('[siteContent] load:', error.message); return null; }
  return data?.data ?? null;
}

// Upsert an editable content blob. Only the admin account passes RLS.
export async function saveSiteContent(key, data) {
  if (!isSupabaseConfigured) return { error: 'Supabase chưa được cấu hình.' };
  const { error } = await supabase
    .from('site_content').upsert({ key, data }, { onConflict: 'key' });
  return { error: error?.message ?? null };
}
