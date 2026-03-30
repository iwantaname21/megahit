import React, { useRef, useEffect } from 'react';

const TICK_MS = 100;
const SPARKLE_STEP = 3.5;

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

  // Per-point interpolation: each point stores displayed {x, y} that lerps to target
  const displayedPts = useRef([]);
  const tickTime = useRef(0);
  const prevDataLen = useRef(0);

  // Domain chase
  const domDisp = useRef({ min: null, max: null });

  // Sparkle tracking
  const lastSparkleAt = useRef(0);

  dataRef.current = data;
  winRef.current = isWinning;
  markersRef.current = showMarkers;

  // Sparkle logic
  const diff = pnlPercent - lastSparkleAt.current;
  if (Math.abs(diff) >= SPARKLE_STEP && data && data.length > 2) {
    const positive = diff > 0;
    lastSparkleAt.current = pnlPercent;
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

      // Downsample
      let pts = d;
      if (d.length > 200) {
        const step = Math.ceil(d.length / 200);
        pts = d.filter((_, i) => i % step === 0 || i === d.length - 1);
      }

      const margin = 25;
      const chartW = w - margin * 2;
      const n = pts.length;

      // Target domain — single loop, no intermediate arrays
      let minV = pts[0].value, maxV = pts[0].value;
      for (let i = 1; i < n; i++) {
        const v = pts[i].value;
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }
      const absMax = Math.max(Math.abs(minV), Math.abs(maxV));
      const pad = absMax * 0.25 || 5;
      const targetDomMin = Math.min(minV, 0) - pad;
      const targetDomMax = Math.max(maxV, 0) + pad;

      // Domain chase — expand instant, shrink smooth
      const dom = domDisp.current;
      if (dom.min === null) {
        dom.min = targetDomMin;
        dom.max = targetDomMax;
      } else {
        const chase = 0.1;
        dom.min = targetDomMin < dom.min ? targetDomMin : dom.min + (targetDomMin - dom.min) * chase;
        dom.max = targetDomMax > dom.max ? targetDomMax : dom.max + (targetDomMax - dom.max) * chase;
      }

      const toYVal = (v) => {
        const y = h - 4 - ((v - dom.min) / (dom.max - dom.min)) * (h - 8);
        // Clamp with enough margin for the holographic glow ring (radius ~20px)
        return Math.max(22, Math.min(h - 22, y));
      };

      // Target pixel positions — compute without allocating new array
      const xScale = n <= 1 ? 0 : chartW / (n - 1);
      const xOff = n <= 1 ? margin + chartW / 2 : margin;

      // Detect new tick
      const newTick = d.length !== prevDataLen.current;
      if (newTick) {
        tickTime.current = now;
        prevDataLen.current = d.length;
      }

      // Easing progress for this frame
      const elapsed = now - tickTime.current;
      const t = Math.min(elapsed / TICK_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      // Update displayed positions — lerp in place, no new arrays
      const dp = displayedPts.current;

      if (markers) {
        // Results — no interpolation, compute directly
        displayedPts.current = [];
        for (let i = 0; i < n; i++) {
          displayedPts.current.push({ x: xOff + i * xScale, y: toYVal(pts[i].value) });
        }
      } else if (dp.length === 0) {
        for (let i = 0; i < n; i++) {
          dp.push({ x: xOff + i * xScale, y: toYVal(pts[i].value) });
        }
      } else {
        // Grow
        while (dp.length < n) {
          const prev = dp.length > 0 ? dp[dp.length - 1] : { x: xOff, y: toYVal(0) };
          dp.push({ x: prev.x, y: prev.y });
        }
        dp.length = n;
        // Lerp in place
        for (let i = 0; i < n; i++) {
          const tx = xOff + i * xScale;
          const ty = toYVal(pts[i].value);
          dp[i].x += (tx - dp[i].x) * eased;
          dp[i].y += (ty - dp[i].y) * eased;
        }
      }

      const rp = displayedPts.current;
      const lastIdx = rp.length - 1;
      const lastX = rp[lastIdx].x;
      const lastY = rp[lastIdx].y;

      // Zero line
      const zeroY = toYVal(0);
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(19,19,20,0.18)';
      ctx.lineWidth = 1;
      ctx.moveTo(0, zeroY);
      ctx.lineTo(w, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      const color = winning ? '#6DD0A9' : '#FF8AA8';
      const rgb = winning ? '109,208,169' : '255,138,168';

      // --- Offscreen canvas ---
      const off = offRef.current;
      const oc = off.getContext('2d');
      oc.globalCompositeOperation = 'source-over';
      oc.setTransform(dpr, 0, 0, dpr, 0, 0);
      oc.clearRect(0, 0, w, h);

      // Bezier path from interpolated positions
      oc.beginPath();
      oc.moveTo(rp[0].x, rp[0].y);
      if (rp.length === 2) {
        oc.lineTo(rp[1].x, rp[1].y);
      } else {
        for (let i = 0; i < rp.length - 1; i++) {
          const x0 = rp[i].x, y0 = rp[i].y;
          const x1 = rp[i + 1].x, y1 = rp[i + 1].y;
          const tension = 0.3;
          let dx0 = 0, dy0 = 0, dx1 = 0, dy1 = 0;
          if (i > 0) {
            dx0 = (rp[i + 1].x - rp[i - 1].x) * tension;
            dy0 = (rp[i + 1].y - rp[i - 1].y) * tension;
          }
          if (i + 2 < rp.length) {
            dx1 = (rp[i + 2].x - rp[i].x) * tension;
            dy1 = (rp[i + 2].y - rp[i].y) * tension;
          }
          oc.bezierCurveTo(x0 + dx0, y0 + dy0, x1 - dx1, y1 - dy1, x1, y1);
        }
      }

      oc.strokeStyle = color;
      oc.lineWidth = 2.5;
      oc.lineJoin = 'round';
      oc.lineCap = 'round';
      oc.stroke();

      // Fill
      oc.lineTo(lastX, h);
      oc.lineTo(rp[0].x, h);
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

      ctx.drawImage(off, 0, 0, w * dpr, h * dpr, 0, 0, w, h);

      // Exit dot (results)
      if (markers) {
        ctx.beginPath();
        ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
        ctx.fillStyle = winning ? '#6DD0A9' : '#FF8AA8';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Holographic dot (live)
      if (!markers && rp.length > 2) {
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
    return () => {
      cancelAnimationFrame(animRef.current);
      displayedPts.current = [];
      domDisp.current = { min: null, max: null };
      prevDataLen.current = 0;
      sparklesRef.current = [];
    };
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
