import React, { useState, useEffect, useRef, useContext } from "react";

import { SegmentsContext } from "@/app/SegmentsContext";

const slicesCount = 5; // Adjust this based on your string array length

function CustomSpinWheel({ colors, setWinner }) {
  const [deceleration, setDeceleration] = useState(0.04);
  const { segments, setSegments } = useContext(SegmentsContext);
  const canvasRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const dimension = 500;
  const rotateDeg = useRef(0);
  const spinSpeed = useRef(30); // Initial spin speed
  let canvas = null;
  let ctx = null;
  // Adjust needle properties as needed
  const needleLength = dimension / 3; // Adjust length
  const needleWidth = dimension / 50; // Adjust width

  const centerX = dimension / 2;
  const centerY = dimension / 2;

  const contrastColor = "black"; // Adjust needle color

  const drawNeedle = () => {
    // Ensure context is available
    if (!ctx) {
      return;
    }
    // Save the current state before drawing
    ctx.save();

    ctx.lineWidth = 1;
    ctx.strokeStyle = contrastColor;
    ctx.fillStyle = contrastColor;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY); // Start at center
    // Draw triangle pointing upwards
    ctx.lineTo(centerX + needleWidth / 2, centerY - needleLength);
    ctx.lineTo(centerX - needleWidth / 2, centerY - needleLength);
    ctx.closePath();

    ctx.fill();
    ctx.restore();
  };

  const drawWheel = () => {
    ctx.save(); // Save current state

    // Clear only the area used for rotation (center circle)
    ctx.beginPath();
    ctx.arc(
      canvas.width / 2,
      canvas.height / 2,
      canvas.width / 5 + 2,
      0,
      2 * Math.PI
    ); // Clear a slightly larger area
    ctx.fillStyle = "white";
    ctx.fill();

    // Apply rotation transformation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    const rad = rotateDeg.current * (Math.PI / 180); // Convert degrees to radians
    ctx.rotate(rad);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw slices with custom colors and text inside
    const sliceAngle = (2 * Math.PI) / segments.length;

    const midAngle = sliceAngle / 2;
    const textRadius = canvas.width / 2 - canvas.width / 5 - 20; // Adjust text radius

    for (let i = 0; i < segments.length; i++) {
      const angle = i * sliceAngle;

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, canvas.height / 2);
      ctx.arc(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2 - canvas.width / 5,
        angle,
        angle + sliceAngle
      );
      ctx.lineTo(canvas.width / 2, canvas.height / 2);

      // Use color based on custom colors array (modulus for repeating)
      const colorIndex = i % colors.length;
      ctx.fillStyle = colors[colorIndex];
      ctx.fill();

      // Draw text inside slice
      ctx.font = "14px Arial"; // Adjust font size
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const text = segments[i];
      const textX = canvas.width / 2 + Math.cos(angle + midAngle) * textRadius;
      const textY = canvas.height / 2 + Math.sin(angle + midAngle) * textRadius;
      ctx.fillText(text.substring(0, 21), textX, textY);

      // ctx.restore();
    }

    ctx.restore(); // Restore saved state
  };


  const wheelInit = () => {
    setDeceleration(Math.random());
    initCanvas();
  };

  const initCanvas = () => {
    canvas = canvasRef.current;

    // if (navigator.userAgent.indexOf("MSIE") !== -1) {
    //   canvas = document.createElement("canvas");
    //   canvas.setAttribute("width", `${dimension}`);
    //   canvas.setAttribute("height", `${dimension}`);
    //   canvas.setAttribute("id", canvasId);
    //   document.getElementById(wheelId)?.appendChild(canvas);
    // }
    // canvas?.addEventListener("click", spinWheel, false);
    ctx = canvas?.getContext("2d");
  };

  const calculateSlicePositions = (rotationDeg) => {
    const slicePositions = [];
    const sliceAngle = (2 * Math.PI) / segments.length;

    for (let i = 0; i < segments.length; i++) {
      let startAngle = i * sliceAngle + rotationDeg * (Math.PI / 180);
      let endAngle = startAngle + sliceAngle;
      //   startAngle = (startAngle * 57.2957795) % 360; //convert to degrees in range of a circle
      //   endAngle = (endAngle * 57.2957795) % 360; //convert to degrees in range of a circle
      slicePositions.push({ startAngle, endAngle });
    }

    return slicePositions;
  };

  function isArcSegmentInsideAnother(arc1, arc2) {
    const { startAngle: a1Start, endAngle: a1End } = arc1;
    const { startAngle: a2Start, endAngle: a2End } = arc2;

    // Normalize angles to be between 0 and 2*PI
    const normalizeAngle = (angle) => {
      angle = angle % (2 * Math.PI);
      return angle < 0 ? angle + 2 * Math.PI : angle;
    };

    // Check for complete containment considering wrap-around
    const a2ContainsA1 =
      normalizeAngle(a2Start) <= normalizeAngle(a1Start) &&
      normalizeAngle(a2End) >= normalizeAngle(a1End);
    const a1StartsBeforeA2Ends =
      normalizeAngle(a1Start) < normalizeAngle(a2End);

    return a2ContainsA1 || a1StartsBeforeA2Ends;
  }

  const spinWheel = () => {
    setIsSpinning(true);
    rotateDeg.current = 0;
    spinSpeed.current = 20;
    setSelectedItem(null);
    wheelInit();

    const spin = () => {
      spinSpeed.current -= Math.min(deceleration, spinSpeed.current);
      rotateDeg.current += spinSpeed.current; // Adjust spin speed

      console.log("running Spin again");
      if (spinSpeed.current < deceleration) {
        // Spin for a few rotations
        setIsSpinning(false);

        let slicePositions = calculateSlicePositions(rotateDeg.current);

        let winningSegment = null;
        const needleAngles = {
          startAngle: (270 - needleWidth / 2) * 0.01745329,
          endAngle: (270 + needleWidth / 2) * 0.01745329,
        };

        let index = 0;
        for (const { startAngle, endAngle } of slicePositions) {
          console.log(
            "start angle " +
              startAngle +
              " End Angle = " +
              endAngle +
              " Index = " +
              slicePositions.indexOf({ startAngle, endAngle })
          );
          // Check if needle tip falls within slice angles (considering wrap-around)
          if (
            isArcSegmentInsideAnother(needleAngles, { startAngle, endAngle })
          ) {
            winningSegment = segments[index];
            console.log("Winning Segment = " + segments[index]);
            setWinner(segments[index]);
            break;
          }

          index++;
        }
        return;
      } else {
        drawWheel(); // Call drawWheel on every frame for animation
        requestAnimationFrame(spin);
      }
    };

    requestAnimationFrame(spin);
  };

  useEffect(() => {
    wheelInit();
    drawNeedle();
    drawWheel(); // Draw wheel initially
    // Draw needle (call separate function)
  }, [segments, colors]);

  return (
    <div>
      <canvas ref={canvasRef} onClick={spinWheel} width="500" height="500" />
      <button onClick={spinWheel} disabled={isSpinning}>
        {isSpinning ? "Spinning..." : "Spin"}
      </button>
      {selectedItem && <p>Selected: {selectedItem}</p>}
    </div>
  );
}

export default CustomSpinWheel;
