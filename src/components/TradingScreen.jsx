import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../store';
import Header from './Header';
import PnlCard from './PnlCard';
import { formatCurrency } from '../lib/simulation';
import { hapticLight, hapticMedium, hapticPriceTick } from '../lib/haptics';

const TICK_MS = 100;
const MILESTONE_STEP = 3.5; // triggers more frequently (~30% easier to activate)

// Liquid glass bubble — circular, transparent, frosted, with refraction highlights
function GlassBubble({ index, positive }) {
  const tint = positive ? 'rgba(109,208,169,' : 'rgba(255,77,106,';
  const borderTint = positive ? 'rgba(139,239,198,' : 'rgba(255,138,168,';

  const left = -5 + Math.random() * 110;
  const top = 5 + Math.random() * 90;
  const size = 30 + Math.random() * 80;
  const delay = Math.random() * 0.25;

  return (
    <motion.div
      className="absolute pointer-events-none rounded-full"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: size,
        height: size,
        background: `${tint}0.12)`,
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        border: `1px solid ${borderTint}0.3)`,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.4),
          inset 0 -1px 0 ${tint}0.1),
          0 4px 16px ${tint}0.15),
          0 0 1px rgba(255,255,255,0.3)
        `,
      }}
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{
        opacity: [0, 0.35, 0.2, 0],
        scale: [0.3, 1.02, 0.98, 0.9],
      }}
      transition={{
        duration: 1.4,
        delay: delay * 1.5,
        ease: 'easeOut',
      }}
    />
  );
}

// Radial gradient flash
function MilestoneFlash({ positive }) {
  const color = positive ? '109,208,169' : '255,77,106';
  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        background: `radial-gradient(circle at 50% 40%, rgba(${color},0.15), rgba(${color},0.05) 50%, transparent 80%)`,
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.8, ease: 'easeOut' }}
    />
  );
}

// Pulsing border ring
function MilestoneBorderPulse({ positive }) {
  const color = positive ? 'rgba(109,208,169,0.5)' : 'rgba(255,77,106,0.5)';
  return (
    <motion.div
      className="absolute inset-0 rounded-2xl pointer-events-none z-30"
      style={{ border: `2px solid ${color}` }}
      initial={{ opacity: 1, scale: 1 }}
      animate={{ opacity: 0, scale: 1.03 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    />
  );
}

export default function TradingScreen() {
  const {
    balance, positionSize, realizedPnl,
    currentPnl, pnlPercent, pnlHistory, isWinning, elapsedTime,
    originalBet,
    tick, doubleDown, closeHalf, closePosition,
  } = useGameStore();

  const intervalRef = useRef(null);
  const lastUpMilestone = useRef(0);
  const lastDownMilestone = useRef(0);

  const [milestoneFlash, setMilestoneFlash] = useState(null);
  const [milestoneFlashKey, setMilestoneFlashKey] = useState(0);
  const [milestoneShake, setMilestoneShake] = useState(null);
  const [splatters, setSplatters] = useState(null);
  const [splattersKey, setSplattersKey] = useState(0);
  const milestoneTimeoutRef = useRef(null);

  const [cardFlash, setCardFlash] = useState(null);
  const cardFlashTimeoutRef = useRef(null);
  const prevPnlRef = useRef(0);
  const lastHapticTickRef = useRef(0);

  useEffect(() => {
    intervalRef.current = setInterval(tick, TICK_MS);
    return () => clearInterval(intervalRef.current);
  }, [tick]);

  // Price tick haptic — every 200ms, strength based on PnL change magnitude
  useEffect(() => {
    const now = Date.now();
    if (now - lastHapticTickRef.current < 200) return;
    lastHapticTickRef.current = now;

    const delta = Math.abs(currentPnl - prevPnlRef.current);
    prevPnlRef.current = currentPnl;
    if (originalBet > 0 && delta > 0) {
      const magnitude = Math.min(delta / originalBet, 1); // normalize to 0-1
      hapticPriceTick(magnitude);
    }
  }, [currentPnl, originalBet]);

  useEffect(() => {
    if (originalBet <= 0) return;

    if (pnlPercent > 0) {
      const upM = Math.floor(pnlPercent / MILESTONE_STEP);
      if (upM > lastUpMilestone.current && upM >= 1) {
        lastUpMilestone.current = upM;
        fireMilestone(true);
      }
    }

    if (pnlPercent < 0) {
      const downM = Math.floor(Math.abs(pnlPercent) / MILESTONE_STEP);
      if (downM > lastDownMilestone.current && downM >= 1) {
        lastDownMilestone.current = downM;
        fireMilestone(false);
      }
    }
  }, [pnlPercent, originalBet]);

  const fireMilestone = useCallback((positive) => {
    setMilestoneFlash({ positive });
    setMilestoneFlashKey((k) => k + 1);
    setMilestoneShake(positive ? 'up' : 'down');
    setSplatters({ positive });
    setSplattersKey((k) => k + 1);

    if (milestoneTimeoutRef.current) clearTimeout(milestoneTimeoutRef.current);
    milestoneTimeoutRef.current = setTimeout(() => {
      setMilestoneFlash(null);
      setMilestoneShake(null);
      setSplatters(null);
    }, 1000);
  }, []);

  const triggerCardFlash = useCallback((c) => {
    setCardFlash(c);
    if (cardFlashTimeoutRef.current) clearTimeout(cardFlashTimeoutRef.current);
    cardFlashTimeoutRef.current = setTimeout(() => setCardFlash(null), 600);
  }, []);

  const handleDouble = useCallback(() => {
    hapticMedium();
    doubleDown();
    triggerCardFlash('green');
  }, [doubleDown, triggerCardFlash]);

  const handleHalf = useCallback(() => {
    hapticMedium();
    closeHalf();
    triggerCardFlash('red');
  }, [closeHalf, triggerCardFlash]);

  const handleClose = useCallback(() => {
    hapticLight();
    closePosition();
  }, [closePosition]);

  const canDouble = balance >= originalBet && originalBet > 0;
  const color = isWinning ? '#6DD0A9' : '#FF8AA8';
  const pnlStr = formatCurrency(currentPnl);

  const shakeAnim = useMemo(() => {
    if (milestoneShake === 'up')
      return {
        x: [0, -1, 1.2, -0.7, 0.4, 0],
        y: [0, -0.8, 0.5, -0.2, 0],
        transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
      };
    if (milestoneShake === 'down')
      return {
        x: [0, -1.5, 1.8, -1, 0.6, -0.3, 0],
        y: [0, 1, -0.5, 0.2, 0],
        transition: { duration: 0.9, ease: [0.25, 0.1, 0.25, 1] },
      };
    return {};
  }, [milestoneShake]);

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Milestone flash */}
      <AnimatePresence>
        {milestoneFlash && (
          <MilestoneFlash
            key={`mflash-${milestoneFlashKey}`}
            positive={milestoneFlash.positive}
          />
        )}
      </AnimatePresence>

      {/* Paint splatters only — no film grain, no confetti */}
      <AnimatePresence>
        {splatters && (
          <div key={`sp-${splattersKey}`} className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
            {Array.from({ length: 14 }).map((_, i) => (
              <GlassBubble key={`s-${i}`} index={i} positive={splatters.positive} />
            ))}
          </div>
        )}
      </AnimatePresence>

      <Header />

      <motion.div
        className="flex-1 px-5 pt-2 pb-8 overflow-y-auto"
        animate={milestoneShake ? shakeAnim : {}}
      >
        {/* Locked tiles */}
        <div className="grid grid-cols-3 gap-3 w-full mb-5">
          {['ASSET', 'LEVERAGE', 'SIDE'].map((label) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <span
                className="font-bold uppercase text-[13px] tracking-widest"
                style={{ color: 'rgba(19,19,20,0.5)' }}
              >
                {label}
              </span>
              <div
                className="glass-tile three-d-tile w-full rounded-2xl flex items-center justify-center"
                style={{ height: '72px' }}
              >
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{ color: '#7EAAD4', fontVariationSettings: "'FILL' 1" }}
                >
                  lock
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* PnL Card */}
        <div className="mb-4 relative">
          <AnimatePresence>
            {milestoneFlash && (
              <MilestoneBorderPulse
                key={`mbp-${milestoneFlashKey}`}
                positive={milestoneFlash.positive}
              />
            )}
          </AnimatePresence>
          <PnlCard
            currentPnl={currentPnl}
            pnlPercent={pnlPercent}
            pnlHistory={pnlHistory}
            isWinning={isWinning}
            elapsedTime={elapsedTime}
            balance={balance}
            milestone={milestoneShake ? (milestoneShake === 'up') : null}
            positionSize={positionSize}
            realizedPnl={realizedPnl}
            cardFlash={cardFlash}
          />
        </div>

        {/* Action buttons — aligned with PnL card edges */}
        <div className="flex flex-col gap-3 w-full">
          <div className="grid grid-cols-2 gap-3 w-full">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              onClick={handleDouble}
              disabled={!canDouble}
              className={`glass-btn-green h-14 rounded-2xl flex items-center justify-center gap-2 font-extrabold text-sm tracking-widest uppercase text-white ${!canDouble ? 'opacity-40' : ''}`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                add
              </span>
              Double
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              onClick={handleHalf}
              className="glass-btn-red h-14 rounded-2xl flex items-center justify-center font-extrabold text-sm tracking-widest uppercase text-white"
            >
              50%
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            onClick={handleClose}
            className="glass-btn-close w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-extrabold text-sm tracking-[0.15em] uppercase"
          >
            <span className="text-[#131314]">✕ CLOSE</span>
            <span style={{ color }}>{pnlStr}</span>
          </motion.button>
        </div>

        <p
          className="text-center mt-5 text-[11px] font-bold uppercase tracking-widest"
          style={{ color: 'rgba(19,19,20,0.3)' }}
        >
          or screenshot to close
        </p>
      </motion.div>
    </div>
  );
}
