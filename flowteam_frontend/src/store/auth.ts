import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";
import { User, ApiResponse } from "@/types";
import { clearTokens } from "@/lib/auth";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  fetchMe: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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
            // Genuine auth failure — tokens are gone, must re-login.
            set({ user: null });
          }
          // For network errors, 5xx, etc. keep the existing user so transient
          // outages don't force a logout.
        } finally {
          set({ isLoading: false });
        }
      },
      logout: () => {
        const refresh = localStorage.getItem("refreshToken");
        if (refresh) {
          api.post("/auth/logout/", { refresh }).catch(console.error);
        }
        clearTokens();
        set({ user: null });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
