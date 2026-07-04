"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { PenLine } from "lucide-react";

/**
 * OwnProfileActions — shown only when the logged-in user is viewing
 * their own profile. Renders a "New Post" CTA button.
 *
 * Props:
 *   profileUserId — MongoDB _id string of the profile being viewed
 */
export default function OwnProfileActions({ profileUserId }) {
  const { data: session } = useSession();

  // Compare by stable MongoDB ID — session.user.name can differ from the URL slug
  if (!session?.user?.id || session.user.id !== profileUserId) return null;

  return (
    <div className="mt-4 flex gap-3 flex-wrap">
      <Link
        href="/post/create"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-full hover:bg-primary/90 transition active:scale-95 shadow-md shadow-primary/20"
      >
        <PenLine size={15} />
        New Post
      </Link>
    </div>
  );
}
