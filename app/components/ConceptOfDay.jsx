'use client';

import { useState } from 'react';
import Link from 'next/link';

// v24: Thẻ lật "Concept of the day" — mặt trước là tên, mặt sau là tóm tắt.
export default function ConceptOfDay({ concept }) {
  const [flipped, setFlipped] = useState(false);
  if (!concept) return null;
  const text = concept.summary || concept.body || '';
  return (
    <div className="[perspective:1200px]">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? 'Show concept name' : 'Reveal the concept summary'}
        className={`relative w-full h-64 md:h-56 text-left transition-transform duration-700 [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}
      >
        {/* Front */}
        <div className="absolute inset-0 glass-card rounded-card p-7 flex flex-col justify-between [backface-visibility:hidden] overflow-hidden">
          <div className="nebula w-64 h-64 -right-16 -top-16" />
          <div className="relative flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">wb_sunny</span>
            <span className="label-sm text-secondary">Concept of the day</span>
          </div>
          <div className="relative">
            {concept.category && <span className="text-xs text-on-surface-variant">{concept.category}</span>}
            <h3 className="font-display text-2xl md:text-3xl font-medium mt-1">{concept.title}</h3>
          </div>
          <span className="relative text-xs text-on-surface-variant inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-base">touch_app</span>
            What do you think it means? Tap to flip.
          </span>
        </div>
        {/* Back */}
        <div className="absolute inset-0 glass-card rounded-card p-7 flex flex-col [backface-visibility:hidden] [transform:rotateY(180deg)] border-primary/30">
          <span className="label-sm text-primary mb-2">{concept.title}</span>
          <p className="text-sm text-on-surface leading-relaxed line-clamp-5 flex-1">{text}</p>
          <span className="text-xs text-on-surface-variant mt-3">Tap to flip back</span>
        </div>
      </button>
      <Link
        href={`/knowledge-hub?c=${concept.id}`}
        className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-bold hover:gap-2 transition-all"
      >
        See it on the map <span className="material-symbols-outlined text-base">arrow_forward</span>
      </Link>
    </div>
  );
}
