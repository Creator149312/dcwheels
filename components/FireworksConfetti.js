'use client'
import { useRef, useState, useEffect } from 'react';

function FireworksOverlay() {
  const canvasRef = useRef(null);
  const animationIdRef = useRef(null);
  const [showConfetti, setShowConfetti] = useState(true);
  const [animationDuration, setAnimationDuration] = useState(5000); // Adjust the duration as needed

  useEffect(() => {
    if (showConfetti) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particleCount = 300;
      const particles = [];

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 10,
          vy: -Math.random() * 10,
          size: Math.random() * 10,
          color: `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.random()})`,
        });
      }

      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / animationDuration, 1);

        const particleCountAtTime = Math.ceil(particles.length * (1 - progress));

        for (let i = 0; i < particleCountAtTime; i++) {
          const particle = particles[i];

          particle.x += particle.vx;
          particle.y += particle.vy;

          particle.vy += 0.1; // Gravity

          if (particle.y > canvas.height) {
            particle.x = Math.random() * canvas.width;
            particle.y = 0;
            particle.vy = -Math.random() * 10;
          }

          ctx.fillStyle = particle.color;
          ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
        }

        animationIdRef.current = requestAnimationFrame(animate);
      };

      const startTime = Date.now();
      animate();

      // Set a timeout to stop the animation and remove the canvas after the specified duration
      const timeoutId = setTimeout(() => {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null; // Clear the reference
        setShowConfetti(false);
      }, animationDuration);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [showConfetti, animationDuration]);

  return (showConfetti &&
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 40 }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
    </div>
  );
}

export default FireworksOverlay;