"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FlaskConical,
  Plus,
  Trash2,
  Wand2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useIssueFields, useCreateIssueField } from "@/hooks/useOperations";
import { useProject } from "@/hooks/useProjects";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";
import type { IssueFieldDefinition } from "@/types/operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";
import { ProjectTopNav } from "@/components/projects/ProjectTopNav";

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  select: "Select",
};

const KANBAN_COLUMNS = [
  "Hypothesis",
  "In Experiment",
  "Eval Review",
  "Staging",
  "Deployed",
];

export default function MLExperimentSetupPage() {
  const { id } = useParams() as { id: string };
  const { data: project } = useProject(id);
  const queryClient = useQueryClient();

  const { data: allFields = [], isLoading } = useIssueFields(id);
  const experimentFields = allFields.filter((f) => f.issue_type === "experiment");

  const createField = useCreateIssueField();

  const [newFieldName, setNewFieldName]   = useState("");
  const [newFieldType, setNewFieldType]   = useState<IssueFieldDefinition["field_type"]>("text");
  const [newRequired, setNewRequired]     = useState(false);
  const [newOptions, setNewOptions]       = useState("");
  const [seeding, setSeeding]             = useState(false);
  const [seedDone, setSeedDone]           = useState(false);

  const deleteField = useMutation({
    mutationFn: async (fieldId: string) => {
      await api.delete(`/projects/issue-fields/${fieldId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops", "issue-fields"] });
      toast.success("Field removed");
    },
    onError: (err) => toast.error(toErrorMessage(err, "Failed to remove field")),
  });

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await api.post<ApiResponse<{ seeded: number }>>("/projects/issue-fields/seed-ml-experiment/", {
        project_id: id,
      });
      const seeded = res.data.data?.seeded ?? 0;
      queryClient.invalidateQueries({ queryKey: ["ops", "issue-fields"] });
      setSeedDone(true);
      toast.success(seeded > 0 ? `Seeded ${seeded} default ML fields` : "All default fields already present");
    } catch (err) {
      toast.error(toErrorMessage(err, "Failed to seed fields"));
    } finally {
      setSeeding(false);
    }
  };

  const handleAddField = async () => {
    if (!newFieldName.trim()) return;
    const options = newFieldType === "select"
      ? newOptions.split(",").map((o) => o.trim()).filter(Boolean)
      : [];
    await createField.mutateAsync({
      project: id,
      issue_type: "experiment",
      name: newFieldName.trim(),
      field_type: newFieldType,
      is_required: newRequired,
      options,
    } as any);
    setNewFieldName("");
    setNewOptions("");
    setNewRequired(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <ProjectTopNav projectId={id} />
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              ML Experiment Setup
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Configure custom fields for <span className="font-medium">Experiment</span> tasks in {project?.name ?? "this project"}.
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleSeedDefaults}
            disabled={seeding || seedDone}
          >
            {seedDone ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {seedDone ? "Defaults loaded" : seeding ? "Seeding…" : "Load Amazon DS defaults"}
          </Button>
        </div>

        {/* Recommended Kanban columns info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recommended board columns for experiments</CardTitle>
            <CardDescription className="text-[12px]">
              Set these columns on your project board to match the ML experiment workflow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {KANBAN_COLUMNS.map((col, i) => (
                <div key={col} className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[11px]">{col}</Badge>
                  {i < KANBAN_COLUMNS.length - 1 && (
                    <span className="text-muted-foreground text-xs">→</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Existing experiment fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Experiment custom fields</span>
              <Badge variant="secondary" className="text-[11px]">{experimentFields.length} fields</Badge>
            </CardTitle>
            <CardDescription className="text-[12px]">
              These fields appear on every Experiment task in this project.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && experimentFields.length === 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-dashed p-4">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">
                  No fields yet. Click <strong>Load Amazon DS defaults</strong> to add the 10 standard ML fields.
                </p>
              </div>
            )}
            {experimentFields.map((field) => (
              <div
                key={field.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}
                  </Badge>
                  <span className="text-sm font-medium truncate">{field.name}</span>
                  {field.is_required && (
                    <Badge variant="destructive" className="text-[10px] shrink-0">Required</Badge>
                  )}
                  {field.options.length > 0 && (
                    <span className="text-[11px] text-muted-foreground truncate hidden sm:block">
                      {field.options.slice(0, 4).join(" · ")}{field.options.length > 4 ? " …" : ""}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => deleteField.mutate(field.id)}
                  disabled={deleteField.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Add custom field */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add custom field</CardTitle>
            <CardDescription className="text-[12px]">Add a field specific to your team's experiment workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Field name (e.g. AUC Score)"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleAddField(); }}
              />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as IssueFieldDefinition["field_type"])}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="select">Select (dropdown)</option>
              </select>
            </div>
            {newFieldType === "select" && (
              <Input
                placeholder="Options, comma-separated (e.g. Low,Medium,High)"
                value={newOptions}
                onChange={(e) => setNewOptions(e.target.value)}
              />
            )}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={newRequired}
                  onChange={(e) => setNewRequired(e.target.checked)}
                  className="rounded"
                />
                Required field
              </label>
              <Button
                className="ml-auto gap-2"
                onClick={handleAddField}
                disabled={!newFieldName.trim() || createField.isPending}
              >
                <Plus className="h-4 w-4" />
                Add field
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
