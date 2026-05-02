"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateColumn } from "@/hooks/useColumns";

interface CreateColumnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  nextOrder: number;
}

export function CreateColumnModal({ open, onOpenChange, projectId, nextOrder }: CreateColumnModalProps) {
  const [name, setName] = useState("");
  const createColumn = useCreateColumn();

  const handleCreate = () => {
    if (!name.trim()) return;
    
    createColumn.mutate({
      projectId,
      name: name.trim(),
      order: nextOrder,
    }, {
      onSuccess: () => {
        setName("");
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add New Column</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Column Name</Label>
            <Input 
              id="name" 
              placeholder="e.g. In Review, QA, Testing" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createColumn.isPending}>
            {createColumn.isPending ? "Adding..." : "Add Column"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
