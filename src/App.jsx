import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useGameStore from './store';
import VideoBackground from './components/VideoBackground';
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
    <div className="min-h-screen w-full flex flex-col items-center" style={{ backgroundColor: '#1a1a1a' }}>
      {/* Video background — calm or storm mode */}
      <VideoBackground />

      {/* Centered phone-width container — fades in after glass is ready */}
      <motion.div
        className="relative w-full max-w-[430px] min-h-screen flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
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
