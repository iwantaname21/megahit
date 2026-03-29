import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PnlChart from './PnlChart';
import { formatCurrency, formatDuration } from '../lib/simulation';

// Smoothly animated number that lerps toward the target value
function SmoothNumber({ value, color, fontSize = '3.5rem' }) {
  const displayRef = useRef(null);
  const currentVal = useRef(value);
  const targetVal = useRef(value);
  const animRef = useRef(null);

  targetVal.current = value;

  useEffect(() => {
    const tick = () => {
      // Lerp 20% toward target each frame
      currentVal.current += (targetVal.current - currentVal.current) * 0.2;

      // Snap when close enough
      if (Math.abs(targetVal.current - currentVal.current) < 0.01) {
        currentVal.current = targetVal.current;
      }

      if (displayRef.current) {
        const v = currentVal.current;
        const abs = Math.abs(v);
        const sign = v >= 0 ? '+$' : '-$';
        displayRef.current.textContent = sign + abs.toFixed(2);
      }

      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <span
      ref={displayRef}
      className="font-extrabold tracking-tighter leading-none"
      style={{ fontSize, color, transition: 'color 0.3s' }}
    >
      {formatCurrency(value)}
    </span>
  );
}

// Smooth percent display
function SmoothPercent({ value, color }) {
  const numRef = useRef(null);
  const currentVal = useRef(value);
  const targetVal = useRef(value);
  const animRef = useRef(null);

  targetVal.current = value;

  useEffect(() => {
    const tick = () => {
      currentVal.current += (targetVal.current - currentVal.current) * 0.2;
      if (Math.abs(targetVal.current - currentVal.current) < 0.01) {
        currentVal.current = targetVal.current;
      }
      if (numRef.current) {
        numRef.current.textContent = `${Math.abs(currentVal.current).toFixed(1)}%`;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <span className="text-sm font-bold flex items-center gap-0.5" style={{ color, transition: 'color 0.3s' }}>
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '16px', fontVariationSettings: "'wght' 600" }}
      >
        {value >= 0 ? 'north_east' : 'south_east'}
      </span>
      <span ref={numRef}>{Math.abs(value).toFixed(1)}%</span>
    </span>
  );
}

export default function PnlCard({
  currentPnl,
  pnlPercent,
  pnlHistory,
  isWinning,
  elapsedTime,
  balance,
  positionSize,
  realizedPnl,
  cardFlash = null,
}) {
  const color = isWinning ? '#6DD0A9' : '#FF8AA8';
  const glowClass = '';
  const tintBg = isWinning ? 'rgba(109,208,169,0.05)' : 'rgba(255,138,168,0.06)';
  const borderColor = isWinning ? 'rgba(109,208,169,0.35)' : 'rgba(255,138,168,0.35)';

  return (
    <motion.div
      className={`w-full rounded-2xl p-5 relative overflow-hidden ${glowClass}`}
      animate={{ borderColor }}
      style={{
        background: 'rgba(255,255,255,0.18)',
        backdropFilter: 'blur(40px) saturate(1.8) brightness(1.1)',
        WebkitBackdropFilter: 'blur(40px) saturate(1.8) brightness(1.1)',
        border: `1px solid ${borderColor}`,
      }}
      transition={{ duration: 0.4 }}
    >
      {/* Color tint overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        animate={{ background: tintBg }}
        transition={{ duration: 0.4 }}
      />

      {/* Card flash for double / 50% actions */}
      <AnimatePresence>
        {cardFlash && (
          <motion.div
            key={`card-flash-${cardFlash}-${Date.now()}`}
            className="absolute inset-0 pointer-events-none rounded-2xl z-20"
            style={{
              background: cardFlash === 'green'
                ? 'rgba(109,208,169,0.25)'
                : 'rgba(255,77,106,0.25)',
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      {/* Status row */}
      <div className="relative z-10 flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <motion.span
            className="w-2 h-2 rounded-full"
            animate={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
            transition={{ duration: 0.4 }}
          />
          <span
            className="text-[11px] font-extrabold tracking-widest uppercase"
            style={{ color: '#131314' }}
          >
            {isWinning ? 'WINNING' : 'LOSING'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5" style={{ color: 'rgba(19,19,20,0.5)' }}>
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span className="text-[11px] font-bold">{formatDuration(elapsedTime)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: '#FF4D4D' }}
            />
            <span className="text-[11px] font-extrabold tracking-widest text-[#131314] uppercase">
              LIVE
            </span>
          </div>
        </div>
      </div>

      {/* PnL amount — smooth rolling numbers */}
      <div className="relative z-10 flex flex-col items-center mb-3">
        <SmoothNumber value={currentPnl} color={color} />
        <div className="flex items-center gap-1 mt-1">
          <SmoothPercent value={pnlPercent} color={color} />
        </div>
      </div>

      {/* Chart */}
      <div className="relative z-10 mb-5">
        <PnlChart data={pnlHistory} isWinning={isWinning} height={110} />
      </div>

      {/* Stats bottom bar */}
      <div
        className="relative z-10 grid grid-cols-3 gap-2 pt-4"
        style={{ borderTop: '1px solid rgba(19,19,20,0.06)' }}
      >
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(19,19,20,0.4)' }}>
            Balance
          </span>
          <span className="text-[11px] font-bold text-[#131314]">
            ${balance.toFixed(2)}
          </span>
        </div>
        <div
          className="flex flex-col pl-3"
          style={{ borderLeft: '1px solid rgba(19,19,20,0.06)' }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(19,19,20,0.4)' }}>
            Position
          </span>
          <span className="text-[11px] font-bold text-[#131314]">
            ${positionSize.toFixed(2)}
          </span>
        </div>
        <div
          className="flex flex-col pl-3"
          style={{ borderLeft: '1px solid rgba(19,19,20,0.06)' }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(19,19,20,0.4)' }}>
            Realized
          </span>
          <span
            className="text-[11px] font-bold"
            style={{ color: realizedPnl >= 0 ? '#6DD0A9' : '#FF8AA8' }}
          >
            {formatCurrency(realizedPnl)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
