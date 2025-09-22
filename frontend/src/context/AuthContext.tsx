import React, { createContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { api, setToken, clearToken } from "../api/client";

interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setToken(token);
      api
        .me()
        .then((data) => {
          setUser(data);
          setLoading(false);
        })
        .catch(() => {
          clearToken();
          setUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (token: string) => {
    setToken(token);
    try {
      const data = await api.me();
      setUser(data);
    } catch {
      clearToken();
      setUser(null);
      throw new Error("Failed to fetch user");
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
};
