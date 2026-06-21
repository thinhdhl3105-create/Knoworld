'use client';

const gradients = [
  'from-[#1b2a4a] to-[#0e0d16]',
  'from-[#3a2a4a] to-[#0e0d16]',
  'from-[#2a3a3a] to-[#0e0d16]',
  'from-[#3a2a2a] to-[#0e0d16]',
];

export default function ContentCard({ item, index = 0, video = false }) {
  const grad = gradients[index % gradients.length];
  return (
    <article className="group glass-card pulse-hover rounded-card overflow-hidden flex flex-col">
      <div className={`relative aspect-[16/10] bg-gradient-to-br ${grad} overflow-hidden`}>
        {item.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover_url} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-40">
            <span className="material-symbols-outlined text-5xl text-primary">
              {video ? 'play_circle' : 'auto_awesome'}
            </span>
          </div>
        )}
        {video && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-white/90 group-hover:scale-110 transition-transform">play_circle</span>
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col gap-3 flex-1">
        {item.category && (
          <span className="label-sm text-secondary">{item.category}</span>
        )}
        <h3 className="font-display text-lg font-medium leading-snug group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        {item.summary && (
          <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-3">{item.summary}</p>
        )}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-auto pt-2">
            {item.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[11px] px-2 py-0.5 rounded border border-secondary/40 text-secondary bg-secondary/5">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
