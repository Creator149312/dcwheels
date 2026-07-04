"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import Link from "next/link";

const DEFAULT_EXPIRATION_HOURS = 24; // Default to 24 hours

export default function CreateAskPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [expirationHours, setExpirationHours] = useState(DEFAULT_EXPIRATION_HOURS);
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddOption = useCallback(() => {
    if (options.length < 4) {
      setOptions([...options, ""]);
    }
  }, [options]);

  const handleRemoveOption = useCallback((index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  }, [options]);

  const handleOptionChange = useCallback((index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  }, [options]);

  if (status === "loading") {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={32} /></div>;
  }

  if (!session?.user?.email) {
    return (
      <div className="max-w-2xl mx-auto p-4 py-20 text-center">
        <p className="text-lg font-semibold text-foreground mb-4">You must be logged in to create a dilemma.</p>
        <Link href="/login?callbackUrl=/ask/create" className="inline-block bg-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-full hover:bg-primary/90">
          Log In
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate
    if (!question.trim()) {
      setError("Question is required");
      return;
    }
    if (options.filter((o) => o.trim()).length < 2) {
      setError("At least 2 options are required");
      return;
    }

    setLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(expirationHours || 24));

      const res = await fetch("/api/ask/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          options: options
            .filter((o) => o.trim())
            .map((text) => ({ text: text.trim(), voteCount: 0 })),
          tags: tags
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean),
          expiresAt,
          isPublic,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create dilemma");
      }

      const result = await res.json();
      router.push(`/ask/${result.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6 py-10">
      <h1 className="text-3xl font-bold mb-8 text-foreground">Create a Dilemma</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Question */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            What&apos;s your question?
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Should I watch this anime or read the manga?"
            maxLength={500}
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {question.length}/500
          </p>
        </div>

        {/* Options */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-3">
            Options
          </label>
          <div className="space-y-2">
            {options.map((option, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  maxLength={100}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 4 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition"
            >
              <Plus size={16} /> Add Option
            </button>
          )}
        </div>

        {/* Expiration & Tags */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Expires in (hours)
            </label>
            <select
              value={expirationHours}
              onChange={(e) => setExpirationHours(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={1}>1 hour</option>
              <option value={6}>6 hours</option>
              <option value={24}>24 hours</option>
              <option value={72}>3 days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., anime, manga, decisions"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Public Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-card cursor-pointer"
          />
          <label htmlFor="isPublic" className="text-sm font-medium text-foreground cursor-pointer">
            Make this public (visible on Ask feed & profile)
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Creating...
              </>
            ) : (
              "Create Dilemma"
            )}
          </button>
          <Link href="/ask" className="px-6 py-3 rounded-lg border border-border text-foreground hover:bg-muted transition font-semibold">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}

