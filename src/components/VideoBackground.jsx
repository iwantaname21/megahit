import React from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../store';

const YOUTUBE_IDS = {
  calm: '1grXZtsdHmI',
  sleepy: '4Yw3Kh8bBDo',
};

export default function VideoBackground() {
  const bgMode = useGameStore((s) => s.bgMode);
  const videoId = YOUTUBE_IDS[bgMode];

  return (
    <div className="fixed inset-0" style={{ zIndex: 0 }}>
      {/* YouTube iframe — autoplay, muted, looped, no controls */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          width: '177.78vh', /* 16:9 ratio to cover viewport */
          height: '100vh',
          minWidth: '100vw',
          minHeight: '56.25vw',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      >
        <iframe
          key={bgMode}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            pointerEvents: 'none',
          }}
          title="Background video"
        />
      </div>

      {/* Dark overlay for sleepy mode */}
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
