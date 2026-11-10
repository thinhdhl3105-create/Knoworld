'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from './components/AuthProvider';
import { publicVisitorCount } from '@/lib/visitor';
import { fetchConcepts, fetchContent } from '@/lib/content';
import { conceptOfTheDay, fetchSiteStats } from '@/lib/engagement';
import KnoworldCity from './components/city/KnoworldCity';
import CountUp from './components/CountUp';
import ActivityTicker from './components/ActivityTicker';
import ConceptOfDay from './components/ConceptOfDay';
import JourneyFlux from './components/JourneyFlux';

const pathways = [
  {
    href: '/research', tag: 'Research', icon: 'science',
    title: 'Research Archive', auth: true,
    desc: 'Ongoing research papers and editable theoretical foundations — the conceptual bedrock behind every strategy.',
  },
  {
    href: '/knowledge-hub', tag: 'Repository', icon: 'hub',
    title: 'Knowledge Hub',
    desc: 'A connected map of key concepts and the bridges between them, plus downloadable frameworks like IMC planning and branding strategy.',
  },
  {
    href: '/videos', tag: 'Visual Learning', icon: 'play_circle',
    title: 'Video Case Studies',
    desc: 'Curated video breakdowns — uploaded or linked from YouTube — organised by category and tied to the concepts they illustrate.',
  },
  {
    href: '/students', tag: 'Academic Excellence', icon: 'school',
    title: 'Student Case Studies',
    desc: 'Real student work unpacked into context, insight, creative approach, and execution — with the visuals that brought it to life.',
  },
];

export default function Home() {
  const { user } = useAuth();
  const visiblePathways = pathways.filter((p) => !p.auth || user);

  const [visitorCount, setVisitorCount] = useState(null);
  const [concepts, setConcepts] = useState([]);
  const [caseCount, setCaseCount] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    publicVisitorCount().then((n) => {
      if (alive && typeof n === 'number') setVisitorCount(n);
    });
    fetchConcepts().then(({ data }) => { if (alive) setConcepts(data || []); });
    Promise.all(['video', 'student', 'image'].map((k) => fetchContent(k))).then((rs) => {
      if (alive) setCaseCount(rs.reduce((s, r) => s + (r.data?.length || 0), 0));
    });
    fetchSiteStats().then((s) => { if (alive) setStats(s); });
    return () => { alive = false; };
  }, []);

  const cotd = conceptOfTheDay(concepts);
  const numbers = [
    visitorCount !== null && { icon: 'group', value: visitorCount, label: 'explorers joined' },
    concepts.length > 0 && { icon: 'hub', value: concepts.length, label: 'concepts mapped' },
    caseCount ? { icon: 'cases', value: caseCount, label: 'case studies' } : null,
    stats?.views ? { icon: 'visibility', value: stats.views, label: 'case views' } : null,
  ].filter(Boolean);

  return (
    <div className="pt-20">
      {/* Hero — Knoworld City (v26): every building is a section of the site */}
      <section className="relative">
        <KnoworldCity className="h-[calc(100svh-9rem)] md:h-[calc(100svh-5rem)] min-h-[480px] md:min-h-[560px] max-h-[920px]" />
      </section>

      <section className="max-w-container mx-auto px-5 md:px-16 pt-14 pb-16">
        <div className="max-w-2xl">
          <h1 className="h-xl kw-rise">
            Explore knowledge
            <br />
            <span className="text-primary italic">like a living city.</span>
          </h1>
          <p className="mt-6 text-lg text-on-surface-variant max-w-md kw-rise [animation-delay:120ms]">
            Every building is a part of Knoworld. Click one to walk in, switch the land and the weather,
            or watch the city turn from day to night on Vietnam time.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4 kw-rise [animation-delay:240ms]">
            <Link
              href={user ? '/research' : '/knowledge-hub'}
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-7 py-3 rounded-lg text-sm font-bold uppercase tracking-wide hover:scale-95 transition-transform"
            >
              Start Exploring
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
          <div className="mt-8 kw-rise [animation-delay:360ms]">
            <ActivityTicker />
          </div>
        </div>
      </section>

      {/* Live numbers */}
      {numbers.length > 0 && (
        <section className="max-w-container mx-auto px-5 md:px-16 pb-24 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {numbers.map((n) => (
              <div key={n.label} className="glass-card rounded-card p-5">
                <span className="material-symbols-outlined text-secondary">{n.icon}</span>
                <div className="font-display text-3xl font-semibold mt-2">
                  <CountUp value={n.value} />
                </div>
                <div className="text-xs text-on-surface-variant mt-1">{n.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Curated Pathways + Concept of the day */}
      <section className="max-w-container mx-auto px-5 md:px-16 pb-32">
        <div className="flex items-center gap-3 mb-2">
          <span className="h-px w-12 bg-primary" />
        </div>
        <h2 className="h-lg mb-10">Curated Pathways</h2>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-5">
            {visiblePathways.map((p, i) => (
              <Link
                key={i}
                href={p.href}
                className="group glass-card pulse-hover rounded-card p-6 md:p-8 flex items-center justify-between gap-6 hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-secondary text-lg">{p.icon}</span>
                    <span className="label-sm text-secondary">{p.tag}</span>
                  </div>
                  <h3 className="font-display text-xl font-medium mb-2 group-hover:text-primary transition-colors">{p.title}</h3>
                  <p className="text-sm text-on-surface-variant max-w-2xl leading-relaxed">{p.desc}</p>
                </div>
                <span className="material-symbols-outlined text-outline text-3xl group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
              </Link>
            ))}
          </div>
          {cotd && (
            <aside className="lg:sticky lg:top-28 self-start">
              <ConceptOfDay concept={cotd} />
            </aside>
          )}
        </div>
      </section>

      {/* Active Learning Flux — personal journey */}
      <section className="max-w-container mx-auto px-5 md:px-16 pb-32 text-center">
        <h2 className="h-lg mb-3">Active Learning Flux</h2>
        <p className="text-sm text-on-surface-variant mb-12 max-w-xl mx-auto">
          Your own journey through Knoworld. It grows as you explore concepts, open case studies and join the discussion — no tests, just curiosity.
        </p>
        <JourneyFlux />
      </section>
    </div>
  );
}
