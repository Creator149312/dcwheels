import { Search } from "lucide-react";

export default function SearchEmptyState({ query, label }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
        <div className="relative bg-card border border-border p-6 rounded-3xl shadow-xl">
          <Search className="w-10 h-10 text-primary" />
        </div>
      </div>
      <h2 className="text-xl font-black text-foreground mb-2 capitalize">
        No {label} found
      </h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        No {label} matched{" "}
        <span className="font-semibold text-foreground">{query}</span>.
      </p>
    </div>
  );
}
