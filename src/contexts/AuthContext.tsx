import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, Profile, PROFILE_COLUMNS } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      // Lista explícita de colunas: o painel nunca precisa do endereço
      // residencial, nem do próprio admin.
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', userId)
        .single<Profile>();

      if (error) throw error;

      // Uma sessão restaurada de um não-admin (ou um perfil ilegível) precisa
      // ser encerrada: a rota protegida só checa `user`.
      if (data.role !== 'admin') {
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      await supabase.auth.signOut();
      setProfile(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      // A verificação de admin fica só aqui. `onAuthStateChange` também dispara
      // com este login, mas `loadProfile` apenas lê o perfil — se as duas
      // rotinas chamassem signOut, a corrida entre elas trocaria esta mensagem
      // por um erro genérico de sessão.
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        await supabase.auth.signOut();
        throw profileError;
      }

      if (profileData.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Acesso negado. Privilégios de administrador necessários.');
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin: profile?.role === 'admin',
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
