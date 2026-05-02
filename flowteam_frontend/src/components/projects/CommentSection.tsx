"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { Comment } from "@/types/messaging";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Send, X, Edit2, Trash2, Reply } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { MentionAutocomplete } from "@/components/messaging/MentionAutocomplete";

export function CommentSection({ taskId, teamId }: { taskId: string; teamId: string }) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchComments = async () => {
    const res = await api.get(`/tasks/${taskId}/comments/`);
    if (res.data.success) {
      setComments(res.data.data);
    }
  };

  useEffect(() => {
    fetchComments();
    
    // Setup polling or WS for real-time
    const interval = setInterval(fetchComments, 10000);
    return () => clearInterval(interval);
  }, [taskId]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setIsLoading(true);
    try {
      const res = await api.post(`/tasks/${taskId}/comments/`, {
        text: newComment,
        parent: replyTo?.id,
        mentions
      });
      if (res.data.success) {
        setNewComment("");
        setMentions([]);
        setReplyTo(null);
        fetchComments();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 font-semibold">
        <MessageSquare className="h-4 w-4" />
        Comments
      </div>

      <div className="space-y-4">
        {replyTo && (
          <div className="bg-slate-50 p-2 rounded flex items-center justify-between text-xs border border-slate-200 border-l-4 border-l-primary">
            <span className="truncate">Replying to <strong>{replyTo.author.full_name}</strong></span>
            <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        
        <div className="relative group">
          <MentionAutocomplete 
            value={newComment} 
            onChange={setNewComment} 
            onMentionsChange={setMentions}
            teamId={teamId}
            placeholder="Write a comment... (Type @ to mention)"
          />
          <div className="flex justify-end mt-2">
            <Button size="sm" onClick={handleSubmit} disabled={isLoading || !newComment.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Comment
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem 
            key={comment.id} 
            comment={comment} 
            onReply={(c) => setReplyTo(c)}
            currentUserId={user?.id}
          />
        ))}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  onReply,
  currentUserId,
}: {
  comment: Comment;
  onReply: (comment: Comment) => void;
  currentUserId?: string | null;
}) {
  const isAuthor = comment.author.id === currentUserId;
  return (
    <div className="flex gap-3 group">
      <div className="h-8 w-8 rounded-full bg-slate-100 border flex items-center justify-center shrink-0">
        {comment.author.avatar ? (
          <img src={comment.author.avatar} className="h-full w-full rounded-full object-cover" />
        ) : (
          <span className="text-[10px] font-bold">{comment.author.full_name[0]}</span>
        )}
      </div>
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{comment.author.full_name}</span>
          <span className="text-[10px] text-slate-400">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
          {comment.is_edited && <span className="text-[10px] text-slate-400 italic">(edited)</span>}
        </div>
        
        <div className={cn(
          "text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-transparent hover:border-slate-200 transition-colors",
          comment.is_deleted && "italic text-slate-400 bg-transparent"
        )}>
          {comment.text}
        </div>

        {!comment.is_deleted && (
          <div className="flex items-center gap-4 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onReply(comment)} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-primary font-bold uppercase tracking-wider">
              <Reply className="h-3 w-3" /> Reply
            </button>
            {isAuthor && (
              <>
                <button className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-900 font-bold uppercase tracking-wider">
                  <Edit2 className="h-3 w-3" /> Edit
                </button>
                <button className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-red-500 font-bold uppercase tracking-wider">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </>
            )}
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 pl-4 border-l-2 border-slate-100 space-y-4">
            {comment.replies.map(reply => (
               <CommentItem key={reply.id} comment={reply} onReply={onReply} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
