'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// Lightweight dependency-free force-directed graph rendered as SVG.
// nodes: [{id, title, category}]  links: [{source_id, target_id, label}]
export default function ConceptGraph({ nodes, links, selectedId, onSelect }) {
  const W = 760;
  const H = 480;
  const [pos, setPos] = useState({});
  const draggingRef = useRef(null);
  const svgRef = useRef(null);

  // Build adjacency for force sim
  const edges = useMemo(
    () =>
      links
        .filter((l) => nodes.some((n) => n.id === l.source_id) && nodes.some((n) => n.id === l.target_id))
        .map((l) => ({ s: l.source_id, t: l.target_id, label: l.label })),
    [links, nodes]
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  function clientToSvg(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    return { x, y };
  }
  function onDown(id, e) {
    e.preventDefault();
    draggingRef.current = id;
  }
  function onMove(e) {
    if (!draggingRef.current) return;
    const { x, y } = clientToSvg(e.touches ? e.touches[0] : e);
    setPos((prev) => ({ ...prev, [draggingRef.current]: { ...prev[draggingRef.current], x, y } }));
  }
  function onUp() { draggingRef.current = null; }

  if (!nodes.length) {
    return (
      <div className="glass-card rounded-card h-[300px] flex items-center justify-center text-on-surface-variant text-sm">
        No concepts yet — add key concepts from the dashboard to grow the map.
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full glass-card rounded-card touch-none select-none"
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onTouchMove={onMove}
      onTouchEnd={onUp}
    >
      {edges.map((e, i) => {
        const a = pos[e.s]; const b = pos[e.t];
        if (!a || !b) return null;
        const active = selectedId && (e.s === selectedId || e.t === selectedId);
        const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={active ? 'var(--color-primary, #c6bfff)' : 'rgba(255,255,255,0.16)'}
              strokeWidth={active ? 2 : 1.2} />
            {e.label && (
              <text x={mx} y={my - 4} textAnchor="middle" fontSize="9"
                fill="rgba(255,255,255,0.45)">{e.label}</text>
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
        // Fixed-size circles — the label now sits *below* the node, so the
        // circle no longer needs to stretch to fit the text.
        const r = isFoundation ? 22 : isResearch ? 14 : 18;
        // Foundations = primary (violet); research = secondary (teal); default = violet.
        const accent = isResearch ? 'var(--color-secondary, #7fd4c4)' : 'var(--color-primary, #c6bfff)';
        const fillIdle = isResearch ? 'rgba(127,212,196,0.12)' : 'rgba(198,191,255,0.14)';
        const strokeIdle = isResearch ? 'rgba(127,212,196,0.5)' : 'rgba(198,191,255,0.5)';
        const title = n.title || '';
        const label = title.length > 26 ? title.slice(0, 25) + '…' : title;
        return (
          <g key={n.id} transform={`translate(${p.x},${p.y})`} style={{ cursor: 'pointer' }}
            onMouseDown={(e) => onDown(n.id, e)}
            onTouchStart={(e) => onDown(n.id, e)}
            onClick={() => onSelect?.(n.id)}>
            <circle r={r}
              fill={sel ? accent : fillIdle}
              stroke={sel ? accent : strokeIdle}
              strokeWidth={sel ? 2.5 : isFoundation ? 1.8 : 1.5} />
            {/* Label under the node. A dark stroke behind the glyphs keeps it
                readable over edges and other nodes. */}
            <text textAnchor="middle" y={r + 13} fontSize={isResearch ? 9.5 : 10.5}
              fill={sel ? '#ffffff' : '#dcd9f0'}
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
    </svg>
  );
}
