import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";
import { User, ApiResponse } from "@/types";
import { setTokens, clearTokens } from "@/lib/auth";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  fetchMe: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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
        } catch (error) {
          console.error("Failed to fetch user", error);
          set({ user: null });
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
