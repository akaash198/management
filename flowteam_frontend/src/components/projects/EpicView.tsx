"use client";

import React, { useState } from "react";
import { 
  Plus, 
  MoreHorizontal, 
  Layers, 
  Calendar, 
  User as UserIcon,
  Search,
  Filter,
  ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEpics, useCreateEpic } from "@/hooks/useEpics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface EpicViewProps {
  projectId: string;
}

export function EpicView({ projectId }: EpicViewProps) {
  const { data: epics, isLoading } = useEpics({ project_id: projectId });
  const [search, setSearch] = useState("");

  const filteredEpics = epics?.filter(epic => 
    epic.title.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Layers className="animate-pulse text-muted-foreground" size={32} /></div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Input 
            placeholder="Search epics..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
          <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
        </div>
        
        <Button className="gap-2">
          <Plus size={16} />
          Create Epic
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEpics.map((epic) => (
          <EpicCard key={epic.id} epic={epic} />
        ))}
        
        {filteredEpics.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
            <Layers size={48} className="mb-4 opacity-20" />
            <p className="text-[15px] font-medium">No epics found</p>
            <p className="text-[13px] opacity-60">Create your first epic to start tracking high-level milestones.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EpicCard({ epic }: { epic: any }) {
  const statusColors = {
    backlog: "bg-slate-500",
    discovery: "bg-sky-500",
    wip: "bg-blue-500",
    review: "bg-amber-500",
    done: "bg-emerald-500",
  };

  return (
    <div className="flex flex-col bg-card border border-border/50 rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all group">
      <div className="h-2 w-full" style={{ backgroundColor: epic.color }} />
      
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className={cn("text-[10px] uppercase font-bold text-white border-none", statusColors[epic.status as keyof typeof statusColors])}>
              {epic.status}
            </Badge>
            <h3 className="text-[17px] font-bold tracking-tight group-hover:text-primary transition-colors">{epic.title}</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <MoreHorizontal size={16} />
          </Button>
        </div>

        <p className="text-[13px] text-muted-foreground line-clamp-2 min-h-[40px]">
          {epic.description || "No description provided for this epic."}
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <span>Progress</span>
            <span>65%</span>
          </div>
          <Progress value={65} className="h-1.5" />
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-border/50">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <Avatar key={i} className="h-7 w-7 border-2 border-background shadow-sm">
                <AvatarFallback className="text-[9px] font-bold">U{i}</AvatarFallback>
              </Avatar>
            ))}
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold border-2 border-background shadow-sm">
              +5
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
            <Calendar size={12} />
            {epic.end_date ? format(new Date(epic.end_date), "MMM d, yyyy") : "TBD"}
          </div>
        </div>
      </div>
    </div>
  );
}
