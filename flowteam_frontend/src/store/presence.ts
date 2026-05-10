import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserPresenceStatus } from "@/lib/presence";

export interface CustomStatus {
  emoji: string;
  text: string;
  /** ISO timestamp after which the status clears, or null for "don't clear" */
  clearAt: string | null;
}

interface PresenceState {
  status: UserPresenceStatus;
  customStatus: CustomStatus | null;
  setStatus: (status: UserPresenceStatus) => void;
  setCustomStatus: (cs: CustomStatus | null) => void;
}

export const usePresenceStore = create<PresenceState>()(
  persist(
    (set) => ({
      status: "online",
      customStatus: null,
      setStatus: (status) => set({ status }),
      setCustomStatus: (customStatus) => set({ customStatus }),
    }),
    {
      name: "presence-storage",
      partialize: (state) => ({ status: state.status, customStatus: state.customStatus }),
    }
  )
);
