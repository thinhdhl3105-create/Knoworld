'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useAuth } from '../components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState('signin'); // signin | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    if (!isSupabaseConfigured) {
      setError('Supabase chưa được cấu hình. Hãy thêm biến môi trường NEXT_PUBLIC_SUPABASE_URL / ANON_KEY.');
      return;
    }
    setBusy(true);
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) setError(error.message);
      else setMsg('Đăng ký thành công! Kiểm tra email để xác nhận (nếu bật), rồi đăng nhập.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push('/upload');
    }
    setBusy(false);
  }

  return (
    <div className="pt-32 pb-24 max-w-md mx-auto px-5">
      <div className="glass-card rounded-card p-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-primary">blur_on</span>
          <span className="font-display text-xl font-semibold">Knoworld</span>
        </div>
        <h1 className="h-md mb-1">{mode === 'signin' ? 'Welcome back' : 'Create account'}</h1>
        <p className="text-sm text-on-surface-variant mb-6">
          {mode === 'signin' ? 'Sign in to contribute to the universe.' : 'Join the constellation of researchers.'}
        </p>

        {user && (
          <div className="mb-4 text-sm text-primary">
            Bạn đã đăng nhập với {user.email}. <a href="/upload" className="underline">Vào dashboard</a>.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <Field label="Full name">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                className={inputCls} placeholder="Ada Lovelace" />
            </Field>
          )}
          <Field label="Email">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className={inputCls} placeholder="you@example.com" />
          </Field>
          <Field label="Password">
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className={inputCls} placeholder="••••••••" />
          </Field>

          {error && <p className="text-sm text-error">{error}</p>}
          {msg && <p className="text-sm text-primary">{msg}</p>}

          <button type="submit" disabled={busy}
            className="bg-primary text-on-primary py-3 rounded-lg text-sm font-bold hover:scale-[0.98] transition-transform disabled:opacity-50">
            {busy ? '…' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="text-sm text-on-surface-variant mt-6 text-center">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMsg(''); }}
            className="text-primary font-bold">
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40';

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-sm text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}
