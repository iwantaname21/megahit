import React, { useRef, useEffect } from 'react';

const TICK_MS = 200;

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

  // Per-point interpolation state: each point has {fromX, toX, fromY, toY, tickTime}
  const pointsRef = useRef([]);
  const lastDataLen = useRef(0);
  const tickTimeRef = useRef(0);

  // Domain state
  const domainRef = useRef({ dispMin: null, dispMax: null });

  // Sparkle tracking
  const lastSparkleAt = useRef(0);

  dataRef.current = data;
  winRef.current = isWinning;
  markersRef.current = showMarkers;

  // Sparkle logic
  const SPARKLE_STEP = 3.5;
  const sdiff = pnlPercent - lastSparkleAt.current;
  if (Math.abs(sdiff) >= SPARKLE_STEP && data && data.length > 2) {
    const positive = sdiff > 0;
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

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

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

      // Compute target positions for all points
      const targetXs = pts.map((_, i) => n <= 1 ? margin + chartW / 2 : margin + (i / (n - 1)) * chartW);

      // Detect new tick (data length changed)
      const isNewTick = d.length !== lastDataLen.current;
      if (isNewTick) {
        tickTimeRef.current = now;
        lastDataLen.current = d.length;

        // Update per-point lerp state
        const oldPts = pointsRef.current;
        const newPts = [];

        for (let i = 0; i < n; i++) {
          if (markers) {
            // Results screen: no interpolation
            newPts.push({ fromX: targetXs[i], fromY: pts[i].value, toX: targetXs[i], toY: pts[i].value });
          } else if (i < n - 1 && i < oldPts.length) {
            // Existing point: lerp from current displayed position to new target
            const old = oldPts[i];
            const elapsed = now - (tickTimeRef.current - TICK_MS); // time since last tick
            const t = Math.min(elapsed / TICK_MS, 1);
            const e = easeOut(t);
            const currX = old.fromX + (old.toX - old.fromX) * e;
            const currY = old.fromY + (old.toY - old.fromY) * e;
            newPts.push({ fromX: currX, fromY: currY, toX: targetXs[i], toY: pts[i].value });
          } else if (i === n - 1) {
            // New last point: start from previous last point's position
            const prevLast = oldPts.length > 0 ? oldPts[oldPts.length - 1] : null;
            if (prevLast) {
              const elapsed = now - (tickTimeRef.current - TICK_MS);
              const t = Math.min(elapsed / TICK_MS, 1);
              const e = easeOut(t);
              const currX = prevLast.fromX + (prevLast.toX - prevLast.fromX) * e;
              const currY = prevLast.fromY + (prevLast.toY - prevLast.fromY) * e;
              newPts.push({ fromX: currX, fromY: currY, toX: targetXs[i], toY: pts[i].value });
            } else {
              newPts.push({ fromX: targetXs[i], fromY: pts[i].value, toX: targetXs[i], toY: pts[i].value });
            }
          } else {
            // Brand new point with no prior state
            newPts.push({ fromX: targetXs[i], fromY: pts[i].value, toX: targetXs[i], toY: pts[i].value });
          }
        }
        pointsRef.current = newPts;
      }

      // Interpolate all points
      const elapsed = now - tickTimeRef.current;
      const t = Math.min(elapsed / TICK_MS, 1);
      const e = easeOut(t);

      const ptsState = pointsRef.current;
      // If pointsRef is empty or mismatched (first frames), use raw targets
      const useRaw = ptsState.length !== n;

      // Compute interpolated values for domain calculation
      const interpVals = pts.map((p, i) => {
        if (markers || useRaw) return p.value;
        const s = ptsState[i];
        return s.fromY + (s.toY - s.fromY) * e;
      });

      // Domain
      const minV = Math.min(...interpVals);
      const maxV = Math.max(...interpVals);
      const absMax = Math.max(Math.abs(minV), Math.abs(maxV));
      const pad = absMax * 0.25 || 5;
      const targetDomMin = Math.min(minV, 0) - pad;
      const targetDomMax = Math.max(maxV, 0) + pad;

      const dom = domainRef.current;
      if (dom.dispMin === null) {
        dom.dispMin = targetDomMin;
        dom.dispMax = targetDomMax;
      } else {
        const chase = 0.08;
        dom.dispMin = targetDomMin < dom.dispMin ? targetDomMin : dom.dispMin + (targetDomMin - dom.dispMin) * chase;
        dom.dispMax = targetDomMax > dom.dispMax ? targetDomMax : dom.dispMax + (targetDomMax - dom.dispMax) * chase;
      }
      const domMin = dom.dispMin;
      const domMax = dom.dispMax;

      const toY = (v) => {
        const y = h - 4 - ((v - domMin) / (domMax - domMin)) * (h - 8);
        return Math.max(4, Math.min(h - 4, y));
      };

      // Compute final display positions
      const xArr = pts.map((_, i) => {
        if (markers || useRaw) return targetXs[i];
        const s = ptsState[i];
        return s.fromX + (s.toX - s.fromX) * e;
      });
      const yArr = interpVals.map(v => toY(v));

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

      // --- Draw on offscreen canvas ---
      const off = offRef.current;
      const oc = off.getContext('2d');
      oc.globalCompositeOperation = 'source-over';
      oc.setTransform(dpr, 0, 0, dpr, 0, 0);
      oc.clearRect(0, 0, w, h);

      oc.beginPath();
      oc.moveTo(xArr[0], yArr[0]);
      if (n === 2) {
        oc.lineTo(xArr[1], yArr[1]);
      } else {
        for (let i = 0; i < n - 1; i++) {
          const x0 = xArr[i], y0 = yArr[i];
          const x1 = xArr[i + 1], y1 = yArr[i + 1];
          const tension = 0.3;
          let dx0 = 0, dy0 = 0, dx1 = 0, dy1 = 0;
          if (i > 0) { dx0 = (xArr[i+1] - xArr[i-1]) * tension; dy0 = (yArr[i+1] - yArr[i-1]) * tension; }
          if (i + 2 < n) { dx1 = (xArr[i+2] - xArr[i]) * tension; dy1 = (yArr[i+2] - yArr[i]) * tension; }
          oc.bezierCurveTo(x0 + dx0, y0 + dy0, x1 - dx1, y1 - dy1, x1, y1);
        }
      }

      const lastX = xArr[n - 1];
      const lastY = yArr[n - 1];

      oc.strokeStyle = color;
      oc.lineWidth = 2.5;
      oc.lineJoin = 'round';
      oc.lineCap = 'round';
      oc.stroke();

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
      if (!markers && n > 2) {
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
