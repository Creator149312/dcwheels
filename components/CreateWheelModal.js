"use client";

import { useRouter, usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@components/ui/dialog";
import { Disc3 } from "lucide-react";
import { Sparkles, Film, List } from "lucide-react";

const WHEELS = [
  {
    type: "basic",
    icon: <Disc3 size={28} className="text-blue-500" />,
    label: "Classic Wheel",
    description: "Perfect for: Lists, raffles, random selections, games, decision-making",
    fullDescription: "Add any text you want and spin! Ideal for names, choices, quizzes, or anything you need randomly picked.",
    badge: "Most Popular",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    border: "hover:border-blue-400 dark:hover:border-blue-500",
    ring: "focus-visible:ring-blue-400",
  },
  {
    type: "content",
    icon: <Film size={28} className="text-emerald-500" />,
    label: "Content Wheel",
    description: "Perfect for: Picking movies, games, anime, characters from your lists",
    fullDescription: "Spin your curated lists of movies, anime, games, or characters. Great for deciding what to watch/play next!",
    badge: "Trending",
    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    border: "hover:border-emerald-400 dark:hover:border-emerald-500",
    ring: "focus-visible:ring-emerald-400",
  },
];

const OTHER_ITEMS = [
  {
    type: "list",
    icon: <List size={28} className="text-violet-500" />,
    label: "Create List",
    description: "Perfect for: Organizing items, favorites, shopping lists, wishlists",
    fullDescription: "Create and organize your custom collections. Track favorites, shopping items, wishlists, or any organized collection!",
    badge: null,
    badgeColor: "",
    border: "hover:border-violet-400 dark:hover:border-violet-500",
    ring: "focus-visible:ring-violet-400",
  },
];

export default function CreateWheelModal({ open, onClose }) {
  const router = useRouter();
  const currentPath = usePathname();

  const handleSelect = (type) => {
    if (type === "content") {
      onClose();
      router.push("/lists?mode=content");
      return;
    }

    if (type === "list") {
      onClose();
      router.push("/dashboard?tab=my-lists&action=create");
      return;
    }

    // Store chosen type so SegmentsContext can bootstrap correct defaults
    localStorage.setItem("SpinpapaWheelType", type);
    // Clear any previously saved wheel
    localStorage.removeItem("SpinpapaWheel");

    onClose();

    if (currentPath === "/") {
      window.location.reload();
    } else {
      router.push("/");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Sparkles size={18} className="text-blue-500" />
            What would you like to create?
          </DialogTitle>
          <DialogDescription>
            Choose what you&apos;d like to create. You can always change it later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 pt-2">
          {/* ── Lists Section ──────────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 px-1">Collections (Organize & Track)</h3>
            <div className="space-y-2 sm:space-y-3">
              {OTHER_ITEMS.map(({ type, icon, label, description, fullDescription, badge, badgeColor, border }) => (
                <button
                  key={type}
                  onClick={() => handleSelect(type)}
                  className={`flex items-start gap-3 sm:gap-4 w-full text-left px-3 sm:px-4 py-3 sm:py-4 rounded-lg sm:rounded-xl border-2 border-border bg-card transition-all duration-150 cursor-pointer ${border}`}
                >
                  <div className="flex-shrink-0 mt-0.5 sm:mt-1">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="font-bold text-foreground text-sm">{label}</span>
                      {badge && (
                        <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                          {badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 font-medium">{description}</p>
                    <p className="hidden sm:block text-xs text-muted-foreground/80 mt-1">{fullDescription}</p>
                  </div>
                  <span className="text-muted-foreground text-base sm:text-lg flex-shrink-0 mt-0.5 sm:mt-1">→</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Wheels Section ──────────────────────────────────────────── */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 sm:pt-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 px-1">Wheels (Spin & Play)</h3>
            <div className="space-y-2 sm:space-y-3">
              {WHEELS.map(({ type, icon, label, description, fullDescription, badge, badgeColor, border }) => (
                <button
                  key={type}
                  onClick={() => handleSelect(type)}
                  className={`flex items-start gap-3 sm:gap-4 w-full text-left px-3 sm:px-4 py-3 sm:py-4 rounded-lg sm:rounded-xl border-2 border-border bg-card transition-all duration-150 cursor-pointer ${border}`}
                >
                  <div className="flex-shrink-0 mt-0.5 sm:mt-1">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="font-bold text-foreground text-sm">{label}</span>
                      {badge && (
                        <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                          {badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 font-medium">{description}</p>
                    <p className="hidden sm:block text-xs text-muted-foreground/80 mt-1">{fullDescription}</p>
                  </div>
                  <span className="text-muted-foreground text-base sm:text-lg flex-shrink-0 mt-0.5 sm:mt-1">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
