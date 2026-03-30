import React, { useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../store';

const YOUTUBE_IDS = {
  calm: '1grXZtsdHmI',
  sleepy: '4Yw3Kh8bBDo',
};

function buildSrc(videoId) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&enablejsapi=1&origin=${origin}`;
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

export default function VideoBackground({ onReady }) {
  const bgMode = useGameStore((s) => s.bgMode);
  const readyFired = useRef(false);
  const calmRef = useRef(null);
  const sleepyRef = useRef(null);

  const handleIframeLoad = useCallback(() => {
    if (!readyFired.current && onReady) {
      readyFired.current = true;
      onReady();
    }
  }, [onReady]);

  // When user returns to the app, send play command to both iframes
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Post play command via YouTube iframe API
        const playMsg = JSON.stringify({ event: 'command', func: 'playVideo', args: [] });
        if (calmRef.current?.contentWindow) {
          try { calmRef.current.contentWindow.postMessage(playMsg, '*'); } catch (e) {}
        }
        if (sleepyRef.current?.contentWindow) {
          try { sleepyRef.current.contentWindow.postMessage(playMsg, '*'); } catch (e) {}
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // Also try to resume on any touch (iOS Safari requires user gesture)
    const handleTouch = () => {
      const playMsg = JSON.stringify({ event: 'command', func: 'playVideo', args: [] });
      if (calmRef.current?.contentWindow) {
        try { calmRef.current.contentWindow.postMessage(playMsg, '*'); } catch (e) {}
      }
      if (sleepyRef.current?.contentWindow) {
        try { sleepyRef.current.contentWindow.postMessage(playMsg, '*'); } catch (e) {}
      }
    };
    document.addEventListener('touchstart', handleTouch, { once: false, passive: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('touchstart', handleTouch);
    };
  }, []);

  return (
    <div className="fixed inset-0" style={{ zIndex: 0 }}>
      {/* Calm video */}
      <motion.div
        style={containerStyle}
        animate={{ opacity: bgMode === 'calm' ? 1 : 0 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      >
        <iframe
          ref={calmRef}
          src={buildSrc(YOUTUBE_IDS.calm)}
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          style={iframeStyle}
          title="Calm background"
          onLoad={handleIframeLoad}
        />
      </motion.div>

      {/* Sleepy video */}
      <motion.div
        style={{ ...containerStyle, zIndex: 1 }}
        animate={{ opacity: bgMode === 'sleepy' ? 1 : 0 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      >
        <iframe
          ref={sleepyRef}
          src={buildSrc(YOUTUBE_IDS.sleepy)}
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          style={iframeStyle}
          title="Sleepy background"
          onLoad={handleIframeLoad}
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
