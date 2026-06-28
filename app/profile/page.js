'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import { loadSiteContent, saveSiteContent } from '@/lib/siteContent';

const CV_URL = 'https://lamthinh.vercel.app/cv.html';
const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';
const CONTENT_KEY = 'profile';

// --- Default content (used until an admin saves overrides to Supabase) ------
const DEFAULTS = {
  hero: {
    eyebrow: 'Program Director · Visiting Lecturer',
    name: 'Do Huynh Lam Thinh',
    tagline:
      "Educating the next generation of marketers & communicators across Vietnam's leading universities — where strategy meets the classroom.",
    bio: 'Program Director of Multimedia Communication at Hoa Sen University, and a visiting lecturer at UEF, SIU, HELP University (Malaysia), VATEL (France), Vietnam Aviation Academy, HUTECH, and VLU. With 3+ years in advertising and communication — media planning and account management at DatViet VAC and Mekong Communication — and 5+ years teaching IMC, Brand Management, Digital Marketing and Media Strategy, a published researcher with 6 peer-reviewed papers and faculty advisor for TVCreate across four seasons.',
  },
  stats: [
    { value: '6+', label: 'Years in Industry' },
    { value: '3+', label: 'Universities' },
    { value: '4+', label: 'TVCreate Seasons' },
    { value: '6+', label: 'Research Papers' },
  ],
  expertise: [
    { tag: 'Core', title: 'Marketing', items: ['Integrated Marketing Comm.', 'Brand Management', 'Consumer Behaviour', 'Social Media Marketing'] },
    { tag: 'Focus', title: 'Communication', items: ['Media Strategy & Tactics', 'Digital Marketing', 'Advertising & Branding', 'Public Relations'] },
    { tag: 'Pedagogy', title: 'Teaching', items: ['Curriculum Development', 'Student Event Leadership', 'Industry Case Studies', 'Hospitality Marketing'] },
  ],
  work: [
    { period: '2024–Present', kind: 'Full-time', role: 'Program Director', org: 'Multimedia Communication Program — Hoa Sen University', desc: "Leading the Multimedia Communication program, overseeing curriculum development, faculty coordination, and student experience. Driving the program's vision to integrate creative production with strategic communication for the digital age." },
    { period: '2024–2025', kind: 'Lecturer', role: 'Marketing Lecturer', org: 'Vietnam Aviation Academy', desc: 'Delivered marketing courses bridging strategic marketing principles with the aviation and service industries.' },
    { period: '2021', kind: 'Senior', role: 'Senior Account Executive', org: 'Mekong Communication', desc: 'Managed contracts and liquidation for clients. Built proposals from cross-team plans, controlled execution to ensure quality and KPI delivery.' },
    { period: '2018–2019', kind: 'Executive', role: 'Account Executive', org: 'Mekong Communication', desc: 'Handled contracts and liquidation, built proposals by consolidating cross-functional plans, ensured quality and KPI outcomes.' },
    { period: '2018', kind: 'Planner', role: 'Media Planner', org: 'DatViet VAC', desc: "Built proposals from customer insight, IMC plans and market research. Developed detailed communication plans at one of Vietnam's biggest advertising companies." },
    { period: '2017–2018', kind: 'Junior', role: 'Junior Booking Media', org: 'DatViet VAC', desc: 'Booked TV spots, newspaper and magazine slots; tracked stations to update client information.' },
    { period: '2017', kind: 'Intern', role: 'Intern Account Executive', org: 'IMA Company', desc: 'Finalized contracts with suppliers and clients; ensured quality event outcomes and managed logistics.' },
  ],
  education: [
    { period: '2021–2023', kind: 'Full-time', role: 'Faculty Member in Marketing', org: 'Hoa Sen University — Economic & Business Faculty', desc: 'Taught advertising & communication, branding, IMC, media strategy & tactics, and social media marketing. Led TVCreate 2022 and Hoasen Business Challenge 2022.' },
    { period: 'Visiting', kind: 'Adjunct', role: 'Visiting Lecturer', org: 'UEF — University of Economics & Finance', desc: 'Taught Brand Management, Digital Marketing, and Media Strategy & Tactics.' },
    { period: 'Visiting', kind: 'Adjunct', role: 'Visiting Lecturer', org: 'VATEL — International Hospitality Management School', desc: 'Delivered advertising, communication and marketing courses within the hospitality context.' },
    { period: '2022, 2023, 2025, 2026', kind: 'Faculty Advisor', role: 'Faculty Advisor — TVCreate', org: 'Hoa Sen University — Annual Advertising Film Program', desc: 'Mentored student teams through the creative and strategic process of producing advertising films across four seasons.' },
    { period: '2025', kind: 'Member', role: 'AUN-QA Accreditation Member', org: 'Marketing Program — AUN Quality Assessment 2025', desc: 'Contributed to quality assessment and program improvement for the Marketing undergraduate program.' },
  ],
  papers: [
    { year: '2025', journal: 'Intellectual Economics', title: 'Leveraging ICT For Product Innovation: Insights From Southeast Asian Countries' },
    { year: '2025', journal: 'International Journal of Innovation Science', title: 'Internationally Recognized Quality Certification, Human Capital and Process Innovation: The Moderating Role of Informal Competition' },
    { year: '2025', journal: 'Tạp chí Kinh tế và Dự báo', title: 'Tác Động Của Quản Trị Xanh Đến Đổi Mới Quy Trình Doanh Nghiệp: Vai Trò Điều Tiết Của Lãnh Đạo Nữ Và Kinh Nghiệm Quản Lý' },
    { year: '2024', journal: 'Journal of Social Economics Research', title: "Enhancing Employee's Job Satisfaction in Vietnam: Organizational Commitment, Supervisor Emotional Support and Training" },
    { year: '2024', journal: 'Tạp chí Phát triển và Hội nhập', title: 'Vai Trò Của Vốn Nhân Lực Trong Hoạt Động Xuất Khẩu Của Doanh Nghiệp: Bằng Chứng Từ Khu Vực ASEAN' },
    { year: '2023', journal: 'Int. Journal of Research in Education Humanities and Commerce', title: 'Evaluate The Impact Of Brand Equity On Customer Loyalty In The Alcoholic Beverage Market In Vietnam' },
  ],
  clients: ['ILA', 'EUROTILE', 'UMG MOTOR', 'SEAGATE', 'VIETLOTT', 'Hoi An Impression', 'HENNESSY', 'Carrie Junior', 'Lazada', 'NOVALAND', 'CGV'],
  contact: {
    heading: "Say hello — I'd love to collaborate",
    email: 'thinh.dhl3105@gmail.com',
    phone: '+84 39 376 32 35',
    linkedin: 'https://www.linkedin.com/in/lamthinh-dhly/',
    location: 'Ho Chi Minh City, VN',
  },
};

// --- Small immutable helpers ------------------------------------------------
const clone = (o) => JSON.parse(JSON.stringify(o));
function setIn(obj, path, val) {
  const next = clone(obj);
  let cur = next;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
  cur[path[path.length - 1]] = val;
  return next;
}
function getIn(obj, path) {
  return path.reduce((cur, k) => (cur == null ? cur : cur[k]), obj);
}
// Merge saved data over defaults so newly added default fields still appear.
function withDefaults(saved) {
  if (!saved || typeof saved !== 'object') return clone(DEFAULTS);
  return { ...clone(DEFAULTS), ...saved };
}

// --- Inline editable text ---------------------------------------------------
function Edit({ editing, path, value, onChange, as = 'span', className = '' }) {
  const Tag = as;
  if (!editing) return <Tag className={className}>{value}</Tag>;
  return (
    <Tag
      className={`${className} outline outline-1 outline-dashed outline-primary/50 rounded px-1 focus:outline-2 focus:outline-primary focus:bg-primary/5`}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => {
        const t = e.currentTarget.innerText;
        if (t !== value) onChange(path, t);
      }}
    >
      {value}
    </Tag>
  );
}

function RemoveBtn({ onClick }) {
  return (
    <button onClick={onClick} title="Xoá"
      className="text-error/80 hover:text-error text-xs border border-error/40 rounded px-2 py-0.5">
      ✕ Xoá
    </button>
  );
}
function AddBtn({ onClick, label }) {
  return (
    <button onClick={onClick}
      className="mt-4 inline-flex items-center gap-1 text-sm text-primary border border-primary/40 rounded-lg px-4 py-2 hover:bg-primary/10">
      + {label}
    </button>
  );
}

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

function Timeline({ rows, basePath, editing, set, add, remove }) {
  return (
    <div className="flex flex-col">
      {rows.map((r, i) => (
        <div key={i} className="grid md:grid-cols-[200px_1fr] gap-2 md:gap-8 py-6 border-t border-white/10">
          <div>
            <Edit as="p" className="font-display text-on-surface font-medium" editing={editing}
              path={[...basePath, i, 'period']} value={r.period} onChange={set} />
            <Edit as="span" className="text-xs text-secondary block" editing={editing}
              path={[...basePath, i, 'kind']} value={r.kind} onChange={set} />
          </div>
          <div>
            <Edit as="h3" className="font-display text-lg font-medium mb-1" editing={editing}
              path={[...basePath, i, 'role']} value={r.role} onChange={set} />
            <Edit as="p" className="text-sm text-primary/80 mb-2" editing={editing}
              path={[...basePath, i, 'org']} value={r.org} onChange={set} />
            <Edit as="p" className="text-sm text-on-surface-variant leading-relaxed" editing={editing}
              path={[...basePath, i, 'desc']} value={r.desc} onChange={set} />
            {editing && <div className="mt-2"><RemoveBtn onClick={() => remove(basePath, i)} /></div>}
          </div>
        </div>
      ))}
      {editing && (
        <AddBtn label="Thêm mục"
          onClick={() => add(basePath, { period: 'Năm', kind: 'Vai trò', role: 'Chức danh', org: 'Tổ chức', desc: 'Mô tả…' })} />
      )}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const isAdmin = !!user && user.email === ADMIN_EMAIL;

  const [content, setContent] = useState(DEFAULTS);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadSiteContent(CONTENT_KEY).then((saved) => {
      if (saved) setContent(withDefaults(saved));
    });
  }, []);

  const set = (path, val) => setContent((cur) => setIn(cur, path, val));
  const add = (path, blank) => setContent((cur) => { const n = clone(cur); getIn(n, path).push(blank); return n; });
  const remove = (path, idx) => setContent((cur) => { const n = clone(cur); getIn(n, path).splice(idx, 1); return n; });

  async function handleSave() {
    setSaving(true); setStatus('');
    const { error } = await saveSiteContent(CONTENT_KEY, content);
    setSaving(false);
    if (error) { setStatus('Lưu thất bại: ' + error); return; }
    setStatus('Đã lưu ✓'); setEditing(false);
    setTimeout(() => setStatus(''), 2600);
  }

  async function handleCancel() {
    const saved = await loadSiteContent(CONTENT_KEY);
    setContent(withDefaults(saved));
    setEditing(false);
  }

  function handleDownloadCV(e) {
    e.preventDefault();
    if (loading) return;
    if (user) window.open(CV_URL, '_blank', 'noopener,noreferrer');
    else router.push(`/login?next=${encodeURIComponent('/profile')}`);
  }

  const c = content;

  return (
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
      {/* Admin edit bar */}
      {isAdmin && (
        <div className="fixed right-5 bottom-5 z-50 flex items-center gap-2">
          {status && <span className="text-sm text-primary bg-surface-container/90 px-3 py-1.5 rounded-lg">{status}</span>}
          {!editing ? (
            <button onClick={() => setEditing(true)}
              className="bg-primary text-on-primary px-5 py-2.5 rounded-full text-sm font-bold hover:scale-95 transition-transform">
              ✎ Chỉnh sửa
            </button>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving}
                className="bg-primary text-on-primary px-5 py-2.5 rounded-full text-sm font-bold hover:scale-95 transition-transform disabled:opacity-50">
                {saving ? '…' : '💾 Lưu'}
              </button>
              <button onClick={handleCancel}
                className="glass-card px-5 py-2.5 rounded-full text-sm font-bold">Huỷ</button>
            </>
          )}
        </div>
      )}

      {/* Hero */}
      <header className="mb-20">
        <div className="flex items-center gap-3 mb-6">
          <span className="h-px w-12 bg-primary" />
          <Edit as="span" className="label-sm text-secondary tracking-widest" editing={editing}
            path={['hero', 'eyebrow']} value={c.hero.eyebrow} onChange={set} />
        </div>
        <Edit as="h1" className="h-xl mb-6 block" editing={editing}
          path={['hero', 'name']} value={c.hero.name} onChange={set} />
        <Edit as="p" className="text-xl text-on-surface-variant max-w-3xl leading-relaxed mb-6 block" editing={editing}
          path={['hero', 'tagline']} value={c.hero.tagline} onChange={set} />
        <Edit as="p" className="text-base text-on-surface-variant max-w-3xl leading-relaxed block" editing={editing}
          path={['hero', 'bio']} value={c.hero.bio} onChange={set} />
        <div className="flex flex-wrap gap-4 mt-8">
          <a href="https://lamthinh.vercel.app/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full text-sm font-bold hover:scale-95 transition-transform">
            <span className="material-symbols-outlined text-base">open_in_new</span> Full Portfolio
          </a>
          <button onClick={handleDownloadCV} className="inline-flex items-center gap-2 glass-card px-6 py-3 rounded-full text-sm font-bold hover:border-primary/50 transition-colors">
            <span className="material-symbols-outlined text-base">{user ? 'download' : 'lock'}</span>
            {user ? 'Download CV' : 'Đăng nhập để tải CV'}
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-20">
        {c.stats.map((s, i) => (
          <div key={i} className="glass-card rounded-card p-6 text-center">
            <Edit as="p" className="font-display text-4xl font-semibold text-primary mb-1 block" editing={editing}
              path={['stats', i, 'value']} value={s.value} onChange={set} />
            <Edit as="p" className="text-xs text-on-surface-variant uppercase tracking-wide block" editing={editing}
              path={['stats', i, 'label']} value={s.label} onChange={set} />
          </div>
        ))}
      </div>

      {/* Expertise */}
      <Section index="01" eyebrow="Expertise">
        <div className="grid md:grid-cols-3 gap-5">
          {c.expertise.map((e, ei) => (
            <div key={ei} className="glass-card pulse-hover rounded-card p-7">
              <Edit as="span" className="label-sm text-secondary" editing={editing}
                path={['expertise', ei, 'tag']} value={e.tag} onChange={set} />
              <Edit as="h3" className="font-display text-2xl font-medium mt-1 mb-5 block" editing={editing}
                path={['expertise', ei, 'title']} value={e.title} onChange={set} />
              <ul className="flex flex-col gap-3">
                {e.items.map((it, ii) => (
                  <li key={ii} className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-base">chevron_right</span>
                    <Edit as="span" editing={editing} path={['expertise', ei, 'items', ii]} value={it} onChange={set} />
                    {editing && (
                      <button onClick={() => remove(['expertise', ei, 'items'], ii)}
                        className="text-error/70 hover:text-error text-xs ml-1">✕</button>
                    )}
                  </li>
                ))}
              </ul>
              {editing && (
                <button onClick={() => add(['expertise', ei, 'items'], 'Kỹ năng mới')}
                  className="mt-3 text-xs text-primary border border-primary/40 rounded px-2 py-1">+ Thêm mục</button>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Working experience */}
      <Section index="02" eyebrow="Working Experience">
        <Timeline rows={c.work} basePath={['work']} editing={editing} set={set} add={add} remove={remove} />
      </Section>

      {/* Educational experience */}
      <Section index="03" eyebrow="Educational Experience">
        <Timeline rows={c.education} basePath={['education']} editing={editing} set={set} add={add} remove={remove} />
      </Section>

      {/* Published papers */}
      <Section index="04" eyebrow="Published Papers">
        <div className="grid md:grid-cols-2 gap-5">
          {c.papers.map((p, i) => (
            <div key={i} className="glass-card pulse-hover rounded-card p-6 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <Edit as="span" className="font-display text-2xl text-primary/60" editing={editing}
                  path={['papers', i, 'year']} value={p.year} onChange={set} />
                <span className="material-symbols-outlined text-secondary">science</span>
              </div>
              <Edit as="p" className="text-xs text-secondary mb-2 block" editing={editing}
                path={['papers', i, 'journal']} value={p.journal} onChange={set} />
              <Edit as="h3" className="font-display text-base font-medium leading-snug block" editing={editing}
                path={['papers', i, 'title']} value={p.title} onChange={set} />
              {editing && <div className="mt-3"><RemoveBtn onClick={() => remove(['papers'], i)} /></div>}
            </div>
          ))}
        </div>
        {editing && (
          <AddBtn label="Thêm bài báo"
            onClick={() => add(['papers'], { year: '2026', journal: 'Tạp chí', title: 'Tiêu đề bài báo…' })} />
        )}
      </Section>

      {/* Clients */}
      <Section index="05" eyebrow="Clients & Achievements">
        <div className="flex flex-wrap gap-3">
          {c.clients.map((cl, i) => (
            <span key={i} className="glass-card rounded-full px-5 py-2 text-sm text-on-surface-variant inline-flex items-center gap-2">
              <Edit as="span" editing={editing} path={['clients', i]} value={cl} onChange={set} />
              {editing && (
                <button onClick={() => remove(['clients'], i)} className="text-error/70 hover:text-error text-xs">✕</button>
              )}
            </span>
          ))}
          {editing && (
            <button onClick={() => add(['clients'], 'Khách hàng mới')}
              className="rounded-full px-5 py-2 text-sm text-primary border border-primary/40">+ Thêm</button>
          )}
        </div>
      </Section>

      {/* Contact */}
      <Section index="06" eyebrow="Let's Connect">
        <Edit as="h2" className="h-lg mb-8 block" editing={editing}
          path={['contact', 'heading']} value={c.contact.heading} onChange={set} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a href={`mailto:${c.contact.email}`} className="glass-card pulse-hover rounded-card p-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">mail</span>
            <Edit as="span" className="text-sm text-on-surface-variant break-all" editing={editing}
              path={['contact', 'email']} value={c.contact.email} onChange={set} />
          </a>
          <a href={`tel:${c.contact.phone.replace(/\s/g, '')}`} className="glass-card pulse-hover rounded-card p-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">call</span>
            <Edit as="span" className="text-sm text-on-surface-variant" editing={editing}
              path={['contact', 'phone']} value={c.contact.phone} onChange={set} />
          </a>
          <a href={c.contact.linkedin} target="_blank" rel="noreferrer" className="glass-card pulse-hover rounded-card p-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">link</span>
            <span className="text-sm text-on-surface-variant">LinkedIn</span>
          </a>
          <div className="glass-card rounded-card p-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">location_on</span>
            <Edit as="span" className="text-sm text-on-surface-variant" editing={editing}
              path={['contact', 'location']} value={c.contact.location} onChange={set} />
          </div>
        </div>
        {editing && (
          <label className="block mt-4 text-xs text-on-surface-variant">
            LinkedIn URL:
            <input value={c.contact.linkedin} onChange={(e) => set(['contact', 'linkedin'], e.target.value)}
              className="ml-2 bg-surface-container-lowest border border-white/10 rounded px-2 py-1 text-xs w-80 max-w-full" />
          </label>
        )}
      </Section>
    </div>
  );
}
