"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Save, Trash2 } from "lucide-react";
import { useDocuments, useCreateDocument } from "@/hooks/useOperations";
import { useProject } from "@/hooks/useProjects";
import type { ProjectDocument } from "@/types/operations";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/errorMessage";

export default function ProjectDocsPage() {
  const { id } = useParams() as { id: string };
  const { data: project } = useProject(id);
  const queryClient = useQueryClient();

  const { data: docs = [] } = useDocuments({ projectId: id });
  const createDoc = useCreateDocument();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => docs.find((d) => d.id === selectedId) ?? null, [docs, selectedId]);

  const [draft, setDraft] = useState<{ title: string; doc_type: ProjectDocument["doc_type"]; content: string }>({
    title: "",
    doc_type: "note",
    content: "",
  });

  const saveDoc = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("No document selected");
      const res = await api.patch(`/projects/documents/${selected.id}/`, {
        title: draft.title,
        doc_type: draft.doc_type,
        content: draft.content,
      });
      return res.data?.data;
    },
    onSuccess: () => {
      toast.success("Document saved");
      queryClient.invalidateQueries({ queryKey: ["ops", "documents"] });
    },
    onError: (err) => toast.error(toErrorMessage(err, "Failed to save document")),
  });

  const deleteDoc = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("No document selected");
      await api.delete(`/projects/documents/${selected.id}/`);
    },
    onSuccess: () => {
      toast.success("Document deleted");
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["ops", "documents"] });
    },
    onError: (err) => toast.error(toErrorMessage(err, "Failed to delete document")),
  });

  const handleSelect = (doc: ProjectDocument) => {
    setSelectedId(doc.id);
    setDraft({ title: doc.title, doc_type: doc.doc_type, content: doc.content ?? "" });
  };

  const handleCreate = async () => {
    const created = await createDoc.mutateAsync({
      project: id,
      title: "New document",
      doc_type: "note",
      content: "",
    });
    if (created?.id) handleSelect(created);
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-background">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-medium tracking-tight">Docs</h1>
          <p className="text-[13px] text-muted-foreground/70 mt-0.5">{project?.name ?? "Project"} wiki and notes.</p>
        </div>
        <Button className="gap-2" onClick={() => void handleCreate()} disabled={createDoc.isPending}>
          <Plus className="h-4 w-4" />
          New doc
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </CardTitle>
            <CardDescription>{docs.length} total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {docs.length === 0 ? (
              <div className="text-sm text-muted-foreground">No documents yet.</div>
            ) : (
              docs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleSelect(d)}
                  className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                    d.id === selectedId ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{d.title}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {d.doc_type}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">v{d.version}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Editor</CardTitle>
            <CardDescription>{selected ? "Edit and save your document." : "Select a document to edit."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Title"
                value={draft.title}
                onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))}
                disabled={!selected}
              />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={draft.doc_type}
                onChange={(e) => setDraft((s) => ({ ...s, doc_type: e.target.value as ProjectDocument["doc_type"] }))}
                disabled={!selected}
              >
                <option value="note">Note</option>
                <option value="spec">Spec</option>
                <option value="sop">SOP</option>
                <option value="meeting">Meeting</option>
                <option value="decision">Decision</option>
              </select>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => deleteDoc.mutate()}
                  disabled={!selected || deleteDoc.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
                <Button className="gap-2" onClick={() => saveDoc.mutate()} disabled={!selected || saveDoc.isPending}>
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>
            <textarea
              className="w-full min-h-[420px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              placeholder="Write markdown..."
              value={draft.content}
              onChange={(e) => setDraft((s) => ({ ...s, content: e.target.value }))}
              disabled={!selected}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

