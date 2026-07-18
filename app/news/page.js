'use client';

// News — cập nhật thông tin thị trường (crisis, market update, trend…).
// Ai cũng xem được. Chỉ admin thấy form thêm tin và nút xoá.
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import {
  fetchNews,
  addNews,
  deleteNews,
  NEWS_CATEGORIES,
  categoryMeta,
  sourceHost,
} from '@/lib/news';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';

function CategoryBadge({ category }) {
  const m = categoryMeta(category);
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ color: m.color, backgroundColor: `${m.color}22` }}
    >
      <span className="material-symbols-outlined text-sm leading-none">{m.icon}</span>
      {m.label}
    </span>
  );
}

function AdminForm({ user, onAdded }) {
  const thisYear = new Date().getFullYear();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [year, setYear] = useState(String(thisYear));
  const [category, setCategory] = useState('market');
  const [summary, setSummary] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    const res = await addNews({ title, url, year, category, summary, user });
    setSending(false);
    if (!res.ok) {
      setError(res.error || 'Could not add the news item.');
      return;
    }
    setTitle('');
    setUrl('');
    setSummary('');
    setYear(String(thisYear));
    setCategory('market');
    setOpen(false);
    onAdded();
  };

  return (
    <div className="mb-10">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-bold hover:scale-95 transition-transform"
      >
        <span className="material-symbols-outlined text-base">{open ? 'close' : 'add'}</span>
        {open ? 'Cancel' : 'Add News'}
      </button>

      {open && (
        <form onSubmit={submit} className="glass-card rounded-card p-6 mt-4 flex flex-col gap-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title"
            maxLength={300}
            className="bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Article link (paste the website URL)"
            className="bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="Year"
              inputMode="numeric"
              className="sm:w-32 bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex-1 bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              {NEWS_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Short summary (optional)…"
            rows={3}
            maxLength={1000}
            className="bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 resize-y"
          />
          <div className="flex items-center justify-end gap-3">
            {error && <p className="text-sm text-red-400 mr-auto">{error}</p>}
            <button
              type="submit"
              disabled={sending || !title.trim() || !url.trim()}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-bold hover:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? 'Adding…' : 'Publish'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function NewsCard({ item, isAdmin, onDeleted }) {
  const host = sourceHost(item.url);

  const remove = async () => {
    if (!window.confirm('Delete this news item?')) return;
    const res = await deleteNews(item.id);
    if (res.ok) onDeleted();
  };

  return (
    <article className="glass-card rounded-card p-6 flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <CategoryBadge category={item.category} />
        {item.year && (
          <span className="text-xs font-bold text-on-surface-variant bg-white/5 px-2.5 py-0.5 rounded-full">
            {item.year}
          </span>
        )}
        {host && <span className="text-xs text-on-surface-variant/70">{host}</span>}
        {isAdmin && (
          <button
            onClick={remove}
            className="ml-auto inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-red-400 transition-colors"
            title="Delete"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
        )}
      </div>

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-2"
      >
        <h2 className="font-display text-lg font-medium leading-snug group-hover:text-primary transition-colors">
          {item.title}
        </h2>
        <span className="material-symbols-outlined text-base text-on-surface-variant group-hover:text-primary transition-colors mt-1">
          open_in_new
        </span>
      </a>

      {item.summary && (
        <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
          {item.summary}
        </p>
      )}
    </article>
  );
}

export default function NewsPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = () => {
    fetchNews().then(({ data }) => {
      setItems(data);
      setLoading(false);
    });
  };

  useEffect(load, []);

  // Chỉ hiện nhãn nào thực sự có tin, để bộ lọc gọn gàng.
  const availableCats = useMemo(() => {
    const present = new Set(items.map((i) => i.category));
    return NEWS_CATEGORIES.filter((c) => present.has(c.key));
  }, [items]);

  const shown = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((i) => i.category === filter);
  }, [items, filter]);

  return (
    <div className="pt-32 pb-24 max-w-4xl mx-auto px-5 md:px-8">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-12 bg-primary" />
          <span className="label-sm text-secondary tracking-widest">Market</span>
        </div>
        <h1 className="h-xl mb-4">News</h1>
        <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
          Curated market updates — crises, regulatory changes, and the latest moves shaping the
          industry. Tap any headline to read the full article at the source.
        </p>
      </header>

      {isAdmin && <AdminForm user={user} onAdded={load} />}

      {/* Bộ lọc theo nhãn */}
      {availableCats.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <button
            onClick={() => setFilter('all')}
            className={
              filter === 'all'
                ? 'px-4 py-1.5 rounded-full text-sm bg-primary text-on-primary font-bold'
                : 'px-4 py-1.5 rounded-full text-sm border border-white/10 text-on-surface-variant hover:border-primary/50 transition-colors'
            }
          >
            All
          </button>
          {availableCats.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={
                filter === c.key
                  ? 'px-4 py-1.5 rounded-full text-sm bg-primary text-on-primary font-bold inline-flex items-center gap-1'
                  : 'px-4 py-1.5 rounded-full text-sm border border-white/10 text-on-surface-variant hover:border-primary/50 transition-colors inline-flex items-center gap-1'
              }
            >
              <span className="material-symbols-outlined text-base">{c.icon}</span>
              {c.label}
            </button>
          ))}
          <span className="ml-auto label-sm text-on-surface-variant">
            {shown.length} item{shown.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {loading ? (
        <p className="text-on-surface-variant">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-on-surface-variant glass-card rounded-card p-8 text-center">
          {items.length === 0
            ? 'No news yet — check back soon.'
            : 'No news in this category.'}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {shown.map((item) => (
            <NewsCard key={item.id} item={item} isAdmin={isAdmin} onDeleted={load} />
          ))}
        </div>
      )}
    </div>
  );
}
