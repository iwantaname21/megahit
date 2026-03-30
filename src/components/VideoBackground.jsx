import React, { useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useGameStore from '../store';

const VIDEOS = {
  calm: 'https://drive.google.com/uc?export=download&id=1DgkaoVKDer-1gEj8yOD5KhuD6KdH_kOF',
  sleepy: 'https://drive.google.com/uc?export=download&id=1upElp_xvVemrUhcg6KZ5vPbe4O8a8Tdx',
};

export default function VideoBackground() {
  const bgMode = useGameStore((s) => s.bgMode);
  const videoRef = useRef(null);

  // Ensure video plays on iOS Safari after mode switch
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [bgMode]);

  return (
    <div className="fixed inset-0" style={{ zIndex: 0 }}>
      <AnimatePresence mode="popLayout">
        <motion.video
          key={bgMode}
          ref={videoRef}
          src={VIDEOS[bgMode]}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          className="pointer-events-none"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            minWidth: '100%',
            minHeight: '100%',
          }}
        />
      </AnimatePresence>

      {/* Dark overlay for sleepy mode to deepen the mood */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        animate={{
          backgroundColor: bgMode === 'sleepy' ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0)',
        }}
        transition={{ duration: 1.2 }}
        style={{ zIndex: 1 }}
      />
    </div>
  );
}
