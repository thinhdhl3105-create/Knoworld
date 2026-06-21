'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useAuth } from '../components/AuthProvider';

const empty = { kind: 'research', title: '', summary: '', body: '', category: '', tags: '', media_url: '', cover_url: '' };

export default function UploadPage() {
  const router = useRouter();
  const { user, loading: authLoading, configured } = useAuth();
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [mine, setMine] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user && configured) router.push('/login');
  }, [authLoading, user, configured, router]);

  async function loadMine() {
    if (!isSupabaseConfigured || !user) return;
    const { data } = await supabase
      .from('content')
      .select('*')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false });
    setMine(data || []);
  }
  useEffect(() => { loadMine(); }, [user]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  function reset() { setForm(empty); setEditingId(null); }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file || !isSupabaseConfigured || !user) return;
    setUploading(true);
    setError('');
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error: upErr } = await supabase.storage.from('uploads').upload(path, file, { upsert: false });
    if (upErr) { setError(upErr.message); setUploading(false); return; }
    const { data } = supabase.storage.from('uploads').getPublicUrl(path);
    set('cover_url', data.publicUrl);
    setUploading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!isSupabaseConfigured || !user) { setError('Cần đăng nhập và cấu hình Supabase.'); return; }
    if (!form.title.trim()) return;
    setBusy(true);
    const payload = {
      kind: form.kind,
      title: form.title.trim(),
      summary: form.summary.trim() || null,
      body: form.body.trim() || null,
      category: form.category.trim() || null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      media_url: form.media_url.trim() || null,
      cover_url: form.cover_url.trim() || null,
      author_id: user.id,
    };
    let res;
    if (editingId) res = await supabase.from('content').update(payload).eq('id', editingId);
    else res = await supabase.from('content').insert(payload);
    if (res.error) setError(res.error.message);
    else { reset(); loadMine(); }
    setBusy(false);
  }

  function startEdit(c) {
    setEditingId(c.id);
    setForm({
      kind: c.kind, title: c.title || '', summary: c.summary || '', body: c.body || '',
      category: c.category || '', tags: (c.tags || []).join(', '),
      media_url: c.media_url || '', cover_url: c.cover_url || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(id) {
    if (!confirm('Delete this entry?')) return;
    const { error } = await supabase.from('content').delete().eq('id', id);
    if (error) setError(error.message);
    else loadMine();
  }

  if (authLoading) return <div className="pt-32 px-5 max-w-container mx-auto text-on-surface-variant">Loading…</div>;

  return (
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-12 bg-primary" />
          <span className="label-sm text-secondary tracking-widest">Contributor Dashboard</span>
        </div>
        <h1 className="h-lg">{editingId ? 'Edit entry' : 'Publish to Knoworld'}</h1>
        {user && <p className="text-sm text-on-surface-variant mt-2">Signed in as {user.email}</p>}
        {!configured && (
          <div className="mt-4 glass-card rounded-card p-4 text-sm text-secondary">
            Supabase chưa cấu hình — thêm biến môi trường để bật lưu trữ thật.
          </div>
        )}
      </header>

      <div className="grid lg:grid-cols-5 gap-10">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 glass-card rounded-card p-6 md:p-8 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select value={form.kind} onChange={(e) => set('kind', e.target.value)} className={inputCls}>
                <option value="research">Research</option>
                <option value="student">Student Case Study</option>
                <option value="video">Video Case Study</option>
                <option value="note">Note</option>
              </select>
            </Field>
            <Field label="Category">
              <input value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls} placeholder="Cognitive Science" />
            </Field>
          </div>
          <Field label="Title *">
            <input required value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="Neural Resonances…" />
          </Field>
          <Field label="Summary">
            <textarea value={form.summary} onChange={(e) => set('summary', e.target.value)} rows={2} className={inputCls} placeholder="Short description…" />
          </Field>
          <Field label="Body">
            <textarea value={form.body} onChange={(e) => set('body', e.target.value)} rows={5} className={inputCls} placeholder="Full content…" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tags (comma separated)">
              <input value={form.tags} onChange={(e) => set('tags', e.target.value)} className={inputCls} placeholder="ai, ethics" />
            </Field>
            <Field label="Video / Media URL">
              <input value={form.media_url} onChange={(e) => set('media_url', e.target.value)} className={inputCls} placeholder="https://youtube.com/embed/…" />
            </Field>
          </div>
          <Field label="Cover image">
            <div className="flex items-center gap-3">
              <input type="file" accept="image/*" onChange={handleFile} disabled={!user || uploading}
                className="text-sm text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-on-primary file:text-sm file:font-bold" />
              {uploading && <span className="text-xs text-on-surface-variant">Uploading…</span>}
            </div>
          </Field>
          {form.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.cover_url} alt="cover preview" className="rounded-lg max-h-40 object-cover border border-white/10" />
          )}

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={busy || !user}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-bold hover:scale-[0.98] transition-transform disabled:opacity-50">
              {busy ? '…' : editingId ? 'Update' : 'Publish'}
            </button>
            {editingId && (
              <button type="button" onClick={reset}
                className="px-6 py-2.5 rounded-lg text-sm border border-white/10 text-on-surface-variant hover:border-primary/50">
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* My entries */}
        <div className="lg:col-span-2">
          <h2 className="h-md mb-4">Your entries</h2>
          {mine.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No entries yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {mine.map((c) => (
                <div key={c.id} className="glass-card rounded-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="label-sm text-secondary">{c.kind}</span>
                      <h3 className="font-display text-base font-medium mt-1">{c.title}</h3>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-3 text-sm">
                    <button onClick={() => startEdit(c)} className="text-primary hover:underline">Edit</button>
                    <button onClick={() => remove(c.id)} className="text-error hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40';

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-sm text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}
