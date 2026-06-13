import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  api,
  setTokens,
  clearTokens,
  setClinicId,
  getClinicId,
} from "./api";

interface User {
  id: string;
  clinicId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (clinicId: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const data = await api<User>("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
      clearTokens();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = useCallback(
    async (clinicId: string, email: string, password: string) => {
      const data = await api<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ clinicId, email, password }),
      });
      setTokens(data.accessToken, data.refreshToken);
      setClinicId(clinicId);
      await fetchMe();
    },
    [fetchMe],
  );

  const logout = useCallback(() => {
    api("/auth/logout", { method: "POST" }).catch(() => {});
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
