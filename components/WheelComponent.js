"use client";
import { useEffect, useState, useContext } from "react";

import { SegmentsContext } from "@app/SegmentsContext";

const WheelComponent = ({
  segColors,
  winningSegment,
  onFinished,
  primaryColor = "black",
  contrastColor = "white",
  buttonText = "Spin",
  isOnlyOnce = false,
  size = window.innerWidth,
  upDuration = 200,
  downDuration = 700,
  fontFamily = "proxima-nova",
  fontSize = "1.5em",
  outlineWidth = 10,
  winner,
}) => {
  const { segments, setSegments } = useContext(SegmentsContext);
  const [isClicked, setIsClicked] = useState(false);
  const canvasId = "canvasId";
  const wheelId = "wheelId";
  const dimension = (size + 20) * 2;
  let currentSegment = "";
  let isStarted = false;
  const [isFinished, setFinished] = useState(false);
  let timerHandle = 0;
  // const timerDelay = segments.length % 10;
  const timerDelay = 10; // reducing timer delay so that wheel movement is smooth
  let angleCurrent = 0;
  let angleDelta = 0;
  let canvasContext = null;
  //  let maxSpeed = Math.PI / segments.length;
  // const upTime = segments.length * (upDuration + upDuration * Math.random(0, 1));
  // const downTime = segments.length * (downDuration + downDuration * Math.random(0, 1));
  let maxSpeed = 0.6;
  const upTime = upDuration + upDuration * Math.random(0, 1);
  const downTime = downDuration + downDuration * Math.random(0, 1);
  let spinStart = 0;
  let frames = 0;
  const centerX = size + 20;
  const centerY = size + 20;
  const totalSpinTime = 5000;
  const speedFactor = 4;
  fontSize = Math.min((2 * Math.PI * Math.PI) / segments.length, 2.5) + "em";
  // console.log("Segments in Main Object", segments.length);

  useEffect(() => {
    initCanvas();
    // setTimeout(() => {
    //   window.scrollTo(0, 1);
    // }, 0);
  }, [winner]);

  useEffect(() => {
    initCanvas();
    wheelInit();
    // setTimeout(() => {
    //   window.scrollTo(0, 1);
    // }, 0);
  }, [segments, size]);

  useEffect(() => {
    if (isClicked === true) {
      initCanvas();
      wheelInit();
      spin();

      // setTimeout(() => {
      //   window.scrollTo(0, 1);
      // }, 0);
    }
  }, [isClicked]);

  useEffect(() => {
    initCanvas();
    wheelInit();
    // setTimeout(() => {
    //   window.scrollTo(0, 1);
    // }, 0);
  }, []);

  const wheelInit = () => {
    wheelDraw();
  };

  const initCanvas = () => {
    let canvas = document.getElementById(canvasId);

    if (navigator.userAgent.indexOf("MSIE") !== -1) {
      canvas = document.createElement("canvas");
      canvas.setAttribute("width", `${dimension}`);
      canvas.setAttribute("height", `${dimension}`);
      canvas.setAttribute("id", canvasId);
      document.getElementById(wheelId)?.appendChild(canvas);
    }
    // canvas?.addEventListener("click", spin, false);
    canvasContext = canvas?.getContext("2d");
  };

  const spin = () => {
    // console.log("Wheel Clicked...... and timerHandler = ", timerHandle);
    isStarted = true;
    // setIsClicked(!isClicked);
    setIsClicked(true);
    if (timerHandle === 0) {
      spinStart = new Date().getTime();
      // maxSpeed = Math.PI / segments.length;
      maxSpeed = 0.6;
      frames = 0;
      timerHandle = window.setInterval(onTimerTick, timerDelay);
      //  timerHandle = setInterval(onTimerTick, timerDelay);
    }
  };

  // modified using a specified time to spin the wheel
  // const onTimerTick = () => {
  //   let finished = false;
  //   frames++;
  //   draw();

  //   const duration = new Date().getTime() - spinStart;
  //   const progress = Math.min(duration / totalSpinTime, 1); // Clamp progress to 1

  //   // Ease function for smooth acceleration and deceleration
  //   const ease = progress * (1 - progress); // Cubic ease function

  //   angleDelta = maxSpeed * ease * Math.sin((progress * Math.PI) / 2);

  //   angleCurrent += angleDelta;
  //   while (angleCurrent >= Math.PI * 2) angleCurrent -= Math.PI * 2;

  //   finished = progress >= 0.99;

  //   if (finished) {
  //     setFinished(true);
  //     onFinished(currentSegment);
  //     clearInterval(timerHandle);
  //     timerHandle = 0;
  //     angleDelta = 0;
  //   }
  // };

  const onTimerTick = () => {
    frames++;
    draw();
    const duration = new Date().getTime() - spinStart;
    let progress = 0;
    let finished = false;
    if (duration < upTime) {
      progress = duration / upTime;
      angleDelta = maxSpeed * Math.sin((progress * Math.PI) / 2);
    } else {
      if (winningSegment) {
        if (currentSegment === winningSegment && frames > segments.length) {
          progress = duration / upTime;
          angleDelta =
            maxSpeed * Math.sin((progress * Math.PI) / 2 + Math.PI / 2);
          progress = 1;
        } else {
          progress = duration / downTime;
          angleDelta =
            maxSpeed * Math.sin((progress * Math.PI) / 2 + Math.PI / 2);
        }
        isStarted = false;
        setIsClicked(false);
      } else {
        progress = duration / downTime;
        angleDelta =
          maxSpeed * Math.sin((progress * Math.PI) / 2 + Math.PI / 2);
      }
      // Ease function for smooth stopping (applied conditionally)
      if (progress >= 0.25) {
        const ease = 1 - (progress - 1) * (progress - 1); // Ease function for deceleration
        angleDelta *= ease;
      }
      if (progress >= 1) finished = true;
    }
    // console.log("Angle delta = ", angleDelta);
    angleCurrent += angleDelta;
    while (angleCurrent >= Math.PI * 2) angleCurrent -= Math.PI * 2;
    if (finished) {
      setFinished(true);
      onFinished(currentSegment);
      clearInterval(timerHandle);
      timerHandle = 0;
      angleDelta = 0;
    }
  };

  const wheelDraw = () => {
    clear();
    drawWheel();
    drawNeedle();
  };

  const draw = () => {
    clear();
    drawWheel();
    drawNeedle();
  };

  const drawSegment = (key, lastAngle, angle) => {
    if (!canvasContext) {
      return false;
    }
    const ctx = canvasContext;
    const value = segments[key];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, size, lastAngle, angle, false);
    ctx.lineTo(centerX, centerY);
    ctx.closePath();
    ctx.fillStyle = segColors[key % segColors.length];
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((lastAngle + angle) / 2);
    ctx.fillStyle = contrastColor;
    ctx.font = `bold ${fontSize} ${fontFamily}`;
    ctx.fillText(value.substring(0, 21), size / 2 + 20, 0);
    ctx.restore();
  };

  const drawWheel = () => {
    if (!canvasContext) {
      return false;
    }
    // console.log("Drawing Wheel");
    const ctx = canvasContext;
    let lastAngle = angleCurrent;
    const len = segments.length;
    const PI2 = Math.PI * 2;
    ctx.lineWidth = 1;
    ctx.strokeStyle = primaryColor;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = "1em " + fontFamily;
    // console.log("length = ", len);
    for (let i = 1; i <= len; i++) {
      const angle = PI2 * (i / len) + angleCurrent;
      drawSegment(i - 1, lastAngle, angle);
      lastAngle = angle;
    }

    // Draw a center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 50, 0, PI2, false);
    ctx.closePath();
    ctx.fillStyle = primaryColor;
    ctx.lineWidth = 10;
    ctx.strokeStyle = contrastColor;
    ctx.fill();
    ctx.font = "bold 1em " + fontFamily;
    ctx.fillStyle = contrastColor;
    ctx.textAlign = "center";
    ctx.fillText(buttonText, centerX, centerY + 3);
    ctx.stroke();

    // Draw outer circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, size, 0, PI2, false);
    ctx.closePath();

    ctx.lineWidth = outlineWidth;
    ctx.strokeStyle = primaryColor;
    ctx.stroke();
  };

  const drawNeedle = () => {
    if (!canvasContext) {
      return false;
    }
    const ctx = canvasContext;
    ctx.lineWidth = 1;
    ctx.strokeStyle = contrastColor;
    ctx.fillStyle = contrastColor;
    ctx.beginPath();
    ctx.moveTo(centerX + 20, centerY - 50);
    ctx.lineTo(centerX - 20, centerY - 50);
    ctx.lineTo(centerX, centerY - 70);
    ctx.closePath();
    ctx.fill();
    const change = angleCurrent + Math.PI / 2;
    let i =
      segments.length -
      Math.floor((change / (Math.PI * 2)) * segments.length) -
      1;
    if (i < 0) i = i + segments.length;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = primaryColor;
    ctx.font = "bold 1.5em " + fontFamily;
    currentSegment = segments[i];
    isStarted &&
      ctx.fillText(currentSegment, centerX + 10, centerY + size + 50);
  };

  const clear = () => {
    if (!canvasContext) {
      return false;
    }
    const ctx = canvasContext;
    ctx.clearRect(0, 0, dimension, dimension);
  };

return (
    <div id={wheelId} className="w-[95vw]">
      <canvas
        id={canvasId}
        width={dimension}
        height={dimension}
        style={{
          pointerEvents: isFinished && isOnlyOnce ? "none" : "auto",
        }}
        onClick={()=>{setIsClicked(!isClicked); spin();}}
      />
    </div>
  );
};
export default WheelComponent;
