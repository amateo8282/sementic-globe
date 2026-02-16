"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/infrastructure/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAnonymous: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 인증 상태를 관리하는 Context Provider
 * 초기화 시 세션이 없으면 자동으로 익명 로그인을 수행한다
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAnonymous = user?.is_anonymous ?? true;

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        setIsLoading(false);
      } else {
        // 세션 없으면 익명 로그인
        supabase.auth.signInAnonymously().then(({ data, error }) => {
          if (!error && data.session) {
            setSession(data.session);
            setUser(data.user);
          }
          setIsLoading(false);
        });
      }
    });

    // 인증 상태 변경 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, isAnonymous, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * 인증 상태를 사용하는 훅
 * AuthProvider 내부에서만 사용 가능
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth는 AuthProvider 내부에서 사용해야 합니다");
  }
  return context;
}
