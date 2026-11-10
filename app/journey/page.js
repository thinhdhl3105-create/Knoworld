'use client';

import Link from 'next/link';
import { earnedBadges, journeyStages } from '@/lib/engagement';
import CityPage from '../components/city/CityPage';
import useProgress from '../components/useProgress';

// v24: "My Journey" — streak, lịch hoạt động 12 tuần, huy hiệu khám phá.
// Gắn với trình duyệt này (không cần đăng nhập). Không có điểm số hay bài kiểm tra.
const WEEKS = 12;

function toKey(d) {
  return d.toISOString().slice(0, 10);
}

function Calendar({ days = [], today }) {
  const set = new Set(days);
  const end = today ? new Date(`${today}T00:00:00Z`) : new Date();
  // Kết thúc ở Chủ nhật của tuần hiện tại để lưới thẳng hàng.
  const endDow = (end.getUTCDay() + 6) % 7; // Mon=0
  const last = new Date(end); last.setUTCDate(end.getUTCDate() + (6 - endDow));
  const cells = [];
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(last); d.setUTCDate(last.getUTCDate() - i);
    cells.push({ key: toKey(d), future: d > end });
  }
  const cols = Array.from({ length: WEEKS }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 w-max">
        <div className="flex flex-col gap-1 mr-1 text-[10px] text-on-surface-variant">
          {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((l, i) => <span key={i} className="h-[18px] leading-[18px]">{l}</span>)}
        </div>
        {cols.map((col, i) => (
          <div key={i} className="flex flex-col gap-1">
            {col.map((c) => (
              <span
                key={c.key}
                title={c.future ? '' : `${c.key}${set.has(c.key) ? ' · active' : ''}`}
                className={`w-4 h-[18px] rounded-[2px] ${
                  c.future ? 'bg-transparent' : set.has(c.key) ? 'kw-window-on' : 'kw-window-off'
                } ${c.key === today ? 'ring-1 ring-[#ff9bd2]' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function JourneyPage() {
  const { progress, streak } = useProgress();

  if (!progress) {
    return (
      <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16 grid md:grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => <div key={i} className="kw-skel h-36" />)}
        <div className="kw-skel h-48 md:col-span-3" />
      </div>
    );
  }

  const badges = earnedBadges(progress, streak);
  const earned = badges.filter((b) => b.earned).length;
  const stages = journeyStages(progress);
  const stats = [
    { icon: 'hub', label: 'Concepts explored', value: progress.concepts_explored },
    { icon: 'cases', label: 'Case studies opened', value: progress.cases_viewed },
    { icon: 'favorite', label: 'Reactions given', value: progress.hearts_given + progress.reactions_given },
    { icon: 'forum', label: 'Discussion posts', value: progress.questions + progress.answers },
  ];

  return (
    <CityPage
      place="journey"
      title="My Journey"
      subtitle="This is your house in Profile City. Every day you explore, one more window lights up — no tests, just curiosity. It lives in this browser, no sign-in needed."
    >
      {!progress.available && (
        <p className="mb-6 text-sm text-secondary">Journey tracking is warming up — check back in a moment.</p>
      )}

      {/* Streak + calendar */}
      <section className="grid lg:grid-cols-3 gap-5 mb-10">
        <div className="glass-card rounded-card p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="nebula w-60 h-60 -right-20 -top-20" style={{ background: 'radial-gradient(circle, rgba(255,138,61,0.35) 0%, rgba(19,18,27,0) 70%)' }} />
          <span className="relative label-sm text-on-surface-variant">Current streak</span>
          <div className="relative flex items-end gap-3 mt-3">
            <span className="material-symbols-outlined text-5xl text-[#ff8a3d]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            <span className="font-display text-6xl font-semibold tabular-nums leading-none">{streak.current}</span>
            <span className="text-on-surface-variant mb-1">day{streak.current === 1 ? '' : 's'}</span>
          </div>
          <p className="relative text-sm text-on-surface-variant mt-4">
            {streak.activeToday
              ? 'You explored today — the flame is lit. 🔥'
              : streak.current > 0
                ? 'Open a concept or case today to keep it going.'
                : 'Explore anything today to start a streak.'}
            <span className="block text-xs mt-1 opacity-70">Best: {streak.best} day{streak.best === 1 ? '' : 's'}</span>
          </p>
        </div>
        <div className="glass-card rounded-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <span className="label-sm text-on-surface-variant">Your windows · last {WEEKS} weeks</span>
            <span className="text-xs text-on-surface-variant">{progress.days.length} active day{progress.days.length === 1 ? '' : 's'}</span>
          </div>
          <Calendar days={progress.days} today={progress.today} />
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="glass-card rounded-card p-5">
            <span className="material-symbols-outlined text-primary">{s.icon}</span>
            <div className="font-display text-3xl font-semibold mt-2 tabular-nums">{s.value}</div>
            <div className="text-xs text-on-surface-variant mt-1">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Journey stages — the floors of your house */}
      <section className="glass-card rounded-card p-6 md:p-8 mb-10">
        <h2 className="h-md mb-2">Floors of your house</h2>
        <p className="text-sm text-on-surface-variant mb-6">Each floor opens as your exploring grows.</p>
        <div className="flex flex-col gap-3">
          {[...stages].reverse().map((s, ri) => {
            const floor = stages.length - ri;
            const done = s.progress >= 1;
            const current = !done && (floor === 1 || stages[floor - 2].progress >= 1);
            return (
              <div key={s.key}
                className={`rounded-xl p-4 border flex flex-col gap-2 ${
                  done ? 'border-[#5ee0a0]/40 bg-[#5ee0a0]/[0.07]' : current ? 'border-primary/40 bg-primary/[0.07]' : 'border-dashed border-white/15 opacity-70'
                }`}>
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm font-bold text-on-surface-variant w-8">{floor}F</span>
                  <span className={`font-display font-medium ${done ? 'text-[#5ee0a0]' : current ? 'text-primary' : ''}`}>{s.name}</span>
                  {done && <span className="ml-auto text-xs text-[#5ee0a0]">Unlocked</span>}
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden ml-11">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary transition-[width] duration-700" style={{ width: `${s.progress * 100}%` }} />
                </div>
                <p className="text-xs text-on-surface-variant ml-11">{s.hint}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Badges */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <h2 className="h-md">Plaques on your door</h2>
          <span className="text-sm text-on-surface-variant"><b className="text-on-surface">{earned}</b> / {badges.length} collected</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`rounded-card p-5 text-center flex flex-col items-center gap-2 border transition-all ${
                b.earned ? 'kw-plaque-gold shadow-[0_0_24px_rgba(246,189,86,0.15)]' : 'border-dashed border-white/15 bg-white/[0.03] opacity-60'
              }`}
            >
              <span
                className={`material-symbols-outlined text-4xl ${b.earned ? 'text-secondary' : 'text-on-surface-variant'}`}
                style={b.earned ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {b.earned ? b.icon : 'lock'}
              </span>
              <span className="font-display font-medium text-sm">{b.name}</span>
              <span className="text-[11px] text-on-surface-variant leading-snug">{b.desc}</span>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/knowledge-hub" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-bold hover:scale-95 transition-transform">
            <span className="material-symbols-outlined text-base">hub</span> Explore the map
          </Link>
          <Link href="/discussion" className="inline-flex items-center gap-2 border border-white/10 px-6 py-3 rounded-lg text-sm font-bold hover:border-primary/50 transition-colors">
            <span className="material-symbols-outlined text-base">forum</span> Join the discussion
          </Link>
        </div>
      </section>
    </CityPage>
  );
}
