'use client';

// v23: Nhập concept hàng loạt từ Excel (mẫu) / PowerPoint (.pptx) / Word (.docx).
// Đọc file -> bảng xem trước (sửa được) -> lưu vào concepts + concept_links.
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  parseConceptFile,
  addMentionLinks,
  downloadConceptTemplate,
  exportConceptRows,
  normTitle,
  CLAUDE_PROMPT,
} from '@/lib/conceptImport';
import RequireAuth from '../../components/RequireAuth';
import { useAuth } from '../../components/AuthProvider';
import CityPage from '../../components/city/CityPage';

const inputCls =
  'w-full bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40';
const cellCls =
  'w-full bg-transparent border border-transparent hover:border-white/10 rounded-md px-2 py-1.5 text-sm focus:border-primary focus:bg-surface-container-lowest focus:outline-none';

const splitTags = (s) => (s || '').split(',').map((t) => t.trim()).filter(Boolean);
const splitRel = (s) => (s || '').split(';').map((t) => t.trim()).filter(Boolean);
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

function ImportInner() {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [info, setInfo] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [parsing, setParsing] = useState(false);
  const [existing, setExisting] = useState([]); // [{id,title,category}]
  const [existingLinks, setExistingLinks] = useState([]);
  const [opts, setOpts] = useState({
    includeNotes: true,
    linkSequential: true,
    linkHierarchy: true,
    linkMentions: true,
    docxLevel: 'auto',
  });
  const [defCategory, setDefCategory] = useState('');
  const [extraTags, setExtraTags] = useState('');
  const [published, setPublished] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { concepts, links, missing, ids }
  const [copied, setCopied] = useState(false);

  const loadExisting = async () => {
    if (!isSupabaseConfigured) return;
    const [c, l] = await Promise.all([
      supabase.from('concepts').select('id,title,category'),
      supabase.from('concept_links').select('source_id,target_id'),
    ]);
    setExisting(c.data || []);
    setExistingLinks(l.data || []);
  };
  useEffect(() => { loadExisting(); }, []);

  const existingByNorm = useMemo(() => {
    const m = new Map();
    existing.forEach((c) => m.set(normTitle(c.title), c));
    return m;
  }, [existing]);
  const categories = useMemo(
    () => Array.from(new Set(existing.map((c) => (c.category || '').trim()).filter(Boolean))).sort(),
    [existing]
  );

  const kind = useMemo(() => {
    const n = (file?.name || '').toLowerCase();
    if (n.endsWith('.pptx')) return 'pptx';
    if (n.endsWith('.docx')) return 'docx';
    return n ? 'sheet' : '';
  }, [file]);

  // Đọc (lại) file khi chọn file hoặc đổi tuỳ chọn đọc.
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    setParsing(true);
    setError('');
    setResult(null);
    parseConceptFile(file, opts)
      .then((res) => {
        if (cancelled) return;
        let out = res.rows || [];
        if (opts.linkMentions && kind !== 'sheet') {
          out = addMentionLinks(out, existing.map((c) => c.title));
        }
        // Concept đã có trên web -> mặc định bỏ qua.
        out = out.map((r) => {
          const ex = existingByNorm.get(normTitle(r.title));
          return ex ? { ...r, include: false, exists: true } : r;
        });
        setRows(out);
        setInfo(res.info || '');
        setDocTitle(res.docTitle || '');
      })
      .catch((e) => {
        if (!cancelled) {
          setRows([]);
          setInfo('');
          setError(`Không đọc được file: ${e?.message || e}`);
        }
      })
      .finally(() => !cancelled && setParsing(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, opts.includeNotes, opts.linkSequential, opts.linkHierarchy, opts.linkMentions, opts.docxLevel, existing.length]);

  const setRow = (i, patch) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  // Trùng tên trong chính file.
  const dupSet = useMemo(() => {
    const seen = new Map();
    rows.forEach((r, i) => {
      if (!r.include) return;
      const n = normTitle(r.title);
      seen.set(n, [...(seen.get(n) || []), i]);
    });
    return new Set([...seen.values()].filter((v) => v.length > 1).flat());
  }, [rows]);

  const selected = rows.filter((r) => r.include && r.title.trim());
  // Đếm liên kết duy nhất (A–B và B–A tính 1) để hiển thị.
  const linkCount = useMemo(() => {
    const keys = new Set();
    selected.forEach((r) => {
      const a = normTitle(r.title);
      r.related.forEach((rel) => {
        const b = normTitle(rel);
        if (b && b !== a) keys.add(a < b ? `${a}|${b}` : `${b}|${a}`);
      });
    });
    return keys.size;
  }, [selected]);

  async function handleImport() {
    setError('');
    if (!isSupabaseConfigured || !user) { setError('Cần đăng nhập và cấu hình Supabase.'); return; }
    if (!selected.length) return;
    if (dupSet.size) { setError('Có concept trùng tên trong danh sách — hãy đổi tên hoặc bỏ chọn bớt.'); return; }
    setBusy(true);
    const tagsExtra = splitTags(extraTags);
    const payloads = selected.map((r) => ({
      title: r.title.trim(),
      summary: (r.summary || '').trim() || null,
      body: (r.body || '').trim() || null,
      category: (r.category || '').trim() || defCategory.trim() || null,
      tags: Array.from(new Set([...(r.tags || []), ...tagsExtra])),
      author_id: user.id,
      published,
    }));

    const inserted = [];
    for (const part of chunk(payloads, 50)) {
      const { data, error: e } = await supabase.from('concepts').insert(part).select('id,title');
      if (e) {
        setError(`Lỗi khi lưu concept: ${e.message}${inserted.length ? ` (đã lưu ${inserted.length} concept trước đó)` : ''}`);
        setBusy(false);
        if (inserted.length) setResult({ concepts: inserted.length, links: 0, missing: [], ids: inserted.map((x) => x.id) });
        return;
      }
      inserted.push(...(data || []));
    }

    // Liên kết: theo tên, gồm cả concept đã có trên web.
    const idByNorm = new Map(existing.map((c) => [normTitle(c.title), c.id]));
    inserted.forEach((c) => idByNorm.set(normTitle(c.title), c.id));
    const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    const seen = new Set(existingLinks.map((l) => pairKey(l.source_id, l.target_id)));
    const linkRows = [];
    const missing = new Set();
    selected.forEach((r) => {
      const src = idByNorm.get(normTitle(r.title));
      r.related.forEach((rel) => {
        const tgt = idByNorm.get(normTitle(rel));
        if (!tgt) { missing.add(rel); return; }
        if (!src || tgt === src) return;
        const k = pairKey(src, tgt);
        if (seen.has(k)) return;
        seen.add(k);
        linkRows.push({ source_id: src, target_id: tgt, author_id: user.id });
      });
    });
    let linksSaved = 0;
    for (const part of chunk(linkRows, 100)) {
      const { error: e } = await supabase.from('concept_links').insert(part);
      if (e) { setError(`Đã lưu concept nhưng lỗi khi lưu liên kết: ${e.message}`); break; }
      linksSaved += part.length;
    }

    setResult({ concepts: inserted.length, links: linksSaved, missing: [...missing], ids: inserted.map((x) => x.id) });
    setBusy(false);
    setRows([]);
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    loadExisting();
  }

  async function handleUndo() {
    if (!result?.ids?.length) return;
    setBusy(true);
    let failed = false;
    for (const part of chunk(result.ids, 100)) {
      const { error: e } = await supabase.from('concepts').delete().in('id', part).eq('author_id', user.id);
      if (e) { setError(`Không hoàn tác được: ${e.message}`); failed = true; break; }
    }
    setBusy(false);
    if (!failed) {
      setResult(null);
      setInfo('Đã hoàn tác lần nhập vừa rồi.');
      loadExisting();
    }
  }

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(CLAUDE_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const Opt = ({ k, label, hint }) => (
    <label className="flex items-start gap-2 text-sm cursor-pointer">
      <input type="checkbox" className="mt-0.5 accent-[var(--color-primary,#c6bfff)]" checked={!!opts[k]}
        onChange={(e) => setOpts((o) => ({ ...o, [k]: e.target.checked }))} />
      <span>
        {label}
        {hint && <span className="block text-xs text-on-surface-variant">{hint}</span>}
      </span>
    </label>
  );

  return (
<CityPage place="import" title="Nhập concept từ file" subtitle="Tải lên slide (.pptx), Word (.docx) hoặc Excel theo mẫu — web đọc ra danh sách concept để bạn xem, sửa rồi lưu cả loạt vào bản đồ.">
      <header className="mb-10">
        <Link href="/knowledge-hub" className="text-sm text-on-surface-variant hover:text-primary inline-flex items-center gap-1 mb-6">
          <span className="material-symbols-outlined text-base">arrow_back</span> Knowledge Hub
        </Link>
        <p className="text-lg text-on-surface-variant max-w-3xl leading-relaxed">
          Tải lên slide PowerPoint (.pptx), tài liệu Word (.docx) hoặc file Excel theo mẫu. Web đọc ra danh sách
          concept để bạn xem, sửa, rồi lưu cả loạt vào bản đồ kiến thức.
        </p>
      </header>

      {result && (
        <section className="glass-card rounded-card p-6 mb-8 border border-primary/30">
          <p className="font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">check_circle</span>
            Đã nhập {result.concepts} concept và {result.links} liên kết.
          </p>
          {result.missing.length > 0 && (
            <p className="text-xs text-on-surface-variant mt-2">
              Không tìm thấy concept để nối: {result.missing.slice(0, 8).join(', ')}
              {result.missing.length > 8 ? `… (+${result.missing.length - 8})` : ''}
            </p>
          )}
          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/knowledge-hub" className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-bold">
              Xem bản đồ
            </Link>
            <button onClick={handleUndo} disabled={busy}
              className="px-5 py-2 rounded-lg text-sm font-bold border border-white/10 text-on-surface-variant hover:border-error/50 hover:text-error transition-colors disabled:opacity-40">
              Hoàn tác lần nhập này
            </button>
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Chọn file */}
        <section className="glass-card rounded-card p-6 lg:col-span-2">
          <h2 className="h-md mb-4">1. Chọn file</h2>
          <label
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/15 rounded-card py-10 px-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
          >
            <span className="material-symbols-outlined text-4xl text-primary">upload_file</span>
            <span className="text-sm font-bold">{file ? file.name : 'Kéo thả hoặc bấm để chọn file'}</span>
            <span className="text-xs text-on-surface-variant">.pptx · .docx · .xlsx · .csv</span>
            <input ref={fileRef} type="file" accept=".pptx,.docx,.xlsx,.xls,.csv,.ppt,.doc" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>

          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            <label className="flex flex-col gap-1.5">
              <span className="label-sm text-on-surface-variant">Nhóm (category) mặc định</span>
              <input list="kw-cats" value={defCategory} onChange={(e) => setDefCategory(e.target.value)}
                className={inputCls} placeholder="vd. E-Business" />
              <datalist id="kw-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              <span className="text-xs text-on-surface-variant">Dùng cho dòng chưa có nhóm. Mỗi nhóm là một bản đồ riêng.</span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label-sm text-on-surface-variant">Thêm tag cho tất cả</span>
              <input value={extraTags} onChange={(e) => setExtraTags(e.target.value)} className={inputCls}
                placeholder="vd. Buổi 3, HK1 2026" />
              {docTitle && (
                <button type="button" onClick={() => setExtraTags((t) => (t ? `${t}, ${docTitle}` : docTitle))}
                  className="text-xs text-left text-primary hover:underline">
                  + Dùng tên bài “{docTitle.length > 50 ? `${docTitle.slice(0, 50)}…` : docTitle}” làm tag
                </button>
              )}
            </label>
          </div>
        </section>

        {/* Tuỳ chọn + mẫu */}
        <section className="glass-card rounded-card p-6 flex flex-col gap-4">
          <h2 className="h-md">Tuỳ chọn đọc</h2>
          {kind === 'pptx' && <Opt k="includeNotes" label="Lấy cả ghi chú (speaker notes)" />}
          {kind === 'docx' && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm">Mỗi concept là một</span>
                <select value={opts.docxLevel} onChange={(e) => setOpts((o) => ({ ...o, docxLevel: e.target.value }))} className={inputCls}>
                  <option value="auto">Tự chọn</option>
                  <option value="1">Heading 1</option>
                  <option value="2">Heading 2 (Heading 1 làm concept cha)</option>
                  <option value="3">Heading 3</option>
                </select>
              </label>
              <Opt k="linkHierarchy" label="Nối concept con với concept cha" />
            </>
          )}
          {kind && kind !== 'sheet' && (
            <>
              <Opt k="linkSequential" label="Nối theo thứ tự trong bài" hint="Concept sau nối với concept liền trước." />
              <Opt k="linkMentions" label="Nối khi nội dung nhắc tên concept khác" hint="Kể cả concept đã có trên web." />
              <p className="text-xs text-on-surface-variant">Đổi tuỳ chọn sẽ đọc lại file (mất phần đã sửa).</p>
            </>
          )}
          {kind === 'sheet' && <p className="text-sm text-on-surface-variant">File Excel được đọc đúng theo các cột của mẫu.</p>}
          {!kind && <p className="text-sm text-on-surface-variant">Chọn file để xem tuỳ chọn.</p>}

          <div className="border-t border-white/10 pt-4 flex flex-col gap-2">
            <p className="text-sm font-bold">Muốn tóm tắt kỹ hơn?</p>
            <p className="text-xs text-on-surface-variant">
              Tải file mẫu, nhờ Claude đọc slide và điền vào mẫu, rồi tải file đó lên đây.
            </p>
            <button onClick={downloadConceptTemplate}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-white/10 hover:border-primary/50 transition-colors">
              <span className="material-symbols-outlined text-base">download</span> Tải file Excel mẫu
            </button>
            <button onClick={copyPrompt}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-white/10 hover:border-primary/50 transition-colors">
              <span className="material-symbols-outlined text-base">{copied ? 'check' : 'content_copy'}</span>
              {copied ? 'Đã copy lời nhắc' : 'Copy lời nhắc cho Claude'}
            </button>
          </div>
        </section>
      </div>

      {/* Xem trước */}
      {(parsing || info || error || rows.length > 0) && (
        <section className="glass-card rounded-card p-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="h-md">2. Xem trước & chỉnh sửa</h2>
              <p className="text-sm text-on-surface-variant mt-1">{parsing ? 'Đang đọc file…' : info}</p>
            </div>
            {rows.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setRows((rs) => rs.map((r) => (r.exists ? r : { ...r, include: true })))}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 hover:border-primary/50">Chọn hết</button>
                <button onClick={() => setRows((rs) => rs.map((r) => ({ ...r, include: false })))}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 hover:border-primary/50">Bỏ chọn hết</button>
                <button onClick={() => exportConceptRows(rows)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 hover:border-primary/50 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">table_view</span> Tải bảng ra Excel
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-error text-sm mb-4">{error}</p>}

          {rows.length > 0 && (
            <>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="text-left label-sm text-on-surface-variant border-b border-white/10">
                      <th className="p-2 w-8" />
                      <th className="p-2 w-[24%]">Concept</th>
                      <th className="p-2">Tóm tắt</th>
                      <th className="p-2 w-[13%]">Nhóm</th>
                      <th className="p-2 w-[13%]">Tags</th>
                      <th className="p-2 w-[18%]">Liên kết với ( ; )</th>
                      <th className="p-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <FragmentRow key={i}>
                        <tr className={`border-b border-white/5 align-top ${r.include ? '' : 'opacity-50'}`}>
                          <td className="p-2 pt-3">
                            <input type="checkbox" checked={r.include} disabled={r.exists}
                              onChange={(e) => setRow(i, { include: e.target.checked })} />
                          </td>
                          <td className="p-1">
                            <input value={r.title} onChange={(e) => setRow(i, { title: e.target.value })} className={`${cellCls} font-medium`} />
                            <p className="px-2 text-[11px] text-on-surface-variant">
                              {r.note}
                              {r.exists && <span className="text-secondary"> · đã có trên web</span>}
                              {dupSet.has(i) && <span className="text-error"> · trùng tên</span>}
                            </p>
                          </td>
                          <td className="p-1">
                            <textarea value={r.summary} rows={2} onChange={(e) => setRow(i, { summary: e.target.value })} className={`${cellCls} resize-y`} />
                          </td>
                          <td className="p-1">
                            <input value={r.category} placeholder={defCategory || '—'} onChange={(e) => setRow(i, { category: e.target.value })} className={cellCls} />
                          </td>
                          <td className="p-1">
                            <input value={r.tags.join(', ')} onChange={(e) => setRow(i, { tags: splitTags(e.target.value) })} className={cellCls} />
                          </td>
                          <td className="p-1">
                            <textarea value={r.related.join('; ')} rows={2}
                              onChange={(e) => setRow(i, { related: splitRel(e.target.value) })} className={`${cellCls} resize-y`} />
                          </td>
                          <td className="p-2 pt-3">
                            <button onClick={() => setExpanded(expanded === i ? null : i)} title="Nội dung chi tiết"
                              className="material-symbols-outlined text-on-surface-variant hover:text-primary text-lg">
                              {expanded === i ? 'expand_less' : 'notes'}
                            </button>
                          </td>
                        </tr>
                        {expanded === i && (
                          <tr className="border-b border-white/5">
                            <td />
                            <td colSpan={6} className="p-2">
                              <span className="label-sm text-on-surface-variant">Nội dung chi tiết</span>
                              <textarea value={r.body} rows={8} onChange={(e) => setRow(i, { body: e.target.value })}
                                className={`${inputCls} mt-2 font-mono text-xs`} />
                            </td>
                          </tr>
                        )}
                      </FragmentRow>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
                  Công khai ngay trên Knowledge Hub
                </label>
                <button onClick={handleImport} disabled={busy || !selected.length}
                  className="bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-bold hover:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100">
                  {busy ? 'Đang lưu…' : `Nhập ${selected.length} concept · ${linkCount} liên kết`}
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </CityPage>
  );
}

function FragmentRow({ children }) {
  return <>{children}</>;
}

export default function ImportConceptsPage() {
  return (
    <RequireAuth>
      <ImportInner />
    </RequireAuth>
  );
}
