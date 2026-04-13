import {
  MdPlayArrow,
  MdPause,
  MdVolumeUp,
  MdVolumeOff,
  MdFullscreen,
  MdFullscreenExit,
  MdEdit,
} from "react-icons/md";

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
}) {
  const toggleMute = () => {
    setMuted((prev) => !prev);
  };

  return (
    <div className="bottom-0 relative w-full bg-black/80 text-white flex items-center justify-between px-3 text-sm">
      {/* Left Controls: Play/Pause + Volume */}
      <div className="flex items-center gap-4">
        {/* Play/Pause */}
        <button
          onClick={handleSpinClick}
          className="p-2 rounded hover:bg-white/20 transition"
        >
          {mustSpin ? <MdPause size={24} /> : <MdPlayArrow size={24} />}
        </button>

        {/* Mute/Unmute */}
        <button
          onClick={toggleMute}
          className="p-2 rounded hover:bg-white/20 transition"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MdVolumeOff size={24} /> : <MdVolumeUp size={24} />}
        </button>
      </div>

      {/* Right Controls: Fullscreen */}
      <div className="flex items-center gap-4">
        {/* Edit button */}
        {/* {currentPath !== "/" && (
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-white/20 transition"
            onClick={(e) => {
              saveWheelData(segData, wheelData);
              router.push("/");
            }}
          >
            <MdEdit size={20} />
            <span>Edit</span>
          </button>
        )} */}

        {currentPath !== "/" && (
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-white/20 transition"
            onClick={(e) => {
              saveWheelData(segData, wheelData);
              // ✅ Force full page reload so ads/scripts reinitialize
              window.location.href = "/";
            }}
          >
            <MdEdit size={20} />
            <span>Edit</span>
          </button>
        )}

        {/* Fullscreen Button*/}
        <button
          onClick={handleToggleFullScreen}
          className="p-2 rounded hover:bg-white/20 transition"
        >
          {isFullScreen ? (
            <MdFullscreenExit size={24} />
          ) : (
            <MdFullscreen size={24} />
          )}
        </button>
      </div>
    </div>
  );
}
