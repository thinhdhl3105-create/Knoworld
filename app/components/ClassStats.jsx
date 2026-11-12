'use client';

// v43: Classes by school — thống kê số lớp đã/đang dạy ở từng trường (dữ liệu từ Harbour board).
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchTeachingRows, classStatsBySchool, parseYmd } from '@/lib/island';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (s) => { const d = parseYmd(s); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const hrs = (m) => { const h = m / 60; return h >= 10 ? Math.round(h) : Math.round(h * 10) / 10; };

export default function ClassStats({ showIslandLink = false }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: '' });
  const [year, setYear] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    fetchTeachingRows().then((res) => {
      setRows(res.data);
      setStatus({ loading: false, error: res.ok ? '' : res.error || 'Could not load classes.' });
    });
  }, []);

  const years = useMemo(
    () => Array.from(new Set(rows.map((r) => String(r.date).slice(0, 4)))).sort().reverse(),
    [rows],
  );
  const { schools, totalClasses } = useMemo(() => classStatsBySchool(rows, year), [rows, year]);
  const max = Math.max(1, ...schools.map((s) => s.classes.length));
  const totals = schools.reduce(
    (t, s) => ({ sessions: t.sessions + s.sessions, minutes: t.minutes + s.minutes, active: t.active + s.active }),
    { sessions: 0, minutes: 0, active: 0 },
  );
  const tiles = [
    { label: 'Schools', value: schools.length, icon: 'school' },
    { label: 'Classes', value: totalClasses, icon: 'groups' },
    { label: 'Running now', value: totals.active, icon: 'play_circle' },
    { label: 'Sessions', value: totals.sessions, icon: 'event_available' },
    { label: 'Teaching hours', value: hrs(totals.minutes), icon: 'schedule' },
  ];
  const pill = (on) => (on
    ? 'px-4 py-1.5 rounded-full text-xs bg-primary text-on-primary font-bold'
    : 'px-4 py-1.5 rounded-full text-xs border border-white/10 text-on-surface-variant hover:border-primary/50 transition-colors');

  return (
    <section className="mb-6" aria-labelledby="kwClassStats">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <div>
          <h2 id="kwClassStats" className="h-md">Classes by school</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            From the Harbour board · a weekly series counts as one class · make-up sessions count toward their class
            {showIslandLink && <> · <Link href="/island" className="text-primary hover:underline">edit on Thinh&apos;s Island</Link></>}
          </p>
        </div>
        {years.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setYear(null)} className={pill(year === null)}>All time</button>
            {years.map((y) => (
              <button key={y} type="button" onClick={() => setYear(y)} className={pill(year === y)}>{y}</button>
            ))}
          </div>
        )}
      </div>

      {status.error && <p className="text-xs text-error mb-3">{status.error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {tiles.map((t) => (
          <div key={t.label} className="glass-card rounded-card p-5">
            <span className="material-symbols-outlined text-primary text-2xl" aria-hidden="true">{t.icon}</span>
            <p className="text-3xl font-display font-semibold mt-2 tabular-nums">{status.loading ? '–' : t.value}</p>
            <p className="label-sm text-on-surface-variant mt-1">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-card p-6">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h3 className="font-display text-base font-medium">Number of classes per school</h3>
          <span className="text-[11px] text-on-surface-variant">Tap a school to see its classes</span>
        </div>
        {status.loading ? (
          <p className="text-sm text-on-surface-variant">Counting classes…</p>
        ) : schools.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No teaching sessions yet. Add classes as “Teaching” on Thinh&apos;s Island and pick a school.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {schools.map((s) => {
              const isOpen = open === s.school;
              return (
                <div key={s.school}>
                  <button type="button" onClick={() => setOpen(isOpen ? null : s.school)} aria-expanded={isOpen}
                    className="w-full text-left rounded-lg px-2 py-2 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-sm w-28 sm:w-40 shrink-0 truncate font-medium" title={s.school}>{s.school}</span>
                      <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(s.classes.length / max) * 100}%` }} />
                      </div>
                      <span className="text-sm w-8 text-right tabular-nums font-semibold">{s.classes.length}</span>
                      <span className="material-symbols-outlined text-base text-on-surface-variant" aria-hidden="true">{isOpen ? 'expand_less' : 'expand_more'}</span>
                    </div>
                    <p className="mt-1 sm:ml-[172px] text-[11px] text-on-surface-variant">
                      {s.classes.length} class{s.classes.length === 1 ? '' : 'es'}
                      {s.active ? ` · ${s.active} running now` : ''}
                      {` · ${s.sessions} session${s.sessions === 1 ? '' : 's'} (${s.done} taught)`}
                      {` · ${hrs(s.minutes)} h`}
                      {s.cancelled ? ` · ${s.cancelled} cancelled` : ''}
                    </p>
                  </button>
                  {isOpen && (
                    <ul className="sm:ml-[180px] mt-1 mb-3 flex flex-col divide-y divide-white/10 border-l border-white/10 pl-3">
                      {s.classes.map((c) => (
                        <li key={c.key} className="py-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                          <span className="text-sm flex-1 min-w-0 truncate" title={c.title}>{c.title}</span>
                          <span className="text-[11px] text-on-surface-variant whitespace-nowrap tabular-nums">
                            {c.first === c.last ? fmt(c.first) : `${fmt(c.first)} – ${fmt(c.last)}`}
                            {` · ${c.sessions} session${c.sessions === 1 ? '' : 's'}`}
                            {c.makeup ? ` · ${c.makeup} make-up` : ''}
                            {c.cancelled ? ` · ${c.cancelled} cancelled` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
