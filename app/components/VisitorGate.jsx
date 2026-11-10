'use client';

// v29: Cổng vào = "Văn phòng đăng ký công dân" của Knoworld City.
// Sinh viên → Resident Permit (thẻ cư dân), Giảng viên → City Council Pass, Khách → Visitor Visa.
// Logic giữ nguyên v25: kiểm tra MSSV, lưu site_visitors, đếm lượt ghé, chặn người bị tắt quyền.
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  FIELDS,
  hasRegistered,
  registerVisitor,
  checkStudentId,
  recordVisit,
  flushSessionDuration,
  isBlocked,
} from '@/lib/visitor';
import { useAuth } from './AuthProvider';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import './gate.css';

const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 65 }, (_, i) => CURRENT_YEAR - 16 - i);
const SKIP_PREFIXES = ['/login', '/admin'];

// Ba loại giấy cư trú.
const PERMITS = {
  student: {
    icon: 'school', code: 'R', color: '#c6bfff',
    title: 'Resident Permit', who: 'Students',
    desc: 'Full access to every district. Your student ID (MSSV) is checked against the class list.',
    perks: ['All case studies', 'My Journey & streak'],
  },
  lecturer: {
    icon: 'account_balance', code: 'C', color: '#ffd27a',
    title: 'City Council Pass', who: 'Lecturers',
    desc: 'Sign in with your account to build, manage and contribute to the city.',
    perks: ['Upload & manage', 'Admin City'],
  },
  stranger: {
    icon: 'luggage', code: 'V', color: '#7ef0ff',
    title: 'Visitor Visa', who: 'Guests',
    desc: 'Just passing through? Register a few details and tour selected buildings.',
    perks: ['Selected case studies', 'No ID needed'],
  },
};

// Số công dân cố định theo email — cùng email luôn ra cùng số.
function citizenNo(seed, code) {
  let h = 2166136261;
  for (const ch of (seed || 'knoworld').toLowerCase()) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const n = String((h >>> 0) % 100000).padStart(5, '0');
  return `KW-${String(CURRENT_YEAR).slice(2)}${code}-${n}`;
}

const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function VisitorGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [step, setStep] = useState('role'); // role | student | stranger | lecturer | issued

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [field, setField] = useState('');
  const [otherField, setOtherField] = useState('');
  const [studentId, setStudentId] = useState('');
  const [agree, setAgree] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [issuedRole, setIssuedRole] = useState('student');

  useEffect(() => {
    setMounted(true);
    setRegistered(hasRegistered());
    setBlocked(isBlocked());
  }, []);

  const skip = SKIP_PREFIXES.some((p) => pathname?.startsWith(p));

  // --- Ghi lần truy cập + đo thời lượng + ép đánh giá lần thứ 3 ---------------
  useEffect(() => {
    if (!mounted || skip || user || !registered) return;
    let active = true;
    let acc = 0;
    (async () => {
      const { blocked: b, visitCount } = await recordVisit();
      if (!active) return;
      if (b) { setBlocked(true); return; }
      window.dispatchEvent(new CustomEvent('kw-check-review', { detail: { visitCount } }));
    })();
    const HEARTBEAT = 20;
    const flushNow = () => { if (acc > 0) { flushSessionDuration(acc); acc = 0; } };
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        acc += HEARTBEAT;
        if (acc >= 60) flushNow();
      }
    }, HEARTBEAT * 1000);
    const onVisibility = () => { if (document.visibilityState === 'hidden') flushNow(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushNow);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushNow);
      flushNow();
    };
  }, [mounted, skip, user, registered]);

  const role = step === 'issued' ? issuedRole : step;
  const permit = PERMITS[role] || PERMITS.student;
  const resolvedField = field === 'Other' ? otherField.trim() : field;
  const number = useMemo(() => citizenNo(email.trim() || fullName.trim(), permit.code), [email, fullName, permit.code]);

  if (blocked && !skip && !user) {
    return (
      <div className="kwg">
        <div className="kwg-card kwg-narrow" style={{ textAlign: 'center' }}>
          <span className="material-symbols-outlined kwg-blocked-icon">gpp_bad</span>
          <h1 className="kwg-h1">Permit revoked</h1>
          <p className="kwg-sub">
            Your access to Knoworld City has been disabled by the administrator. If you think this
            is a mistake, please contact us with the email you registered.
          </p>
        </div>
      </div>
    );
  }

  if (!mounted || skip || loading || user || registered) return null;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const baseValid = fullName.trim().length > 1 && emailOk && !!resolvedField && agree && !busy;
  const canSubmit = step === 'student' ? baseValid && studentId.trim().length > 0 : baseValid;

  async function handleDetailsSubmit(e) {
    e.preventDefault();
    setError('');
    if (!canSubmit) {
      setError(
        !agree
          ? 'Please tick the citizen pledge to continue.'
          : step === 'student'
            ? 'Please fill in your full name, student ID (MSSV), a valid email and your district.'
            : 'Please fill in your full name, a valid email and your district.',
      );
      return;
    }
    setBusy(true);
    if (step === 'student') {
      const check = await checkStudentId(studentId);
      if (!check.ok) {
        setBusy(false);
        setError(check.error || 'Your student ID is not on the approved list.');
        return;
      }
    }
    const res = await registerVisitor({
      fullName, email, birthYear, field: resolvedField, role: step,
      studentId: step === 'student' ? studentId : null,
    });
    setBusy(false);
    if (!res.ok) { setError(res.error || "Couldn't file your application. Please try again."); return; }
    setIssuedRole(step);
    setStep('issued');
  }

  async function handleLecturerSignIn(e) {
    e.preventDefault();
    setError('');
    if (!isSupabaseConfigured) { setError('Sign-in is not available (Supabase is not configured).'); return; }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password });
    setBusy(false);
    if (err) setError(err.message);
  }

  const go = (s) => { setError(''); setStep(s); };

  return (
    <div className="kwg" role="dialog" aria-modal="true" aria-label="Knoworld City citizen registration">
      <div className={`kwg-card ${step === 'student' || step === 'stranger' ? 'is-wide' : ''}`}>
        <header className="kwg-head">
          <CitySeal />
          <div className="kwg-head-text">
            <span className="kwg-kicker">Knoworld City · Civil Registry Office</span>
            <span className="kwg-form-no">Form KW-01 · Application for residency</span>
          </div>
        </header>

        {step === 'role' && (
          <>
            <h1 className="kwg-h1">Become a citizen of Knoworld</h1>
            <p className="kwg-sub">Choose the permit that fits you. It takes under a minute.</p>
            <div className="kwg-permits">
              {(['student', 'lecturer', 'stranger']).map((k) => {
                const p = PERMITS[k];
                return (
                  <button key={k} type="button" className="kwg-permit" style={{ '--c': p.color }} onClick={() => go(k)}>
                    <span className="kwg-permit-icon material-symbols-outlined" aria-hidden="true">{p.icon}</span>
                    <span className="kwg-permit-body">
                      <span className="kwg-permit-who">{p.who}</span>
                      <span className="kwg-permit-title">{p.title}</span>
                      <span className="kwg-permit-desc">{p.desc}</span>
                      <span className="kwg-perks">{p.perks.map((x) => <span key={x}>{x}</span>)}</span>
                    </span>
                    <span className="kwg-permit-stub" aria-hidden="true">
                      <span>{p.code}</span>
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="kwg-foot">Already a council member? Choose <b>City Council Pass</b> to sign in.</p>
          </>
        )}

        {(step === 'student' || step === 'stranger') && (
          <>
            <BackBar onBack={() => go('role')} permit={permit} />
            <div className="kwg-split">
            <div className="kwg-split-aside">
              <IdCard
                permit={permit} number={number}
                name={fullName} sid={step === 'student' ? studentId : null}
                district={resolvedField} year={birthYear}
              />
              <p className="kwg-aside-note">Your citizen card fills in as you type. It is stamped once the registry approves your application.</p>
            </div>
            <form onSubmit={handleDetailsSubmit} className="kwg-form" noValidate>
              <Section n="01" title="Identity">
                <Field label="Full name" req>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="kwg-input" placeholder="Nguyen Van A" autoFocus autoComplete="name" />
                </Field>
                {step === 'student' && (
                  <Field label="Student ID (MSSV)" req>
                    <input value={studentId} onChange={(e) => setStudentId(e.target.value)} className="kwg-input" placeholder="e.g. 2153xxxx" inputMode="numeric" />
                  </Field>
                )}
                <Field label="Year of birth">
                  <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className="kwg-input">
                    <option value="">— Select —</option>
                    {BIRTH_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </Field>
              </Section>

              <Section n="02" title="Contact address">
                <Field label="Email" req>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="kwg-input" placeholder="you@example.com" autoComplete="email" />
                </Field>
              </Section>

              <Section n="03" title="Home district">
                <p className="kwg-hint">Which field do you want to live in?</p>
                <div className="kwg-districts" role="radiogroup" aria-label="Home district">
                  {FIELDS.map((f) => (
                    <button key={f} type="button" role="radio" aria-checked={field === f}
                      className={field === f ? 'on' : ''} onClick={() => setField(f)}>{f}</button>
                  ))}
                </div>
                {field === 'Other' && (
                  <input value={otherField} onChange={(e) => setOtherField(e.target.value)} className="kwg-input mt" placeholder="Type your field" />
                )}
              </Section>

              <label className="kwg-pledge">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>I pledge to explore with curiosity, share what I learn, and keep the city kind.
                  My details are used internally only, to improve the content.</span>
              </label>

              {error && <p className="kwg-error">{error}</p>}

              <button type="submit" disabled={!canSubmit} className="kwg-submit" style={{ '--c': permit.color }}>
                {busy ? (step === 'student' ? 'Checking the class list…' : 'Filing…') : `Issue my ${permit.title}`}
                {!busy && <span className="material-symbols-outlined" aria-hidden="true">approval</span>}
              </button>
            </form>
            </div>
          </>
        )}

        {step === 'lecturer' && (
          <>
            <BackBar onBack={() => go('role')} permit={permit} />
            <h1 className="kwg-h1">Council sign-in</h1>
            <p className="kwg-sub">Show your pass to enter City Hall.</p>
            <form onSubmit={handleLecturerSignIn} className="kwg-form">
              <Section n="01" title="Credentials">
                <Field label="Email">
                  <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="kwg-input" placeholder="you@example.com" autoFocus autoComplete="email" />
                </Field>
                <Field label="Password">
                  <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="kwg-input" placeholder="••••••••" autoComplete="current-password" />
                </Field>
              </Section>
              {error && <p className="kwg-error">{error}</p>}
              <button type="submit" disabled={busy} className="kwg-submit" style={{ '--c': permit.color }}>
                {busy ? 'Checking your pass…' : 'Enter City Hall'}
                {!busy && <span className="material-symbols-outlined" aria-hidden="true">key</span>}
              </button>
              <p className="kwg-foot">
                No council pass yet?{' '}
                <button type="button" onClick={() => router.push('/login')} className="kwg-link">Request one</button>
              </p>
            </form>
          </>
        )}

        {step === 'issued' && (
          <div className="kwg-issued">
            <IdCard permit={permit} number={number} name={fullName} sid={issuedRole === 'student' ? studentId : null} district={resolvedField} year={birthYear} stamped />
            <h1 className="kwg-h1">Welcome, citizen!</h1>
            <p className="kwg-sub">
              Your {permit.title} <b>{number}</b> has been issued. Every building in the city is now open
              {issuedRole === 'stranger' ? ' for your tour.' : ' to you.'}
            </p>
            <button type="button" className="kwg-submit" style={{ '--c': permit.color }} onClick={() => setRegistered(true)}>
              Enter the city <span className="material-symbols-outlined" aria-hidden="true">location_city</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BackBar({ onBack, permit }) {
  return (
    <div className="kwg-backbar">
      <button type="button" onClick={onBack} className="kwg-back">
        <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span> Permits
      </button>
      <span className="kwg-chip" style={{ '--c': permit.color }}>{permit.title}</span>
    </div>
  );
}

function IdCard({ permit, number, name, sid, district, year, stamped = false }) {
  return (
    <div className={`kwg-id ${stamped ? 'is-stamped' : ''}`} style={{ '--c': permit.color }}>
      <div className="kwg-id-top">
        <span>Knoworld City</span>
        <span>{permit.title}</span>
      </div>
      <div className="kwg-id-main">
        <div className="kwg-id-photo" aria-hidden="true">
          {name.trim() ? name.trim().split(/\s+/).slice(-1)[0].slice(0, 1).toUpperCase() : <span className="material-symbols-outlined">person</span>}
        </div>
        <dl className="kwg-id-fields">
          <div className="wide"><dt>Name</dt><dd>{name.trim() || '—'}</dd></div>
          {sid !== null && <div><dt>MSSV</dt><dd>{sid?.trim() || '—'}</dd></div>}
          <div><dt>District</dt><dd>{district || '—'}</dd></div>
          <div><dt>Born</dt><dd>{year || '—'}</dd></div>
          <div><dt>Issued</dt><dd>{today()}</dd></div>
        </dl>
      </div>
      <div className="kwg-id-mrz">{number} &lt;&lt;&lt; {(name || 'CITIZEN').toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, '<').slice(0, 22)}</div>
      {stamped && <div className="kwg-stamp" aria-hidden="true">Approved</div>}
    </div>
  );
}

function Section({ n, title, children }) {
  return (
    <fieldset className="kwg-section">
      <legend><span>{n}</span>{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, req, children }) {
  return (
    <label className="kwg-field">
      <span className="kwg-label">{label}{req && <i> *</i>}</span>
      {children}
    </label>
  );
}

function CitySeal() {
  return (
    <svg className="kwg-seal" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="17.5" fill="none" stroke="currentColor" strokeWidth=".8" strokeDasharray="1.5 2" />
      <path d="M13 31h22M15 31V22h4v9M21 31V16h6v15M29 31V20h4v11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="24" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}
