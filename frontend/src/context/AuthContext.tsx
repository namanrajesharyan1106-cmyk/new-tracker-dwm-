"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '../lib/axios';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId: string;
  isApproved: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        // Only try refresh if we're not on auth pages
        if (!pathname.startsWith('/login') && !pathname.startsWith('/register')) {
          try {
            const res = await api.get('/auth/refresh');
            localStorage.setItem('accessToken', res.data.token);
            await fetchUser();
          } catch (error) {
            setIsLoading(false);
            router.push('/login');
          }
        } else {
          setIsLoading(false);
        }
        return;
      }

      await fetchUser();
    };

    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.data);
      } catch (error) {
        localStorage.removeItem('accessToken');
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  const login = (token: string, userData: User) => {
    localStorage.setItem('accessToken', token);
    setUser(userData);
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
