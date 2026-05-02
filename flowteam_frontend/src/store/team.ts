import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";
import type { ApiResponse, Team } from "@/types";
import { useAIStore } from "@/store/ai";

interface TeamState {
  teams: Team[];
  activeTeamId: string | null;
  isLoading: boolean;
  setActiveTeamId: (teamId: string) => void;
  fetchTeams: () => Promise<void>;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      teams: [],
      activeTeamId: null,
      isLoading: false,
      fetchTeams: async () => {
        if (get().isLoading) return;
        set({ isLoading: true });
        try {
          const res = await api.get<ApiResponse<Team[]>>("/teams/");
          if (!res.data.success) return;

          const teams = res.data.data ?? [];
          const currentActiveTeamId = get().activeTeamId;
          const isActiveValid = !!currentActiveTeamId && teams.some((t) => t.id === currentActiveTeamId);
          const nextActiveTeamId = isActiveValid ? currentActiveTeamId : teams[0]?.id ?? null;
          const activeTeam = teams.find((team) => team.id === nextActiveTeamId) ?? null;
          useAIStore.getState().setAIEnabled(!!activeTeam?.ai_enabled);

          set({ teams, activeTeamId: nextActiveTeamId });
        } catch (error) {
          console.error("Failed to fetch teams", error);
          set({ teams: [], activeTeamId: null });
        } finally {
          set({ isLoading: false });
        }
      },
      setActiveTeamId: (teamId) => {
        const activeTeam = get().teams.find((team) => team.id === teamId) ?? null;
        useAIStore.getState().setAIEnabled(!!activeTeam?.ai_enabled);
        set({ activeTeamId: teamId });
      },
    }),
    {
      name: "team-storage",
      partialize: (state) => ({ activeTeamId: state.activeTeamId }),
    }
  )
);
