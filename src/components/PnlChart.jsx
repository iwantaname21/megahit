import React, { useRef, useEffect } from 'react';

const TICK_MS = 200; // must match TradingScreen tick rate

export default function PnlChart({ data, isWinning, showMarkers = false, height = 120, milestone = null, pnlPercent = 0 }) {
  const canvasRef = useRef(null);
  const dataRef = useRef(data);
  const winRef = useRef(isWinning);
  const markersRef = useRef(showMarkers);
  const sparklesRef = useRef([]);
  const animRef = useRef(null);
  const pulseT = useRef(0);
  const offRef = useRef(null);
  const lastW = useRef(0);
  const lastH = useRef(0);

  // Lerp state: smoothly animate the last data point between ticks
  const lerpRef = useRef({
    prevLen: 0,
    fromVal: 0,
    toVal: 0,
    tickTime: 0,
  });

  // Domain state: continuously chase target bounds
  const domainRef = useRef({
    dispMin: null,
    dispMax: null,
  });

  // Sparkle: track last trigger point, fire on every ±3.5% move from it
  const lastSparkleAt = useRef(0); // pnlPercent at last sparkle

  dataRef.current = data;
  winRef.current = isWinning;
  markersRef.current = showMarkers;

  // Sparkle logic: fire when pnlPercent moves ±3.5% from last trigger point
  const SPARKLE_STEP = 3.5;
  const diff = pnlPercent - lastSparkleAt.current;
  if (Math.abs(diff) >= SPARKLE_STEP && data && data.length > 2) {
    const positive = diff > 0;
    lastSparkleAt.current = pnlPercent; // reset anchor to current
    for (let i = 0; i < 14; i++) {
      sparklesRef.current.push({
        angle: (Math.PI * 2 * i) / 14 + Math.random() * 0.3,
        speed: 35 + Math.random() * 55,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 3,
        positive,
      });
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const draw = (now) => {
      const d = dataRef.current;
      const winning = winRef.current;
      const markers = markersRef.current;

      const rect = canvas.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w === 0 || h === 0) { animRef.current = requestAnimationFrame(draw); return; }

      if (!offRef.current) offRef.current = document.createElement('canvas');
      if (w !== lastW.current || h !== lastH.current) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        offRef.current.width = w * dpr;
        offRef.current.height = h * dpr;
        lastW.current = w;
        lastH.current = h;
      }

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

      // --- Lerp logic: detect new tick, interpolate last point ---
      const lerp = lerpRef.current;
      if (d.length !== lerp.prevLen) {
        // New data point arrived — start lerping from current interpolated position to new value
        const prevLastVal = lerp.prevLen > 0 && d.length > 1 ? lerp.toVal : d[d.length - 1].value;
        lerp.fromVal = lerp.prevLen === 0 ? d[d.length - 1].value : prevLastVal;
        lerp.toVal = d[d.length - 1].value;
        lerp.tickTime = now;
        lerp.prevLen = d.length;
      }

      // Calculate lerp progress (0 to 1 over TICK_MS)
      const elapsed = now - lerp.tickTime;
      const t = Math.min(elapsed / TICK_MS, 1);
      // Smooth easing (ease-out cubic)
      const eased = 1 - Math.pow(1 - t, 3);
      const interpolatedLastVal = lerp.fromVal + (lerp.toVal - lerp.fromVal) * eased;

      // Live mode: sliding window of last WINDOW_SIZE points (scrolls left)
      // Results mode: show all points (full history)
      const WINDOW_SIZE = 60; // ~12 seconds of data at 200ms ticks
      let pts;
      if (markers) {
        // Results screen — show everything, downsample if needed
        pts = d;
        if (d.length > 200) {
          const step = Math.ceil(d.length / 200);
          pts = d.filter((_, i) => i % step === 0 || i === d.length - 1);
        }
      } else {
        // Live — take last WINDOW_SIZE points
        pts = d.length > WINDOW_SIZE ? d.slice(d.length - WINDOW_SIZE) : d;
      }

      // Replace last point's value with interpolated value (only in live mode)
      const displayPts = markers ? pts : pts.map((p, i) =>
        i === pts.length - 1 ? { ...p, value: interpolatedLastVal } : p
      );

      // Domain — compute target bounds, then lerp toward them
      const vals = displayPts.map((p) => p.value);
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      const absMax = Math.max(Math.abs(minV), Math.abs(maxV));
      const pad = absMax * 0.25 || 5;
      const targetDomMin = Math.min(minV, 0) - pad;
      const targetDomMax = Math.max(maxV, 0) + pad;

      // Continuous domain chase — exponential decay toward target, expand instantly
      const dom = domainRef.current;
      if (dom.dispMin === null) {
        dom.dispMin = targetDomMin;
        dom.dispMax = targetDomMax;
      } else {
        // Expand instantly (never clip), shrink smoothly (chase at ~15% per frame)
        const chase = 0.08;
        dom.dispMin = targetDomMin < dom.dispMin
          ? targetDomMin  // expanding down — snap
          : dom.dispMin + (targetDomMin - dom.dispMin) * chase; // shrinking — smooth
        dom.dispMax = targetDomMax > dom.dispMax
          ? targetDomMax  // expanding up — snap
          : dom.dispMax + (targetDomMax - dom.dispMax) * chase; // shrinking — smooth
      }

      const domMin = dom.dispMin;
      const domMax = dom.dispMax;

      const margin = 25;
      const chartW = w - margin * 2;
      const n = displayPts.length;
      let toX;
      if (markers) {
        // Results: spread all points evenly across full width
        toX = (i) => n <= 1 ? margin + chartW / 2 : margin + (i / (n - 1)) * chartW;
      } else {
        // Live: fixed spacing, last point pinned right, scrolls left
        const spacing = chartW / (WINDOW_SIZE - 1);
        toX = (i) => {
          // Last point at right edge, earlier points at fixed intervals to the left
          const fromRight = (n - 1 - i) * spacing;
          return margin + chartW - fromRight;
        };
      }
      const toY = (v) => {
        const y = h - 4 - ((v - domMin) / (domMax - domMin)) * (h - 8);
        return Math.max(4, Math.min(h - 4, y)); // clamp within chart bounds
      };

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

      const color = winning ? '#6DD0A9' : '#FF8AA8';
      const rgb = winning ? '109,208,169' : '255,138,168';

      const xArr = displayPts.map((_, i) => toX(i));
      const yArr = displayPts.map((p) => toY(p.value));

      // --- Draw line + fill on cached offscreen canvas ---
      const off = offRef.current;
      const oc = off.getContext('2d');
      oc.globalCompositeOperation = 'source-over';
      oc.setTransform(dpr, 0, 0, dpr, 0, 0);
      oc.clearRect(0, 0, w, h);

      // Build cubic bezier path
      oc.beginPath();
      oc.moveTo(xArr[0], yArr[0]);
      if (displayPts.length === 2) {
        oc.lineTo(xArr[1], yArr[1]);
      } else {
        for (let i = 0; i < displayPts.length - 1; i++) {
          const x0 = xArr[i], y0 = yArr[i];
          const x1 = xArr[i + 1], y1 = yArr[i + 1];
          const tension = 0.3;
          let dx0 = 0, dy0 = 0, dx1 = 0, dy1 = 0;
          if (i > 0) { dx0 = (xArr[i+1] - xArr[i-1]) * tension; dy0 = (yArr[i+1] - yArr[i-1]) * tension; }
          if (i + 2 < displayPts.length) { dx1 = (xArr[i+2] - xArr[i]) * tension; dy1 = (yArr[i+2] - yArr[i]) * tension; }
          oc.bezierCurveTo(x0 + dx0, y0 + dy0, x1 - dx1, y1 - dy1, x1, y1);
        }
      }

      const lastIdx = displayPts.length - 1;
      const lastX = xArr[lastIdx];
      const lastY = yArr[lastIdx];

      oc.strokeStyle = color;
      oc.lineWidth = 2.5;
      oc.lineJoin = 'round';
      oc.lineCap = 'round';
      oc.stroke();

      // Fill under line
      oc.lineTo(lastX, h);
      oc.lineTo(xArr[0], h);
      oc.closePath();
      const vertGrad = oc.createLinearGradient(0, 0, 0, h);
      vertGrad.addColorStop(0, `rgba(${rgb}, 0.38)`);
      vertGrad.addColorStop(0.5, `rgba(${rgb}, 0.15)`);
      vertGrad.addColorStop(0.85, `rgba(${rgb}, 0.03)`);
      vertGrad.addColorStop(1, `rgba(${rgb}, 0.0)`);
      oc.fillStyle = vertGrad;
      oc.fill();

      // Edge fade
      oc.globalCompositeOperation = 'destination-out';
      const fadeW = w * 0.15;

      const leftFade = oc.createLinearGradient(0, 0, fadeW, 0);
      leftFade.addColorStop(0, 'rgba(0,0,0,1)');
      leftFade.addColorStop(1, 'rgba(0,0,0,0)');
      oc.fillStyle = leftFade;
      oc.fillRect(0, 0, fadeW, h);

      const rightFade = oc.createLinearGradient(w - fadeW, 0, w, 0);
      rightFade.addColorStop(0, 'rgba(0,0,0,0)');
      rightFade.addColorStop(1, 'rgba(0,0,0,1)');
      oc.fillStyle = rightFade;
      oc.fillRect(w - fadeW, 0, fadeW, h);

      // Composite onto main canvas
      ctx.drawImage(off, 0, 0, w * dpr, h * dpr, 0, 0, w, h);

      // Exit dot for results
      if (markers) {
        ctx.beginPath();
        ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
        ctx.fillStyle = winning ? '#6DD0A9' : '#FF8AA8';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Holographic dot (live mode)
      if (!markers && displayPts.length > 2) {
        pulseT.current += 0.03;
        const pt = pulseT.current;
        const pulse = Math.sin(pt * 1.7);
        const hue = (pt * 60) % 360;
        const hue2 = (hue + 120) % 360;
        const hue3 = (hue + 240) % 360;

        ctx.beginPath();
        ctx.arc(lastX, lastY, 16 + pulse * 4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, 75%, ${0.12 + pulse * 0.04})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(lastX, lastY, 10 + pulse * 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue2}, 100%, 70%, ${0.18 + pulse * 0.05})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(lastX, lastY, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue3}, 100%, 80%, 0.25)`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = `hsla(${hue}, 100%, 65%, 0.9)`;
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Sparkles
        const sparkles = sparklesRef.current;
        for (let s = sparkles.length - 1; s >= 0; s--) {
          const sp = sparkles[s];
          sp.life -= 0.016 / sp.maxLife;
          if (sp.life <= 0) { sparkles.splice(s, 1); continue; }
          const dist = (1 - sp.life) * sp.speed;
          const sx = lastX + Math.cos(sp.angle) * dist;
          const sy = lastY + Math.sin(sp.angle) * dist;
          const alpha = sp.life * 0.9;
          const sc = sp.positive ? `rgba(109,208,169,${alpha})` : `rgba(255,77,106,${alpha})`;
          ctx.beginPath();
          ctx.arc(sx, sy, sp.size * sp.life, 0, Math.PI * 2);
          ctx.fillStyle = sc;
          ctx.shadowColor = sc;
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
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
        <div className="flex justify-end mt-1">
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: isWinning ? '#6DD0A9' : '#FF8AA8' }}>
            EXIT ●
          </span>
        </div>
      )}
    </div>
  );
}
