'use client';

// v18 — Admin > Access:
//   1) Danh sách MSSV được duyệt (dán tay hoặc upload Excel/CSV)
//   2) Chọn tối đa 5 case (video/image) cho Guest (stranger) xem
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '../../components/RequireAuth';
import { useAuth } from '../../components/AuthProvider';
import {
  fetchApprovedStudents,
  addApprovedStudents,
  removeApprovedStudent,
  parseStudentList,
  loadFeaturedCaseIds,
  saveFeaturedCaseIds,
  STRANGER_CASE_LIMIT,
} from '@/lib/access';
import { downloadStudentTemplate, parseStudentFile } from '@/lib/studentSheet';
import { fetchContent } from '@/lib/content';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';

function AccessInner() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  // ---- Approved students ----------------------------------------------------
  const [students, setStudents] = useState([]);
  const [pasteText, setPasteText] = useState('');
  const [stuBusy, setStuBusy] = useState(false);
  const [stuMsg, setStuMsg] = useState('');
  const [stuErr, setStuErr] = useState('');
  const [stuQuery, setStuQuery] = useState('');
  const fileRef = useRef(null);

  // ---- Featured cases for guests ---------------------------------------------
  const [cases, setCases] = useState([]);
  const [selected, setSelected] = useState([]); // array of ids (max 5)
  const [caseBusy, setCaseBusy] = useState(false);
  const [caseMsg, setCaseMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      fetchApprovedStudents(),
      fetchContent('video'),
      fetchContent('image'),
      loadFeaturedCaseIds(),
    ]).then(([stu, vids, imgs, featured]) => {
      if (stu.error) setStuErr(stu.error);
      setStudents(stu.data || []);
      setCases([
        ...(vids.data || []).map((c) => ({ ...c, _kind: 'Video' })),
        ...(imgs.data || []).map((c) => ({ ...c, _kind: 'Image' })),
      ]);
      setSelected(featured.map(String));
      setLoading(false);
    });
  }, [isAdmin]);

  const filteredStudents = useMemo(() => {
    const term = stuQuery.trim().toLowerCase();
    if (!term) return students;
    return students.filter(
      (s) =>
        s.student_id.toLowerCase().includes(term) ||
        (s.full_name || '').toLowerCase().includes(term)
    );
  }, [students, stuQuery]);

  async function importRows(rows) {
    if (!rows.length) {
      setStuErr('No valid student IDs found.');
      setStuBusy(false);
      return;
    }
    setStuBusy(true);
    setStuErr('');
    setStuMsg('');
    const res = await addApprovedStudents(rows);
    if (!res.ok) {
      setStuErr(res.error || 'Import failed.');
    } else {
      setStuMsg(`Added / updated ${res.count} student ID${res.count > 1 ? 's' : ''}.`);
      setPasteText('');
      const fresh = await fetchApprovedStudents();
      setStudents(fresh.data || []);
    }
    setStuBusy(false);
  }

  function handlePasteImport() {
    importRows(parseStudentList(pasteText));
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phép chọn lại cùng file
    if (!file) return;
    setStuBusy(true);
    setStuErr('');
    setStuMsg('');
    try {
      const rows = await parseStudentFile(file); // Excel (.xlsx/.xls) hoặc CSV/TXT
      await importRows(rows);
    } catch (err) {
      setStuBusy(false);
      setStuErr('Could not read the file. Use the Excel template or a CSV/TXT list.');
    }
  }

  async function handleDownloadTemplate() {
    try {
      await downloadStudentTemplate();
    } catch (err) {
      setStuErr('Could not generate the Excel template.');
    }
  }

  async function handleRemove(id) {
    if (!confirm(`Remove ${id} from the approved list?`)) return;
    const res = await removeApprovedStudent(id);
    if (res.ok) setStudents((prev) => prev.filter((s) => s.student_id !== id));
    else alert(res.error || 'Could not remove.');
  }

  function toggleCase(id) {
    const sid = String(id);
    setCaseMsg('');
    setSelected((prev) => {
      if (prev.includes(sid)) return prev.filter((x) => x !== sid);
      if (prev.length >= STRANGER_CASE_LIMIT) return prev; // đủ 5 rồi
      return [...prev, sid];
    });
  }

  async function handleSaveCases() {
    setCaseBusy(true);
    setCaseMsg('');
    const { error } = await saveFeaturedCaseIds(selected);
    setCaseBusy(false);
    setCaseMsg(error ? `Save failed: ${error}` : 'Saved. Guests now see these cases.');
  }

  if (!isAdmin) {
    return (
      <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16 text-center">
        <div className="glass-card rounded-card p-10 max-w-md mx-auto">
          <span className="material-symbols-outlined text-primary text-4xl mb-3">admin_panel_settings</span>
          <h1 className="h-md mb-2">Admins only</h1>
          <p className="text-sm text-on-surface-variant mb-6">Only the admin account can view this page.</p>
          <Link href="/" className="inline-block bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-bold">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-12 bg-primary" />
          <span className="label-sm text-secondary tracking-widest">Admin</span>
          <Link href="/admin/visitors" className="ml-auto text-sm text-on-surface-variant hover:text-primary">
            → Visitors
          </Link>
        </div>
        <h1 className="h-xl mb-3">Access control</h1>
        <p className="text-on-surface-variant max-w-2xl">
          Manage the approved student list (MSSV) and choose which case studies guests can preview.
        </p>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* 1) Approved students                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-14">
        <h2 className="h-md mb-1">Approved students (MSSV)</h2>
        <p className="text-sm text-on-surface-variant mb-5">
          Only these student IDs can register as a student. {students.length} on the list.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card rounded-card p-5">
            <p className="text-sm font-medium mb-2">Paste a list</p>
            <p className="text-xs text-on-surface-variant mb-3">
              One student per line — <code>MSSV</code> or <code>MSSV, Full name</code>.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={6}
              placeholder={'2153001, Nguyen Van A\n2153002, Tran Thi B\n2153003'}
              className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 font-mono"
            />
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handlePasteImport}
                disabled={stuBusy || !pasteText.trim()}
                className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-40"
              >
                {stuBusy ? 'Importing…' : 'Add to list'}
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={stuBusy}
                className="border border-white/15 px-5 py-2 rounded-lg text-sm text-on-surface-variant hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-40"
              >
                Upload Excel / CSV
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={handleFile}
                className="hidden"
              />
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-on-surface-variant mb-2">
                Prefer a spreadsheet? Download the Excel template (columns{' '}
                <code>MSSV</code> and <code>Họ tên</code>), fill it in, then upload it back.
              </p>
              <button
                onClick={handleDownloadTemplate}
                disabled={stuBusy}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-base">download</span>
                Download Excel template (.xlsx)
              </button>
            </div>

            {stuMsg && <p className="text-xs text-emerald-400 mt-3">{stuMsg}</p>}
            {stuErr && <p className="text-xs text-error mt-3">{stuErr}</p>}
          </div>

          <div className="glass-card rounded-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-on-surface-variant text-xl">search</span>
              <input
                value={stuQuery}
                onChange={(e) => setStuQuery(e.target.value)}
                placeholder="Search MSSV or name…"
                className="flex-1 bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant/60"
              />
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-on-surface-variant py-6 text-center">
                  {students.length === 0 ? 'No student IDs yet — paste or upload a list.' : 'No matches.'}
                </p>
              ) : (
                filteredStudents.map((s) => (
                  <div key={s.student_id} className="flex items-center gap-3 py-2">
                    <span className="font-mono text-sm text-on-surface">{s.student_id}</span>
                    <span className="text-sm text-on-surface-variant flex-1 truncate">{s.full_name || ''}</span>
                    <button
                      onClick={() => handleRemove(s.student_id)}
                      className="material-symbols-outlined text-base text-on-surface-variant/60 hover:text-error"
                      title="Remove"
                    >
                      delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2) Guest preview cases                                              */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <h2 className="h-md mb-1">Guest preview cases</h2>
        <p className="text-sm text-on-surface-variant mb-5">
          Pick up to {STRANGER_CASE_LIMIT} video / image case studies that guests can view
          ({selected.length}/{STRANGER_CASE_LIMIT} selected). If none are picked, the {STRANGER_CASE_LIMIT} newest
          cases are shown instead.
        </p>

        {loading ? (
          <p className="text-on-surface-variant">Loading…</p>
        ) : cases.length === 0 ? (
          <p className="text-on-surface-variant glass-card rounded-card p-8 text-center">
            No video or image case studies yet.
          </p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {cases.map((c) => {
                const sid = String(c.id);
                const on = selected.includes(sid);
                const full = !on && selected.length >= STRANGER_CASE_LIMIT;
                return (
                  <button
                    key={sid}
                    onClick={() => toggleCase(c.id)}
                    disabled={full}
                    className={`text-left glass-card rounded-card p-4 flex items-start gap-3 transition-colors ${
                      on ? 'border border-primary/70' : 'border border-transparent hover:border-primary/30'
                    } ${full ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span className={`material-symbols-outlined mt-0.5 ${on ? 'text-primary' : 'text-outline'}`}>
                      {on ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">{c.title}</span>
                      <span className="block text-xs text-on-surface-variant mt-0.5">
                        {c._kind}
                        {c.brand ? ` · ${c.brand}` : ''}
                        {c.category ? ` · ${c.category}` : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSaveCases}
                disabled={caseBusy}
                className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-bold disabled:opacity-40"
              >
                {caseBusy ? 'Saving…' : 'Save guest cases'}
              </button>
              {caseMsg && (
                <p className={`text-xs ${caseMsg.startsWith('Save failed') ? 'text-error' : 'text-emerald-400'}`}>
                  {caseMsg}
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default function AdminAccessPage() {
  return (
    <RequireAuth>
      <AccessInner />
    </RequireAuth>
  );
}
