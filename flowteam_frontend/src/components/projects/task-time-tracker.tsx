"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { TimeLog } from "@/types/task";
import { ApiResponse } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Clock, 
  Play, 
  Pause, 
  StopCircle, 
  History, 
  Trash2,
  Timer as TimerIcon
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TaskTimeTracker({ taskId }: { taskId: string, projectId: string }) {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [note, setNote] = useState("");

  const { data: logs } = useQuery<TimeLog[]>({
    queryKey: ["task-timelogs", taskId],
    queryFn: async () => {
      // Corrected dedicated task path: /api/tasks/{id}/timelogs/
      const res = await api.get<ApiResponse<TimeLog[]>>(`/tasks/${taskId}/timelogs/`);
      return res.data.data ?? [];
    },
    enabled: !!taskId
  });

  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        setSessionSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const addLogMutation = useMutation({
    mutationFn: async ({ minutes, logNote }: { minutes: number, logNote?: string }) => {
      return api.post(`/tasks/${taskId}/timelogs/`, { minutes, note: logNote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-timelogs", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Time logged successfully");
    }
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (logId: string) => api.delete(`/tasks/${taskId}/timelogs/${logId}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-timelogs", taskId] })
  });

  const toggleTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  };

  const stopTimer = () => {
    const minutes = Math.ceil(sessionSeconds / 60);
    if (minutes > 0) {
      addLogMutation.mutate({ minutes, logNote: note });
    }
    setIsRunning(false);
    setSessionSeconds(0);
    setNote("");
  };

  const formatElapsedTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalMinutes = logs?.reduce((acc, l) => acc + l.minutes, 0) ?? 0;

  return (
    <div className="space-y-6">
      <Card className="border-[0.5px] border-border shadow-none bg-muted/20 overflow-hidden">
        <CardContent className="p-4">
           <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                 <div className={cn(
                   "h-10 w-10 rounded-lg flex items-center justify-center transition-all",
                   isRunning ? "bg-primary text-white animate-pulse shadow-lg shadow-primary/20" : "bg-background text-muted-foreground/40 border-[0.5px] border-border"
                 )}>
                    <TimerIcon size={18} />
                 </div>
                 <div>
                    <h4 className="text-[20px] font-medium tabular-nums tracking-tight">{formatElapsedTime(sessionSeconds)}</h4>
                    <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-[0.1em]">Active Session</p>
                 </div>
              </div>

              <div className="flex items-center gap-2">
                 <Button 
                   onClick={toggleTimer} 
                   variant="ghost"
                   size="sm"
                   className={cn(
                     "h-8 px-3 text-[12px] font-medium border-[0.5px] transition-all", 
                     isRunning ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100" : "border-border bg-background hover:bg-muted"
                   )}
                 >
                    {isRunning ? (
                      <><Pause size={12} className="mr-1.5" /> Pause</>
                    ) : (
                      <><Play size={12} className="mr-1.5" /> Start</>
                    )}
                 </Button>
                 {sessionSeconds > 0 && (
                   <Button onClick={stopTimer} size="sm" className="h-8 px-3 text-[12px] font-medium bg-primary hover:bg-primary/90">
                      <StopCircle size={12} className="mr-1.5" /> Log
                   </Button>
                 )}
              </div>
           </div>
           
           {isRunning && (
             <div className="mt-3">
                <Input 
                  placeholder="Notes for this session..." 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="bg-background border-border/60 text-[12px] h-8 px-3 rounded-md focus-visible:ring-1 focus-visible:ring-primary/20"
                />
             </div>
           )}
        </CardContent>
      </Card>

      <div className="space-y-3">
         <div className="flex items-center justify-between">
            <h5 className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
               <History size={12} />
               Time Logs
            </h5>
            <div className="text-[11px] font-medium text-muted-foreground">
               Total: <span className="text-foreground">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</span>
            </div>
         </div>

         <div className="space-y-1.5">
            {logs?.slice(0, 5).map((log) => (
              <div key={log.id} className="group p-3 bg-muted/5 border-[0.5px] border-border/40 rounded-lg flex items-center justify-between hover:bg-muted/10 transition-colors">
                 <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded bg-background border-[0.5px] border-border flex items-center justify-center text-muted-foreground/40">
                       <Clock size={12} />
                    </div>
                    <div>
                       <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium">{log.hours_display}</span>
                          <span className="text-[10px] text-muted-foreground/50">{format(new Date(log.date), "MMM d, yyyy")}</span>
                       </div>
                       {log.note && <p className="text-[11px] text-muted-foreground/60 line-clamp-1">{log.note}</p>}
                    </div>
                 </div>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 transition-all"
                   onClick={() => deleteLogMutation.mutate(log.id)}
                 >
                    <Trash2 size={12} />
                 </Button>
              </div>
            ))}
            
            {logs?.length === 0 && (
              <div className="py-6 text-center text-[12px] text-muted-foreground/30 italic border-[0.5px] border-dashed border-border/60 rounded-lg">
                No time logged yet.
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
