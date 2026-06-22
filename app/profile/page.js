'use client';

const STATS = [
  { value: '6+', label: 'Years in Industry' },
  { value: '3+', label: 'Universities' },
  { value: '4+', label: 'TVCreate Seasons' },
  { value: '6+', label: 'Research Papers' },
];

const EXPERTISE = [
  {
    tag: 'Core',
    title: 'Marketing',
    items: ['Integrated Marketing Comm.', 'Brand Management', 'Consumer Behaviour', 'Social Media Marketing'],
  },
  {
    tag: 'Focus',
    title: 'Communication',
    items: ['Media Strategy & Tactics', 'Digital Marketing', 'Advertising & Branding', 'Public Relations'],
  },
  {
    tag: 'Pedagogy',
    title: 'Teaching',
    items: ['Curriculum Development', 'Student Event Leadership', 'Industry Case Studies', 'Hospitality Marketing'],
  },
];

const WORK_EXPERIENCE = [
  {
    period: '2024–Present',
    kind: 'Full-time',
    role: 'Program Director',
    org: 'Multimedia Communication Program — Hoa Sen University',
    desc: "Leading the Multimedia Communication program, overseeing curriculum development, faculty coordination, and student experience. Driving the program's vision to integrate creative production with strategic communication for the digital age.",
  },
  {
    period: '2024–2025',
    kind: 'Lecturer',
    role: 'Marketing Lecturer',
    org: 'Vietnam Aviation Academy',
    desc: 'Delivered marketing courses bridging strategic marketing principles with the aviation and service industries.',
  },
  {
    period: '2021',
    kind: 'Senior',
    role: 'Senior Account Executive',
    org: 'Mekong Communication',
    desc: 'Managed contracts and liquidation for clients. Built proposals from cross-team plans, controlled execution to ensure quality and KPI delivery.',
  },
  {
    period: '2018–2019',
    kind: 'Executive',
    role: 'Account Executive',
    org: 'Mekong Communication',
    desc: 'Handled contracts and liquidation, built proposals by consolidating cross-functional plans, ensured quality and KPI outcomes.',
  },
  {
    period: '2018',
    kind: 'Planner',
    role: 'Media Planner',
    org: 'DatViet VAC',
    desc: 'Built proposals from customer insight, IMC plans and market research. Developed detailed communication plans at one of Vietnam’s biggest advertising companies.',
  },
  {
    period: '2017–2018',
    kind: 'Junior',
    role: 'Junior Booking Media',
    org: 'DatViet VAC',
    desc: 'Booked TV spots, newspaper and magazine slots; tracked stations to update client information.',
  },
  {
    period: '2017',
    kind: 'Intern',
    role: 'Intern Account Executive',
    org: 'IMA Company',
    desc: 'Finalized contracts with suppliers and clients; ensured quality event outcomes and managed logistics.',
  },
];

const EDUCATION_EXPERIENCE = [
  {
    period: '2021–2023',
    kind: 'Full-time',
    role: 'Faculty Member in Marketing',
    org: 'Hoa Sen University — Economic & Business Faculty',
    desc: 'Taught advertising & communication, branding, IMC, media strategy & tactics, and social media marketing. Led TVCreate 2022 and Hoasen Business Challenge 2022.',
  },
  {
    period: 'Visiting',
    kind: 'Adjunct',
    role: 'Visiting Lecturer',
    org: 'UEF — University of Economics & Finance',
    desc: 'Taught Brand Management, Digital Marketing, and Media Strategy & Tactics.',
  },
  {
    period: 'Visiting',
    kind: 'Adjunct',
    role: 'Visiting Lecturer',
    org: 'VATEL — International Hospitality Management School',
    desc: 'Delivered advertising, communication and marketing courses within the hospitality context.',
  },
  {
    period: '2022, 2023, 2025, 2026',
    kind: 'Faculty Advisor',
    role: 'Faculty Advisor — TVCreate',
    org: 'Hoa Sen University — Annual Advertising Film Program',
    desc: 'Mentored student teams through the creative and strategic process of producing advertising films across four seasons.',
  },
  {
    period: '2025',
    kind: 'Member',
    role: 'AUN-QA Accreditation Member',
    org: 'Marketing Program — AUN Quality Assessment 2025',
    desc: 'Contributed to quality assessment and program improvement for the Marketing undergraduate program.',
  },
];

const PAPERS = [
  { year: '2025', journal: 'Intellectual Economics', title: 'Leveraging ICT For Product Innovation: Insights From Southeast Asian Countries' },
  { year: '2025', journal: 'International Journal of Innovation Science', title: 'Internationally Recognized Quality Certification, Human Capital and Process Innovation: The Moderating Role of Informal Competition' },
  { year: '2025', journal: 'Tạp chí Kinh tế và Dự báo', title: 'Tác Động Của Quản Trị Xanh Đến Đổi Mới Quy Trình Doanh Nghiệp: Vai Trò Điều Tiết Của Lãnh Đạo Nữ Và Kinh Nghiệm Quản Lý' },
  { year: '2024', journal: 'Journal of Social Economics Research', title: "Enhancing Employee's Job Satisfaction in Vietnam: Organizational Commitment, Supervisor Emotional Support and Training" },
  { year: '2024', journal: 'Tạp chí Phát triển và Hội nhập', title: 'Vai Trò Của Vốn Nhân Lực Trong Hoạt Động Xuất Khẩu Của Doanh Nghiệp: Bằng Chứng Từ Khu Vực ASEAN' },
  { year: '2023', journal: 'Int. Journal of Research in Education Humanities and Commerce', title: 'Evaluate The Impact Of Brand Equity On Customer Loyalty In The Alcoholic Beverage Market In Vietnam' },
];

const CLIENTS = ['ILA', 'EUROTILE', 'UMG MOTOR', 'SEAGATE', 'VIETLOTT', 'Hoi An Impression', 'HENNESSY', 'Carrie Junior', 'Lazada', 'NOVALAND', 'CGV'];

function Section({ index, eyebrow, children }) {
  return (
    <section className="mb-20">
      <div className="flex items-center gap-3 mb-8">
        <span className="font-display text-sm text-primary/70">{index}</span>
        <span className="h-px w-12 bg-primary" />
        <span className="label-sm text-secondary tracking-widest">{eyebrow}</span>
      </div>
      {children}
    </section>
  );
}

function Timeline({ rows }) {
  return (
    <div className="flex flex-col">
      {rows.map((r, i) => (
        <div key={i} className="grid md:grid-cols-[200px_1fr] gap-2 md:gap-8 py-6 border-t border-white/10">
          <div>
            <p className="font-display text-on-surface font-medium">{r.period}</p>
            <span className="text-xs text-secondary">{r.kind}</span>
          </div>
          <div>
            <h3 className="font-display text-lg font-medium mb-1">{r.role}</h3>
            <p className="text-sm text-primary/80 mb-2">{r.org}</p>
            <p className="text-sm text-on-surface-variant leading-relaxed">{r.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
      {/* Hero */}
      <header className="mb-20">
        <div className="flex items-center gap-3 mb-6">
          <span className="h-px w-12 bg-primary" />
          <span className="label-sm text-secondary tracking-widest">Program Director · Visiting Lecturer</span>
        </div>
        <h1 className="h-xl mb-6">Do Huynh Lam Thinh</h1>
        <p className="text-xl text-on-surface-variant max-w-3xl leading-relaxed mb-6">
          Educating the next generation of marketers &amp; communicators across Vietnam&apos;s leading
          universities — where strategy meets the classroom.
        </p>
        <p className="text-base text-on-surface-variant max-w-3xl leading-relaxed">
          Program Director of Multimedia Communication at <span className="text-on-surface">Hoa Sen University</span>, and
          a visiting lecturer at UEF, SIU, HELP University (Malaysia), VATEL (France), Vietnam Aviation Academy,
          HUTECH, and VLU. With 3+ years in advertising and communication — media planning and account management at
          DatViet VAC and Mekong Communication — and 5+ years teaching IMC, Brand Management, Digital Marketing and
          Media Strategy, a published researcher with 6 peer-reviewed papers and faculty advisor for TVCreate across
          four seasons.
        </p>
        <div className="flex flex-wrap gap-4 mt-8">
          <a href="https://lamthinh.vercel.app/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full text-sm font-bold hover:scale-95 transition-transform">
            <span className="material-symbols-outlined text-base">open_in_new</span> Full Portfolio
          </a>
          <a href="https://lamthinh.vercel.app/cv.html" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 glass-card px-6 py-3 rounded-full text-sm font-bold hover:border-primary/50 transition-colors">
            <span className="material-symbols-outlined text-base">download</span> Download CV
          </a>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-20">
        {STATS.map((s) => (
          <div key={s.label} className="glass-card rounded-card p-6 text-center">
            <p className="font-display text-4xl font-semibold text-primary mb-1">{s.value}</p>
            <p className="text-xs text-on-surface-variant uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Expertise */}
      <Section index="01" eyebrow="Expertise">
        <div className="grid md:grid-cols-3 gap-5">
          {EXPERTISE.map((e) => (
            <div key={e.title} className="glass-card pulse-hover rounded-card p-7">
              <span className="label-sm text-secondary">{e.tag}</span>
              <h3 className="font-display text-2xl font-medium mt-1 mb-5">{e.title}</h3>
              <ul className="flex flex-col gap-3">
                {e.items.map((it) => (
                  <li key={it} className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-base">chevron_right</span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Working experience */}
      <Section index="02" eyebrow="Working Experience">
        <Timeline rows={WORK_EXPERIENCE} />
      </Section>

      {/* Educational experience */}
      <Section index="03" eyebrow="Educational Experience">
        <Timeline rows={EDUCATION_EXPERIENCE} />
      </Section>

      {/* Published papers */}
      <Section index="04" eyebrow="Published Papers">
        <div className="grid md:grid-cols-2 gap-5">
          {PAPERS.map((p, i) => (
            <div key={i} className="glass-card pulse-hover rounded-card p-6 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display text-2xl text-primary/60">{p.year}</span>
                <span className="material-symbols-outlined text-secondary">science</span>
              </div>
              <p className="text-xs text-secondary mb-2">{p.journal}</p>
              <h3 className="font-display text-base font-medium leading-snug">{p.title}</h3>
            </div>
          ))}
        </div>
      </Section>

      {/* Clients */}
      <Section index="05" eyebrow="Clients & Achievements">
        <div className="flex flex-wrap gap-3">
          {CLIENTS.map((c) => (
            <span key={c} className="glass-card rounded-full px-5 py-2 text-sm text-on-surface-variant">
              {c}
            </span>
          ))}
        </div>
      </Section>

      {/* Contact */}
      <Section index="06" eyebrow="Let's Connect">
        <h2 className="h-lg mb-8">
          Say hello — <span className="text-primary">I&apos;d love to collaborate</span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a href="mailto:thinh.dhl3105@gmail.com" className="glass-card pulse-hover rounded-card p-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">mail</span>
            <span className="text-sm text-on-surface-variant break-all">thinh.dhl3105@gmail.com</span>
          </a>
          <a href="tel:+84393763235" className="glass-card pulse-hover rounded-card p-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">call</span>
            <span className="text-sm text-on-surface-variant">+84 39 376 32 35</span>
          </a>
          <a href="https://www.linkedin.com/in/lamthinh-dhly/" target="_blank" rel="noreferrer" className="glass-card pulse-hover rounded-card p-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">link</span>
            <span className="text-sm text-on-surface-variant">LinkedIn</span>
          </a>
          <div className="glass-card rounded-card p-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">location_on</span>
            <span className="text-sm text-on-surface-variant">Ho Chi Minh City, VN</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
