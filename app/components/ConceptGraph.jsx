'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { lineColor, lineOf, metroPath } from '@/lib/metroLines';

// Lightweight dependency-free force-directed graph rendered as SVG.
// nodes: [{id, title, category}]  links: [{source_id, target_id, label}]
// v24: zoom (cuộn chuột / nút +/-), kéo nền để di chuyển, rê chuột vào node để
// làm sáng các concept liên quan, tự "bay" tới concept đang chọn, node to theo số liên kết.
export default function ConceptGraph({ nodes, links, selectedId, onSelect, visited }) {
  const W = 760;
  const H = 480;
  const [pos, setPos] = useState({});
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [hoverId, setHoverId] = useState(null);
  const draggingRef = useRef(null);
  const panRef = useRef(null);
  const movedRef = useRef(false);
  const svgRef = useRef(null);
  const animRef = useRef(0);

  // Build adjacency for force sim
  const edges = useMemo(
    () =>
      links
        .filter((l) => nodes.some((n) => n.id === l.source_id) && nodes.some((n) => n.id === l.target_id))
        .map((l) => ({ s: l.source_id, t: l.target_id, label: l.label })),
    [links, nodes]
  );

  const degree = useMemo(() => {
    const d = {};
    edges.forEach((e) => { d[e.s] = (d[e.s] || 0) + 1; d[e.t] = (d[e.t] || 0) + 1; });
    return d;
  }, [edges]);
  const neighbors = useMemo(() => {
    const m = {};
    edges.forEach((e) => {
      (m[e.s] ||= new Set()).add(e.t);
      (m[e.t] ||= new Set()).add(e.s);
    });
    return m;
  }, [edges]);

  // v28: metro — ga đổi tuyến = nối với concept thuộc nhóm khác, hoặc có từ 3 liên kết.
  const catOf = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, lineOf(n.category)])), [nodes]);
  const interchange = useMemo(() => {
    const set = new Set();
    edges.forEach((e) => { if (catOf[e.s] !== catOf[e.t]) { set.add(e.s); set.add(e.t); } });
    Object.entries(degree).forEach(([id, d]) => { if (d >= 3) set.add(id); });
    return set;
  }, [edges, catOf, degree]);

  // Run a short force simulation when graph changes.
  useEffect(() => {
    if (!nodes.length) {
      setPos({});
      return;
    }
    const p = {};
    nodes.forEach((n, i) => {
      const a = (2 * Math.PI * i) / nodes.length;
      p[n.id] = { x: W / 2 + Math.cos(a) * 160, y: H / 2 + Math.sin(a) * 130, vx: 0, vy: 0 };
    });
    const idx = Object.fromEntries(nodes.map((n, i) => [n.id, i]));
    for (let iter = 0; iter < 280; iter++) {
      // repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = p[nodes[i].id];
          const b = p[nodes[j].id];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy || 0.01;
          const f = 9000 / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
        }
      }
      // spring attraction along edges
      edges.forEach((e) => {
        const a = p[e.s]; const b = p[e.t];
        if (!a || !b) return;
        const dx = b.x - a.x; const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d - 150) * 0.04;
        const fx = (dx / d) * f; const fy = (dy / d) * f;
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
      });
      // center gravity + integrate
      nodes.forEach((n) => {
        const a = p[n.id];
        a.vx += (W / 2 - a.x) * 0.01;
        a.vy += (H / 2 - a.y) * 0.01;
        a.x += a.vx * 0.18; a.y += a.vy * 0.18;
        a.vx *= 0.85; a.vy *= 0.85;
        // Leave extra room at the bottom so the label under a node never clips.
        a.x = Math.max(48, Math.min(W - 48, a.x));
        a.y = Math.max(40, Math.min(H - 56, a.y));
      });
    }
    setPos({ ...p });
    setView({ k: 1, x: 0, y: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  // Animate the camera to a target view.
  const flyTo = (target) => {
    cancelAnimationFrame(animRef.current);
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setView(target); return; }
    const from = { ...viewRef.current };
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 650);
      const e = 1 - Math.pow(1 - k, 3);
      setView({
        k: from.k + (target.k - from.k) * e,
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
      });
      if (k < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  };
  const viewRef = useRef(view);
  viewRef.current = view;

  // Fly to the selected concept (from search, list, URL…).
  useEffect(() => {
    if (!selectedId) return;
    const p = pos[selectedId];
    if (!p) return;
    const k = Math.max(viewRef.current.k, 1.5);
    flyTo({ k, x: W / 2 - p.x * k, y: H / 2 - p.y * k });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, pos[selectedId]?.x == null]);

  const zoomBy = (factor, cx = W / 2, cy = H / 2) => {
    const v = viewRef.current;
    const k = Math.max(0.5, Math.min(3.5, v.k * factor));
    const f = k / v.k;
    setView({ k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f });
  };
  const resetView = () => flyTo({ k: 1, x: 0, y: 0 });

  // Wheel zoom (non-passive so the page doesn't scroll while zooming the map).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = ((e.clientX - rect.left) / rect.width) * W;
      const cy = ((e.clientY - rect.top) / rect.height) * H;
      zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, cx, cy);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  function clientToSvg(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    return { x, y };
  }
  function toGraph(pt) {
    const v = viewRef.current;
    return { x: (pt.x - v.x) / v.k, y: (pt.y - v.y) / v.k };
  }
  function onDown(id, e) {
    e.stopPropagation();
    if (!e.touches) e.preventDefault();
    draggingRef.current = id;
    movedRef.current = false;
  }
  function onBgDown(e) {
    const pt = clientToSvg(e.touches ? e.touches[0] : e);
    panRef.current = { sx: pt.x, sy: pt.y, vx: viewRef.current.x, vy: viewRef.current.y };
  }
  function onMove(e) {
    const src = e.touches ? e.touches[0] : e;
    if (!src) return;
    const pt = clientToSvg(src);
    if (draggingRef.current) {
      movedRef.current = true;
      const { x, y } = toGraph(pt);
      setPos((prev) => ({ ...prev, [draggingRef.current]: { ...prev[draggingRef.current], x, y } }));
    } else if (panRef.current) {
      const p = panRef.current;
      setView((v) => ({ ...v, x: p.vx + (pt.x - p.sx), y: p.vy + (pt.y - p.sy) }));
    }
  }
  function onUp() { draggingRef.current = null; panRef.current = null; }

  if (!nodes.length) {
    return (
      <div className="glass-card rounded-card h-[300px] flex items-center justify-center text-on-surface-variant text-sm">
        No concepts yet — add key concepts from the dashboard to grow the map.
      </div>
    );
  }

  const focusId = hoverId || selectedId;
  const lit = focusId ? new Set([focusId, ...(neighbors[focusId] || [])]) : null;

  return (
    <div className="relative">
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full glass-card rounded-card select-none cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none' }}
      onMouseDown={onBgDown}
      onTouchStart={onBgDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onTouchMove={onMove}
      onTouchEnd={onUp}
    >
      <defs><pattern id="kwmetro" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.07)" /></pattern></defs>
      <rect width={W} height={H} fill="url(#kwmetro)" />
      <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
      {edges.map((e, i) => {
        const a = pos[e.s]; const b = pos[e.t];
        if (!a || !b) return null;
        const active = focusId && (e.s === focusId || e.t === focusId);
        const dim = lit && !active;
        const same = catOf[e.s] === catOf[e.t];
        const color = same ? lineColor(catOf[e.s]) : 'rgba(220,215,240,0.45)';
        const d = metroPath(a, b);
        const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
        return (
          <g key={i} style={{ opacity: dim ? 0.14 : 1, transition: 'opacity .25s' }}>
            {active && <path d={d} fill="none" stroke={color} strokeOpacity="0.35" strokeWidth={14 / Math.sqrt(view.k)} strokeLinecap="round" strokeLinejoin="round" />}
            <path d={d} fill="none" stroke={color}
              strokeWidth={(same ? 6 : 3.5) / Math.sqrt(view.k)}
              strokeDasharray={same ? undefined : `${6 / Math.sqrt(view.k)} ${5 / Math.sqrt(view.k)}`}
              strokeLinecap="round" strokeLinejoin="round" />
            {e.label && active && (
              <text x={mx} y={my - 8} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.75)"
                style={{ paintOrder: 'stroke', stroke: 'rgba(12,11,24,0.9)', strokeWidth: 3 }}>{e.label}</text>
            )}
          </g>
        );
      })}
      {nodes.map((n) => {
        const p = pos[n.id];
        if (!p) return null;
        const sel = n.id === selectedId;
        const isFoundation = n.type === 'foundation';
        const isResearch = n.type === 'research';
        const xchg = interchange.has(n.id);
        const r = xchg ? 9 : 7;
        const dim = lit && !lit.has(n.id);
        const seen = visited && visited.has(n.id);
        const color = lineColor(n.category);
        const title = n.title || '';
        const label = title.length > 26 ? title.slice(0, 25) + '…' : title;
        return (
          <g key={n.id} transform={`translate(${p.x},${p.y})`}
            style={{ cursor: 'pointer', opacity: dim ? 0.25 : 1, transition: 'opacity .25s' }}
            onMouseDown={(e) => onDown(n.id, e)}
            onTouchStart={(e) => onDown(n.id, e)}
            onMouseEnter={() => setHoverId(n.id)}
            onMouseLeave={() => setHoverId(null)}
            onClick={(e) => { e.stopPropagation(); if (!movedRef.current) onSelect?.(n.id); }}>
            <circle r={18} fill="transparent" />
            {sel && (
              <circle r={r + 9} fill="none" stroke="#ffd27a" strokeWidth="2" strokeDasharray="4 4">
                <animate attributeName="r" values={`${r + 6};${r + 12};${r + 6}`} dur="2.4s" repeatCount="indefinite" />
              </circle>
            )}
            <circle r={r}
              fill={sel ? color : '#13121b'}
              stroke={xchg ? '#ece9f5' : color}
              strokeWidth={xchg ? 4 : 3.5} />
            {seen && !sel && <circle r={3} cx={r + 2} cy={-r - 2} fill="#f6bd56" />}
            {/* Label under the node. A dark stroke behind the glyphs keeps it
                readable over edges and other nodes. */}
            <text textAnchor="middle" y={r + 15} fontSize={isResearch ? 9.5 : 10.5}
              fill={sel ? '#ffd27a' : '#e5e0ed'}
              style={{
                pointerEvents: 'none',
                fontWeight: isFoundation ? 700 : 600,
                paintOrder: 'stroke',
                stroke: 'rgba(12,11,24,0.9)',
                strokeWidth: 3,
                strokeLinejoin: 'round',
              }}>
              {label}
            </text>
          </g>
        );
      })}
      </g>
    </svg>
      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        {[
          { icon: 'add', label: 'Zoom in', fn: () => zoomBy(1.25) },
          { icon: 'remove', label: 'Zoom out', fn: () => zoomBy(0.8) },
          { icon: 'center_focus_strong', label: 'Reset view', fn: resetView },
        ].map((b) => (
          <button key={b.icon} type="button" onClick={b.fn} title={b.label} aria-label={b.label}
            className="w-8 h-8 grid place-items-center rounded-lg glass-card text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors">
            <span className="material-symbols-outlined text-lg">{b.icon}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
