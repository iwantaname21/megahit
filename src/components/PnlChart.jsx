import React, { useRef, useEffect } from 'react';

// Pure canvas chart — 60fps smooth rendering with interpolation between data points.
// The chart lerps the last point's position toward its target so the line extends
// smoothly rather than jumping tick-to-tick.

export default function PnlChart({ data, isWinning, showMarkers = false, height = 120 }) {
  const canvasRef = useRef(null);
  const dataRef = useRef(data);
  const winRef = useRef(isWinning);
  const markersRef = useRef(showMarkers);
  const animRef = useRef(null);
  const pulseT = useRef(0);

  // Smooth interpolation state for the trailing edge
  const interpY = useRef(null); // current interpolated y-value (in data-space)
  const lastDataLen = useRef(0);

  dataRef.current = data;
  winRef.current = isWinning;
  markersRef.current = showMarkers;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const LERP_SPEED = 0.18; // how fast to chase the target (0-1, higher = faster)

    const draw = () => {
      const d = dataRef.current;
      const winning = winRef.current;
      const markers = markersRef.current;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (!d || d.length < 2) {
        ctx.fillStyle = 'rgba(19,19,20,0.25)';
        ctx.font = "600 10px 'Inter', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for data...', w / 2, h / 2);
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // Downsample to max 200 points
      let pts = d;
      if (d.length > 200) {
        const step = Math.ceil(d.length / 200);
        pts = d.filter((_, i) => i % step === 0 || i === d.length - 1);
      }

      // Interpolate the last value for smoothness
      const lastVal = pts[pts.length - 1].value;
      if (interpY.current === null || d.length <= 2) {
        interpY.current = lastVal;
      } else {
        interpY.current += (lastVal - interpY.current) * LERP_SPEED;
      }
      lastDataLen.current = d.length;

      // Build display array with interpolated tail
      const displayPts = pts.map((p, i) =>
        i === pts.length - 1 ? { ...p, value: interpY.current } : p
      );

      // Domain
      const vals = displayPts.map((p) => p.value);
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      const absMax = Math.max(Math.abs(minV), Math.abs(maxV));
      const pad = absMax * 0.25 || 5;
      const domMin = Math.min(minV, 0) - pad;
      const domMax = Math.max(maxV, 0) + pad;

      const toX = (i) => (i / (displayPts.length - 1)) * (w - 8) + 4;
      const toY = (v) => h - 4 - ((v - domMin) / (domMax - domMin)) * (h - 8);

      // Zero line
      const zeroY = toY(0);
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(19,19,20,0.12)';
      ctx.lineWidth = 1;
      ctx.moveTo(0, zeroY);
      ctx.lineTo(w, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Smooth line with cubic bezier (Catmull-Rom to Bezier)
      const color = winning ? '#6DD0A9' : '#FF8AA8';
      const rgb = winning ? '109,208,169' : '255,138,168';

      const xArr = displayPts.map((_, i) => toX(i));
      const yArr = displayPts.map((p) => toY(p.value));

      ctx.beginPath();
      ctx.moveTo(xArr[0], yArr[0]);

      if (displayPts.length === 2) {
        ctx.lineTo(xArr[1], yArr[1]);
      } else {
        // Use monotone cubic interpolation for smooth, non-overshooting curves
        for (let i = 0; i < displayPts.length - 1; i++) {
          const x0 = xArr[i];
          const y0 = yArr[i];
          const x1 = xArr[i + 1];
          const y1 = yArr[i + 1];

          // Tension-based control points
          const tension = 0.3;
          let dx0 = 0, dy0 = 0, dx1 = 0, dy1 = 0;

          if (i > 0) {
            dx0 = (xArr[i + 1] - xArr[i - 1]) * tension;
            dy0 = (yArr[i + 1] - yArr[i - 1]) * tension;
          }
          if (i + 2 < displayPts.length) {
            dx1 = (xArr[i + 2] - xArr[i]) * tension;
            dy1 = (yArr[i + 2] - yArr[i]) * tension;
          }

          ctx.bezierCurveTo(
            x0 + dx0, y0 + dy0,
            x1 - dx1, y1 - dy1,
            x1, y1
          );
        }
      }

      const lastIdx = displayPts.length - 1;
      const lastX = xArr[lastIdx];
      const lastY = yArr[lastIdx];

      // Stroke
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Gradient fill
      ctx.lineTo(lastX, h);
      ctx.lineTo(xArr[0], h);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `rgba(${rgb}, 0.22)`);
      grad.addColorStop(1, `rgba(${rgb}, 0.01)`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Markers for results screen
      if (markers) {
        ctx.beginPath();
        ctx.arc(xArr[0], yArr[0], 5, 0, Math.PI * 2);
        ctx.fillStyle = '#6DD0A9';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FF8AA8';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Pulsing white sun dot at current price (live mode only)
      if (!markers && displayPts.length > 2) {
        pulseT.current += 0.05;
        const pulse = Math.sin(pulseT.current);

        // Outer glow — large soft halo
        const glowR = 14 + pulse * 4;
        const glowA = 0.12 + pulse * 0.05;
        ctx.beginPath();
        ctx.arc(lastX, lastY, glowR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${glowA})`;
        ctx.fill();

        // Mid glow ring
        const midR = 9 + pulse * 2;
        ctx.beginPath();
        ctx.arc(lastX, lastY, midR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.18 + pulse * 0.06})`;
        ctx.fill();

        // Core dot — solid white
        ctx.beginPath();
        ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height, display: 'block', borderRadius: '0.75rem' }}
      />
      {showMarkers && data && data.length > 1 && (
        <div className="flex justify-between mt-1">
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#6DD0A9' }}>
            ● ENTRY
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#FF8AA8' }}>
            EXIT ●
          </span>
        </div>
      )}
    </div>
  );
}
