'use client';
// entries list: grouped + searchable
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useAuth } from '../components/AuthProvider';

const empty = {
  kind: 'research', title: '', summary: '', body: '', category: '', tags: '',
  media_url: '', cover_url: '', paper_url: '', source_url: '', is_foundation: false,
  context: '', insight: '', creative_approach: '', execution: '', images: [],
  student_name: '', school: '', year: '', brand: '',
  concept_id: '', file_url: '', file_name: '', links: [],
  published: true,
  // Research papers: structured authors [{ name, role }], role ∈ first|co|corresponding.
  authors: [],
  // Theoretical Map: ids of the OTHER end of foundation_links.
  // Editing a Foundation → research ids it links to.
  // Editing a Research  → foundation ids it belongs to.
  flinks: [],
};

// The "foundation" form-type is stored as a research-kind content row with
// is_foundation = true. Map the UI kind onto the real content_kind enum.
const isFoundationKind = (kind) => kind === 'foundation';
const isResearchSide = (kind) => kind === 'research' || kind === 'foundation';
const storedKind = (kind) => (isFoundationKind(kind) ? 'research' : kind);

// Which table a kind lives in.
const tableOf = (kind) =>
  kind === 'concept' ? 'concepts' : kind === 'framework' ? 'frameworks' : 'content';

const AUTHOR_ROLES = [
  { value: 'first', label: 'First author' },
  { value: 'co', label: 'Co-author' },
  { value: 'corresponding', label: 'Corresponding author' },
];

// ---- auto cover helpers (video case studies) ----
// Derive a cover thumbnail directly from a YouTube link (no upload needed).
function youtubeThumb(url) {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  return yt ? `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` : null;
}
// Vimeo needs an oEmbed lookup to get its thumbnail URL.
async function vimeoThumb(url) {
  if (!/vimeo\.com\/\d+/.test(url)) return null;
  try {
    const r = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
    if (!r.ok) return null;
    const j = await r.json();
    return j.thumbnail_url || null;
  } catch { return null; }
}
// Capture a single frame from an uploaded video file -> JPEG blob.
function captureVideoFrame(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    const cleanup = () => URL.revokeObjectURL(url);
    video.onloadeddata = () => {
      // Seek to the middle (or 1s) for a representative frame.
      video.currentTime = Math.min(Math.max(video.duration / 2 || 1, 0.1), video.duration || 1);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => { cleanup(); resolve(blob); }, 'image/jpeg', 0.82);
      } catch { cleanup(); resolve(null); }
    };
    video.onerror = () => { cleanup(); resolve(null); };
  });
}

const kindLabel = {
  research: 'Research Paper', foundation: 'Theoretical Foundation',
  student: 'Student Case Study',
  video: 'Video Case Study', concept: 'Key Concept (Knowledge Hub)',
  framework: 'Framework (downloadable)',
};

export default function UploadPage() {
  const router = useRouter();
  const { user, loading: authLoading, configured } = useAuth();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null); // {table, id}
  const [mine, setMine] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [researchItems, setResearchItems] = useState([]); // all research-kind rows (for map linking)
  const [allCats, setAllCats] = useState([]); // every category used anywhere, for suggestions
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState('');
  // True while the current cover was auto-derived (so we may overwrite it),
  // false once the user picks a cover manually (so we leave it alone).
  const coverAuto = useRef(false);

  // Apply an auto-derived cover only if the user hasn't set one manually.
  function applyAutoCover(url) {
    if (!url) return;
    setForm((f) => (!f.cover_url || coverAuto.current) ? { ...f, cover_url: url } : f);
    coverAuto.current = true;
  }

  // Handle the YouTube/Vimeo link field for video case studies.
  async function onVideoLink(value) {
    set('media_url', value);
    if (form.kind !== 'video') return;
    const yt = youtubeThumb(value);
    if (yt) { applyAutoCover(yt); return; }
    applyAutoCover(await vimeoThumb(value));
  }

  // Handle an uploaded video file: upload it, then capture a cover frame.
  async function onVideoFile(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading('video'); setError('');
    try {
      const { url } = await uploadFile(file);
      setForm((f) => ({ ...f, media_url: url }));
      // Generate a poster frame and upload it as the cover (if none set yet).
      if (!form.cover_url || coverAuto.current) {
        try {
          const blob = await captureVideoFrame(file);
          if (blob) {
            const thumbFile = new File([blob], `cover-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const { url: coverUrl } = await uploadFile(thumbFile);
            applyAutoCover(coverUrl);
          }
        } catch { /* cover is optional — ignore frame-capture failures */ }
      }
    } catch (err) { setError(err.message); }
    setUploading('');
  }

  useEffect(() => {
    if (!authLoading && !user && configured) router.push('/login');
  }, [authLoading, user, configured, router]);

  async function loadAux() {
    if (!isSupabaseConfigured) return;
    const [{ data: cs }, { data: contentRows }, { data: rs }, { data: fwRows }] = await Promise.all([
      supabase.from('concepts').select('id,title,category').order('title'),
      supabase.from('content').select('category,kind').not('category', 'is', null),
      supabase.from('content').select('id,title,is_foundation').eq('kind', 'research').order('title'),
      supabase.from('frameworks').select('category').not('category', 'is', null),
    ]);
    setConcepts(cs || []);
    setResearchItems(rs || []);
    // Merge categories from concepts, all content kinds, and frameworks into one list.
    const merged = [
      ...(cs || []).map((r) => r.category),
      ...(contentRows || []).map((r) => r.category),
      ...(fwRows || []).map((r) => r.category),
    ].filter(Boolean).map((c) => c.trim());
    setAllCats(Array.from(new Set(merged)).sort((a, b) => a.localeCompare(b)));
  }

  async function loadMine() {
    if (!isSupabaseConfigured || !user) return;
    const [c, k, f] = await Promise.all([
      supabase.from('content').select('*').eq('author_id', user.id).order('created_at', { ascending: false }),
      supabase.from('concepts').select('*').eq('author_id', user.id).order('created_at', { ascending: false }),
      supabase.from('frameworks').select('*').eq('author_id', user.id).order('created_at', { ascending: false }),
    ]);
    const rows = [
      // Foundations are research-kind rows; surface them under their own UI kind.
      ...(c.data || []).map((r) => ({
        ...r, _table: 'content',
        kind: r.kind === 'research' && r.is_foundation ? 'foundation' : r.kind,
      })),
      ...(k.data || []).map((r) => ({ ...r, _table: 'concepts', kind: 'concept' })),
      ...(f.data || []).map((r) => ({ ...r, _table: 'frameworks', kind: 'framework' })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setMine(rows);
  }
  useEffect(() => { loadMine(); loadAux(); }, [user]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  function reset() { setForm(empty); setEditing(null); coverAuto.current = false; }

  // ---- file uploads ----
  async function uploadFile(file) {
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error: upErr } = await supabase.storage.from('uploads').upload(path, file, { upsert: false });
    if (upErr) throw upErr;
    return { url: supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl, name: file.name };
  }
  async function onSingleFile(e, field, tag) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(tag); setError('');
    try {
      const { url, name } = await uploadFile(file);
      setForm((f) => ({ ...f, [field]: url, ...(field === 'file_url' ? { file_name: name } : {}) }));
    } catch (err) { setError(err.message); }
    setUploading('');
  }
  async function onMultiImages(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !user) return;
    setUploading('images'); setError('');
    try {
      const urls = [];
      for (const file of files) { const { url } = await uploadFile(file); urls.push(url); }
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    } catch (err) { setError(err.message); }
    setUploading('');
  }
  const removeImage = (i) => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
  const tagsArr = (s) => s.split(',').map((t) => t.trim()).filter(Boolean);

  // ---- submit ----
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!isSupabaseConfigured || !user) { setError('Cần đăng nhập và cấu hình Supabase.'); return; }
    if (!form.title.trim()) return;
    setBusy(true);
    const table = tableOf(form.kind);
    const base = {
      title: form.title.trim(),
      summary: form.summary.trim() || null,
      body: form.body.trim() || null,
      category: form.category.trim() || null,
      tags: tagsArr(form.tags),
      author_id: user.id,
      published: !!form.published,
    };
    let payload;
    if (table === 'content') {
      payload = {
        ...base, kind: storedKind(form.kind), cover_url: form.cover_url || null,
        media_url: form.media_url.trim() || null,
        paper_url: form.paper_url || null,
        source_url: form.source_url.trim() || null,
        is_foundation: isFoundationKind(form.kind),
        authors: form.kind === 'research'
          ? form.authors.filter((a) => a && a.name && a.name.trim())
              .map((a) => ({ name: a.name.trim(), role: a.role || 'co' }))
          : [],
        context: form.context.trim() || null,
        insight: form.insight.trim() || null,
        creative_approach: form.creative_approach.trim() || null,
        execution: form.execution.trim() || null,
        images: form.images || [],
        student_name: form.kind === 'student' ? (form.student_name.trim() || null) : null,
        school: form.kind === 'student' ? (form.school.trim() || null) : null,
        year: form.kind === 'student' ? (form.year.trim() || null) : null,
        brand: (form.kind === 'video' || form.kind === 'student') ? (form.brand.trim() || null) : null,
        concept_id:
          (form.kind === 'video' || form.kind === 'student') && form.concept_id
            ? form.concept_id
            : null,
      };
    } else if (table === 'concepts') {
      payload = { ...base };
    } else {
      payload = { ...base, file_url: form.file_url || null, file_name: form.file_name || null, cover_url: form.cover_url || null };
    }

    let res, savedId;
    if (editing) {
      res = await supabase.from(table).update(payload).eq('id', editing.id).select('id').single();
      savedId = editing.id;
    } else {
      res = await supabase.from(table).insert(payload).select('id').single();
      savedId = res.data?.id;
    }
    if (res.error) { setError(res.error.message); setBusy(false); return; }

    // sync concept links
    if (table === 'concepts' && savedId) {
      await supabase.from('concept_links').delete().eq('source_id', savedId).eq('author_id', user.id);
      const rows = form.links
        .filter((tid) => tid && tid !== savedId)
        .map((tid) => ({ source_id: savedId, target_id: tid, author_id: user.id }));
      if (rows.length) await supabase.from('concept_links').insert(rows);
    }

    // sync Theoretical Map edges (foundation ↔ research)
    if (table === 'content' && isResearchSide(form.kind) && savedId) {
      const isFoundation = isFoundationKind(form.kind);
      const sideCol = isFoundation ? 'foundation_id' : 'research_id';
      await supabase.from('foundation_links').delete().eq(sideCol, savedId).eq('author_id', user.id);
      const rows = form.flinks
        .filter((tid) => tid && tid !== savedId)
        .map((tid) =>
          isFoundation
            ? { foundation_id: savedId, research_id: tid, author_id: user.id }
            : { foundation_id: tid, research_id: savedId, author_id: user.id }
        );
      if (rows.length) await supabase.from('foundation_links').insert(rows);
    }

    reset(); loadMine(); loadAux();
    setBusy(false);
  }

  async function startEdit(c) {
    const table = c._table;
    let links = [];
    let flinks = [];
    if (table === 'concepts') {
      const { data } = await supabase.from('concept_links').select('target_id').eq('source_id', c.id).eq('author_id', user.id);
      links = (data || []).map((l) => l.target_id);
    }
    if (table === 'content' && isResearchSide(c.kind)) {
      if (c.is_foundation) {
        const { data } = await supabase.from('foundation_links').select('research_id').eq('foundation_id', c.id).eq('author_id', user.id);
        flinks = (data || []).map((l) => l.research_id);
      } else {
        const { data } = await supabase.from('foundation_links').select('foundation_id').eq('research_id', c.id).eq('author_id', user.id);
        flinks = (data || []).map((l) => l.foundation_id);
      }
    }
    setEditing({ table, id: c.id });
    coverAuto.current = false; // keep the saved cover unless the user re-picks a video
    setForm({
      ...empty,
      kind: c.is_foundation ? 'foundation' : c.kind,
      title: c.title || '', summary: c.summary || '', body: c.body || '',
      category: c.category || '', tags: (c.tags || []).join(', '),
      media_url: c.media_url || '', cover_url: c.cover_url || '', paper_url: c.paper_url || '',
      source_url: c.source_url || '',
      is_foundation: !!c.is_foundation,
      authors: Array.isArray(c.authors) ? c.authors : [],
      context: c.context || '', insight: c.insight || '', creative_approach: c.creative_approach || '',
      execution: c.execution || '', images: c.images || [],
      student_name: c.student_name || '', school: c.school || '', year: c.year || '', brand: c.brand || '',
      concept_id: c.concept_id || '', file_url: c.file_url || '', file_name: c.file_name || '',
      published: c.published !== false,
      links, flinks,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(c) {
    if (!confirm('Delete this entry?')) return;
    const { error } = await supabase.from(c._table).delete().eq('id', c.id);
    if (error) setError(error.message);
    else loadMine();
  }

  async function togglePublish(c) {
    const next = !(c.published !== false);
    const { error } = await supabase.from(c._table).update({ published: next }).eq('id', c.id);
    if (error) setError(error.message);
    else loadMine();
  }

  if (authLoading) return <div className="pt-32 px-5 max-w-container mx-auto text-on-surface-variant">Loading…</div>;

  const k = form.kind;
  const isContent = tableOf(k) === 'content';

  return (
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-12 bg-primary" />
          <span className="label-sm text-secondary tracking-widest">Contributor Dashboard</span>
        </div>
        <h1 className="h-lg">{editing ? 'Edit entry' : 'Publish to Knoworld'}</h1>
        {user && <p className="text-sm text-on-surface-variant mt-2">Signed in as {user.email}</p>}
        {!configured && (
          <div className="mt-4 glass-card rounded-card p-4 text-sm text-secondary">
            Supabase chưa cấu hình — thêm biến môi trường để bật lưu trữ thật.
          </div>
        )}
      </header>

      <div className="grid lg:grid-cols-5 gap-10">
        <form onSubmit={handleSubmit} className="lg:col-span-3 glass-card rounded-card p-6 md:p-8 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select value={form.kind} onChange={(e) => set('kind', e.target.value)} className={inputCls} disabled={!!editing}>
                {Object.entries(kindLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <input value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}
                list="all-cats"
                placeholder={k === 'video' ? 'e.g. Strategy Breakdowns' : 'Chọn hoặc nhập category…'} />
              {/* Suggestions = every category already used anywhere (pick or type new). */}
              <datalist id="all-cats">{allCats.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
          </div>

          <Field label="Title *">
            <input required value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="Title…" />
          </Field>
          <Field label="Summary">
            <textarea value={form.summary} onChange={(e) => set('summary', e.target.value)} rows={2} className={inputCls} placeholder="Short description…" />
          </Field>

          {/* research paper */}
          {k === 'research' && (
            <>
              <Field label="Body / abstract">
                <textarea value={form.body} onChange={(e) => set('body', e.target.value)} rows={5} className={inputCls} placeholder="Full text…" />
              </Field>

              {/* Authors with roles */}
              <Field label="Authors">
                <AuthorsEditor authors={form.authors} onChange={(next) => set('authors', next)} />
              </Field>

              <FileField label="Research paper (PDF, optional)" accept=".pdf,.doc,.docx" busy={uploading === 'paper'}
                onChange={(e) => onSingleFile(e, 'paper_url', 'paper')} done={form.paper_url} />
              <Field label="Related link (URL, optional)">
                <input value={form.source_url} onChange={(e) => set('source_url', e.target.value)} className={inputCls}
                  placeholder="https://doi.org/…  ·  Google Drive  ·  article URL" />
              </Field>

              <Field label="This paper supports which Foundation(s)? (Theoretical Map)">
                <MapPicker
                  options={researchItems.filter((r) => r.is_foundation && (!editing || r.id !== editing.id))}
                  selected={form.flinks}
                  onToggle={(id) =>
                    set('flinks', form.flinks.includes(id) ? form.flinks.filter((x) => x !== id) : [...form.flinks, id])
                  }
                  emptyText="No foundations yet — add a Theoretical Foundation first."
                />
              </Field>
            </>
          )}

          {/* theoretical foundation */}
          {k === 'foundation' && (
            <>
              <p className="text-xs text-on-surface-variant -mt-1">
                A core theory (e.g. <strong className="text-on-surface">RBV</strong>) with its definition and the
                research papers that build on it — kept separate from individual papers for easy lookup.
              </p>
              <Field label="Definition">
                <textarea value={form.body} onChange={(e) => set('body', e.target.value)} rows={5} className={inputCls}
                  placeholder="Define the theory — what it claims, where it comes from…" />
              </Field>
              <Field label="Related link (URL, optional)">
                <input value={form.source_url} onChange={(e) => set('source_url', e.target.value)} className={inputCls}
                  placeholder="https://doi.org/…  ·  reference URL" />
              </Field>
              <Field label="Link related research papers (Theoretical Map)">
                <MapPicker
                  options={researchItems.filter((r) => !r.is_foundation && (!editing || r.id !== editing.id))}
                  selected={form.flinks}
                  onToggle={(id) =>
                    set('flinks', form.flinks.includes(id) ? form.flinks.filter((x) => x !== id) : [...form.flinks, id])
                  }
                  emptyText="No research papers yet — add some, then link them here."
                />
              </Field>
            </>
          )}

          {/* student case study */}
          {k === 'student' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Brand name">
                  <input value={form.brand} onChange={(e) => set('brand', e.target.value)} className={inputCls} placeholder="e.g. Nike, Coca-Cola" />
                </Field>
                <Field label="Student(s)">
                  <input value={form.student_name} onChange={(e) => set('student_name', e.target.value)} className={inputCls} placeholder="Name (comma-separated for teams)" />
                </Field>
                <Field label="School">
                  <input value={form.school} onChange={(e) => set('school', e.target.value)} className={inputCls} placeholder="University / school" />
                </Field>
                <Field label="Year">
                  <input value={form.year} onChange={(e) => set('year', e.target.value)} className={inputCls} placeholder="e.g. 2025" />
                </Field>
              </div>
              <Field label="Context"><textarea value={form.context} onChange={(e) => set('context', e.target.value)} rows={3} className={inputCls} placeholder="Background & brief…" /></Field>
              <Field label="Insight"><textarea value={form.insight} onChange={(e) => set('insight', e.target.value)} rows={3} className={inputCls} placeholder="The key human truth…" /></Field>
              <Field label="Creative Approach"><textarea value={form.creative_approach} onChange={(e) => set('creative_approach', e.target.value)} rows={3} className={inputCls} placeholder="Big idea & concept…" /></Field>
              <Field label="Execution"><textarea value={form.execution} onChange={(e) => set('execution', e.target.value)} rows={3} className={inputCls} placeholder="How it was brought to life…" /></Field>
              <Field label="Link to a Knowledge Hub concept (optional)">
                <select value={form.concept_id} onChange={(e) => set('concept_id', e.target.value)} className={inputCls}>
                  <option value="">— none —</option>
                  {concepts.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </Field>
              <Field label="Project images (multiple)">
                <input type="file" accept="image/*" multiple onChange={onMultiImages} disabled={!user || uploading === 'images'} className={fileCls} />
                {uploading === 'images' && <span className="text-xs text-on-surface-variant">Uploading…</span>}
              </Field>
              {form.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.images.map((src, i) => (
                    <div key={i} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="w-20 h-20 object-cover rounded-lg border border-white/10" />
                      <button type="button" onClick={() => removeImage(i)} className="absolute -top-2 -right-2 bg-error text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">×</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* video */}
          {k === 'video' && (
            <>
              <Field label="Brand name">
                <input value={form.brand} onChange={(e) => set('brand', e.target.value)} className={inputCls} placeholder="e.g. Nike, Coca-Cola" />
              </Field>
              <Field label="YouTube / Vimeo link (or upload a file below)">
                <input value={form.media_url} onChange={(e) => onVideoLink(e.target.value)} className={inputCls} placeholder="https://youtube.com/watch?v=…" />
              </Field>
              <FileField label="…or upload a video file" accept="video/*" busy={uploading === 'video'}
                onChange={onVideoFile} done={form.media_url} />
              <p className="text-xs text-on-surface-variant -mt-2">
                Cover image sẽ tự cập nhật từ video. Bạn vẫn có thể tự đổi ở phần Cover image bên dưới.
              </p>
              <Field label="Link to a Knowledge Hub concept (optional)">
                <select value={form.concept_id} onChange={(e) => set('concept_id', e.target.value)} className={inputCls}>
                  <option value="">— none —</option>
                  {concepts.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </Field>
            </>
          )}

          {/* concept */}
          {k === 'concept' && (
            <>
              <Field label="Content / explanation">
                <textarea value={form.body} onChange={(e) => set('body', e.target.value)} rows={5} className={inputCls} placeholder="Explain the concept…" />
              </Field>
              <Field label="Connect to other concepts (the node bridges)">
                {concepts.filter((c) => !editing || c.id !== editing.id).length === 0 ? (
                  <p className="text-xs text-on-surface-variant">No other concepts yet — add more, then link them.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {concepts.filter((c) => !editing || c.id !== editing.id).map((c) => {
                      const on = form.links.includes(c.id);
                      return (
                        <button type="button" key={c.id}
                          onClick={() => set('links', on ? form.links.filter((x) => x !== c.id) : [...form.links, c.id])}
                          className={on
                            ? 'px-3 py-1.5 rounded-full text-xs bg-primary text-on-primary font-bold'
                            : 'px-3 py-1.5 rounded-full text-xs border border-white/10 text-on-surface-variant hover:border-primary/50'}>
                          {c.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Field>
            </>
          )}

          {/* framework */}
          {k === 'framework' && (
            <>
              <Field label="Guide / description page">
                <textarea value={form.body} onChange={(e) => set('body', e.target.value)} rows={5} className={inputCls} placeholder="How to use this framework…" />
              </Field>
              <FileField label="Downloadable file (PDF / DOCX / PPTX / XLSX)" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                busy={uploading === 'file'} onChange={(e) => onSingleFile(e, 'file_url', 'file')} done={form.file_url} doneLabel={form.file_name} />
            </>
          )}

          <Field label="Tags (comma separated)">
            <input value={form.tags} onChange={(e) => set('tags', e.target.value)} className={inputCls} placeholder="imc, branding" />
          </Field>

          {/* cover image — for content + framework */}
          {(isContent || k === 'framework') && (
            <>
              <Field label="Cover image">
                <input type="file" accept="image/*" onChange={(e) => { coverAuto.current = false; onSingleFile(e, 'cover_url', 'cover'); }} disabled={!user || uploading === 'cover'} className={fileCls} />
                {uploading === 'cover' && <span className="text-xs text-on-surface-variant">Uploading…</span>}
              </Field>
              {form.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.cover_url} alt="cover preview" className="rounded-lg max-h-40 object-cover border border-white/10" />
              )}
            </>
          )}

          {/* publish / visibility control */}
          <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-surface-container-lowest p-4">
            <input
              id="published"
              type="checkbox"
              checked={form.published}
              onChange={(e) => set('published', e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[color:var(--color-primary,#c6bfff)]"
            />
            <label htmlFor="published" className="text-sm cursor-pointer">
              <span className="font-medium text-on-surface">
                {form.published ? 'Công khai (Published)' : 'Ẩn (Draft / chỉ mình bạn thấy)'}
              </span>
              <span className="block text-xs text-on-surface-variant mt-0.5">
                Bật = mọi người xem được. Tắt = ẩn khỏi các trang công khai, chỉ bạn thấy trong khu quản lý. Bạn đổi lại bất cứ lúc nào.
              </span>
            </label>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={busy || !user || !!uploading}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-bold hover:scale-[0.98] transition-transform disabled:opacity-50">
              {busy ? '…' : editing ? 'Update' : 'Publish'}
            </button>
            {editing && (
              <button type="button" onClick={reset} className="px-6 py-2.5 rounded-lg text-sm border border-white/10 text-on-surface-variant hover:border-primary/50">Cancel</button>
            )}
          </div>
        </form>

        {/* My entries */}
        <div className="lg:col-span-2">
          <MyEntries
            items={mine}
            kindLabel={kindLabel}
            onToggle={togglePublish}
            onEdit={startEdit}
            onRemove={remove}
          />
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40';
const fileCls =
  'text-sm text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-on-primary file:text-sm file:font-bold';

// Compact, searchable entries list grouped by type with collapsible sections.
function MyEntries({ items, kindLabel, onToggle, onEdit, onRemove }) {
  const [q, setQ] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [collapsed, setCollapsed] = useState({}); // { [kind]: true }

  // Filter by search text + kind.
  const filtered = items.filter((c) => {
    if (kindFilter !== 'all' && c.kind !== kindFilter) return false;
    if (q.trim() && !(c.title || '').toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  });

  // Group the filtered rows by kind, preserving the kindLabel order.
  const order = Object.keys(kindLabel);
  const groups = order
    .map((k) => ({ kind: k, label: kindLabel[k], rows: filtered.filter((c) => c.kind === k) }))
    .filter((g) => g.rows.length > 0);

  // Kinds that actually exist in the data (for the filter chips).
  const presentKinds = order.filter((k) => items.some((c) => c.kind === k));

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h2 className="h-md">Your entries</h2>
        {items.length > 0 && (
          <span className="text-xs text-on-surface-variant">
            {filtered.length === items.length ? `${items.length} entries` : `${filtered.length} / ${items.length}`}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No entries yet.</p>
      ) : (
        <>
          {/* Search + type filter */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <span className="material-symbols-outlined text-base text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">search</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search entries…"
                className="w-full bg-surface-container-lowest border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button onClick={() => setKindFilter('all')}
              className={kindFilter === 'all'
                ? 'px-3 py-1 rounded-full text-xs bg-primary text-on-primary font-bold'
                : 'px-3 py-1 rounded-full text-xs border border-white/10 text-on-surface-variant hover:border-primary/50 transition-colors'}>
              All
            </button>
            {presentKinds.map((k) => (
              <button key={k} onClick={() => setKindFilter(k)}
                className={kindFilter === k
                  ? 'px-3 py-1 rounded-full text-xs bg-primary text-on-primary font-bold'
                  : 'px-3 py-1 rounded-full text-xs border border-white/10 text-on-surface-variant hover:border-primary/50 transition-colors'}>
                {kindLabel[k]} <span className="opacity-70">{items.filter((c) => c.kind === k).length}</span>
              </button>
            ))}
          </div>

          {groups.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No entries match.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((g) => {
                const isOpen = !collapsed[g.kind];
                return (
                  <div key={g.kind} className="glass-card rounded-card overflow-hidden">
                    <button
                      onClick={() => setCollapsed((s) => ({ ...s, [g.kind]: isOpen }))}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-white/[0.03] transition-colors"
                    >
                      <span className={`material-symbols-outlined text-base text-on-surface-variant transition-transform ${isOpen ? '' : '-rotate-90'}`}>expand_more</span>
                      <span className="text-xs uppercase tracking-wide text-secondary font-bold">{g.label}</span>
                      <span className="text-xs text-on-surface-variant">{g.rows.length}</span>
                    </button>
                    {isOpen && (
                      <div className="divide-y divide-white/10 border-t border-white/10">
                        {g.rows.map((c) => (
                          <div
                            key={`${c._table}-${c.id}`}
                            className="group flex items-center gap-3 px-4 py-2 hover:bg-white/[0.03] transition-colors"
                          >
                            <span
                              className={(c.published !== false ? 'bg-secondary' : 'bg-on-surface-variant/40') + ' h-2 w-2 rounded-full shrink-0'}
                              title={c.published !== false ? 'Công khai' : 'Ẩn'}
                            />
                            <h3 className="font-display text-sm font-medium truncate flex-1 min-w-0" title={c.title}>
                              {c.title}
                            </h3>
                            <div className="flex items-center gap-3 text-xs shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button onClick={() => onToggle(c)} className="text-on-surface-variant hover:text-on-surface hover:underline">
                                {c.published !== false ? 'Ẩn' : 'Công khai'}
                              </button>
                              <button onClick={() => onEdit(c)} className="text-primary hover:underline">Edit</button>
                              <button onClick={() => onRemove(c)} className="text-error hover:underline">Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-sm text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

function FileField({ label, accept, onChange, busy, done, doneLabel }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3 flex-wrap">
        <input type="file" accept={accept} onChange={onChange} disabled={busy} className={fileCls} />
        {busy && <span className="text-xs text-on-surface-variant">Uploading…</span>}
        {done && !busy && <span className="text-xs text-secondary">✓ {doneLabel || 'uploaded'}</span>}
      </div>
    </Field>
  );
}

// Editable list of paper authors, each with a name and a role
// (first / co / corresponding author).
function AuthorsEditor({ authors, onChange }) {
  const rows = authors || [];
  const update = (i, patch) => onChange(rows.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const add = () => onChange([...rows, { name: '', role: rows.length === 0 ? 'first' : 'co' }]);
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i));
  return (
    <div className="flex flex-col gap-2">
      {rows.length === 0 && (
        <p className="text-xs text-on-surface-variant">No authors yet — add the first author below.</p>
      )}
      {rows.map((a, i) => (
        <div key={i} className="flex items-center gap-2 flex-wrap">
          <input
            value={a.name || ''}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="Author name"
            className="flex-1 min-w-[140px] bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <select
            value={a.role || 'co'}
            onChange={(e) => update(i, { role: e.target.value })}
            className="bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            {AUTHOR_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button type="button" onClick={() => remove(i)}
            className="material-symbols-outlined text-base text-on-surface-variant hover:text-error" title="Remove author">close</button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="self-start inline-flex items-center gap-1 text-xs text-primary font-bold hover:gap-2 transition-all">
        <span className="material-symbols-outlined text-base">add</span> Add author
      </button>
    </div>
  );
}

// Pill multi-select used to draw the Foundation↔Research edges of the map.
function MapPicker({ options, selected, onToggle, emptyText }) {
  if (!options.length) return <p className="text-xs text-on-surface-variant">{emptyText}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button type="button" key={o.id} onClick={() => onToggle(o.id)}
            className={on
              ? 'px-3 py-1.5 rounded-full text-xs bg-primary text-on-primary font-bold'
              : 'px-3 py-1.5 rounded-full text-xs border border-white/10 text-on-surface-variant hover:border-primary/50'}>
            {o.title}
          </button>
        );
      })}
    </div>
  );
}