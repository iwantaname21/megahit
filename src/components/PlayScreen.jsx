import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../store';
import Header from './Header';
import TileTriplet from './TileTriplet';
import { hapticLight, hapticSlider } from '../lib/haptics';
import HistoryView from './HistoryView';

const springBounce = {
  whileHover: { scale: 1.04 },
  whileTap: { scale: 0.93 },
  transition: { type: 'spring', stiffness: 400, damping: 15 },
};

export default function PlayScreen() {
  const { balance, betAmount, setBetAmount, startSpin, activeTab, setActiveTab, tradeHistory } = useGameStore();
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const lastSliderHaptic = useRef(0);
  const handleSlider = (e) => {
    const val = parseFloat(e.target.value);
    setBetAmount(val);
    const now = Date.now();
    if (now - lastSliderHaptic.current > 30) {
      hapticSlider();
      lastSliderHaptic.current = now;
    }
  };

  const startDrag = () => setIsDragging(true);
  const endDrag = () => setIsDragging(false);

  const sliderPct = balance > 0 ? (betAmount / balance) * 100 : 0;

  const canSpin = betAmount > 0 && betAmount <= balance;

  return (
    <div className="flex flex-col min-h-screen">
      <Header showNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 px-5 pb-8 overflow-y-auto flex flex-col">
        {activeTab === 'play' ? (
          <>
            {/* Top spacer — shifted up 20% */}
            <div className="flex-[1] min-h-[12px]" />

            {/* Glass card with tiles + betting — compact */}
            <div
              className="liquid-glass rounded-2xl p-4 border mb-4 relative overflow-hidden"
              style={{ borderColor: 'rgba(255,255,255,0.3)' }}
            >
              {/* Subtle gradient accent — contained within card */}
              <div
                className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(109,208,169,0.08) 0%, transparent 70%)' }}
              />

              {/* Tiles (placeholder) */}
              <TileTriplet
                mode="placeholder"
                asset="BTC"
                leverage={1000}
                side="LONG"
              />

              {/* How it works */}
              <div className="mt-4 mb-4 flex flex-col items-center">
                <motion.button
                  className="text-[10px] font-bold uppercase tracking-widest cursor-pointer"
                  style={{ color: 'rgba(19,19,20,0.35)' }}
                  onClick={() => setShowHowItWorks((v) => !v)}
                  {...springBounce}
                >
                  How it works <span className="material-symbols-outlined text-[10px] align-middle" style={{ fontVariationSettings: "'wght' 600" }}>{showHowItWorks ? 'expand_less' : 'expand_more'}</span>
                </motion.button>
                <AnimatePresence>
                  {showHowItWorks && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden w-full"
                    >
                      <div
                        className="mt-3 rounded-xl px-4 py-3 text-[11px] leading-relaxed font-medium space-y-1.5"
                        style={{ background: 'rgba(19,19,20,0.04)', color: 'rgba(19,19,20,0.55)' }}
                      >
                        <div className="flex gap-1.5"><span className="font-bold text-[#131314]/70 shrink-0">1.</span><span>Set your bet and press spin.</span></div>
                        <div className="flex gap-1.5"><span className="font-bold text-[#131314]/70 shrink-0">2.</span><span>A random asset, leverage, and side are locked — hidden from you.</span></div>
                        <div className="flex gap-1.5"><span className="font-bold text-[#131314]/70 shrink-0">3.</span><span>Watch the live PnL. Double down or cut 50% anytime.</span></div>
                        <div className="flex gap-1.5"><span className="font-bold text-[#131314]/70 shrink-0">4.</span><span>Close when you're ready. The trade is revealed.</span></div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Balance + Bet row */}
              <div
                className="flex justify-between items-end pb-4 mb-4"
                style={{ borderBottom: '1px solid rgba(19,19,20,0.06)' }}
              >
                <div className="flex flex-col">
                  <span
                    className="font-bold uppercase text-[10px] tracking-widest mb-1"
                    style={{ color: 'rgba(19,19,20,0.5)' }}
                  >
                    BALANCE
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: '#6DD0A9' }}
                    />
                    <span className="text-[#131314] font-bold text-xl">
                      ${balance.toFixed(0)}
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col">
                  <span
                    className="font-bold uppercase text-[10px] tracking-widest mb-1"
                    style={{ color: 'rgba(19,19,20,0.5)' }}
                  >
                    BET AMOUNT
                  </span>
                  <span className="text-[#131314] font-black text-4xl tracking-tight leading-none">
                    ${betAmount.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Slider — glass track */}
              <div className="relative w-full flex items-center mb-4" style={{ height: '32px' }}>
                <div className="absolute w-full rounded-full slider-track" style={{ height: '6px' }} />
                <div className="absolute rounded-full slider-fill" style={{ height: '6px', width: `${sliderPct}%` }} />
                <input
                  type="range"
                  min={1}
                  max={balance}
                  step={1}
                  value={betAmount}
                  onChange={handleSlider}
                  onMouseDown={startDrag}
                  onMouseUp={endDrag}
                  onTouchStart={startDrag}
                  onTouchEnd={endDrag}
                  onTouchCancel={endDrag}
                  className={`bet-slider ${isDragging ? 'dragging' : ''}`}
                />
              </div>

              {/* Preset pills — darker trough with sliding pill */}
              <div className="glass-nav-dark rounded-full px-1.5 py-1.5 flex gap-1 relative">
                {/* Sliding pill background — always rendered, positioned over active preset */}
                {[10, 50, 100].includes(Math.round(betAmount)) && (() => {
                  const idx = [10, 50, 100].indexOf(Math.round(betAmount));
                  // Each button is 1/3 of container width; pill inset by 6px on each side
                  const positions = ['6px', 'calc(33.333% + 2px)', 'calc(66.666% - 2px)'];
                  return (
                    <motion.div
                      className="absolute rounded-full sliding-pill"
                      style={{
                        top: '6px',
                        bottom: '6px',
                        width: 'calc(33.333% - 6px)',
                      }}
                      animate={{ left: positions[idx] }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    />
                  );
                })()}
                {[10, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => { hapticLight(); setBetAmount(Math.min(preset, balance)); }}
                    className={`relative z-10 flex-1 py-2.5 rounded-full font-bold text-sm transition-colors duration-200 ${
                      Math.round(betAmount) === preset ? 'text-[#131314]' : 'text-[#131314]/40'
                    }`}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Spin button */}
            <div className="flex flex-col items-center pt-2 pb-6">
              <motion.button
                className="hit-orb w-24 h-24 rounded-full flex items-center justify-center text-white"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                onClick={() => { hapticLight(); startSpin(); }}
                disabled={!canSpin}
                style={{ opacity: canSpin ? 1 : 0.4, willChange: 'transform' }}
              >
                <span
                  className="material-symbols-outlined text-4xl font-bold"
                  style={{ fontVariationSettings: "'FILL' 0, 'wght' 600" }}
                >
                  add
                </span>
              </motion.button>
              <span
                className="mt-5 font-bold uppercase text-[10px] tracking-[0.2em]"
                style={{ color: 'rgba(19,19,20,0.35)' }}
              >
                Press ✚ to spin.
              </span>
            </div>

            {/* Bottom spacer */}
            <div className="flex-[4] min-h-[16px]" />
          </>
        ) : (
          <HistoryView trades={tradeHistory} />
        )}
      </div>
    </div>
  );
}
