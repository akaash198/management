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
          // Server will clear cookie regardless
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
