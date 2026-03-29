import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// mode: 'placeholder' | 'spinning' | 'locked' | 'revealed'
// spinValues: { asset, leverage, side } — current cycling display values
// revealed: { asset, leverage, side } — final values for revealed mode

function Tile({ label, value, mode, flipped = false }) {
  const isLocked = mode === 'locked' || (mode === 'revealed' && !flipped);
  const isRevealed = mode === 'revealed' && flipped;

  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="font-bold uppercase text-[10px] tracking-widest"
        style={{ color: 'rgba(19,19,20,0.5)' }}
      >
        {label}
      </span>
      <div
        className="glass-tile three-d-tile w-full rounded-2xl flex items-center justify-center"
        style={{ height: '80px' }}
      >
        <AnimatePresence mode="wait">
          {mode === 'locked' && (
            <motion.span
              key="lock"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="material-symbols-outlined text-2xl"
              style={{ color: '#7EAAD4', fontVariationSettings: "'FILL' 1" }}
            >
              lock
            </motion.span>
          )}
          {mode === 'spinning' && (
            <motion.span
              key={`spin-${value}`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.06 }}
              className="font-black text-xl tracking-tight"
              style={{
                color: label === 'SIDE' && value === 'LONG' ? '#6DD0A9' :
                       label === 'SIDE' && value === 'SHORT' ? '#FF8AA8' : 'white',
              }}
            >
              {label === 'LEVERAGE' ? `${value}x` : value}
            </motion.span>
          )}
          {mode === 'placeholder' && (
            <motion.span
              key="placeholder"
              className="font-black text-xl tracking-tight"
              style={{
                color: label === 'SIDE' ? '#6DD0A9' : 'white',
              }}
            >
              {label === 'LEVERAGE' ? `${value}x` : value}
            </motion.span>
          )}
          {mode === 'revealed' && !flipped && (
            <motion.span
              key="lock-reveal"
              className="material-symbols-outlined text-2xl"
              style={{ color: '#7EAAD4', fontVariationSettings: "'FILL' 1" }}
            >
              lock
            </motion.span>
          )}
          {mode === 'revealed' && flipped && (
            <motion.span
              key={`revealed-${value}`}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="font-black text-xl tracking-tight"
              style={{
                color: label === 'SIDE' && value === 'LONG' ? '#6DD0A9' :
                       label === 'SIDE' && value === 'SHORT' ? '#FF8AA8' :
                       label === 'LEVERAGE' ? '#8befc6' : 'white',
              }}
            >
              {label === 'LEVERAGE' ? `${value}x` : value}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function TileTriplet({ mode, spinValues, asset, leverage, side, revealedCount = 0 }) {
  // revealedCount: 0=none, 1=asset, 2=asset+leverage, 3=all
  const tiles = [
    { label: 'ASSET', value: mode === 'spinning' ? spinValues?.asset : asset },
    { label: 'LEVERAGE', value: mode === 'spinning' ? spinValues?.leverage : leverage },
    { label: 'SIDE', value: mode === 'spinning' ? spinValues?.side : side },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {tiles.map((tile, i) => {
        let tileMode = mode;
        if (mode === 'revealed') {
          tileMode = i < revealedCount ? 'revealed' : 'revealed';
        }
        return (
          <Tile
            key={tile.label}
            label={tile.label}
            value={tile.value}
            mode={tileMode}
            flipped={mode === 'revealed' && i < revealedCount}
          />
        );
      })}
    </div>
  );
}
