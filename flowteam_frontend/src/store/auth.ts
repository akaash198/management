import { create } from "zustand";
import api from "@/lib/api";
import { User, ApiResponse } from "@/types";
import { clearTokens } from "@/lib/auth";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
}

// Auth state is kept in memory only — no localStorage persistence.
// User PII and role data in localStorage is an XSS risk. The httpOnly refresh
// cookie handles silent re-authentication; fetchMe() re-hydrates on app boot.
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get<ApiResponse<User>>("/auth/me/");
      if (res.data.success) {
        set({ user: res.data.data });
      }
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        set({ user: null });
      }
    } finally {
      set({ isLoading: false });
    }
  },
  logout: async () => {
    try {
      await api.post("/auth/logout/", {});
    } catch {
      // Server clears the cookie regardless — client logout always succeeds
    }
    clearTokens();
    set({ user: null });
  },
}));
