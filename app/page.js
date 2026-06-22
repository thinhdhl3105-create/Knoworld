'use client';

import Link from 'next/link';
import { useAuth } from './components/AuthProvider';

const pathways = [
  {
    href: '/research', tag: 'Research', icon: 'science',
    title: 'Research Archive', auth: true,
    desc: 'Ongoing research papers and editable theoretical foundations — the conceptual bedrock behind every strategy.',
  },
  {
    href: '/knowledge-hub', tag: 'Repository', icon: 'hub',
    title: 'Knowledge Hub', auth: true,
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
  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="relative max-w-container mx-auto px-5 md:px-16 pt-20 pb-32 overflow-hidden">
        <div className="nebula w-[480px] h-[480px] right-0 top-10 hidden md:block" />
        <div className="relative z-10 max-w-2xl">
          <h1 className="h-xl">
            Explore knowledge
            <br />
            <span className="text-primary italic">like a universe.</span>
          </h1>
          <p className="mt-6 text-lg text-on-surface-variant max-w-md">
            A celestial platform for scientific precision in knowledge discovery. Navigate through
            vast constellations of data and expert insights.
          </p>
          <Link
            href="/research"
            className="inline-flex items-center gap-2 mt-10 bg-primary text-on-primary px-7 py-3 rounded-lg text-sm font-bold uppercase tracking-wide hover:scale-95 transition-transform"
          >
            Start Exploring
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>
        <div className="absolute right-10 top-24 w-72 h-72 rounded-full bg-gradient-to-br from-surface-container-high to-surface-container-lowest border border-white/5 hidden lg:block" />
      </section>

      {/* Curated Pathways */}
      <section className="max-w-container mx-auto px-5 md:px-16 pb-32">
        <div className="flex items-center gap-3 mb-2">
          <span className="h-px w-12 bg-primary" />
        </div>
        <h2 className="h-lg mb-10">Curated Pathways</h2>
        <div className="flex flex-col gap-5">
          {visiblePathways.map((p, i) => (
            <Link
              key={i}
              href={p.href}
              className="group glass-card pulse-hover rounded-card p-6 md:p-8 flex items-center justify-between gap-6"
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
      </section>

      {/* Active Learning Flux */}
      <section className="max-w-container mx-auto px-5 md:px-16 pb-32 text-center">
        <h2 className="h-lg mb-12">Active Learning Flux</h2>
        <div className="relative max-w-3xl mx-auto">
          <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="flex justify-between mt-6">
            {['Origin Discovery', 'Knowledge Expansion', 'Universal Mastery'].map((s) => (
              <div key={s} className="flex flex-col items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_rgba(198,191,255,0.8)]" />
                <span className="label-sm text-on-surface-variant">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
