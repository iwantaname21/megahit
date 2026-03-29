import React, { useRef, useEffect } from 'react';

// Realistic animated ocean rendered on a full-screen canvas at 60fps.
// Uses layered sine waves with varying amplitudes, frequencies, and speeds.

export default function OceanBackground() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let t = 0;
    let cachedW = 0, cachedH = 0;
    let lastFrame = 0;

    const draw = (now) => {
      // Throttle to ~30fps — ocean doesn't need 60fps
      if (now - lastFrame < 33) { animRef.current = requestAnimationFrame(draw); return; }
      lastFrame = now;
      const w = Math.max(window.innerWidth, screen.width);
      const h = Math.max(window.innerHeight, screen.height);
      // Only resize when dimensions change
      if (w !== cachedW || h !== cachedH) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        cachedW = w;
        cachedH = h;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      t += 0.008;

      // Sky gradient — warm top fading to ocean
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#454950');    // lighter evening gray
      skyGrad.addColorStop(0.25, '#505660'); // mid gray
      skyGrad.addColorStop(0.5, '#5A6575');  // horizon blue-gray
      skyGrad.addColorStop(0.55, '#6D8FA8'); // water starts (30% darker)
      skyGrad.addColorStop(0.7, '#4A6D8A');  // mid ocean (30% darker)
      skyGrad.addColorStop(0.85, '#335869'); // deeper (30% darker)
      skyGrad.addColorStop(1, '#284A5B');    // deep ocean (30% darker)
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Horizon line with subtle glow
      const horizonY = h * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(w, horizonY);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Sun reflection shimmer on water
      const sunX = w * 0.5;
      const shimmerGrad = ctx.createRadialGradient(sunX, horizonY, 0, sunX, horizonY + h * 0.15, w * 0.3);
      shimmerGrad.addColorStop(0, 'rgba(255,240,220,0.12)');
      shimmerGrad.addColorStop(0.5, 'rgba(255,230,200,0.05)');
      shimmerGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shimmerGrad;
      ctx.fillRect(0, horizonY, w, h - horizonY);

      // Wave layers — each with different speed, amplitude, and color
      const waves = [
        { y: horizonY + 2, amp: 3, freq: 0.008, speed: 0.7, color: 'rgba(155,181,201,0.3)' },
        { y: horizonY + 8, amp: 4, freq: 0.006, speed: 0.5, color: 'rgba(120,170,195,0.25)' },
        { y: horizonY + 18, amp: 5, freq: 0.01, speed: 0.9, color: 'rgba(106,155,181,0.2)' },
        { y: horizonY + 35, amp: 6, freq: 0.007, speed: 0.6, color: 'rgba(90,140,170,0.2)' },
        { y: horizonY + 55, amp: 7, freq: 0.012, speed: 1.1, color: 'rgba(74,125,150,0.15)' },
        { y: horizonY + 80, amp: 8, freq: 0.005, speed: 0.4, color: 'rgba(58,107,130,0.15)' },
        { y: horizonY + 110, amp: 6, freq: 0.009, speed: 0.8, color: 'rgba(58,107,130,0.1)' },
      ];

      for (const wave of waves) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 4) {
          const y = wave.y +
            Math.sin(x * wave.freq + t * wave.speed) * wave.amp +
            Math.sin(x * wave.freq * 1.7 + t * wave.speed * 1.3 + 1.5) * wave.amp * 0.4 +
            Math.sin(x * wave.freq * 0.5 + t * wave.speed * 0.7 + 3.0) * wave.amp * 0.6;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = wave.color;
        ctx.fill();
      }

      // Specular highlights — small bright flecks on the water
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let i = 0; i < 10; i++) {
        const fx = (Math.sin(t * 0.3 + i * 2.1) * 0.5 + 0.5) * w;
        const fy = horizonY + 10 + (Math.sin(t * 0.2 + i * 1.7) * 0.5 + 0.5) * (h * 0.35);
        const fw = 8 + Math.sin(t * 0.5 + i) * 4;
        const fh = 1.5 + Math.sin(t * 0.7 + i * 0.5) * 0.5;
        ctx.fillRect(fx, fy, fw, fh);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        minWidth: '100%',
        minHeight: '100%',
      }}
    />
  );
}
