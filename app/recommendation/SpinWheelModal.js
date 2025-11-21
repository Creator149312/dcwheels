"use client";

import { useRef, useState } from "react";

export default function SpinWheelModal({ results, onClose }) {
  const canvasRef = useRef(null);
  const [winner, setWinner] = useState(null);

  const getItemTitle = (item) => {
    if (item.title) {
      if (item.title.english || item.title.romaji) {
        return item.title.english || item.title.romaji; // Anime
      }
      return item.title || item.name; // Movie
    }
    return "Unknown";
  };

  const getItemImage = (item) => {
    if (item.coverImage) return item.coverImage.large; // Anime
    if (item.poster_path) return `https://image.tmdb.org/t/p/w300${item.poster_path}`; // Movie
    return "";
  };

  const spinWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const numSegments = results.length;
    const arc = (2 * Math.PI) / numSegments;

    let spinAngle = Math.random() * 360 + 1440; // 4+ rotations
    let currentAngle = 0;

    const colors = ["#f87171", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#fb7185"];

    const drawWheel = (rotation) => {
      ctx.clearRect(0, 0, 300, 300);
      ctx.save();
      ctx.translate(150, 150);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-150, -150);

      for (let i = 0; i < numSegments; i++) {
        const angle = i * arc;
        ctx.beginPath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.moveTo(150, 150);
        ctx.arc(150, 150, 150, angle, angle + arc);
        ctx.fill();

        // Label
        ctx.save();
        ctx.translate(150, 150);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(getItemTitle(results[i]), 130, 5);
        ctx.restore();
      }
      ctx.restore();

      // ✅ Draw pointer/arrow at the top
      ctx.beginPath();
      ctx.moveTo(150, 0);      // tip of arrow
      ctx.lineTo(140, 20);     // left base
      ctx.lineTo(160, 20);     // right base
      ctx.closePath();
      ctx.fillStyle = "#000";
      ctx.fill();
    };

    const animate = () => {
      currentAngle += 10;
      drawWheel(currentAngle);
      if (currentAngle < spinAngle) {
        requestAnimationFrame(animate);
      } else {
        const finalRotation = currentAngle % 360;
        const winningIndex = Math.floor(
          (numSegments - (finalRotation / (360 / numSegments))) % numSegments
        );
        setWinner(results[winningIndex]);
      }
    };

    animate();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500">
          ✕
        </button>
        <h2 className="text-lg font-bold mb-4 text-center">Spin the Wheel!</h2>
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="mx-auto border rounded"
        ></canvas>
        <div className="text-center mt-4">
          <button
            onClick={spinWheel}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Spin Now
          </button>
        </div>
        {winner && (
          <div className="mt-6 text-center">
            <h3 className="text-lg font-bold">You should watch:</h3>
            <img
              src={getItemImage(winner)}
              alt={getItemTitle(winner)}
              className="w-32 h-44 mx-auto rounded shadow mt-2"
            />
            <p className="mt-2 font-semibold">{getItemTitle(winner)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
