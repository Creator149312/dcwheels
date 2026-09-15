import Link from "next/link";
import { Card } from "@components/ui/card";
import { ArrowRight, Layers } from "lucide-react";
import { getWheelUrl } from "@utils/UrlHandler";

export default function WheelCard({ item }) {
  const segmentCount = item.data?.length || item.segmentCount || 0;

  return (
    <Link href={getWheelUrl(item)} className="group block touch-manipulation">
      <Card className="group relative overflow-hidden border-none bg-card shadow-sm p-3 md:p-5 lg:p-6 transition duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 active:scale-[0.99]">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/0 group-hover:from-primary/5 transition-colors duration-500" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 md:space-x-5 min-w-0">
            <div className="relative flex-shrink-0 h-10 w-10 md:h-12 lg:h-14 md:w-12 lg:w-14 flex items-center justify-center rounded-lg md:rounded-xl lg:rounded-2xl bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:rotate-12 transition duration-300">
              <Layers size={18} className="md:w-5 md:h-5 lg:w-6 lg:h-6" />
            </div>
            <div className="truncate">
              <h2 className="text-base md:text-lg lg:text-xl font-bold text-foreground truncate mb-0.5 md:mb-1">
                {item.title}
              </h2>
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-wider">
                {segmentCount} Segment{segmentCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="h-7 w-7 md:h-9 md:w-9 lg:h-10 lg:w-10 flex items-center justify-center rounded-full border border-border group-hover:bg-primary group-hover:border-primary transition">
              <ArrowRight
                size={14}
                className="text-muted-foreground md:w-4 md:h-4 lg:w-[18px] lg:h-[18px] group-hover:text-primary-foreground group-hover:translate-x-0.5 transition"
              />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
