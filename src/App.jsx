import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useGameStore from './store';
import VideoBackground from './components/VideoBackground';
import PlayScreen from './components/PlayScreen';
import LockingScreen from './components/LockingScreen';
import TradingScreen from './components/TradingScreen';
import ResultsScreen from './components/ResultsScreen';

function LoadingScreen({ onComplete, videoReady }) {
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [progress, setProgress] = useState(0);

  // Minimum 3s display, then wait for video
  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Animate progress: 0-80% over 3s (min time), then 80-100% when video ready
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      let pct;
      if (!minTimePassed) {
        // Phase 1: 0-80% over 3 seconds
        pct = Math.min((elapsed / 3000) * 0.8, 0.8);
      } else if (!videoReady) {
        // Phase 2: hold at 85%, waiting for video
        pct = 0.85;
      } else {
        // Phase 3: snap to 100%
        pct = 1;
      }
      setProgress(pct);
      if (pct < 1) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }, [minTimePassed, videoReady]);

  // Complete when both conditions met
  useEffect(() => {
    if (minTimePassed && videoReady) {
      setProgress(1);
      const t = setTimeout(onComplete, 600);
      return () => clearTimeout(t);
    }
  }, [minTimePassed, videoReady, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#0f0f11', zIndex: 100 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {/* Animated dawn orbs — orange-yellow like sunrise */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 160 + i * 80,
            height: 160 + i * 80,
            background: `radial-gradient(circle, rgba(255, ${180 + i * 15}, ${60 + i * 20}, ${0.04 + i * 0.012}) 0%, transparent 70%)`,
            border: '1px solid rgba(255, 200, 100, 0.04)',
          }}
          animate={{
            x: [0, 20 - i * 8, -15 + i * 5, 0],
            y: [0, -15 + i * 6, 10 - i * 3, 0],
            scale: [1, 1.08, 0.95, 1],
          }}
          transition={{
            duration: 5 + i * 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Logo + progress */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Glass card */}
        <div
          className="rounded-3xl px-10 py-8 flex flex-col items-center"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1.5px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <motion.span
            className="font-bold text-2xl tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.85)' }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            MEGAHIT
          </motion.span>
        </div>

        {/* Progress bar — liquid glass pill style like preset selectors */}
        <div
          className="mt-8 rounded-full overflow-hidden"
          style={{
            width: 220,
            height: 28,
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(8px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
            padding: 4,
          }}
        >
          <motion.div
            className="h-full rounded-full"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              background: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 0 8px rgba(255,200,100,0.15)',
              minWidth: progress > 0 ? 20 : 0,
            }}
          />
        </div>

        {/* Loading text */}
        <motion.span
          className="mt-4 font-bold text-[13px] tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.25)' }}
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          Loading
        </motion.span>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const currentScreen = useGameStore((s) => s.currentScreen);
  const [loading, setLoading] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  const handleVideoReady = useCallback(() => setVideoReady(true), []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center" style={{ backgroundColor: '#0f0f11' }}>
      {/* Video background — starts loading immediately behind the loading screen */}
      <VideoBackground onReady={handleVideoReady} />

      <AnimatePresence>
        {loading && (
          <LoadingScreen
            key="loader"
            onComplete={() => setLoading(false)}
            videoReady={videoReady}
          />
        )}
      </AnimatePresence>

      {/* Main app */}
      <motion.div
        className="relative w-full max-w-[430px] min-h-screen flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: loading ? 0 : 1 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: loading ? 0 : 0.3 }}
      >
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{
              duration: 0.4,
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: 0.15,
            }}
            className="flex-1 flex flex-col"
          >
            {currentScreen === 'play' && <PlayScreen />}
            {currentScreen === 'locking' && <LockingScreen />}
            {currentScreen === 'trading' && <TradingScreen />}
            {currentScreen === 'results' && <ResultsScreen />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
