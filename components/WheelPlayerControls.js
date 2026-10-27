import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Pencil,
  ListOrdered,
} from "lucide-react";
import { switchWheelToList } from "@/utils/wheelToListBridge";

export default function WheelPlayerControls({
  handleSpinClick,
  mustSpin,
  handleToggleFullScreen,
  isFullScreen,
  segData,
  wheelData,
  saveWheelData,
  router,
  muted,
  setMuted,
  onEditClick,
  wheelTitle,
  wheelDescription,
  wheelId,
  authorHandle,
}) {
  const toggleMute = () => {
    setMuted((prev) => !prev);
  };

  const handleSwitchToList = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. If saveWheelData is available, ensure current wheel edits are flushed
    if (typeof saveWheelData === "function") {
      try {
        saveWheelData(segData, wheelData);
      } catch (err) {
        console.warn("Failed saving wheel before switch:", err);
      }
    }

    // 2. Convert current wheel segments + title/desc into List draft
    const targetUrl = switchWheelToList({
      segData,
      wheelData,
      wheelTitle,
      wheelDescription,
    });

    // 3. Route to list creation page
    if (router && typeof router.push === "function") {
      router.push(targetUrl);
    } else {
      window.location.href = targetUrl;
    }
  };

  return (
    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/70 via-black/40 to-transparent text-white flex items-center justify-between px-2.5 sm:px-4 pb-2 sm:pb-3 pt-6 sm:pt-8 z-10 pointer-events-auto touch-manipulation">
      {/* Left Controls: Play/Pause + Volume */}
      <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto">
        {/* Play/Pause */}
        <button
          onClick={handleSpinClick}
          className="min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] flex items-center justify-center rounded-full hover:bg-white/20 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white touch-manipulation cursor-pointer"
          aria-label={mustSpin ? "Pause wheel" : "Spin wheel"}
        >
          {mustSpin ? (
            <Pause size={20} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
          ) : (
            <Play size={20} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
          )}
        </button>

        {/* Mute/Unmute */}
        <button
          onClick={toggleMute}
          className="min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] flex items-center justify-center rounded-full hover:bg-white/20 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white touch-manipulation cursor-pointer"
          title={muted ? "Unmute" : "Mute"}
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
        >
          {muted ? (
            <VolumeX size={20} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
          ) : (
            <Volume2 size={20} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* Right Controls: Fullscreen */}
      <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto">
        {/* Switch to List Button */}
        <button
          type="button"
          onClick={handleSwitchToList}
          className="min-h-[36px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/10 hover:bg-white/25 active:scale-95 transition-all text-white outline-none focus-visible:ring-2 focus-visible:ring-white text-xs sm:text-sm font-semibold backdrop-blur-xs touch-manipulation cursor-pointer"
          title="Convert this wheel into a rankable list or tier board"
        >
          <ListOrdered size={16} className="text-violet-300 sm:w-[18px] sm:h-[18px]" />
          <span>Switch to List</span>
        </button>

        {/* Edit button — opens the in-place Wheel Editor (Bottom Sheet on mobile, right sidebar on desktop) */}
        <button
          type="button"
          className="min-h-[38px] flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-400/40 text-yellow-300 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white backdrop-blur-xs touch-manipulation cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window !== "undefined" && wheelId) {
              try {
                const raw = window.localStorage.getItem("SpinpapaWheel") || "{}";
                const parsed = JSON.parse(raw);
                parsed.forkedFrom = {
                  wheelId: String(wheelId),
                  authorHandle: authorHandle || null,
                };
                window.localStorage.setItem("SpinpapaWheel", JSON.stringify(parsed));
              } catch {}
            }
            if (typeof onEditClick === "function") {
              onEditClick();
            }
          }}
          aria-label="Edit wheel entries"
        >
          <Pencil size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span className="font-bold text-xs sm:text-sm">Edit</span>
        </button>

        {/* Fullscreen Button*/}
        <button
          onClick={handleToggleFullScreen}
          className="min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] flex items-center justify-center rounded-full hover:bg-white/20 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white touch-manipulation cursor-pointer"
          aria-label={isFullScreen ? "Exit full screen" : "Enter full screen"}
        >
          {isFullScreen ? (
            <Minimize size={20} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
          ) : (
            <Maximize size={20} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </div>
  );
}
