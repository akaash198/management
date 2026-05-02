import { create } from "zustand";
import { api, unwrapData, unwrapList } from "../lib/api";
import { sampleTeams, sampleUser } from "../lib/sampleData";
import { clearTokens, getAccessToken, setTokens } from "../lib/tokenStorage";
import type { ApiResponse, Team, User } from "../lib/types";

type AuthState = {
  user: User | null;
  teams: Team[];
  activeTeamId: string | null;
  isBooting: boolean;
  isDemoMode: boolean;
  boot: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: () => void;
  logout: () => Promise<void>;
  setActiveTeam: (teamId: string) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  teams: [],
  activeTeamId: null,
  isBooting: true,
  isDemoMode: false,
  boot: async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        set({ isBooting: false });
        return;
      }
      const [me, teams] = await Promise.all([
        api.get<ApiResponse<User>>("/auth/me/"),
        api.get<ApiResponse<Team[]>>("/teams/"),
      ]);
      const teamList = unwrapList<Team>(teams.data);
      set({
        user: unwrapData<User | null>(me.data),
        teams: teamList,
        activeTeamId: teamList[0]?.id ?? null,
        isBooting: false,
        isDemoMode: false,
      });
    } catch {
      await clearTokens();
      set({ user: null, teams: [], activeTeamId: null, isBooting: false });
    }
  },
  login: async (email, password) => {
    const response = await api.post<ApiResponse<{ access: string; refresh: string; user?: User }>>("/auth/login/", {
      email,
      password,
    });
    const payload = unwrapData<{ access: string; refresh: string; user?: User }>(response.data);
    if (!payload?.access || !payload.refresh) throw new Error("Login did not return tokens");
    await setTokens(payload.access, payload.refresh);
    const [me, teams] = await Promise.all([
      api.get<ApiResponse<User>>("/auth/me/"),
      api.get<ApiResponse<Team[]>>("/teams/"),
    ]);
    const teamList = unwrapList<Team>(teams.data);
    set({
      user: unwrapData<User | null>(me.data) ?? payload.user ?? null,
      teams: teamList,
      activeTeamId: teamList[0]?.id ?? null,
      isDemoMode: false,
    });
  },
  demoLogin: () => {
    set({
      user: sampleUser,
      teams: sampleTeams,
      activeTeamId: sampleTeams[0].id,
      isDemoMode: true,
      isBooting: false,
    });
  },
  logout: async () => {
    await clearTokens();
    set({ user: null, teams: [], activeTeamId: null, isDemoMode: false });
  },
  setActiveTeam: (teamId) => set({ activeTeamId: teamId }),
}));
