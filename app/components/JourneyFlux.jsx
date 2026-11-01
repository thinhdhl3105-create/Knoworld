'use client';

import Link from 'next/link';
import { journeyStages } from '@/lib/engagement';
import useProgress from './useProgress';

// v24: "Active Learning Flux" thành hành trình cá nhân — thanh sáng chạy tới
// chặng người học đã đạt, dựa trên việc họ đã chủ động khám phá (không chấm điểm).
export default function JourneyFlux() {
  const { progress, streak } = useProgress();
  const p = progress || { cases_viewed: 0, concepts_explored: 0, questions: 0, answers: 0 };
  const stages = journeyStages(p);
  // Phần trăm tổng: mỗi chặng chiếm 1/3 thanh.
  const total = stages.reduce((s, st) => s + st.progress, 0) / stages.length;
  const live = progress?.available;

  return (
    <div className="relative max-w-3xl mx-auto">
      <div className="relative h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary-container via-primary to-secondary shadow-[0_0_16px_rgba(198,191,255,0.8)] transition-[width] duration-1000"
          style={{ width: `${Math.max(live ? 2 : 0, total * 100)}%` }}
        />
      </div>
      <div className="grid grid-cols-3 mt-6 gap-3">
        {stages.map((s, i) => {
          const done = s.progress >= 1;
          return (
            <div key={s.key} className={`flex flex-col gap-2 ${i === 0 ? 'items-start text-left' : i === 2 ? 'items-end text-right' : 'items-center text-center'}`}>
              <span
                className={`w-3 h-3 rounded-full ${done ? 'bg-secondary shadow-[0_0_14px_rgba(246,189,86,0.9)]' : 'bg-primary/40'}`}
              />
              <span className={`label-sm ${done ? 'text-secondary' : 'text-on-surface-variant'}`}>{s.name}</span>
              <span className="text-xs text-on-surface-variant/80 max-w-[12rem] leading-snug hidden sm:block">
                {done ? 'Reached ✓' : s.hint}
              </span>
              {live && !done && (
                <span className="text-[11px] text-primary tabular-nums">{Math.round(s.progress * 100)}%</span>
              )}
            </div>
          );
        })}
      </div>
      {live && (
        <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
          <span className="glass-card rounded-full px-4 py-2 inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ff8a3d] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            <b className="tabular-nums">{streak.current}</b>-day streak
          </span>
          <span className="glass-card rounded-full px-4 py-2 inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">hub</span>
            <b className="tabular-nums">{p.concepts_explored}</b> concepts explored
          </span>
          <Link href="/journey" className="glass-card rounded-full px-4 py-2 inline-flex items-center gap-2 hover:border-primary/40 transition-colors">
            <span className="material-symbols-outlined text-secondary text-lg">military_tech</span>
            My badges
          </Link>
        </div>
      )}
    </div>
  );
}
