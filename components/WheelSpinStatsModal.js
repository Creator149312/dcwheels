"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { BarChart2, Lock, Sparkles, X, ChevronRight } from "lucide-react";

function formatCount(n) {
  if (!n || n === 0) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

/**
 * WheelSpinStatsModal: Detailed segment hit distribution and landing frequency.
 * Gated for Pro users (or admins). Non-pro users see a blurred preview with an upgrade upsell.
 */
export default function WheelSpinStatsModal({ isOpen, onClose, wheelId, wheelTitle }) {
  const { data: session } = useSession();
  const openLoginPrompt = useLoginPrompt();

  const isPro = Boolean(session?.user?.isPro || session?.user?.role === "admin");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!isOpen || !wheelId) return;

    let ignore = false;
    setLoading(true);

    fetch(`/api/wheel-analytics/${wheelId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!ignore && json?.analytics) {
          setData(json.analytics);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isOpen, wheelId]);

  if (!isOpen) return null;

  const topSegments = data?.topSegments || [];
  const spinCount = data?.spin_count || 0;
  const viewCount = data?.view_count || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-card text-card-foreground border border-border/80 rounded-2xl shadow-2xl p-5 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <BarChart2 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-tight">Wheel Spin Analytics</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  PRO
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-[260px] sm:max-w-xs">
                {wheelTitle || "Wheel Statistics"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-4 overflow-y-auto relative">
          {/* Summary counters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-center">
              <span className="text-xs text-muted-foreground font-medium block">Total Views</span>
              <span className="text-xl font-black text-foreground tabular-nums">
                {formatCount(viewCount)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-center">
              <span className="text-xs text-muted-foreground font-medium block">Total Spins</span>
              <span className="text-xl font-black text-primary tabular-nums">
                {formatCount(spinCount)}
              </span>
            </div>
          </div>

          {/* Segment hit breakdown */}
          <div className="space-y-2 relative">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Segment Landing Frequency
            </h4>

            {loading ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-9 rounded-lg bg-muted/60 animate-pulse" />
                ))}
              </div>
            ) : topSegments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No spins recorded for this wheel yet.
              </p>
            ) : (
              <div className={`space-y-2.5 ${!isPro ? "filter blur-sm select-none pointer-events-none" : ""}`}>
                {topSegments.map((seg, idx) => (
                  <div key={seg.label} className="text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate text-foreground flex items-center gap-1.5">
                        <span className="text-muted-foreground/60 w-3">{idx + 1}.</span>
                        {seg.label}
                      </span>
                      <span className="text-muted-foreground tabular-nums font-mono shrink-0">
                        {seg.percentage}% ({formatCount(seg.count)} spins)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, seg.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pro Gate Overlay (Shown when user is not Pro) */}
            {!isPro && (
              <div className="absolute inset-x-0 bottom-0 top-6 z-10 flex flex-col items-center justify-center p-4 rounded-xl bg-background/85 border border-primary/20 backdrop-blur-xs text-center space-y-3 shadow-lg">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    Unlock Full Spin Distribution
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    See exactly which options land most frequently, complete hit rates, and audience drop-off statistics.
                  </p>
                </div>

                {!session?.user ? (
                  <button
                    onClick={() => {
                      onClose();
                      openLoginPrompt?.();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-md"
                  >
                    <span>Log in to access Pro Stats</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>SpinPapa Pro Feature</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
