"use client";

import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import { useState, useRef } from "react";
import {
  FaThumbsUp,
  FaThumbsDown,
  FaPlay,
  FaPause,
  FaExpand,
} from "react-icons/fa";

export default function WheelPlayerPanel({
  title = "Sample Wheel",
  wheelCanvasId = "wheelCanvas",
}) {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef(null);

  const handleLike = () => {
    setLiked(true);
    setDisliked(false);
    // Optionally send to backend
  };

  const handleDislike = () => {
    setDisliked(true);
    setLiked(false);
    // Optionally send to backend
  };

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    // Optionally trigger canvas spin
    console.log("Play/Pause");
  };

  const handleFullscreen = () => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  };

  return (<></>
    // <div
    //   ref={containerRef}
    //   className="w-full bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 space-y-4 transition-colors"
    // >
    //   {/* Title */}
    //   <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
    //     {title}
    //   </h2>

    //   {/* Canvas or image placeholder */}
    //   <div className="dark:bg-gray-950 rounded-lg">
    //     <WheelWithInputContentEditable
    //       newSegments={ensureArrayOfObjects([
    //         "science",
    //         "name",
    //         "game",
    //         "data",
    //       ])}
    //     />
    //   </div>

    //   {/* Controls */}
    //   <div className="flex items-center justify-between mt-2 flex-wrap gap-4">
    //     <div className="flex items-center gap-4">
    //       <button
    //         onClick={handleLike}
    //         className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm transition ${
    //           liked
    //             ? "bg-blue-600 text-white"
    //             : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
    //         }`}
    //       >
    //         <FaThumbsUp /> Like
    //       </button>

    //       <button
    //         onClick={handleDislike}
    //         className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm transition ${
    //           disliked
    //             ? "bg-red-600 text-white"
    //             : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
    //         }`}
    //       >
    //         <FaThumbsDown /> Dislike
    //       </button>
    //     </div>

    //     <div className="flex items-center gap-3">
    //       <button
    //         onClick={handlePlay}
    //         className="flex items-center gap-1 px-3 py-2 rounded-full bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-sm"
    //       >
    //         {isPlaying ? <FaPause /> : <FaPlay />}{" "}
    //         {isPlaying ? "Pause" : "Play"}
    //       </button>

    //       <button
    //         onClick={handleFullscreen}
    //         className="flex items-center gap-1 px-3 py-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
    //       >
    //         <FaExpand /> Fullscreen
    //       </button>
    //     </div>
    //   </div>
    // </div>
  );
}
