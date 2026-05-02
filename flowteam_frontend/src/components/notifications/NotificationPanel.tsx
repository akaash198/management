"use client";

import { useEffect } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import { formatDistanceToNow } from "date-fns";
import { Check, BellOff, MessageCircle, ClipboardCheck, UserPlus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const typeIcons = {
  task_assigned: ClipboardCheck,
  task_due: BellOff,
  task_overdue: BellOff,
  task_watched: ClipboardCheck,
  approval_requested: ClipboardCheck,
  approval_decided: ClipboardCheck,
  automation_notice: Info,
  mentioned_message: MessageCircle,
  mentioned_comment: MessageCircle,
  task_moved: Info,
  task_completed: Check,
  invite_accepted: UserPlus,
};

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { notifications, isLoading, fetchNotifications, markAsRead, markAllRead } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = async (n: { id: string; is_read: boolean; reference_type: string; reference_id: string; action_url?: string }) => {
    if (!n.is_read) {
      await markAsRead([n.id]);
    }
    onClose();
    if (n.action_url) {
      router.push(n.action_url);
      return;
    }
    
    if (n.reference_type === "task") {
      router.push(`/projects/active?task=${n.reference_id}`); // Logic to find project might be needed
    } else if (n.reference_type === "message") {
      router.push(`/messages?channel=${n.reference_id}`);
    }
  };

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">Notifications</h3>
        <Button variant="ghost" size="sm" onClick={markAllRead} className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10">
          Mark all read
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <BellOff className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900">All caught up!</p>
            <p className="text-xs text-slate-500">No new notifications.</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((n) => {
              const Icon = typeIcons[n.type as keyof typeof typeIcons] || Info;
              return (
                <div 
                  key={n.id} 
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "flex gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors relative",
                    !n.is_read && "bg-slate-50/50"
                  )}
                >
                  {!n.is_read && <div className="absolute left-1.5 top-5 bottom-5 w-1 rounded-full bg-primary" />}
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border",
                    !n.is_read ? "bg-white" : "bg-slate-50"
                  )}>
                    <Icon className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className={cn("text-xs", !n.is_read ? "font-semibold text-slate-900" : "font-medium text-slate-600")}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
      
      <div className="p-2 border-t text-center">
        <Button variant="ghost" className="w-full text-xs text-slate-500">
          View all notifications
        </Button>
      </div>
    </div>
  );
}
