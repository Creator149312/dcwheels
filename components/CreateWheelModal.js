"use client";

import { useRouter, usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@components/ui/dialog";
import { GiCartwheel } from "react-icons/gi";
import { FaGraduationCap, FaSlidersH } from "react-icons/fa";
import { Sparkles } from "lucide-react";

const WHEEL_TYPES = [
  {
    type: "basic",
    icon: <GiCartwheel size={32} className="text-blue-500" />,
    label: "Classic Wheel",
    description: "Random picker for names, choices, and raffles.",
    badge: "Most Popular",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    border: "hover:border-blue-400 dark:hover:border-blue-500",
    ring: "focus-visible:ring-blue-400",
  },
  {
    type: "quiz",
    icon: <FaGraduationCap size={32} className="text-purple-500" />,
    label: "Quiz Wheel",
    description: "Interactive trivia & flashcards with score tracking.",
    badge: "New",
    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    border: "hover:border-purple-400 dark:hover:border-purple-500",
    ring: "focus-visible:ring-purple-400",
  },
  {
    type: "advanced",
    icon: <FaSlidersH size={32} className="text-orange-500" />,
    label: "Advanced Wheel",
    description: "Custom weights, colors, and full segment control.",
    badge: null,
    badgeColor: "",
    border: "hover:border-orange-400 dark:hover:border-orange-500",
    ring: "focus-visible:ring-orange-400",
  },
];

export default function CreateWheelModal({ open, onClose }) {
  const router = useRouter();
  const currentPath = usePathname();

  const handleSelect = (type) => {
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
          {WHEEL_TYPES.map(({ type, icon, label, description, badge, badgeColor, border }) => (
            <button
              key={type}
              onClick={() => handleSelect(type)}
              className={`flex items-center gap-4 w-full text-left px-4 py-4 rounded-xl border-2 border-border bg-card transition-all duration-150 cursor-pointer ${border}`}
            >
              <div className="flex-shrink-0">{icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-sm">{label}</span>
                  {badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
              <span className="text-muted-foreground text-lg">→</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
