import { notFound } from "next/navigation";
import { getSavedListCached } from "@lib/lists";
import ListDetailClient from "../../../lists/[listId]/ListDetailClient";
import { Bookmark, ShieldCheck } from "lucide-react";

// ISR: saved list data is cached across requests and busted by revalidateTag
// whenever a mutation API route runs. The session/isOwner check is done
// client-side so this page is fully cacheable for guest visitors.
export const revalidate = 604800; // 7 days — tag-busted instantly on mutations

export async function generateMetadata({ params }) {
  const { username } = params;

  const list = await getSavedListCached(username);

  if (list) {
    const title = `@${username.toLowerCase()}'s Saved Collection`;
    const description = `Explore the saved wheels and interests of ${username}.`;

    return { 
      title, 
      description, 
      robots: "noindex" // Personal saved pages shouldn't be indexed by default
    };
  }

  return {
    title: "Collection Not Found",
    description: "The requested collection does not exist.",
    robots: "noindex",
  };
}

export default async function SavedPage({ params }) {
  const { username } = params;

  const list = await getSavedListCached(username);

  if (!list) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Clean Header ────────────────────────────────────── */}
      <div className="py-10 border-b border-border bg-card/30">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="p-4 bg-background border border-border rounded-2xl shadow-sm text-primary">
               <Bookmark size={28} />
            </div>
            <div className="text-left">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                Saved Collection
              </h1>
              <p className="text-sm md:text-base text-muted-foreground font-bold">
                Handpicked by @{username.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto pt-8 pb-20">
        <div className="px-4 md:px-6">
           {/* Info Bar */}
           <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-6 px-1">
             <ShieldCheck size={14} className="text-emerald-500" />
             <span>Private & Only Visible to You</span>
           </div>

           {/* Reuse the core logic client but inside our high-end shell */}
           <ListDetailClient
              initialList={list}
              listId={list.id}
              listOwnerId={list.userId}
            />
        </div>
      </div>
    </div>
  );
}
