import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@app/api/auth/[...nextauth]/route";

/**
 * /dashboard/decisions → /u/[username] Redirect
 * Legacy route deprecated in favor of new profile page
 */
export default async function DashboardDecisionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    redirect("/login?callbackUrl=/dashboard/decisions");
  }

  const targetUsername = session?.user?.username || session.user.name;
  redirect(`/u/${encodeURIComponent(targetUsername.toLowerCase())}`);
}

  const doneCount = decisions.filter(d => d.status === "done").length;
  const pendingCount = decisions.filter(d => d.status === "pending" || !d.status).length;
  const droppedCount = decisions.filter(d => d.status === "dropped").length;

  return (
    <div className="w-full px-4 py-8 max-w-4xl mx-auto">
      <div className="mb-6 space-y-4">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-foreground">
            <Zap size={24} className="text-amber-500" /> My Decisions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Timeline of all outcomes you&apos;ve picked across spin wheels.</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="p-4 rounded-xl border border-green-200 dark:border-green-900/40 bg-green-50/50 dark:bg-green-900/10">
          <p className="text-xs text-green-700 dark:text-green-400 font-semibold mb-1">Done</p>
          <p className="text-2xl font-black text-green-700 dark:text-green-400">{doneCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <p className="text-xs text-muted-foreground font-semibold mb-1">Pending</p>
          <p className="text-2xl font-black">{pendingCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/10">
          <p className="text-xs text-red-600 dark:text-red-400 font-semibold mb-1">Dropped</p>
          <p className="text-2xl font-black text-red-600 dark:text-red-400">{droppedCount}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative space-y-4">
        {decisions.length > 0 && (
          <div className="absolute left-4 top-2 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-border to-transparent hidden sm:block" />
        )}
        
        {decisions.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center border border-dashed rounded-xl">
             You haven&apos;t saved any decisions yet. Spin a wheel and commit to an outcome!
          </p>
        ) : (
          decisions.map((d) => <DecisionTimelineItem key={d._id} item={d} />)
        )}
      </div>
    </div>
  );
}
