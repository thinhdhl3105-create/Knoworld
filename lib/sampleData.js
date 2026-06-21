// Sample/placeholder content used when Supabase is not yet configured,
// and as fallback seed. Mirrors the public.content table shape.

export const sampleContent = [
  // ---- RESEARCH ----
  {
    id: 's-r1', kind: 'research', category: 'Cognitive Science',
    title: 'Neural Resonances in Multi-Dimensional Data Voids',
    summary: 'Exploring how synthetic cognition adapts to non-Euclidean information fields and the emergent patterns therein.',
    tags: ['neural', 'cognition', 'featured'], featured: true,
    created_at: '2026-03-12',
  },
  {
    id: 's-r2', kind: 'research', category: 'Ethics',
    title: 'Synthetic Neural Ethics',
    summary: 'Establishing a behavioral framework for autonomous system accountability across distributed agents.',
    tags: ['ethics', 'ai'], created_at: '2026-02-28',
  },
  {
    id: 's-r3', kind: 'research', category: 'Physics',
    title: 'Deep Space Latency',
    summary: 'Quantifying cognitive downstream in observer-relative time across interstellar communication.',
    tags: ['physics', 'time'], created_at: '2026-02-10',
  },
  {
    id: 's-r4', kind: 'research', category: 'Networks',
    title: 'Bioluminescent Networks',
    summary: 'Investigating the use of synthetic biology to model healthier large-scale data routing.',
    tags: ['biology', 'networks'], created_at: '2026-01-22',
  },
  // ---- STUDENT ----
  {
    id: 's-s1', kind: 'student', category: 'Urban Design',
    title: 'Biosphere Alpha: Regenerative Urban Habitats',
    summary: 'A self-sustaining city model integrating vertical agriculture and closed-loop resource systems.',
    tags: ['sustainability', 'design', 'featured'], featured: true,
    created_at: '2026-03-01',
  },
  {
    id: 's-s2', kind: 'student', category: 'Neuroscience',
    title: 'Cognitive Mapping',
    summary: 'Visualizing memory pathways with non-invasive spatial reconstruction techniques.',
    tags: ['brain', 'mapping'], created_at: '2026-02-18',
  },
  {
    id: 's-s3', kind: 'student', category: 'Robotics',
    title: 'Prosthetic Harmony',
    summary: 'Neural-linked prosthetics that adapt motor intent in real time.',
    tags: ['robotics', 'health'], created_at: '2026-02-05',
  },
  {
    id: 's-s4', kind: 'student', category: 'Agriculture',
    title: 'Arid Agriculture',
    summary: 'Drought-resistant crop systems engineered for extreme climates.',
    tags: ['climate', 'food'], created_at: '2026-01-30',
  },
  {
    id: 's-s5', kind: 'student', category: 'Materials',
    title: 'Luminescent Threads',
    summary: 'Self-charging textiles that emit ambient light from kinetic motion.',
    tags: ['materials', 'energy'], created_at: '2026-01-15',
  },
  {
    id: 's-s6', kind: 'student', category: 'Marine',
    title: 'The Living Archive',
    summary: 'A coral-based data preservation concept for long-term ecological memory.',
    tags: ['marine', 'data'], created_at: '2026-01-08',
  },
  // ---- VIDEO ----
  {
    id: 's-v1', kind: 'video', category: 'Strategy Breakdowns',
    title: 'Quantum Encryption: The Unbreakable Code',
    summary: 'A visual breakdown of how quantum key distribution secures tomorrow’s networks.',
    tags: ['quantum', 'security', 'featured'], featured: true,
    media_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', created_at: '2026-03-05',
  },
  {
    id: 's-v2', kind: 'video', category: 'Strategy Breakdowns',
    title: 'The Ethics of Synthetic Biology',
    summary: 'Scaling the cosmos: a measured look at where biology meets engineering.',
    tags: ['biology', 'ethics'], created_at: '2026-02-20',
  },
  {
    id: 's-v3', kind: 'video', category: 'Creative Process',
    title: 'Visualizing Complexity: The Design System Journey',
    summary: 'From chaos to clarity — building a design language for cosmic data.',
    tags: ['design', 'process'], created_at: '2026-02-11',
  },
  {
    id: 's-v4', kind: 'video', category: 'Pitch Recordings',
    title: 'Quantum-Encrypted Series B Board Meeting',
    summary: 'A full pitch recording exploring the future of secure infrastructure.',
    tags: ['pitch', 'startup'], created_at: '2026-01-28',
  },
];

export const sampleByKind = (kind) => sampleContent.filter((c) => c.kind === kind);
