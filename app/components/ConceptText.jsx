'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchConcepts } from '@/lib/content';

// v24: Hiển thị văn bản, biến "#TenConcept" thành link tới concept trên bản đồ.
// Khớp không phân biệt hoa/thường, dấu và khoảng trắng: #BrandEquity, #brand-equity
// đều trỏ tới concept "Brand Equity".
let cache = null;
const key = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');

function useConceptIndex() {
  const [idx, setIdx] = useState(null);
  useEffect(() => {
    if (!cache) {
      cache = fetchConcepts().then(({ data }) => {
        const m = new Map();
        (data || []).forEach((c) => { const k = key(c.title); if (k) m.set(k, c); });
        return m;
      });
    }
    let alive = true;
    cache.then((m) => { if (alive) setIdx(m); });
    return () => { alive = false; };
  }, []);
  return idx;
}

export default function ConceptText({ text = '', className = '' }) {
  const idx = useConceptIndex();
  if (!text) return null;
  const parts = text.split(/(#[\p{L}\p{N}_-]+)/u);
  return (
    <p className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('#') && idx) {
          const c = idx.get(key(part.slice(1)));
          if (c) {
            return (
              <Link key={i} href={`/knowledge-hub?c=${c.id}`}
                className="inline-flex items-center gap-0.5 px-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors no-underline">
                <span className="material-symbols-outlined text-[14px]">hub</span>{c.title}
              </Link>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}
