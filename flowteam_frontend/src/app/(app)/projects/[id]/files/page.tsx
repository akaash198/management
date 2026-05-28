"use client";

import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink, Eye, FileSpreadsheet, FileText, FileType2, FolderOpen, Presentation, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useDocuments, useCreateDocument } from "@/hooks/useOperations";
import { useProject } from "@/hooks/useProjects";
import { ProjectTopNav } from "@/components/projects/ProjectTopNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import api from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import type { ProjectDocument } from "@/types/operations";

type Category = ProjectDocument["category"];

const CATEGORY_META: Record<Category, { label: string; icon: ComponentType<{ className?: string }> }> = {
  ppt: { label: "PPT", icon: Presentation },
  usecase: { label: "Use case", icon: FileType2 },
  documentation: { label: "Documentation", icon: FileText },
  excel: { label: "Excel", icon: FileSpreadsheet },
  other: { label: "Other", icon: FolderOpen },
};

function fileNameFromUrl(url: string) {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop() || "";
    return decodeURIComponent(last);
  } catch {
    const last = url.split("/").pop() || "";
    return decodeURIComponent(last);
  }
}

function fileExt(filename: string) {
  const base = filename.split("?")[0].split("#")[0];
  const idx = base.lastIndexOf(".");
  if (idx === -1) return "";
  return base.slice(idx + 1).toLowerCase();
}

export default function ProjectFilesPage() {
  const { id } = useParams() as { id: string };
  const { data: project } = useProject(id);
  const queryClient = useQueryClient();

  const { data: docs = [] } = useDocuments({ projectId: id });
  const createDoc = useCreateDocument();

  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("documentation");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);

  const fileDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs
      .filter((d) => !!d.attachment_url)
      .filter((d) => {
        if (!q) return true;
        const name = fileNameFromUrl(d.attachment_url || "");
        return (d.title || "").toLowerCase().includes(q) || name.toLowerCase().includes(q) || (d.category || "").toLowerCase().includes(q);
      });
  }, [docs, query]);

  const byCategory = useMemo(() => {
    const grouped: Record<Category, ProjectDocument[]> = { ppt: [], usecase: [], documentation: [], excel: [], other: [] };
    for (const d of fileDocs) grouped[d.category || "other"].push(d);
    return grouped;
  }, [fileDocs]);

  const deleteDoc = useMutation({
    mutationFn: async (docId: string) => {
      await api.delete(`/projects/documents/${docId}/`);
    },
    onSuccess: () => {
      toast.success("File removed");
      queryClient.invalidateQueries({ queryKey: ["ops", "documents"] });
    },
    onError: (err) => toast.error(toErrorMessage(err, "Failed to delete file")),
  });

  const handleUpload = async () => {
    if (!newFile) {
      toast.error("Pick a file to upload");
      return;
    }
    try {
      setUploading(true);
      await createDoc.mutateAsync({
        project: id,
        title: newTitle || newFile.name,
        doc_type: "note",
        content: "",
        category: newCategory,
        attachment: newFile,
      });
      setNewTitle("");
      setNewFile(null);
      setNewCategory("documentation");
    } catch (err) {
      toast.error(toErrorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ProjectTopNav projectId={id} />
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[22px] font-medium tracking-tight">Files</h1>
            <p className="text-[13px] text-muted-foreground/70 mt-0.5">
              {project?.name ?? "Project"} documents with a simple breakdown (PPT, use cases, documentation, Excel).
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </CardTitle>
            <CardDescription>Upload a project-related file and tag it for faster browsing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-6">
              <div className="md:col-span-2">
                <Input placeholder="Title (optional)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as Category)}
                >
                  <option value="documentation">Project documentation</option>
                  <option value="usecase">Use case</option>
                  <option value="ppt">PPT</option>
                  <option value="excel">Excel</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Input
                  type="file"
                  onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                  aria-label="Choose file"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => { setNewFile(null); setNewTitle(""); }}>
                Clear
              </Button>
              <Button className="gap-2" onClick={() => void handleUpload()} disabled={uploading || createDoc.isPending}>
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <Input className="pl-8" placeholder="Search files..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Badge variant="secondary" className="text-[11px]">
            {fileDocs.length} file(s)
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const list = byCategory[cat] ?? [];
            return (
              <Card key={cat}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {meta.label}
                  </CardTitle>
                  <CardDescription>{list.length} item(s)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {list.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No files in this category.</div>
                  ) : (
                    list.map((d) => {
                      const filename = fileNameFromUrl(d.attachment_url);
                      const ext = fileExt(filename);
                      const canInlinePreview = ["pdf", "png", "jpg", "jpeg", "gif", "webp"].includes(ext);
                      return (
                        <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{d.title || filename}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{filename}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                if (!d.attachment_url) return;
                                if (!canInlinePreview) {
                                  toast.info("Preview not available for this file type. Use Open instead.");
                                  return;
                                }
                                setPreviewDoc(d);
                              }}
                              disabled={!d.attachment_url}
                            >
                              <Eye className="h-4 w-4" />
                              Preview
                            </Button>
                            <Button asChild variant="outline" size="sm" className="gap-2">
                              <a href={d.attachment_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                Open
                              </a>
                            </Button>
                            <Button asChild variant="ghost" size="sm" className="text-muted-foreground" aria-label="Download file">
                              <a href={d.attachment_url} download>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground"
                              onClick={() => deleteDoc.mutate(d.id)}
                              disabled={deleteDoc.isPending}
                              aria-label="Delete file"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!previewDoc} onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span className="truncate">{previewDoc?.title || (previewDoc?.attachment_url ? fileNameFromUrl(previewDoc.attachment_url) : "Preview")}</span>
              {previewDoc?.attachment_url && (
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <a href={previewDoc.attachment_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </a>
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewDoc?.attachment_url ? (
            (() => {
              const ext = fileExt(fileNameFromUrl(previewDoc.attachment_url));
              if (ext === "pdf") {
                return <iframe title="PDF Preview" src={previewDoc.attachment_url} className="w-full h-[75vh] rounded-md border" />;
              }
              if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
                return (
                  <div className="w-full h-[75vh] overflow-auto rounded-md border bg-muted/10 flex items-start justify-center p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewDoc.attachment_url} alt="Preview" className="max-w-full h-auto rounded" />
                  </div>
                );
              }
              return (
                <div className="text-sm text-muted-foreground">
                  Preview not available for this file type.
                </div>
              );
            })()
          ) : (
            <div className="text-sm text-muted-foreground">No preview available.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
