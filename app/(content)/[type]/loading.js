export default function TopicListLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero skeleton */}
      <div className="h-72 md:h-[420px] bg-muted animate-pulse" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 md:mb-8">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-8 w-24 bg-muted rounded-full animate-pulse" />
            <div className="h-8 w-24 bg-muted rounded-full animate-pulse" />
            <div className="h-8 w-24 bg-muted rounded-full animate-pulse" />
            <div className="h-8 w-32 bg-muted rounded-full animate-pulse" />
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[3/4] bg-muted rounded-xl animate-pulse" />
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
