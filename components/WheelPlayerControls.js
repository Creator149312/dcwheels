import {
  MdPlayArrow,
  MdPause,
  MdVolumeUp,
  MdVolumeOff,
  MdFullscreen,
  MdFullscreenExit,
  MdEdit,
} from "react-icons/md";
import { useState } from "react";

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
}) {
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);

  const toggleMute = () => {
    setMuted((prev) => !prev);
    if (!muted && volume > 0) {
      setVolume(0);
    } else if (muted && volume === 0) {
      setVolume(100);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    if (newVolume === 0) {
      setMuted(true);
    } else {
      setMuted(false);
    }
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

        {/* Volume + Mute/Unmute */}
        {/* <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded hover:bg-white/20 transition"
          >
            {muted || volume === 0 ? (
              <MdVolumeOff size={24} />
            ) : (
              <MdVolumeUp size={24} />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            className="w-24 accent-red-500 cursor-pointer"
            onChange={handleVolumeChange}
          />
        </div> */}
      </div>

      {/* Right Controls: Fullscreen */}
      <div className="flex items-center gap-4">
        {/* Edit button */}
        {currentPath !== "/" && (
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
