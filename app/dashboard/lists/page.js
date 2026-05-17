import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { resolveUserIdFromSession, getDashboardLists } from "@lib/dashboard";
import { RowCard } from "@components/UserDashboard";
import { ArrowLeft, BookMarked, Plus } from "lucide-react";

export const metadata = {
  title: "My Lists | Dashboard",
  description: "View and manage all your created lists.",
};

export default async function DashboardListsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/dashboard/lists");
  }

  const userId = await resolveUserIdFromSession(session);
  const lists = await getDashboardLists(userId);

  const totalItems = lists.reduce((acc, curr) => acc + (curr.itemCount || 0), 0);

  return (
    <div className="w-full px-4 py-8 max-w-4xl mx-auto">
      <div className="mb-6 space-y-4">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-foreground">
              <BookMarked size={24} className="text-violet-600" /> My Lists
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your saved collections and wishlists.</p>
          </div>
          
          <a href="/lists/create" className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors">
            <Plus size={16} /> Create New
          </a>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground font-semibold mb-1">Total Lists</p>
          <p className="text-2xl font-black">{lists.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground font-semibold mb-1">Total Items Saved</p>
          <p className="text-2xl font-black">{totalItems}</p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {lists.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center border border-dashed rounded-xl">
            You haven&apos;t created any lists yet.
          </p>
        ) : (
          lists.map((l) => (
             <RowCard key={l.id} href={`/lists/${l.id}`} title={l.name} meta={`${l.itemCount} items`} />
          ))
        )}
      </div>
    </div>
  );
}
