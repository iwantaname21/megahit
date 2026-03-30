import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../store';

const YOUTUBE_IDS = {
  calm: '1grXZtsdHmI',
  sleepy: '4Yw3Kh8bBDo',
};

function buildSrc(videoId) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&origin=${origin}`;
}

const iframeStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  border: 'none',
  pointerEvents: 'none',
};

const containerStyle = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  width: '177.78vh',
  height: '100vh',
  minWidth: '100vw',
  minHeight: '56.25vw',
  transform: 'translate(-50%, -50%)',
  pointerEvents: 'none',
};

export default function VideoBackground() {
  const bgMode = useGameStore((s) => s.bgMode);

  // Keep both iframes alive, crossfade by toggling opacity
  // This avoids destroying/recreating iframes which causes black flash
  return (
    <div className="fixed inset-0" style={{ zIndex: 0 }}>
      {/* Calm video — always mounted */}
      <motion.div
        style={containerStyle}
        animate={{ opacity: bgMode === 'calm' ? 1 : 0 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      >
        <iframe
          src={buildSrc(YOUTUBE_IDS.calm)}
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          style={iframeStyle}
          title="Calm background"
        />
      </motion.div>

      {/* Sleepy video — always mounted */}
      <motion.div
        style={{ ...containerStyle, zIndex: 1 }}
        animate={{ opacity: bgMode === 'sleepy' ? 1 : 0 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      >
        <iframe
          src={buildSrc(YOUTUBE_IDS.sleepy)}
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          style={iframeStyle}
          title="Sleepy background"
        />
      </motion.div>

      {/* Dark overlay for sleepy mode */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        animate={{
          backgroundColor: bgMode === 'sleepy' ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0)',
        }}
        transition={{ duration: 1.2 }}
        style={{ zIndex: 2 }}
      />
    </div>
  );
}
