import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Pencil,
} from "lucide-react";

export default function WheelPlayerControls({
  handleSpinClick,
  mustSpin,
  handleToggleFullScreen,
  isFullScreen,
  segData,
  wheelData,
  saveWheelData,
  currentPath,
  router,
  muted,
  setMuted,
  onEditClick,
  isEditingActive,
}) {
  const toggleMute = () => {
    setMuted((prev) => !prev);
  };

  return (
    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent text-white flex items-center justify-between px-3 sm:px-4 pb-2 sm:pb-3 pt-6 sm:pt-8 z-10 pointer-events-auto">
      {/* Left Controls: Play/Pause + Volume */}
      <div className="flex items-center gap-1 sm:gap-4 pointer-events-auto">
        {/* Play/Pause */}
        <button
          onClick={handleSpinClick}
          className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white"
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
          className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? (
            <VolumeX size={20} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
          ) : (
            <Volume2 size={20} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* Right Controls: Fullscreen */}
      <div className="flex items-center gap-1 sm:gap-4 pointer-events-auto">
        {/* Edit button: 
            1. If editing is active (Home/Create/?edit=true), show yellow button on mobile only 
            2. Otherwise show white button that redirects to creates on all devices */}
        {isEditingActive ? (
          <button
            className="lg:hidden flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full hover:bg-white/20 active:scale-95 transition-all text-yellow-400 outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={onEditClick}
          >
            <Pencil size={18} className="sm:w-[20px] sm:h-[20px]" />
            <span className="font-bold text-xs sm:text-sm">Edit</span>
          </button>
        ) : (
          <button
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full hover:bg-white/20 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={(e) => {
              saveWheelData(segData, wheelData);
              window.location.href = "/wheels/create";
            }}
          >
            <Pencil size={18} className="sm:w-[20px] sm:h-[20px]" />
            <span className="font-medium text-xs sm:text-sm">Edit</span>
          </button>
        )}

        {/* Fullscreen Button*/}
        <button
          onClick={handleToggleFullScreen}
          className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white"
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
