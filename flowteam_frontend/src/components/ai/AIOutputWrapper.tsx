"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, AlertCircle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface AIOutputWrapperProps {
  logId?: string | null;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}

/**
 * Wraps any AI-generated content block with:
 * - An "AI-generated" disclaimer
 * - Thumbs up/down feedback that posts to /ai/logs/:id/feedback/
 */
export function AIOutputWrapper({ logId, children, className, compact = false }: AIOutputWrapperProps) {
  const [rating, setRating] = useState<1 | 5 | null>(null);
  const [showTextarea, setShowTextarea] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submitFeedback(r: 1 | 5, text?: string) {
    if (!logId || submitted) return;
    setSubmitting(true);
    try {
      await api.post(`/ai/logs/${logId}/feedback/`, {
        rating: r,
        feedback_text: text ?? "",
        output_acted_on: r === 5,
      });
      setSubmitted(true);
    } catch {
      // silent — feedback is non-critical
    } finally {
      setSubmitting(false);
    }
  }

  function handleThumbsUp() {
    setRating(5);
    submitFeedback(5);
  }

  function handleThumbsDown() {
    setRating(1);
    setShowTextarea(true);
  }

  function handleTextSubmit() {
    submitFeedback(1, feedbackText);
    setShowTextarea(false);
  }

  return (
    <div className={cn("relative", className)}>
      {children}

      <div className={cn(
        "mt-2 flex items-center justify-between gap-2",
        compact ? "pt-1" : "pt-2 border-t"
      )}>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>AI-generated · May contain errors · Verify before acting</span>
        </div>

        {logId && !submitted && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-6 w-6", rating === 5 && "text-green-600")}
              onClick={handleThumbsUp}
              disabled={submitting || !!rating}
              title="Helpful"
            >
              {submitting && rating === 5 ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ThumbsUp className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-6 w-6", rating === 1 && "text-red-500")}
              onClick={handleThumbsDown}
              disabled={submitting || !!rating}
              title="Not helpful"
            >
              {submitting && rating === 1 ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ThumbsDown className="h-3 w-3" />
              )}
            </Button>
          </div>
        )}

        {submitted && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Check className="h-3 w-3 text-green-500" />
            <span>Thanks for your feedback</span>
          </div>
        )}
      </div>

      {showTextarea && !submitted && (
        <div className="mt-2 space-y-1.5">
          <Textarea
            placeholder="What was wrong with this output? (optional)"
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            rows={2}
            className="text-xs resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowTextarea(false)}>
              Skip
            </Button>
            <Button size="sm" className="text-xs h-7" onClick={handleTextSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Submit feedback
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
