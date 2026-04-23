"use client";

import { useRouter, usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@components/ui/dialog";
import { GiCartwheel } from "react-icons/gi";
import { Sparkles, Film } from "lucide-react";

const WHEEL_TYPES = [
  {
    type: "basic",
    icon: <GiCartwheel size={32} className="text-blue-500" />,
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
    icon: <Film size={32} className="text-emerald-500" />,
    label: "Content Wheel",
    description: "Perfect for: Picking movies, games, anime, characters from your lists",
    fullDescription: "Spin your curated lists of movies, anime, games, or characters. Great for deciding what to watch/play next!",
    badge: "Trending",
    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    border: "hover:border-emerald-400 dark:hover:border-emerald-500",
    ring: "focus-visible:ring-emerald-400",
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
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles size={20} className="text-blue-500" />
            What kind of wheel?
          </DialogTitle>
          <DialogDescription>
            Choose a wheel type to get started. You can always change it later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 pt-2">
          {WHEEL_TYPES.map(({ type, icon, label, description, fullDescription, badge, badgeColor, border }) => (
            <button
              key={type}
              onClick={() => handleSelect(type)}
              className={`flex items-start gap-4 w-full text-left px-4 py-4 rounded-xl border-2 border-border bg-card transition-all duration-150 cursor-pointer ${border}`}
            >
              <div className="flex-shrink-0 mt-1">{icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-sm">{label}</span>
                  {badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{description}</p>
                <p className="text-xs text-muted-foreground/80 mt-1.5">{fullDescription}</p>
              </div>
              <span className="text-muted-foreground text-lg flex-shrink-0 mt-1">→</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
