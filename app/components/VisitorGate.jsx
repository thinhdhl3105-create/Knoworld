'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FIELDS, hasRegistered, registerVisitor } from '@/lib/visitor';
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
  const [step, setStep] = useState('role'); // role | student | lecturer

  // Student form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [field, setField] = useState('');
  const [otherField, setOtherField] = useState('');

  // Lecturer sign-in
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    setRegistered(hasRegistered());
  }, []);

  const skip = SKIP_PREFIXES.some((p) => pathname?.startsWith(p));
  // Hide the gate for: unmounted, skipped routes, signed-in lecturers, or registered students.
  if (!mounted || skip || loading || user || registered) return null;

  // ---- Student submit -------------------------------------------------------
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const resolvedField = field === 'Other' ? otherField.trim() : field;
  const canSubmitStudent =
    fullName.trim().length > 1 && emailOk && !!resolvedField && !busy;

  async function handleStudentSubmit(e) {
    e.preventDefault();
    setError('');
    if (!canSubmitStudent) {
      setError('Please fill in your full name, a valid email and your field.');
      return;
    }
    setBusy(true);
    const res = await registerVisitor({
      fullName,
      email,
      birthYear,
      field: resolvedField,
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
                desc="Share a few details, then explore the content."
                onClick={() => { setError(''); setStep('student'); }}
              />
              <RoleCard
                icon="co_present"
                title="I'm a Lecturer"
                desc="Sign in with your account to manage and contribute."
                onClick={() => { setError(''); setStep('lecturer'); }}
              />
            </div>
          </>
        )}

        {/* STEP 2a — student details */}
        {step === 'student' && (
          <>
            <button onClick={back} className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary mb-3">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back
            </button>
            <h1 className="h-md mb-1">A few details</h1>
            <p className="text-sm text-on-surface-variant mb-6">
              This helps us understand who's interested and improve your experience.
            </p>

            <form onSubmit={handleStudentSubmit} className="flex flex-col gap-4">
              <Field label="Full name *">
                <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className={inputCls} placeholder="Jane Doe" autoFocus />
              </Field>
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

              <button type="submit" disabled={!canSubmitStudent}
                className="mt-1 bg-primary text-on-primary py-3 rounded-lg text-sm font-bold hover:scale-[0.98] transition-transform disabled:opacity-40 disabled:hover:scale-100">
                {busy ? 'Saving…' : 'Start exploring'}
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
