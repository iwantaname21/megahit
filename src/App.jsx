import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useGameStore from './store';
import VideoBackground from './components/VideoBackground';
import PlayScreen from './components/PlayScreen';
import LockingScreen from './components/LockingScreen';
import TradingScreen from './components/TradingScreen';
import ResultsScreen from './components/ResultsScreen';

function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 10000; // 10 seconds
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / duration, 1);
      setProgress(pct);
      if (pct < 1) {
        requestAnimationFrame(tick);
      } else {
        onComplete();
      }
    };
    requestAnimationFrame(tick);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#0f0f11', zIndex: 100 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {/* Animated glass orbs in background */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 80 + i * 40,
            height: 80 + i * 40,
            background: `rgba(109, 208, 169, ${0.03 + i * 0.01})`,
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(2px)',
          }}
          animate={{
            x: [0, 20 - i * 8, -15 + i * 5, 0],
            y: [0, -15 + i * 6, 10 - i * 3, 0],
            scale: [1, 1.05, 0.97, 1],
          }}
          transition={{
            duration: 4 + i * 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Logo / title */}
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
            className="font-black text-2xl tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.85)' }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            MEGAHIT
          </motion.span>
        </div>

        {/* Progress bar */}
        <div
          className="mt-8 rounded-full overflow-hidden"
          style={{
            width: 200,
            height: 3,
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.08)',
          }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, rgba(109,208,169,0.5), rgba(109,208,169,0.8))',
              boxShadow: '0 0 8px rgba(109,208,169,0.3)',
            }}
          />
        </div>

        {/* Loading text */}
        <motion.span
          className="mt-4 text-[10px] font-bold tracking-[0.2em] uppercase"
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

  return (
    <div className="min-h-screen w-full flex flex-col items-center" style={{ backgroundColor: '#0f0f11' }}>
      {/* Video background — starts loading immediately behind the loading screen */}
      <VideoBackground />

      <AnimatePresence>
        {loading && (
          <LoadingScreen key="loader" onComplete={() => setLoading(false)} />
        )}
      </AnimatePresence>

      {/* Main app — visible after loading */}
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
