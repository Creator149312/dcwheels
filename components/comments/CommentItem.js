"use client";
import { useState } from "react";
import { timeAgo } from "./helpers";
import CommentForm from "./CommentForm";
import RepliesList from "./RepliesList";
import ReportButton from "@components/ReportButton";
import { MoreHorizontal, Flag, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CommentItem({
  comment,
  currentUser,
  isLoggedIn,
  openLoginPrompt,
  onReply,
  onEdit,
  onDelete,
  fetchReplies,
}) {
  const usernameRaw = comment.userId?.name || "User";
  const username = usernameRaw.includes("@") ? usernameRaw.split("@")[0] : usernameRaw;
  const initials = username.charAt(0).toUpperCase();

  // NextAuth stores user ID as `session.user.id`, whereas DB queries often return populated object with `_id` 
  const currentUserId = currentUser?.id || currentUser?._id;
  const commentUserId = comment.userId?.id || comment.userId?._id || comment.userId;
  
  const isAuthor = currentUserId && commentUserId && String(currentUserId) === String(commentUserId);

  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const replyCount = comment.replyCount ?? comment.replies?.length ?? 0;

  const handleToggleReplies = async () => {
    if (!expanded && !comment.repliesLoaded && replyCount > 0) {
      await fetchReplies(comment._id);
    }
    setExpanded((v) => !v);
  };

  return (
    <div className="group animate-in fade-in slide-in-from-bottom-1 duration-300 py-2.5 first:pt-0 last:border-0 border-b border-border/10">
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 rounded-full bg-muted border border-border/40 flex items-center justify-center text-xs font-black text-foreground/80 overflow-hidden">
          {comment.userId?.image || comment.userId?.avatar ? (
            <img 
              src={comment.userId.image || comment.userId.avatar} 
              alt={username} 
              className="w-full h-full object-cover" 
            />
          ) : (
            initials
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between h-5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs md:text-sm text-foreground">
                {username}
              </span>
              <span className="text-xs text-muted-foreground/50">
                {timeAgo(comment.createdAt)}
              </span>
            </div>

            {/* Actions Dropdown */}
            {(isAuthor || !isAuthor) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded-full hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors">
                    <MoreHorizontal size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  {isAuthor ? (
                    <>
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Pencil size={14} className="mr-2" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          if (window.confirm("Delete this comment permanently?")) {
                            onDelete(comment._id);
                          }
                        }}
                      >
                        <Trash2 size={14} className="mr-2" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem asChild>
                      <div className="w-full">
                        <ReportButton
                          targetType="comment"
                          targetId={String(comment._id)}
                          isLoggedIn={isLoggedIn}
                          variant="ghost"
                          className="w-full justify-start px-2 h-8 font-normal text-sm"
                        />
                      </div>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2">
              <CommentForm
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
                openLoginPrompt={openLoginPrompt}
                initialValue={comment.text}
                submitLabel="Save"
                onSubmit={(text, reset) => {
                  onEdit(comment._id, text);
                  setIsEditing(false);
                  reset();
                }}
              />
            </div>
          ) : (
            <div className="mt-0.5 text-sm text-foreground leading-relaxed break-words">
              {comment.text}
            </div>
          )}

          <div className="flex gap-4 mt-2 items-center">
            {/* Reply action */}
            {comment.parentCommentId == null && (
              <button
                className="text-xs font-bold text-muted-foreground/80 hover:text-primary transition-colors"
                onClick={() => setIsReplying(!isReplying)}
              >
                Reply
              </button>
            )}
          </div>

          {isReplying && (
            <div className="mt-2 pl-4 border-l-2 border-border/20">
              <CommentForm
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
                openLoginPrompt={openLoginPrompt}
                placeholder="Write a reply..."
                submitLabel="Reply"
                autoFocus={true}
                onSubmit={(text, reset) => {
                  onReply(comment._id, text);
                  setIsReplying(false);
                  reset();
                }}
              />
            </div>
          )}

          {replyCount > 0 && comment.parentCommentId == null && (
            <button
              onClick={handleToggleReplies}
              className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-primary hover:bg-primary/5 px-2 py-0.5 -ml-1 rounded-full transition-colors w-fit"
            >
              <ChevronIcon open={expanded} />
              {replyCount} {replyCount === 1 ? "Reply" : "Replies"}
            </button>
          )}

          {expanded && comment.replies?.length > 0 && (
            <div className="mt-2 border-l border-border/40 pl-4">
              <RepliesList
                replies={comment.replies}
                currentUser={currentUser}
                isLoggedIn={isLoggedIn}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                disableReply
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg 
      className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
