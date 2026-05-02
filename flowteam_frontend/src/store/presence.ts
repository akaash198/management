import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserPresenceStatus } from "@/lib/presence";

interface PresenceState {
  status: UserPresenceStatus;
  setStatus: (status: UserPresenceStatus) => void;
}

export const usePresenceStore = create<PresenceState>()(
  persist(
    (set) => ({
      status: "online",
      setStatus: (status) => set({ status }),
    }),
    {
      name: "presence-storage",
      partialize: (state) => ({ status: state.status }),
    }
  )
);
