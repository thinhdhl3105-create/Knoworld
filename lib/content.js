import { supabase, isSupabaseConfigured } from './supabaseClient';
import { sampleByKind, sampleConcepts, sampleConceptLinks, sampleFrameworks } from './sampleData';

// Fetch content of a given kind. Falls back to sample data when Supabase
// is not configured, so the UI never errors out before setup.
export async function fetchContent(kind) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('kind', kind)
      .eq('published', true)
      .order('created_at', { ascending: false });
    if (!error) return { data: data || [], source: 'supabase' };
  }
  return { data: sampleByKind(kind), source: 'sample' };
}

// Single content item by id (used by student case study detail page).
export async function fetchContentById(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('content').select('*').eq('id', id).single();
    if (!error && data) return { data, source: 'supabase' };
  }
  return { data: null, source: 'sample' };
}

// Distinct categories already used for a kind (for persistent category lists).
export async function fetchCategories(kind) {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('content')
    .select('category')
    .eq('kind', kind)
    .not('category', 'is', null);
  if (error || !data) return [];
  return Array.from(new Set(data.map((r) => r.category).filter(Boolean))).sort();
}

// Knowledge Hub — concepts.
export async function fetchConcepts() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('concepts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });
    if (!error) return { data: data || [], source: 'supabase' };
  }
  return { data: sampleConcepts, source: 'sample' };
}

// Content (videos / students) that are linked to a Knowledge Hub concept.
// Used to show "related case studies" inside a concept. Falls back to sample.
export async function fetchConceptLinkedContent() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('content')
      .select('id,kind,title,summary,category,concept_id,cover_url')
      .in('kind', ['video', 'student'])
      .not('concept_id', 'is', null)
      .eq('published', true)
      .order('created_at', { ascending: false });
    if (!error) return { data: data || [], source: 'supabase' };
  }
  return { data: [], source: 'sample' };
}

// Knowledge Hub — links/edges between concepts.
export async function fetchConceptLinks() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('concept_links').select('*');
    if (!error) return { data: data || [], source: 'supabase' };
  }
  return { data: sampleConceptLinks, source: 'sample' };
}

// Frameworks (downloadable templates + guide).
export async function fetchFrameworks() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('frameworks')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });
    if (!error) return { data: data || [], source: 'supabase' };
  }
  return { data: sampleFrameworks, source: 'sample' };
}
