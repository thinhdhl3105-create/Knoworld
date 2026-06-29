'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';

// Interactive viewer for a framework's ordered steps.
// Default view = a radial "spiderweb": the framework sits at the centre, each
// step radiates out as a node, and its sub-steps hang off it as small satellites.
// Click a step node to reveal its explanation + sub-steps in the side panel.
// A toggle switches to a plain numbered list for linear reading.
// steps: [{ title, body, substeps: [{ title, body }] }]
export default function FrameworkSteps({ steps, title = 'Framework' }) {
  const rows = Array.isArray(steps) ? steps : [];
  const [active, setActive] = useState(0); // selected step index
  const [view, setView] = useState('radial'); // 'radial' | 'list'

  const svgRef = useRef(null);
  const gRootRef = useRef(null);
  const zoomRef = useRef(null);

  const W = 760;
  const H = 600;

  // Build the d3 hierarchy: framework -> steps -> sub-steps.
  const data = useMemo(() => {
    return {
      name: title,
      _root: true,
      children: rows.map((s, i) => ({
        name: s.title || `Step ${i + 1}`,
        idx: i,
        _step: s,
        children: (Array.isArray(s.substeps) ? s.substeps : []).map((ss, j) => ({
          name: ss.title || `${i + 1}.${j + 1}`,
          tag: `${i + 1}.${j + 1}`,
          _sub: ss,
        })),
      })),
    };
  }, [rows, title]);

  // ---- Render the radial graph (layout + paint). Re-runs on data/view change.
  useEffect(() => {
    if (view !== 'radial' || !svgRef.current || rows.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // gradient for the core node
    const defs = svg.append('defs');
    const grad = defs.append('radialGradient').attr('id', 'fwCore');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#d8ccff');
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#5844d9');

    const gRoot = svg.append('g');
    gRootRef.current = gRoot;
    const gLink = gRoot.append('g');
    const gNode = gRoot.append('g');

    // zoom / pan
    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 2.4])
      .on('zoom', (e) => gRoot.attr('transform', e.transform));
    zoomRef.current = zoom;
    svg.call(zoom).on('dblclick.zoom', null);

    // layout
    const root = d3.hierarchy(data);
    const radius = Math.min(W, H) / 2 - 96;
    d3.cluster().size([2 * Math.PI, radius])(root);
    root.each((d) => {
      const a = d.x - Math.PI / 2;
      d.px = d.depth === 0 ? W / 2 : W / 2 + Math.cos(a) * d.y;
      d.py = d.depth === 0 ? H / 2 : H / 2 + Math.sin(a) * d.y;
      d.ang = a;
    });

    // links (straight spokes -> spiderweb look)
    gLink
      .selectAll('line')
      .data(root.links())
      .join('line')
      .attr('class', 'fw-link')
      .attr('x1', (d) => d.source.px)
      .attr('y1', (d) => d.source.py)
      .attr('x2', (d) => d.target.px)
      .attr('y2', (d) => d.target.py)
      .attr('stroke-linecap', 'round')
      .attr('stroke', (d) =>
        d.target.depth === 1 ? 'rgba(198,191,255,.40)' : 'rgba(150,142,200,.22)'
      )
      .attr('stroke-width', (d) => (d.target.depth === 1 ? 1.5 : 1));

    // nodes
    const node = gNode
      .selectAll('g.fw-node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'fw-node')
      .attr('transform', (d) => `translate(${d.px},${d.py})`)
      .style('cursor', (d) => (d.depth <= 1 ? 'pointer' : 'default'))
      .on('click', (e, d) => {
        if (d.depth === 1) setActive(d.data.idx);
        else if (d.depth === 0) setActive(0);
      });

    node
      .append('circle')
      .attr('r', (d) => (d.depth === 0 ? 36 : d.depth === 1 ? 10 : 4.5))
      .attr('fill', (d) =>
        d.depth === 0 ? 'url(#fwCore)' : d.depth === 1 ? '#1c1b23' : '#15131f'
      )
      .attr('stroke', (d) =>
        d.depth === 0 ? 'rgba(216,204,255,.6)' : d.depth === 1 ? '#c6bfff' : 'rgba(150,142,200,.7)'
      )
      .attr('stroke-width', (d) => (d.depth === 1 ? 2 : 1.4));

    // step number badge inside depth-1 nodes
    node
      .filter((d) => d.depth === 1)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.34em')
      .attr('font-size', 10.5)
      .attr('font-weight', 700)
      .attr('fill', '#c6bfff')
      .attr('pointer-events', 'none')
      .text((d) => d.data.idx + 1);

    // centre label
    const core = node.filter((d) => d.depth === 0).append('text');
    core
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-weight', 700)
      .attr('font-size', 13)
      .attr('pointer-events', 'none');
    wrapCenter(core, title);

    // step labels (depth 1) placed outside the node, angled
    node
      .filter((d) => d.depth === 1)
      .append('text')
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .attr('fill', '#e5e0ed')
      .attr('pointer-events', 'none')
      .attr('dy', '0.32em')
      .each(function (d) {
        const right = Math.cos(d.ang) >= 0;
        const label = (d.data.name || '').length > 22 ? d.data.name.slice(0, 21) + '…' : d.data.name;
        d3.select(this)
          .attr('text-anchor', right ? 'start' : 'end')
          .attr('transform', `translate(${right ? 18 : -18},0)`)
          .attr('paint-order', 'stroke')
          .attr('stroke', 'rgba(14,13,22,.92)')
          .attr('stroke-width', 3.2)
          .attr('stroke-linejoin', 'round')
          .text(label);
      });

    // reset zoom to identity
    svg.call(zoom.transform, d3.zoomIdentity);

    return () => svg.on('.zoom', null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, view, title, rows.length]);

  // ---- Highlight the active branch whenever selection changes.
  useEffect(() => {
    if (view !== 'radial' || !gRootRef.current) return;
    const gRoot = gRootRef.current;
    gRoot
      .selectAll('g.fw-node')
      .select('circle')
      .attr('stroke-width', (d) =>
        d.depth === 1 && d.data.idx === active ? 3.4 : d.depth === 1 ? 2 : 1.4
      )
      .attr('fill', (d) => {
        if (d.depth === 0) return 'url(#fwCore)';
        if (d.depth === 1 && d.data.idx === active) return 'rgba(198,191,255,.28)';
        return d.depth === 1 ? '#1c1b23' : '#15131f';
      });
    gRoot.selectAll('line.fw-link').attr('opacity', (d) => {
      const branchRoot = d.source.depth === 0 ? d.target : d.source;
      return branchRoot.data.idx === active ? 1 : 0.32;
    });
  }, [active, view, data]);

  if (!rows.length) return null;

  const sel = rows[active] || rows[0];
  const subs = sel && Array.isArray(sel.substeps) ? sel.substeps : [];

  return (
    <div>
      {/* Toolbar: view toggle + progress */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex bg-surface-container-lowest border border-white/10 rounded-full p-1">
          {[
            { id: 'radial', label: 'Spiderweb', icon: 'hub' },
            { id: 'list', label: 'Danh sách', icon: 'format_list_numbered' },
          ].map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={
                'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ' +
                (view === v.id
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface')
              }
            >
              <span className="material-symbols-outlined text-base">{v.icon}</span>
              {v.label}
            </button>
          ))}
        </div>
        <div className="hidden sm:flex items-center gap-1.5 flex-1 max-w-[260px]">
          {rows.map((_, i) => (
            <span
              key={i}
              className={
                'h-1 flex-1 rounded-full transition-colors ' +
                (i <= active ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-white/10')
              }
            />
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-stretch">
        {/* LEFT: graph or list */}
        {view === 'radial' ? (
          <div className="relative rounded-xl border border-white/10 overflow-hidden bg-surface-container-lowest min-h-[420px]">
            {/* faint dotted backdrop */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                maskImage: 'radial-gradient(72% 72% at 50% 50%, #000, transparent)',
                WebkitMaskImage: 'radial-gradient(72% 72% at 50% 50%, #000, transparent)',
              }}
            />
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-full block touch-none select-none"
              style={{ minHeight: 420 }}
            />
            <div className="absolute left-4 bottom-3 flex gap-4 text-[11px] text-on-surface-variant/70 pointer-events-none">
              <span><b className="text-on-surface-variant">Click</b> node để xem</span>
              <span><b className="text-on-surface-variant">Cuộn</b> để zoom · <b className="text-on-surface-variant">kéo</b> để di chuyển</span>
            </div>
            <div className="absolute right-3 bottom-3 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => zoomRef.current && d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.25)}
                className="w-8 h-8 rounded-lg border border-white/10 bg-surface-container text-on-surface text-lg leading-none hover:border-primary/60"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => zoomRef.current && d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.8)}
                className="w-8 h-8 rounded-lg border border-white/10 bg-surface-container text-on-surface text-lg leading-none hover:border-primary/60"
              >
                −
              </button>
            </div>
          </div>
        ) : (
          <ol className="flex flex-col gap-2 rounded-xl border border-white/10 bg-surface-container-lowest p-3 min-h-[420px]">
            {rows.map((s, i) => {
              const on = i === active;
              const count = Array.isArray(s.substeps) ? s.substeps.length : 0;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    className={
                      'w-full text-left flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ' +
                      (on
                        ? 'border-primary bg-primary/15'
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
                      <span className="block text-sm leading-snug text-on-surface font-medium truncate">
                        {s.title || `Step ${i + 1}`}
                      </span>
                      {count > 0 && (
                        <span className="block text-[11px] text-on-surface-variant">
                          {count} sub-step{count > 1 ? 's' : ''}
                        </span>
                      )}
                    </span>
                    <span
                      className={
                        'material-symbols-outlined text-base ' +
                        (on ? 'text-primary' : 'text-on-surface-variant')
                      }
                    >
                      chevron_right
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        {/* RIGHT: detail panel */}
        <div className="rounded-xl border border-white/10 bg-surface-container-lowest/60 overflow-hidden flex flex-col">
          <div className="relative p-5 border-b border-white/10 overflow-hidden">
            <div
              className="absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(198,191,255,.30), transparent 70%)', filter: 'blur(8px)' }}
            />
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-full bg-gradient-to-b from-secondary to-tertiary text-on-secondary text-xs font-bold grid place-items-center">
                {active + 1}
              </span>
              <span className="label-sm text-secondary tracking-widest">
                STEP {String(active + 1).padStart(2, '0')}
              </span>
            </div>
            <h3 className="font-display text-xl font-semibold leading-snug">
              {sel.title || `Step ${active + 1}`}
            </h3>
            {sel.body && (
              <p className="text-sm text-on-surface-variant leading-relaxed mt-2 whitespace-pre-wrap">
                {sel.body}
              </p>
            )}
          </div>

          <div className="p-4 overflow-y-auto flex-1 max-h-[360px]">
            {subs.length > 0 ? (
              <>
                <span className="label-sm text-primary flex items-center gap-1 mb-3">
                  <span className="material-symbols-outlined text-base">subdirectory_arrow_right</span>
                  Sub-steps
                </span>
                <div className="flex flex-col gap-2.5">
                  {subs.map((ss, j) => (
                    <div
                      key={j}
                      className="rounded-xl border border-white/10 bg-surface-container-low p-3 transition-colors hover:border-primary/50"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-on-secondary bg-gradient-to-b from-secondary to-tertiary rounded-md px-1.5 py-0.5">
                          {active + 1}.{j + 1}
                        </span>
                        {ss.title && (
                          <span className="text-sm font-semibold leading-snug">{ss.title}</span>
                        )}
                      </div>
                      {ss.body && (
                        <p className="text-[13px] text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                          {ss.body}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-on-surface-variant py-6 text-center">
                Bước này chưa có sub-step.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap the centre framework title onto up to 3 short lines.
function wrapCenter(textSel, raw) {
  const words = String(raw || 'Framework').split(/\s+/);
  const lines = [];
  let cur = '';
  words.forEach((w) => {
    if ((cur + ' ' + w).trim().length > 12) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  });
  if (cur) lines.push(cur);
  const show = lines.slice(0, 3);
  const start = -((show.length - 1) / 2);
  show.forEach((ln, i) => {
    textSel
      .append('tspan')
      .attr('x', 0)
      .attr('dy', i === 0 ? `${start * 1.15 + 0.32}em` : '1.15em')
      .text(ln);
  });
}
