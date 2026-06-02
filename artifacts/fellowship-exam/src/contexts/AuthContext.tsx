import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, setToken, clearToken, ApiError, type User } from "../lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("fellowship_token");
    if (!token) { setLoading(false); return; }
    try {
      const me = await api.get<User>("/auth/me");
      setUser(me);
    } catch (err) {
      // Only clear the stored token when the server explicitly rejects it (401).
      // Network errors, server restarts, or 5xx responses must NOT log the user out.
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadMe(); }, [loadMe]);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
  };

  const logout = useCallback(() => {
    api.post("/auth/logout", {}).catch(() => {});
    clearToken();
    setUser(null);
  }, []);

  // Inactivity Auto-Logout Effect
  useEffect(() => {
    if (!user) return;

    let lastInteractionTime = Date.now();
    let timeoutMinutes = 30; // fallback default to 30 mins

    // Fetch dynamic timeout configuration from global settings
    api.get<{ value: string }>("/global-settings/session_inactivity_timeout")
      .then(setting => {
        if (setting && setting.value) {
          const parsed = parseInt(setting.value, 10);
          if (!isNaN(parsed) && parsed > 0) {
            timeoutMinutes = parsed;
          }
        }
      })
      .catch(() => {});

    const handleInteraction = () => {
      lastInteractionTime = Date.now();
    };

    window.addEventListener("mousemove", handleInteraction);
    window.addEventListener("keydown", handleInteraction);
    window.addEventListener("click", handleInteraction);
    window.addEventListener("scroll", handleInteraction);

    // Periodically inspect inactivity duration
    const intervalId = setInterval(() => {
      const elapsedMs = Date.now() - lastInteractionTime;
      if (elapsedMs > timeoutMinutes * 60 * 1000) {
        logout();
        alert("Your session has expired due to inactivity. Please log in again.");
      }
    }, 10000); // check every 10 seconds

    return () => {
      window.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
      clearInterval(intervalId);
    };
  }, [user, logout]);

  const refreshUser = async () => {
    const me = await api.get<User>("/auth/me");
    setUser(me);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
