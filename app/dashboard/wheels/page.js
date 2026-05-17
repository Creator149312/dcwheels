import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { resolveUserIdFromSession, getDashboardWheels } from "@lib/dashboard";
import { WheelRowCard } from "@components/UserDashboard";
import { ArrowLeft, Layers, Plus } from "lucide-react";

export const metadata = {
  title: "My Wheels | Dashboard",
  description: "View and manage all your created wheels.",
};

export default async function DashboardWheelsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/dashboard/wheels");
  }

  const userId = await resolveUserIdFromSession(session);
  const wheels = await getDashboardWheels(session.user.email);

  const publicWheels = wheels.filter(w => w.isPublic).length;
  const privateWheels = wheels.length - publicWheels;

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
              <Layers size={24} className="text-primary" /> My Wheels
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage all your custom created wheels.</p>
          </div>
          
          <a href="/" className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors">
            <Plus size={16} /> Create New
          </a>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground font-semibold mb-1">Total</p>
          <p className="text-2xl font-black">{wheels.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground font-semibold mb-1">Public</p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{publicWheels}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground font-semibold mb-1">Private</p>
          <p className="text-2xl font-black text-gray-600 dark:text-gray-400">{privateWheels}</p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {wheels.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center border border-dashed rounded-xl">
            You haven&apos;t created any wheels yet.
          </p>
        ) : (
          wheels.map((w) => <WheelRowCard key={w._id} item={w} />)
        )}
      </div>
    </div>
  );
}
