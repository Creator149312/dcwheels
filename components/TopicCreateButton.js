"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, X, BarChart2, Disc3, Loader2, ChevronLeft } from "lucide-react";

// Inline version of TopicCreateFAB — same functionality, different UI placement

export default function TopicCreateButton({ tag, tagDisplay, contentRef = null }) {
  const { data: session } = useSession();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("choose"); // "choose" | "poll"

  // Poll form state
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setStep("choose");
    setTitle("");
    setOptions(["", ""]);
    setError("");
    setLoading(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  const openModal = () => {
    reset();
    setOpen(true);
  };

  // ── Wheel choice ──────────────────────────────────────────────────────────
  const handleWheelChoice = () => {
    close();
    router.push(`/wheels/create?tag=${encodeURIComponent(tag)}`);
  };

  // ── Poll submission ───────────────────────────────────────────────────────
  const handlePollSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) { setError("Question is required"); return; }
    const filled = options.filter((o) => o.trim());
    if (filled.length < 2) { setError("Add at least 2 options"); return; }

    if (!session?.user) {
      router.push(`/login?callbackUrl=/tags/${tag}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/post/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: "",
          image: null,
          hasPoll: true,
          pollOptions: filled.map((text) => ({ text: text.trim(), voteCount: 0 })),
          tags: [tag],
          contentRef: contentRef || null,
          isPublic: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create poll");
      }

      const { id } = await res.json();
      close();
      if (session?.user?.username) {
        router.push(`/u/${session.user.username}`);
      } else {
        router.push(id ? `/post/${id}` : `/tags/${tag}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
  };

  const removeOption = (i) => {
    if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i));
  };

  const updateOption = (i, val) => {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  };

  return (
    <>
      {/* ── Inline Pill Button ──────────────────────── */}
      <button
        onClick={openModal}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground text-sm font-semibold transition-colors duration-150 flex-shrink-0"
      >
        <Plus size={16} className="flex-shrink-0" />
        Create
      </button>

      {/* ── Backdrop & Modal ─────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                {step === "poll" && (
                  <button
                    onClick={() => setStep("choose")}
                    className="text-muted-foreground hover:text-foreground mr-1 -ml-1 p-1 rounded"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <div>
                  <p className="text-[11px] font-medium text-primary uppercase tracking-wider">
                    {tagDisplay} Space
                  </p>
                  <h2 className="text-base font-bold text-foreground leading-tight">
                    {step === "choose"
                      ? "What do you want to create?"
                      : `Add a Poll about ${tagDisplay}`}
                  </h2>
                </div>
              </div>
              <button
                onClick={close}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Step: Choose ─────────────────────────────────────────────── */}
            {step === "choose" && (
              <div className="p-5 flex flex-col gap-3">
                {/* Poll card */}
                <button
                  onClick={() => setStep("poll")}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30 hover:border-primary/60 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <BarChart2 size={22} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">
                      Add a Poll about {tagDisplay}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ask the community to vote — tag is pre-filled
                    </p>
                  </div>
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-semibold shrink-0">
                    Hot
                  </span>
                </button>

                {/* Wheel card */}
                <button
                  onClick={handleWheelChoice}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30 hover:border-amber-500/60 hover:bg-amber-500/5 transition-all text-left group"
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                    <Disc3 size={22} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">
                      Create a {tagDisplay} Wheel
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Build a spinner for the community to use
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* ── Step: Quick Poll Form ─────────────────────────────────────── */}
            {step === "poll" && (
              <form onSubmit={handlePollSubmit} className="p-5 flex flex-col gap-4">
                {/* Tag chip */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                    #{tag}
                  </span>
                  <span className="text-xs text-muted-foreground">auto-tagged</span>
                </div>

                {/* Question */}
                <div>
                  <input
                    type="text"
                    placeholder={`Who would win: Iron Man or Batman?`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    autoFocus
                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition"
                  />
                </div>

                {/* Poll options */}
                <div className="flex flex-col gap-2">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {String.fromCharCode(65 + i)}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        maxLength={100}
                        className="flex-1 bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add option button */}
                  {options.length < 4 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium py-1.5 transition-colors"
                    >
                      <Plus size={14} />
                      Add Option
                    </button>
                  )}
                </div>

                {error && (
                  <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground font-semibold rounded-xl px-4 py-3 text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating Poll...
                    </>
                  ) : (
                    "Post Poll"
                  )}
                </button>
              </form>
            )}

          </div>
        </div>
      )}
    </>
  );
}
