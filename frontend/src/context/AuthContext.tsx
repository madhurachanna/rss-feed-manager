import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "../api/types";
import { fetchMe, logout as apiLogout } from "../api";
import { setAuthToken, getAuthToken } from "../api/client";

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthContextValue = AuthState & {
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = Boolean(user);

  const refreshUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      // Token invalid or expired
      setAuthToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (token: string, newUser: User) => {
    setAuthToken(token);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore errors during logout
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  };

  // Initial load
  useEffect(() => {
    refreshUser();
  }, []);

  // Listen for forced logout (from 401 interceptor)
  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
    };
    window.addEventListener("auth-logout", handleLogout);
    return () => window.removeEventListener("auth-logout", handleLogout);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
