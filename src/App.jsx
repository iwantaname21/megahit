import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useGameStore from './store';
import OceanBackground from './components/OceanBackground';
import PlayScreen from './components/PlayScreen';
import LockingScreen from './components/LockingScreen';
import TradingScreen from './components/TradingScreen';
import ResultsScreen from './components/ResultsScreen';

const screenVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.25, ease: 'easeIn' } },
};

export default function App() {
  const currentScreen = useGameStore((s) => s.currentScreen);
  const [ready, setReady] = useState(false);

  // Delay UI reveal so backdrop-filter composites before anything is visible
  useEffect(() => {
    // Wait for two animation frames + a small delay so blur layers are fully composited
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => setReady(true), 50);
      });
    });
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center" style={{ backgroundColor: '#E8E4E0' }}>
      {/* Animated ocean background */}
      <OceanBackground />

      {/* Centered phone-width container — fades in after glass is ready */}
      <motion.div
        className="relative w-full max-w-[430px] min-h-screen flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <AnimatePresence mode="wait">
          {currentScreen === 'play' && (
            <motion.div key="play" {...screenVariants} className="flex-1 flex flex-col">
              <PlayScreen />
            </motion.div>
          )}
          {currentScreen === 'locking' && (
            <motion.div key="locking" {...screenVariants} className="flex-1 flex flex-col">
              <LockingScreen />
            </motion.div>
          )}
          {currentScreen === 'trading' && (
            <motion.div key="trading" {...screenVariants} className="flex-1 flex flex-col">
              <TradingScreen />
            </motion.div>
          )}
          {currentScreen === 'results' && (
            <motion.div key="results" {...screenVariants} className="flex-1 flex flex-col">
              <ResultsScreen />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
