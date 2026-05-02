import { create } from "zustand";

interface AIState {
  aiEnabled: boolean;
  setAIEnabled: (value: boolean) => void;
  loading: Record<string, boolean>;
  setLoading: (key: string, value: boolean) => void;
  dailyBriefing: {
    text: string;
    overdueCount: number;
    dueTodayCount: number;
    meetingCount: number;
    updatedAt: number;
  } | null;
  setDailyBriefing: (data: AIState["dailyBriefing"]) => void;
  focus: {
    recommendations: Array<{
      rank: number;
      task_id: string;
      task_title: string;
      reason: string;
      urgency_level: "critical" | "high" | "medium" | "low" | string;
    }>;
    updatedAt: number;
  } | null;
  setFocus: (data: AIState["focus"]) => void;
}

export const useAIStore = create<AIState>((set) => ({
  aiEnabled: false,
  setAIEnabled: (value) => set({ aiEnabled: value }),
  loading: {},
  setLoading: (key, value) =>
    set((state) => ({ loading: { ...state.loading, [key]: value } })),
  dailyBriefing: null,
  setDailyBriefing: (data) => set({ dailyBriefing: data }),
  focus: null,
  setFocus: (data) => set({ focus: data }),
}));
