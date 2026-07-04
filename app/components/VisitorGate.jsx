'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  FIELDS,
  hasRegistered,
  registerVisitor,
  checkStudentId,
  recordVisit,
  flushSessionDuration,
  isBlocked,
  MANDATORY_REVIEW_VISIT,
} from '@/lib/visitor';
import { hasReviewed } from '@/lib/reviews';
import { useAuth } from './AuthProvider';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const CURRENT_YEAR = new Date().getFullYear();
// Birth years: from age 16 to age 80.
const BIRTH_YEARS = Array.from({ length: 65 }, (_, i) => CURRENT_YEAR - 16 - i);

// Don't show the gate on admin / login routes.
const SKIP_PREFIXES = ['/login', '/admin'];

export default function VisitorGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [step, setStep] = useState('role'); // role | student | stranger | lecturer

  // Student / stranger form (dùng chung — student có thêm MSSV)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [field, setField] = useState('');
  const [otherField, setOtherField] = useState('');
  const [studentId, setStudentId] = useState('');

  // Lecturer sign-in
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
    let acc = 0; // giây tích luỹ chưa gửi

    (async () => {
      const { blocked: b, visitCount } = await recordVisit();
      if (!active) return;
      if (b) {
        setBlocked(true);
        return;
      }
      // Đủ số lần truy cập -> bắt buộc đánh giá (chặn cứng).
      if (visitCount >= MANDATORY_REVIEW_VISIT && !hasReviewed()) {
        window.dispatchEvent(new CustomEvent('kw-force-review'));
      }
    })();

    const HEARTBEAT = 20; // giây
    const flushNow = () => {
      if (acc > 0) {
        flushSessionDuration(acc);
        acc = 0;
      }
    };
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        acc += HEARTBEAT;
        if (acc >= 60) flushNow();
      }
    }, HEARTBEAT * 1000);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushNow();
    };
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

  // Người bị admin tắt quyền truy cập -> màn hình chặn (trừ /admin, /login).
  if (blocked && !skip && !user) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md">
        <div className="relative w-full max-w-md glass-card rounded-card p-8 text-center">
          <span className="material-symbols-outlined text-error text-4xl mb-3">block</span>
          <h1 className="h-md mb-2">Access disabled</h1>
          <p className="text-sm text-on-surface-variant">
            Your access to Knoworld has been disabled by the administrator. If you think this
            is a mistake, please contact us with the email you registered.
          </p>
        </div>
      </div>
    );
  }

  // Hide the gate for: unmounted, skipped routes, signed-in lecturers, or registered students.
  if (!mounted || skip || loading || user || registered) return null;

  // ---- Student / stranger submit ---------------------------------------------
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const resolvedField = field === 'Other' ? otherField.trim() : field;
  const baseValid = fullName.trim().length > 1 && emailOk && !!resolvedField && !busy;
  const canSubmitStudent = baseValid && studentId.trim().length > 0;
  const canSubmitStranger = baseValid;

  async function handleDetailsSubmit(e, role) {
    e.preventDefault();
    setError('');
    const canSubmit = role === 'student' ? canSubmitStudent : canSubmitStranger;
    if (!canSubmit) {
      setError(
        role === 'student'
          ? 'Please fill in your full name, student ID (MSSV), a valid email and your field.'
          : 'Please fill in your full name, a valid email and your field.'
      );
      return;
    }
    setBusy(true);

    // Student: MSSV phải nằm trong danh sách được duyệt.
    if (role === 'student') {
      const check = await checkStudentId(studentId);
      if (!check.ok) {
        setBusy(false);
        setError(check.error || 'Your student ID is not on the approved list.');
        return;
      }
    }

    const res = await registerVisitor({
      fullName,
      email,
      birthYear,
      field: resolvedField,
      role,
      studentId: role === 'student' ? studentId : null,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Couldn't save your details. Please try again.");
      return;
    }
    setRegistered(true);
  }

  // ---- Lecturer sign-in -----------------------------------------------------
  async function handleLecturerSignIn(e) {
    e.preventDefault();
    setError('');
    if (!isSupabaseConfigured) {
      setError('Sign-in is not available (Supabase is not configured).');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    // On success the auth state updates and the gate hides automatically.
  }

  const back = () => {
    setError('');
    setStep('role');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md overflow-y-auto">
      <div className="nebula w-[420px] h-[420px] -top-20 -right-20 hidden md:block pointer-events-none" />
      <div className="relative w-full max-w-md glass-card rounded-card p-7 my-8">
        <div className="flex items-center gap-2 mb-5">
          <span className="material-symbols-outlined text-primary">blur_on</span>
          <span className="font-display text-xl font-semibold">Knoworld</span>
        </div>

        {/* STEP 1 — choose role */}
        {step === 'role' && (
          <>
            <h1 className="h-md mb-1">Welcome to Knoworld</h1>
            <p className="text-sm text-on-surface-variant mb-6">
              Tell us who you are to get started.
            </p>
            <div className="flex flex-col gap-3">
              <RoleCard
                icon="school"
                title="I'm a Student"
                desc="Enter your student ID (MSSV) to unlock all case studies."
                onClick={() => { setError(''); setStep('student'); }}
              />
              <RoleCard
                icon="co_present"
                title="I'm a Lecturer"
                desc="Sign in with your account to manage and contribute."
                onClick={() => { setError(''); setStep('lecturer'); }}
              />
              <RoleCard
                icon="waving_hand"
                title="I'm a Guest"
                desc="Just curious? Share a few details and preview selected case studies."
                onClick={() => { setError(''); setStep('stranger'); }}
              />
            </div>
          </>
        )}

        {/* STEP 2a — student / guest details (student needs MSSV) */}
        {(step === 'student' || step === 'stranger') && (
          <>
            <button onClick={back} className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary mb-3">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back
            </button>
            <h1 className="h-md mb-1">A few details</h1>
            <p className="text-sm text-on-surface-variant mb-6">
              {step === 'student'
                ? 'Your student ID is checked against the class list to unlock full access.'
                : "This helps us understand who's interested. As a guest you can preview a selection of case studies."}
            </p>

            <form onSubmit={(e) => handleDetailsSubmit(e, step)} className="flex flex-col gap-4">
              <Field label="Full name *">
                <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className={inputCls} placeholder="Jane Doe" autoFocus />
              </Field>
              {step === 'student' && (
                <Field label="Student ID (MSSV) *">
                  <input value={studentId} onChange={(e) => setStudentId(e.target.value)}
                    className={inputCls} placeholder="e.g. 2153xxxx" />
                </Field>
              )}
              <Field label="Email *">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputCls} placeholder="you@example.com" />
              </Field>
              <Field label="Year of birth">
                <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className={inputCls}>
                  <option value="">— Select year —</option>
                  {BIRTH_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
              <Field label="Field of interest *">
                <select value={field} onChange={(e) => setField(e.target.value)} className={inputCls}>
                  <option value="">— Select a field —</option>
                  {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              {field === 'Other' && (
                <Field label="Other field">
                  <input value={otherField} onChange={(e) => setOtherField(e.target.value)}
                    className={inputCls} placeholder="Type your field" />
                </Field>
              )}

              {error && <p className="text-sm text-error">{error}</p>}

              <button type="submit" disabled={step === 'student' ? !canSubmitStudent : !canSubmitStranger}
                className="mt-1 bg-primary text-on-primary py-3 rounded-lg text-sm font-bold hover:scale-[0.98] transition-transform disabled:opacity-40 disabled:hover:scale-100">
                {busy ? (step === 'student' ? 'Checking…' : 'Saving…') : 'Start exploring'}
              </button>
              <p className="text-xs text-on-surface-variant/70 text-center">
                Your details are used internally only, to improve the content.
              </p>
            </form>
          </>
        )}

        {/* STEP 2b — lecturer sign-in */}
        {step === 'lecturer' && (
          <>
            <button onClick={back} className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary mb-3">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back
            </button>
            <h1 className="h-md mb-1">Lecturer sign-in</h1>
            <p className="text-sm text-on-surface-variant mb-6">
              Sign in to manage and contribute to the universe.
            </p>

            <form onSubmit={handleLecturerSignIn} className="flex flex-col gap-4">
              <Field label="Email">
                <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                  className={inputCls} placeholder="you@example.com" autoFocus />
              </Field>
              <Field label="Password">
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                  className={inputCls} placeholder="••••••••" />
              </Field>

              {error && <p className="text-sm text-error">{error}</p>}

              <button type="submit" disabled={busy}
                className="mt-1 bg-primary text-on-primary py-3 rounded-lg text-sm font-bold hover:scale-[0.98] transition-transform disabled:opacity-50">
                {busy ? 'Signing in…' : 'Sign In'}
              </button>
              <p className="text-xs text-on-surface-variant text-center">
                Don't have an account?{' '}
                <button type="button" onClick={() => router.push('/login')} className="text-primary font-bold">
                  Sign up
                </button>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40';

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-sm text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

function RoleCard({ icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group text-left glass-card rounded-card p-5 flex items-center gap-4 hover:border-primary/50 transition-colors"
    >
      <span className="material-symbols-outlined text-primary text-3xl">{icon}</span>
      <span className="flex-1">
        <span className="block font-display text-lg font-medium group-hover:text-primary transition-colors">{title}</span>
        <span className="block text-xs text-on-surface-variant mt-0.5">{desc}</span>
      </span>
      <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
    </button>
  );
}
