'use client';

import { useState } from 'react';

// Interactive, concept-map-style viewer for a framework's ordered steps.
// Left rail = numbered step "nodes" you click; right panel reveals only the
// selected step's explanation plus its related sub-steps (each explained).
// steps: [{ title, body, substeps: [{ title, body }] }]
export default function FrameworkSteps({ steps }) {
  const rows = Array.isArray(steps) ? steps : [];
  // Nothing selected at first — the user "points" at a step to reveal it.
  const [active, setActive] = useState(null);
  if (!rows.length) return null;

  const sel = active != null ? rows[active] : null;
  const subs = sel && Array.isArray(sel.substeps) ? sel.substeps : [];

  return (
    <div className="grid md:grid-cols-[minmax(0,260px)_1fr] gap-5">
      {/* Step rail — the "nodes". Click one to reveal its content. */}
      <ol className="flex flex-col gap-2">
        {rows.map((s, i) => {
          const on = i === active;
          const count = Array.isArray(s.substeps) ? s.substeps.length : 0;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => setActive(on ? null : i)}
                className={
                  'w-full text-left flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ' +
                  (on
                    ? 'border-primary bg-primary/15 shadow-[0_0_0_1px_var(--color-primary,#c6bfff)]'
                    : 'border-white/10 bg-surface-container-lowest hover:border-primary/50')
                }
              >
                <span
                  className={
                    'shrink-0 w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center ' +
                    (on ? 'bg-primary text-on-primary' : 'bg-primary/20 text-primary')
                  }
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={'block text-sm leading-snug truncate ' + (on ? 'text-on-surface font-semibold' : 'text-on-surface')}>
                    {s.title || `Step ${i + 1}`}
                  </span>
                  {count > 0 && (
                    <span className="block text-[11px] text-on-surface-variant">
                      {count} sub-step{count > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
                <span className={'material-symbols-outlined text-base transition-transform ' + (on ? 'text-primary rotate-90' : 'text-on-surface-variant')}>
                  chevron_right
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Detail panel — only the pointed-at step shows its content + sub-steps. */}
      <div className="rounded-xl border border-white/10 bg-surface-container-lowest/50 p-5 min-h-[220px]">
        {!sel ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-on-surface-variant gap-2 py-8">
            <span className="material-symbols-outlined text-3xl text-primary/60">touch_app</span>
            <p className="text-sm">Select a step on the left to see what to do and its sub-steps.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 rounded-full bg-primary text-on-primary text-sm font-bold flex items-center justify-center">{active + 1}</span>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-medium leading-snug">{sel.title || `Step ${active + 1}`}</h3>
                {sel.body && (
                  <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap mt-1.5">{sel.body}</p>
                )}
              </div>
            </div>

            {subs.length > 0 && (
              <div className="flex flex-col gap-2.5 pl-2">
                <span className="label-sm text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">subdirectory_arrow_right</span>
                  Sub-steps
                </span>
                <ol className="flex flex-col gap-2.5">
                  {subs.map((ss, j) => (
                    <li key={j} className="flex gap-3 rounded-lg border border-white/10 bg-surface-container-lowest p-3">
                      <span className="shrink-0 px-1.5 h-5 min-w-[2rem] rounded-full bg-secondary/80 text-on-secondary text-[11px] font-bold flex items-center justify-center mt-0.5">
                        {active + 1}.{j + 1}
                      </span>
                      <div className="min-w-0">
                        {ss.title && <h4 className="text-sm font-semibold leading-snug">{ss.title}</h4>}
                        {ss.body && (
                          <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap mt-0.5">{ss.body}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
