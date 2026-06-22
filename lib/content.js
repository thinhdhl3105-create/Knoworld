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

// Theoretical Map — edges between Foundations and Research papers.
export async function fetchFoundationLinks() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('foundation_links').select('*');
    if (!error) return { data: data || [], source: 'supabase' };
  }
  return { data: [], source: 'sample' };
}

// Global search across video case studies, student case studies, research
// papers and Knowledge Hub concepts. Runs the filter client-side over the
// published rows so it works the same whether data comes from Supabase or
// the sample fallback.
const KIND_META = {
  video: { label: 'Video Case Study', href: '/videos', icon: 'play_circle' },
  student: { label: 'Student Case Study', href: '/students', icon: 'school' },
  research: { label: 'Research', href: '/research', icon: 'science' },
  concept: { label: 'Knowledge', href: '/knowledge-hub', icon: 'hub' },
};

function matchesQuery(item, terms) {
  const haystack = [
    item.title,
    item.summary,
    item.category,
    Array.isArray(item.tags) ? item.tags.join(' ') : item.tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

export async function searchAll(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return { data: [], source: isSupabaseConfigured ? 'supabase' : 'sample' };
  const terms = q.split(/\s+/).filter(Boolean);

  const [videos, students, research, concepts] = await Promise.all([
    fetchContent('video'),
    fetchContent('student'),
    fetchContent('research'),
    fetchConcepts(),
  ]);

  const source = videos.source;

  const tag = (rows, kind) =>
    (rows.data || []).map((r) => ({ ...r, _kind: kind, _meta: KIND_META[kind] }));

  const all = [
    ...tag(videos, 'video'),
    ...tag(students, 'student'),
    ...tag(research, 'research'),
    ...tag(concepts, 'concept'),
  ];

  const results = all.filter((item) => matchesQuery(item, terms));
  return { data: results, source };
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
