import { Card } from "@components/ui/card";
import { Layers } from "lucide-react";

export default function WheelsSectionSkeleton({ count = 10 }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className="relative overflow-hidden border-none bg-card shadow-sm p-3.5 md:p-6"
        >
          <div className="flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center space-x-3 md:space-x-5 min-w-0">
              <div className="h-11 w-11 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-muted" />
              <div className="space-y-2">
                <div className="h-4 md:h-5 w-32 md:w-56 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
            </div>
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-muted" />
          </div>
        </Card>
      ))}
    </div>
  );
}
