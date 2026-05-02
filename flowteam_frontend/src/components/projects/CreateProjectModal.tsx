"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProject } from "@/hooks/useProjects";
import { useProjectTemplates } from "@/hooks/usePlanning";
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/store/team";
import { toast } from "sonner";

const projectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color"),
  icon: z.string().optional(),
  template_id: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const COLORS = ["#6366f1", "#06b6d4", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899", "#8b5cf6"];
const EMOJIS = ["🚀", "⚙️", "🎨", "📅", "🔥", "🛠️", "🎯", "⚡", "📦", "💬", "🔍", "🏠"];

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const { activeTeamId } = useTeamStore();
  const createProject = useCreateProject();
  const { data: templates = [] } = useProjectTemplates(activeTeamId ?? undefined);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      color: COLORS[0],
      icon: EMOJIS[0],
      template_id: "",
    },
  });

  const selectedColor = watch("color");
  const selectedIcon = watch("icon");
  const selectedTemplateId = watch("template_id");

  const onSubmit = async (values: ProjectFormValues) => {
    if (!activeTeamId) {
       toast.error("Please select a team first");
       return;
    }
    await createProject.mutateAsync({ ...values, team: activeTeamId, template_id: values.template_id || undefined });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Setup a new workspace for your team tasks.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} placeholder="Project Alpha" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" {...register("description")} placeholder="Describe the project goal..." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="template_id">Template</Label>
            <select
              id="template_id"
              value={selectedTemplateId || ""}
              onChange={(event) => setValue("template_id", event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Start from blank project</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setValue("icon", emoji)}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center rounded border hover:bg-slate-100",
                    selectedIcon === emoji ? "border-primary bg-slate-50" : "border-slate-200"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Theme Color</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue("color", color)}
                  className={cn(
                    "h-6 w-6 rounded-full border-2",
                    selectedColor === color ? "border-slate-900" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={createProject.isPending}>
            {createProject.isPending ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
