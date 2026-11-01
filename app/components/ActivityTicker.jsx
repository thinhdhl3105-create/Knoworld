'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchRecentActivity, contentHref } from '@/lib/engagement';
import { timeAgo } from '@/lib/discussion';

const VERB = {
  heart: { icon: 'favorite', color: 'text-[#ff5c8a]', text: 'Someone hearted' },
  view: { icon: 'visibility', color: 'text-primary', text: 'Someone is exploring' },
  insight: { emoji: '💡', text: 'Someone found insight in' },
  debate: { emoji: '🤔', text: 'Someone wants to debate' },
  fire: { emoji: '🔥', text: 'Someone was inspired by' },
  question: { icon: 'forum', color: 'text-secondary', text: 'New question:' },
};

// v24: Dòng "đang diễn ra" — xoay vòng hoạt động gần đây (ẩn danh).
export default function ActivityTicker() {
  const [items, setItems] = useState([]);
  const [i, setI] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchRecentActivity(12).then((rows) => {
      if (!alive) return;
      // Bỏ trùng (cùng mục + cùng loại liên tiếp).
      const seen = new Set();
      setItems(rows.filter((r) => {
        const k = `${r.kind}:${r.content_id || r.title}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }));
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setI((x) => (x + 1) % items.length); setFade(true); }, 250);
    }, 4200);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;
  const it = items[i % items.length];
  const v = VERB[it.kind] || VERB.view;

  return (
    <Link
      href={contentHref(it.content_kind, it.content_id)}
      className="inline-flex items-center gap-2.5 glass-card rounded-full pl-3 pr-4 py-2 max-w-full hover:border-primary/40 transition-colors"
    >
      <span className="relative flex w-2 h-2 shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#5ee0a0] opacity-60 animate-ping" />
        <span className="relative inline-flex w-2 h-2 rounded-full bg-[#5ee0a0]" />
      </span>
      <span className={`flex items-center gap-1.5 text-sm text-on-surface-variant min-w-0 transition-opacity duration-200 ${fade ? 'opacity-100' : 'opacity-0'}`}>
        {v.emoji ? <span>{v.emoji}</span> : <span className={`material-symbols-outlined text-base ${v.color}`}>{v.icon}</span>}
        <span className="truncate">
          {v.text} <span className="text-on-surface font-medium">{it.title}</span>
        </span>
        <span className="text-xs opacity-60 shrink-0">· {timeAgo(it.created_at)}</span>
      </span>
    </Link>
  );
}
