"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader, CheckCircle, AlertCircle, X } from "lucide-react";

const STEPS = [
  { id: 1, label: "Title", icon: "✏️" },
  { id: 2, label: "Generate", icon: "✨" },
  { id: 3, label: "Tags", icon: "🏷️" },
  { id: 4, label: "Slug", icon: "🔗" },
  { id: 5, label: "Create", icon: "🎯" },
];

export default function AIWheelGenerator() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [completed, setCompleted] = useState(new Set());

  // Form data
  const [title, setTitle] = useState("");
  const [generated, setGenerated] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [slug, setSlug] = useState("");
  const [tagSearch, setTagSearch] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch("/api/admin/ai-wheel-generator");
        if (response.ok) {
          const data = await response.json();
          setAvailableTags(data.tags || []);
        }
      } catch (err) {
        console.error("Failed to fetch tags:", err);
      }
    };
    fetchTags();
  }, []);

  const handleGenerateContent = async () => {
    if (!title.trim()) {
      setError("Please enter a wheel title");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/ai-wheel-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate content");
      }

      const data = await response.json();
      setGenerated(data);
      setSelectedTags(data.suggestedTags || []);
      // Auto-generate slug from title
      setSlug(
        title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      );

      // Mark step 1 as complete and move to step 2
      setCompleted((prev) => new Set([...prev, 1]));
      setCurrentStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep < STEPS.length) {
      setCompleted((prev) => new Set([...prev, currentStep]));
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateWheel = async () => {
    if (!generated) {
      setError("Generation data missing");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/ai-wheel-generator/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          shortDescription: generated.shortDescription,
          contentParagraphs: generated.contentParagraphs,
          segments: generated.segments,
          tags: selectedTags,
          slug,
          indexed: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create wheel");
      }

      const data = await response.json();
      setSuccess(`Wheel created! Visit /wheels/${data.slug}`);
      setCompleted((prev) => new Set([...prev, 5]));
      setCurrentStep(6);

      // Reset form
      setTimeout(() => {
        setTitle("");
        setGenerated(null);
        setSelectedTags([]);
        setSlug("");
        setCompleted(new Set());
        setCurrentStep(1);
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredTags = availableTags.filter((t) =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />`n            <h1 className="text-4xl font-black text-foreground">
              AI Wheel Creator
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Create engaging wheels powered by AI in 5 simple steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-10 bg-card rounded-lg p-4 sm:p-6 shadow-sm border border-border">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-0 sm:justify-between">{STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-3">
                <button
                  onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full font-bold text-base sm:text-lg transition flex items-center justify-center ${
                    completed.has(step.id)
                      ? "bg-green-100 text-green-700 cursor-pointer"
                      : currentStep === step.id
                      ? "bg-primary/10 text-primary ring-2 ring-primary/30 cursor-pointer"
                      : step.id < currentStep
                      ? "bg-muted text-muted-foreground cursor-pointer"
                      : "bg-muted/50 text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {completed.has(step.id) ? "✓" : step.icon}
                </button>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-foreground">
                    {step.label}
                  </p>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`hidden sm:block w-8 h-1 mx-2 rounded-full ${
                      step.id < currentStep
                        ? "bg-green-300"
                        : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
              className="ml-auto text-red-600 hover:text-red-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3 items-start">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">Success!</p>
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Content Card */}
        <div className="bg-card rounded-lg shadow-md border border-border p-6 sm:p-8 mb-6">
          {/* Step 1: Title Input */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  What kind of wheel do you want to create?
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., 'Anime Character Picker', 'Movie Recommendation Wheel', 'Decision Maker'"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Be specific! Examples: &quot;Anime Character Picker&quot;, &quot;Gaming Genres&quot;, &quot;Movie Mood Selector&quot;
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleGenerateContent}
                  disabled={loading || !title.trim()}
                  className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate with AI
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review Generated Content */}
          {currentStep === 2 && generated && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-3">Segments</h3>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {generated.segments.map((seg, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-muted border-border rounded-lg"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {seg.text}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                            style={{ width: `${(seg.weight / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {seg.weight}/10
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1">Summary</h3>
                <p className="text-sm text-muted-foreground italic mb-4 border-l-4 border-blue-300 pl-3">
                  {generated.shortDescription}
                </p>

                <h3 className="font-semibold text-foreground mb-2">Page Content</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {generated.contentParagraphs?.map((para, i) => (
                    <p key={i} className="text-sm text-foreground leading-relaxed p-3 bg-muted/40 border border-border rounded">
                      {para}
                    </p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {generated.contentParagraphs?.join(" ").split(" ").length || 0} words across {generated.contentParagraphs?.length || 0} paragraphs
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handlePrevStep}
                  className="flex-1 px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted/40 font-semibold transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Select Tags */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Select Tags (Pick up to 10)
                </label>
                <input
                  type="text"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Search tags..."
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-3"
                />

                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 border border-border rounded-lg bg-muted/40">
                  {filteredTags.length > 0 ? (
                    filteredTags.map((tag) => (
                      <button
                        key={tag.name}
                        onClick={() => toggleTag(tag.name)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedTags.includes(tag.name)
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border text-foreground hover:border-blue-300"
                        }`}
                      >
                        {tag.name}
                        <span className="ml-1 text-xs opacity-70">({tag.count})</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No tags found</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {selectedTags.length}/10
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handlePrevStep}
                  className="flex-1 px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted/40 font-semibold transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Customize Slug */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Page URL Slug
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">/wheels/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "")
                          .replace(/^-+|-+$/g, "")
                      )
                    }
                    className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Your wheel will be accessible at: <code className="bg-muted px-2 py-1 rounded">/wheels/{slug}</code>
                </p>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Preview</h4>
                <div className="space-y-1 text-sm text-foreground">
                  <p>
                    <strong>Title:</strong> {title}
                  </p>
                  <p>
                    <strong>Tags:</strong> {selectedTags.join(", ") || "None"}
                  </p>
                  <p>
                    <strong>Segments:</strong> {generated?.segments.length || 0}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handlePrevStep}
                  className="flex-1 px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted/40 font-semibold transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Create */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="p-6 bg-primary/5 border border-primary/20 rounded-lg text-center">
                <Sparkles className="w-12 h-12 text-primary mx-auto mb-3" />
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Ready to create your wheel?
                </h3>
                <p className="text-muted-foreground mb-4">
                  Your AI-powered wheel with {generated?.segments.length} segments is ready to go live!
                </p>

                <div className="space-y-2 text-sm text-foreground">
                  <p>✓ {generated?.segments.length} wheel segments</p>
                  <p>✓ {generated?.contentParagraphs?.length || 0} content paragraphs (~{generated?.contentParagraphs?.join(" ").split(" ").length || 0} words)</p>
                  <p>✓ Tags: {selectedTags.join(", ") || "None selected"}</p>
                  <p>✓ URL: <code className="bg-muted px-2 py-1 rounded">/wheels/{slug}</code></p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handlePrevStep}
                  disabled={loading}
                  className="flex-1 px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted/40 font-semibold transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateWheel}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Create Wheel
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Success State */}
          {currentStep === 6 && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Wheel Created!
              </h3>
              <p className="text-muted-foreground mb-6">
                Your AI-powered wheel is now live and ready to spin.
              </p>
              <button
                onClick={() => {
                  setTitle("");
                  setGenerated(null);
                  setSelectedTags([]);
                  setSlug("");
                  setCompleted(new Set());
                  setCurrentStep(1);
                }}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold transition-colors"
              >
                Create Another
              </button>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-3">💡 How it works</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• AI generates 8-12 engaging segments based on your title</li>
            <li>• Segments are auto-weighted by relevance & trending factors</li>
            <li>• Professional description written by AI (~300 words)</li>
            <li>• Select from popular tags or add your own</li>
            <li>• Customize the URL slug before creating</li>
            <li>• Wheel is instantly accessible and ready to use</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
