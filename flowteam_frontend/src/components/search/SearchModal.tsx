"use client";

import { useEffect, useState } from "react";
import { 
  CommandDialog, 
  CommandInput, 
  CommandList, 
  CommandEmpty, 
  CommandGroup, 
  CommandItem 
} from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { SearchResults } from "@/types/dashboard";
import { 
  Search, 
  Briefcase, 
  MessageSquare, 
  Users, 
  Hash, 
  Layout, 
  Clock,
  ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTeamStore } from "@/store/team";
import type { ApiResponse } from "@/types";

export function SearchModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { activeTeamId, fetchTeams } = useTeamStore();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const { data, isLoading } = useQuery<SearchResults>({
    queryKey: ["search", activeTeamId, debouncedQuery],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SearchResults>>(
        `/dashboard/search/?q=${debouncedQuery}&team_id=${activeTeamId}`
      );
      return res.data.data;
    },
    enabled: !!activeTeamId && debouncedQuery.length >= 2,
    staleTime: 30000
  });

  const handleSelect = (type: string, id: string) => {
    onOpenChange(false);
    if (type === "task") {
      router.push(`/projects/active?task=${id}`);
    } else if (type === "project") {
      router.push(`/projects/${id}`);
    } else if (type === "member") {
      router.push(`/team?user=${id}`);
    } else if (type === "message") {
      router.push(`/messages?channel=${id}`);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search tasks, messages, people..." 
        value={query} 
        onValueChange={setQuery} 
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {data?.results?.tasks && (
          <CommandGroup heading="Tasks">
            {data.results.tasks.items.map((task) => (
              <CommandItem key={task.id} onSelect={() => handleSelect("task", task.id)}>
                <Briefcase className="mr-2 h-4 w-4 text-slate-400" />
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{task.title}</span>
                  <span className="text-[10px] text-slate-400">{task.project_name} • {task.column_name}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {data?.results?.projects && (
          <CommandGroup heading="Projects">
            {data.results.projects.items.map((project) => (
              <CommandItem key={project.id} onSelect={() => handleSelect("project", project.id)}>
                <Layout className="mr-2 h-4 w-4 text-slate-400" />
                <span>{project.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {data?.results?.members && (
          <CommandGroup heading="People">
            {data.results.members.items.map((m) => (
              <CommandItem key={m.user.id} onSelect={() => handleSelect("member", m.user.id)}>
                <Users className="mr-2 h-4 w-4 text-slate-400" />
                <div className="flex flex-col">
                  <span>{m.user.full_name}</span>
                  <span className="text-[10px] text-slate-400">{m.role}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {data?.results?.messages && (
          <CommandGroup heading="Messages">
            {data.results.messages.items.map((msg) => (
              <CommandItem key={msg.id} onSelect={() => handleSelect("message", msg.id)}>
                <MessageSquare className="mr-2 h-4 w-4 text-slate-400" />
                <div className="flex flex-col">
                  <span className="text-sm line-clamp-1">{msg.text}</span>
                  <span className="text-[10px] text-slate-400">#{msg.channel_name}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <div className="p-2 border-t mt-2 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex gap-2">
            <span><kbd className="bg-slate-100 px-1 rounded">↵</kbd> select</span>
            <span><kbd className="bg-slate-100 px-1 rounded">↑↓</kbd> navigate</span>
          </div>
          {data && <span>{data.results.tasks?.total || 0} tasks found in {data.took_ms}ms</span>}
        </div>
      </CommandList>
    </CommandDialog>
  );
}
