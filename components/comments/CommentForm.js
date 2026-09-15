"use client";
import { useState, useEffect, useRef } from "react";
import { Smile } from "lucide-react";

export default function CommentForm({
  onSubmit,
  isLoggedIn,
  currentUser,
  openLoginPrompt,
  placeholder = "Add a comment...",
  autoFocus = false,
  initialValue = "",
  submitLabel = "Comment",
  loading = false,
}) {
  const [text, setText] = useState(initialValue);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);

  // Listen for global custom focus event for detail page scrolling + focus trigger
  useEffect(() => {
    const handleGlobalFocus = () => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        setFocused(true);
      }
    };
    window.addEventListener("comment-form:focus", handleGlobalFocus);
    return () => window.removeEventListener("comment-form:focus", handleGlobalFocus);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(text.trim(), () => {
      setText("");
      setFocused(false);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mb-2 group">
      <div className="flex gap-2.5 items-start">
        {/* User avatar */}
        <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-muted border border-border/40 overflow-hidden">
          {isLoggedIn && (currentUser?.image || currentUser?.avatar) ? (
            <img 
              src={currentUser.image || currentUser.avatar} 
              alt={currentUser.name} 
              className="w-full h-full object-cover" 
            />
          ) : (
             <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
               {isLoggedIn && currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "?"}
             </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={focused ? 2 : 1}
              placeholder={isLoggedIn ? placeholder : "Add a comment..."}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                // Simple auto-resize
                e.target.style.height = 'inherit';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onFocus={() => {
                if (!isLoggedIn) {
                  openLoginPrompt?.();
                  // Optional: blur the element so they don't keep typing 
                  // or just let them see the modal.
                  return;
                }
                setFocused(true);
              }}
              autoFocus={autoFocus}
              disabled={loading}
              className={`
                w-full resize-none bg-transparent py-0.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none outline-none
                border-b ${focused ? 'border-primary border-b-2' : 'border-border/40'}
                transition-all duration-200
              `}
            />
          </div>

          {focused && (
            <div className="flex justify-end items-center mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setText("");
                    setFocused(false);
                  }}
                  className="px-3 py-1 rounded-full text-xs font-bold text-foreground hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!text.trim() || loading}
                  className={`
                    px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all
                    ${!text.trim() || loading 
                      ? "bg-muted text-muted-foreground/50 cursor-not-allowed" 
                      : "bg-[#3ea6ff] hover:bg-[#65b8ff] text-black"}
                  `}
                >
                  {loading ? "Posting..." : submitLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

