import * as React from 'react';
import { useLocation } from "wouter";
import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";

export type User = {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  profileImage?: string;
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/user", {
          credentials: "include",
        });

        if (res.status === 200) {
          const data = await res.json();
          if (data && data.user) {
            setUser(data.user);
          } else if (data) {
            setUser(data);
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest("/api/auth/login", "POST", { username, password });
      if (data && data.user) {
        setUser(data.user);
      } else {
        setUser(data);
      }
      setLocation("/");
    } catch (err) {
      console.error("Login failed:", err);
      setError("Invalid username or password");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);

    try {
      await apiRequest("/api/auth/logout", "POST");
      setUser(null);
      // Clear all queries from the cache
      queryClient.clear();
      setLocation("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return React.createElement(
    AuthContext.Provider,
    { value: { user, isLoading, login, logout, error } },
    children
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
