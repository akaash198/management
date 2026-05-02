"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Notification } from "@/types/messaging";
import api from "@/lib/api";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  prependNotification: (n: Notification) => void;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get("/messaging/notifications/");
      if (response.data.success) {
        set({ notifications: response.data.data });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    const response = await api.get("/messaging/notifications/unread-count/");
    if (response.data.success) {
      set({ unreadCount: response.data.data.count });
    }
  },

  prependNotification: (n: Notification) => {
    set((state) => ({
      notifications: [n, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAsRead: async (ids: string[]) => {
    await api.post("/messaging/notifications/mark-read/", { ids });
    set((state) => ({
      notifications: state.notifications.map((n) => 
        ids.includes(n.id) ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - ids.length),
    }));
  },

  markAllRead: async () => {
    await api.post("/messaging/notifications/mark-read/", { all: true });
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },
}));
