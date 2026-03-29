import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../store';
import Header from './Header';
import { ASSETS, LEVERAGES, SIDES } from '../lib/simulation';

const SPIN_DURATION = 1500;
const LOCK_DELAY = 320;

// Build reel strips — repeat values many times for seamless looping
const ASSET_STRIP = Array.from({ length: 24 }, (_, i) => ASSETS[i % ASSETS.length]);
const LEVERAGE_STRIP = Array.from({ length: 24 }, (_, i) => LEVERAGES[i % LEVERAGES.length]);
const SIDE_STRIP = Array.from({ length: 24 }, (_, i) => SIDES[i % SIDES.length]);

function formatVal(label, value) {
  if (label === 'LEVERAGE') return `${value}x`;
  return value;
}

function valColor(label, value) {
  if (label === 'SIDE' && value === 'LONG') return '#6DD0A9';
  if (label === 'SIDE' && value === 'SHORT') return '#FF8AA8';
  return 'white';
}

// Smooth 60fps scrolling reel using requestAnimationFrame
function SpinReel({ label, strip, speed, isLocked }) {
  const reelRef = useRef(null);
  const offsetRef = useRef(0);
  const animRef = useRef(null);

  const ITEM_H = 80;
  // One full cycle = half the strip (since we duplicate for seamless wrap)
  const halfLen = strip.length / 2;
  const cycleHeight = halfLen * ITEM_H;

  useEffect(() => {
    const tick = () => {
      offsetRef.current -= speed; // px per frame
      if (Math.abs(offsetRef.current) >= cycleHeight) {
        offsetRef.current += cycleHeight;
      }
      if (reelRef.current) {
        reelRef.current.style.transform = `translateY(${offsetRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [speed, cycleHeight]);

  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="font-bold uppercase text-[10px] tracking-widest"
        style={{ color: 'rgba(19,19,20,0.5)' }}
      >
        {label}
      </span>
      <div
        className="glass-tile three-d-tile w-full rounded-2xl overflow-hidden relative"
        style={{ height: `${ITEM_H}px` }}
      >
        {/* Scrolling reel — GPU-accelerated via will-change + translateY */}
        <div
          ref={reelRef}
          style={{ willChange: 'transform' }}
        >
          {strip.map((val, i) => (
            <div
              key={`${label}-${i}`}
              className="flex items-center justify-center font-black text-xl tracking-tight"
              style={{ height: ITEM_H, color: valColor(label, val) }}
            >
              {formatVal(label, val)}
            </div>
          ))}
        </div>

        {/* Lock overlay — slides down from above, oversized to hide slivers */}
        {isLocked && (
          <motion.div
            className="absolute flex items-center justify-center z-10 rounded-2xl"
            style={{
              background: 'linear-gradient(180deg, #2A2A2B 0%, #19191A 100%)',
              top: '-8px',
              left: '-4px',
              right: '-4px',
              bottom: '-8px',
            }}
            initial={{ y: '-110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
          >
            <motion.span
              className="material-symbols-outlined text-2xl"
              style={{ color: '#7EAAD4', fontVariationSettings: "'FILL' 1" }}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 500, damping: 18 }}
            >
              lock
            </motion.span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function LockingScreen() {
  const { betAmount, startTrading } = useGameStore();
  const [lockedCount, setLockedCount] = useState(0);
  const [phase, setPhase] = useState('spinning');
  const timeoutsRef = useRef([]);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase('locking');
      const t2 = setTimeout(() => {
        setLockedCount(1);
        const t3 = setTimeout(() => {
          setLockedCount(2);
          const t4 = setTimeout(() => {
            setLockedCount(3);
            setPhase('done');
            const t5 = setTimeout(() => startTrading(), 900);
            timeoutsRef.current.push(t5);
          }, LOCK_DELAY);
          timeoutsRef.current.push(t4);
        }, LOCK_DELAY);
        timeoutsRef.current.push(t3);
      }, LOCK_DELAY);
      timeoutsRef.current.push(t2);
    }, SPIN_DURATION);
    timeoutsRef.current.push(t1);

    return () => timeoutsRef.current.forEach(clearTimeout);
  }, []);

  // Different speeds per reel (px per frame at 60fps) — creates visual variety
  const reels = [
    { label: 'ASSET', strip: ASSET_STRIP, speed: 4.5 },
    { label: 'LEVERAGE', strip: LEVERAGE_STRIP, speed: 6.2 },
    { label: 'SIDE', strip: SIDE_STRIP, speed: 3.4 },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <div className="flex-1 flex flex-col items-center px-5 pt-4 pb-8">
        {/* Stake display */}
        <div className="text-center mb-8">
          <span
            className="font-bold uppercase text-[10px] tracking-widest block mb-2"
            style={{ color: 'rgba(19,19,20,0.4)' }}
          >
            {[10, 50, 100].includes(Math.round(betAmount)) ? 'STAKE' : 'CUSTOM STAKE'}
          </span>
          <span className="font-black text-5xl tracking-tight text-[#131314]">
            ${betAmount.toFixed(2)}
          </span>
        </div>

        {/* Tiles grid */}
        <div
          className="liquid-glass rounded-2xl p-6 border w-full mb-8"
          style={{ borderColor: 'rgba(255,255,255,0.3)' }}
        >
          <div className="grid grid-cols-3 gap-3">
            {reels.map((reel, i) => (
              <SpinReel
                key={reel.label}
                label={reel.label}
                strip={reel.strip}
                speed={reel.speed}
                isLocked={lockedCount > i}
              />
            ))}
          </div>
        </div>

        {/* Locking status */}
        <motion.div
          className="flex items-center gap-2"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-[#131314]/50 text-lg">✱</span>
          <span
            className="text-[11px] font-extrabold tracking-[0.2em] uppercase"
            style={{ color: 'rgba(19,19,20,0.5)' }}
          >
            {phase === 'done' ? 'POSITION LOCKED' : 'LOCKING POSITION'}
          </span>
        </motion.div>

        {/* Progress dots */}
        <div className="flex gap-2 mt-4">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              animate={{
                backgroundColor: i < lockedCount ? '#6DD0A9' : 'rgba(19,19,20,0.2)',
                scale: i < lockedCount ? 1.2 : 1,
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
