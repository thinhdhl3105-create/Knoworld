'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, configured: isSupabaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
