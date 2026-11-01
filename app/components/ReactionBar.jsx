'use client';

import { useEffect, useState } from 'react';
import { REACTIONS, fetchReactionMap, toggleReaction } from '@/lib/engagement';

// v24: 💡 Insightful · 🤔 Worth debating · 🔥 Inspiring — bổ sung cho nút tim.
// data (tuỳ chọn): { insight: {count, reacted}, … } nạp sẵn từ trang cha.
export default function ReactionBar({ contentId, data, size = 'md', className = '' }) {
  const [state, setState] = useState(data || {});
  const [pop, setPop] = useState(null);

  useEffect(() => {
    if (data) { setState(data); return; }
    if (!contentId) return;
    let alive = true;
    fetchReactionMap([contentId]).then((m) => { if (alive) setState(m[contentId] || {}); });
    return () => { alive = false; };
  }, [contentId, data]);

  const onClick = async (e, key) => {
    e.preventDefault();
    e.stopPropagation();
    const cur = state[key] || { count: 0, reacted: false };
    setState((s) => ({ ...s, [key]: { count: Math.max(0, cur.count + (cur.reacted ? -1 : 1)), reacted: !cur.reacted } }));
    if (!cur.reacted) { setPop(key); setTimeout(() => setPop(null), 400); }
    const res = await toggleReaction(contentId, key);
    if (res) setState((s) => ({ ...s, [key]: res }));
  };

  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1.5 text-sm';
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {REACTIONS.map((r) => {
        const st = state[r.key] || { count: 0, reacted: false };
        return (
          <button
            key={r.key}
            type="button"
            onClick={(e) => onClick(e, r.key)}
            title={r.label}
            aria-label={`${r.label} (${st.count})`}
            aria-pressed={st.reacted}
            className={`inline-flex items-center gap-1 rounded-full border transition-colors ${pad} ${
              st.reacted
                ? 'border-secondary/50 bg-secondary/10 text-on-surface'
                : 'border-white/10 text-on-surface-variant hover:border-secondary/40 hover:text-on-surface'
            }`}
          >
            <span className={pop === r.key ? 'kw-pop inline-block' : 'inline-block'}>{r.emoji}</span>
            <span className="font-bold tabular-nums">{st.count}</span>
            {size !== 'sm' && <span className="hidden sm:inline text-xs opacity-80">{r.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
