"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { ApiResponse } from "@/types";
import { MissedMessagesSummary } from "@/types/task";
import { 
  Sparkles, 
  X, 
  MessageSquare, 
  ArrowRight, 
  Clock,
  Zap
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export const MissedMessagesPulse: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  const { data: summary, isLoading } = useQuery<MissedMessagesSummary>({
    queryKey: ["missed-messages-summary"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<MissedMessagesSummary>>("/messaging/summary/missed/");
      return res.data.data;
    },
    // Only fetch once per session or on dashboard mount
    staleTime: 1000 * 60 * 5, 
  });

  if (isLoading || !summary || summary.total_unread === 0 || !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative group overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-xl shadow-indigo-100/20"
      >
        {/* Animated Background Pulse */}
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-indigo-50/50 blur-3xl group-hover:bg-indigo-100/50 transition-all duration-700" />
        <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-blue-50/50 blur-3xl group-hover:bg-blue-100/50 transition-all duration-700" />

        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-indigo-600 blur-md opacity-20 animate-pulse" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200">
                  <Sparkles size={22} className="animate-pulse" />
                </div>
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                  {summary.total_unread > 99 ? "99+" : summary.total_unread}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold tracking-tight text-gray-900">
                  Welcome back! You&apos;ve been missed.
                </h3>
                <p className="text-sm text-gray-500 font-medium">
                  While you were away, your team kept the momentum going.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link 
                href="/messages"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95 group/btn"
              >
                Catch up now
                <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
              </Link>
              <button 
                onClick={() => setIsVisible(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            {summary.channels.slice(0, 3).map((channel) => (
              <Link
                key={channel.channel_id}
                href={`/messages?channel=${channel.channel_id}`}
                className="flex flex-col p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all duration-300 group/card"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 rounded-md bg-white border border-gray-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                      <MessageSquare size={12} />
                    </div>
                    <span className="text-xs font-bold text-gray-700 truncate">
                      #{channel.channel_name}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                    {channel.unread_count} new
                  </span>
                </div>
                
                {channel.last_message && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 line-clamp-1 italic">
                      &ldquo;{channel.last_message.text}&rdquo;
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-indigo-200 flex items-center justify-center text-[8px] font-bold text-indigo-700">
                        {channel.last_message.sender.charAt(0)}
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {channel.last_message.sender}
                      </span>
                    </div>
                  </div>
                )}
              </Link>
            ))}
            
            {summary.channels.length > 3 && (
              <Link
                href="/messages"
                className="flex items-center justify-center p-4 rounded-xl border border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-xs font-bold text-gray-400 hover:text-indigo-600 group"
              >
                View {summary.channels.length - 3} more channels
                <Zap size={12} className="ml-2 group-hover:fill-current" />
              </Link>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            <Clock size={10} />
            Since your last login {formatDistanceToNow(new Date(summary.since))} ago
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
