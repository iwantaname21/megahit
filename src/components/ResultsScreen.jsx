import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../store';
import Header from './Header';
import PnlChart from './PnlChart';
import { formatCurrency, formatPrice, formatDuration } from '../lib/simulation';
import { hapticLight } from '../lib/haptics';

const REVEAL_DELAY = 400;

function FlipTile({ label, value, revealed, delay }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (revealed) {
      const t = setTimeout(() => setFlipped(true), delay);
      return () => clearTimeout(t);
    }
  }, [revealed, delay]);

  const displayValue = label === 'LEVERAGE' ? `${value ?? ''}x` : (value ?? '');
  const textColor = label === 'SIDE' && value === 'LONG' ? '#6DD0A9' :
                    label === 'SIDE' && value === 'SHORT' ? '#FF8AA8' :
                    label === 'LEVERAGE' ? '#8befc6' : 'white';

  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="font-bold uppercase text-[13px] tracking-widest"
        style={{ color: 'rgba(19,19,20,0.6)' }}
      >
        {label}
      </span>
      <div
        className="w-full rounded-2xl flip-card"
        style={{ height: '68px' }}
      >
        <motion.div
          className="flip-card-inner w-full"
          style={{ height: '68px' }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Front: lock — oversized to prevent sliver showing */}
          <div
            className="flip-card-front glass-tile three-d-tile"
            style={{ borderRadius: '1rem', top: '-4px', bottom: '-4px', left: '-2px', right: '-2px', width: 'calc(100% + 4px)', height: 'calc(100% + 8px)' }}
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={{ color: '#7EAAD4', fontVariationSettings: "'FILL' 1" }}
            >
              lock
            </span>
          </div>
          {/* Back: revealed value — same glass-tile look as play screen */}
          <div
            className="flip-card-back glass-tile three-d-tile"
            style={{ borderRadius: '1rem' }}
          >
            <span className="font-black text-xl tracking-tight" style={{ color: textColor }}>
              {displayValue}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ResultChart({ pnlHistory }) {
  const isWin = pnlHistory.length > 0 && pnlHistory[pnlHistory.length - 1].value >= 0;

  return (
    <div className="relative">
      <PnlChart data={pnlHistory} isWinning={isWin} height={110} showMarkers />
    </div>
  );
}

export default function ResultsScreen() {
  const { balance, tradeHistory, spinAgain } = useGameStore();

  const [revealed, setRevealed] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const lastTrade = tradeHistory[0];
  // Read everything from the saved trade so nulling store state during exit animation doesn't cause issues
  const asset = lastTrade?.asset ?? 'BTC';
  const leverage = lastTrade?.leverage ?? 1000;
  const side = lastTrade?.side ?? 'LONG';
  const entryPrice = lastTrade?.entryPrice;
  const exitPrice = lastTrade?.exitPrice;
  const originalBet = lastTrade?.originalBet ?? 0;
  const doublesCount = lastTrade?.doublesCount ?? 0;
  const pnlHistory = lastTrade?.pnlHistory || [];
  const totalPnl = lastTrade?.pnl ?? 0;
  const pnlPct = lastTrade?.pnlPercent ?? 0;
  const duration = lastTrade?.duration ?? 0;
  const isWin = totalPnl >= 0;
  const color = isWin ? '#6DD0A9' : '#FF8AA8';
  const pnlStr = formatCurrency(totalPnl);
  const arrowIcon = totalPnl >= 0 ? 'north_east' : 'south_east';
  const arrowText = totalPnl >= 0 ? '+' : '-';

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(t);
  }, []);

  const handleShare = () => {
    const text = `MegaHit Trade: ${asset} ${leverage}x ${side}\n${pnlStr} (${arrowText}${Math.abs(pnlPct).toFixed(1)}%)\nDuration: ${formatDuration(duration)}\nmegahit.app`;
    navigator.clipboard.writeText(text).then(() => {
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2500);
    }).catch(() => {
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2500);
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Toast */}
      <AnimatePresence>
        {toastVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-white text-[11px] font-extrabold uppercase tracking-widest"
            style={{ background: '#6DD0A9', boxShadow: '0 4px 20px rgba(109,208,169,0.4)' }}
          >
            Copied to clipboard ✓
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 px-5 pt-0 pb-8 overflow-y-auto">
        {/* Reveal tiles */}
        <div className="grid grid-cols-3 gap-2 w-full mb-3">
          {[
            { label: 'ASSET', value: asset },
            { label: 'LEVERAGE', value: leverage },
            { label: 'SIDE', value: side },
          ].map((tile, i) => (
            <FlipTile
              key={tile.label}
              label={tile.label}
              value={tile.value}
              revealed={revealed}
              delay={i * REVEAL_DELAY}
            />
          ))}
        </div>

        {/* Results card */}
        <div
          className="liquid-glass rounded-2xl p-4 mb-3"
          style={{
            borderColor: isWin ? 'rgba(109,208,169,0.25)' : 'rgba(255,138,168,0.25)',
          }}
        >
          {/* Result badge — top, like status row in live */}
          <div className="flex justify-center mb-3">
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.5, type: 'spring', stiffness: 300, damping: 18 }}
              className="px-4 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest text-white"
              style={{
                background: isWin ? '#6DD0A9' : '#FF8AA8',
                boxShadow: `0 4px 16px ${color}50`,
              }}
            >
              {isWin ? '✚ WINNER' : '✕ LOSER'}
            </motion.span>
          </div>

          {/* Chart — below badge, above PnL number */}
          <div className="mb-3">
            <ResultChart pnlHistory={pnlHistory} />
          </div>

          {/* PnL amount — below chart */}
          <div className="flex flex-col items-center mb-3">
            <motion.h1
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.6, type: 'spring', stiffness: 250, damping: 18 }}
              className="font-extrabold tracking-tighter leading-none"
              style={{ fontSize: '3.5rem', color }}
            >
              {pnlStr}
            </motion.h1>
            <span className="text-sm font-bold mt-1 flex items-center gap-0.5" style={{ color }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'wght' 600" }}>{arrowIcon}</span>
              {Math.abs(pnlPct).toFixed(1)}%
            </span>
          </div>

          {/* Trade details */}
          <div
            className="rounded-xl px-4 py-3 grid grid-cols-3 gap-2"
            style={{ background: 'rgba(19,19,20,0.05)' }}
          >
            <div className="flex flex-col items-center justify-between pr-4" style={{ borderRight: '1px solid rgba(19,19,20,0.1)' }}>
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(19,19,20,0.48)' }}>
                Duration
              </span>
              <span className="text-[12px] font-extrabold text-[#131314] mt-1.5">
                {formatDuration(duration)}
              </span>
            </div>
            <div className="flex flex-col items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(19,19,20,0.48)' }}>
                Entry → Exit
              </span>
              <span className="text-[10px] font-extrabold text-[#131314] whitespace-nowrap mt-1.5">
                {entryPrice ? formatPrice(entryPrice, asset) : '—'} → {exitPrice ? formatPrice(exitPrice, asset) : '—'}
              </span>
            </div>
            <div className="flex flex-col items-center justify-between pl-4" style={{ borderLeft: '1px solid rgba(19,19,20,0.1)' }}>
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(19,19,20,0.48)' }}>
                Position
              </span>
              <span className="text-[12px] font-extrabold text-[#131314] mt-1.5">
                {doublesCount > 0 ? `${Math.pow(2, doublesCount)}×` : '1×'} ${originalBet?.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons — aligned with results card edges */}
        <div className="flex flex-col gap-3 w-full">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            onClick={() => { hapticLight(); spinAgain(); }}
            className="glass-btn-green w-full h-14 rounded-2xl font-extrabold text-sm tracking-widest uppercase text-white"
          >
            SPIN AGAIN
          </motion.button>
          <div className="grid grid-cols-2 gap-3 w-full">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              onClick={() => { hapticLight(); spinAgain(); }}
              className="glass-btn h-14 rounded-2xl font-extrabold text-sm tracking-widest uppercase text-[#131314]"
            >
              HOME
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              onClick={() => { hapticLight(); handleShare(); }}
              className="glass-btn h-14 rounded-2xl font-extrabold text-sm tracking-widest uppercase flex items-center justify-center gap-2 text-[#131314]"
            >
              <span className="material-symbols-outlined text-base">share</span>
              SHARE
            </motion.button>
          </div>
        </div>

        {/* Balance footer */}
        <div className="mt-5 text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(19,19,20,0.48)' }}>
            Balance
          </span>
          <span className="text-[#131314] font-black text-xl ml-2">
            ${balance.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
