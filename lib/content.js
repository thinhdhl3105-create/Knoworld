import { supabase, isSupabaseConfigured } from './supabaseClient';
import { sampleByKind } from './sampleData';

// Fetch content of a given kind. Falls back to sample data when Supabase
// is not configured or returns nothing, so the UI always has something to show.
export async function fetchContent(kind) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('kind', kind)
      .eq('published', true)
      .order('created_at', { ascending: false });
    if (!error && data && data.length) return { data, source: 'supabase' };
  }
  return { data: sampleByKind(kind), source: 'sample' };
}
