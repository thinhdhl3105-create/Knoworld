import { supabase, isSupabaseConfigured } from './supabaseClient';
import { loadSiteContent, saveSiteContent } from './siteContent';

// ---------------------------------------------------------------------------
// v31: Game Island — lưu danh sách mặc định (site_content 'games') và kết quả công bố (game_rounds).
// ---------------------------------------------------------------------------

export async function loadGameDefaults() {
  const d = await loadSiteContent('games');
  return { groups: Array.isArray(d?.groups) ? d.groups : [], brands: Array.isArray(d?.brands) ? d.brands : [] };
}

export async function saveGameDefaults(patch) {
  const cur = (await loadSiteContent('games')) || {};
  return saveSiteContent('games', { ...cur, ...patch });
}

export async function publishRound(kind, data, user) {
  if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
  const title = kind === 'race'
    ? `${data.order?.[0] || 'A group'} presents first`
    : `${data.groups?.length || 0} groups got their brands`;
  const { error } = await supabase.from('game_rounds').insert({ kind, title, data, created_by: user?.email || null });
  if (error && /game_rounds/.test(error.message)) return { error: 'Run supabase/migration_v31_game_island.sql first.' };
  return { error: error?.message || null };
}

// Kết quả mới nhất của mỗi loại.
export async function latestRounds() {
  if (!isSupabaseConfigured) return {};
  const { data, error } = await supabase.from('game_rounds').select('*').order('created_at', { ascending: false }).limit(10);
  if (error || !data) return {};
  return { race: data.find((r) => r.kind === 'race') || null, brands: data.find((r) => r.kind === 'brands') || null, all: data };
}
