// One-time script to create the single allowed account in Supabase.
// Run locally (machine with internet):  node scripts/seed-account.mjs
// Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const EMAIL = 'thinh.dhl3105@gmail.com';
const PASSWORD = 'Lamthinh123!';

// Minimal .env.local loader
const env = {};
try {
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
} catch {}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error('Missing Supabase env vars in .env.local');
  process.exit(1);
}

const sb = createClient(url, anon);

const signin = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (!signin.error) {
  console.log('✓ Account already exists and the password works. Nothing to do.');
  process.exit(0);
}
console.log('Sign-in failed (' + signin.error.message + '). Trying to create the account…');

const signup = await sb.auth.signUp({
  email: EMAIL,
  password: PASSWORD,
  options: { data: { full_name: 'Thinh Do' } },
});
if (signup.error) {
  console.error('✗ Sign-up failed:', signup.error.message);
  process.exit(1);
}
if (signup.data.session) {
  console.log('✓ Account created and active.');
} else {
  console.log('✓ Account created. Email confirmation is ON — confirm it in the Supabase dashboard');
  console.log('  (Authentication → Users → click the user → Confirm), or disable email confirmation in');
  console.log('  Authentication → Providers → Email, then sign in.');
}
