import { create } from 'zustand';
import { randomizeParams, getEntryPrice, calcPnl, nextPrice } from './lib/simulation';

const useGameStore = create((set, get) => ({
  // Background mode
  bgMode: 'calm', // 'calm' | 'sleepy'
  setBgMode: (mode) => set({ bgMode: mode }),
  toggleBgMode: () => set((s) => ({ bgMode: s.bgMode === 'calm' ? 'sleepy' : 'calm' })),

  // User
  balance: 705,

  // Bet
  betAmount: 50,

  // Trade params (hidden until reveal)
  asset: null,
  leverage: null,
  side: null,

  // Prices
  entryPrice: null,
  currentPrice: null,
  exitPrice: null,

  // Active trade
  positionSize: 0,
  originalBet: 0,
  doublesCount: 0,
  currentPnl: 0,
  pnlPercent: 0,
  pnlHistory: [],
  elapsedTime: 0,
  realizedPnl: 0,
  isWinning: false,
  startTime: null,

  // Navigation
  currentScreen: 'play', // 'play' | 'locking' | 'trading' | 'results'

  // Active tab on play screen
  activeTab: 'play',

  // History
  tradeHistory: [],

  // Actions
  setBetAmount: (amount) => set({ betAmount: amount }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  startSpin: () => {
    let { betAmount, balance } = get();
    // Safety: ensure bet is valid
    if (betAmount <= 0) betAmount = Math.min(50, balance);
    if (betAmount <= 0 || betAmount > balance) return;

    const params = randomizeParams();
    const entry = getEntryPrice(params.asset);

    set({
      ...params,
      entryPrice: entry,
      currentPrice: entry,
      positionSize: betAmount,
      originalBet: betAmount,
      doublesCount: 0,
      balance: balance - betAmount,
      currentPnl: 0,
      pnlPercent: 0,
      pnlHistory: [],
      elapsedTime: 0,
      realizedPnl: 0,
      isWinning: false,
      exitPrice: null,
      startTime: Date.now(),
      currentScreen: 'locking',
    });
  },

  startTrading: () => {
    set({ currentScreen: 'trading', startTime: Date.now() });
  },

  tick: () => {
    const { currentPrice, entryPrice, leverage, side, positionSize, pnlHistory, startTime, realizedPnl, originalBet } = get();
    if (!currentPrice || !entryPrice || !leverage) return;

    const newPrice = nextPrice(currentPrice, leverage);
    let unrealizedPnl = calcPnl({ currentPrice: newPrice, entryPrice, leverage, side, positionSize });

    // Cap loss at position size (simulated liquidation)
    unrealizedPnl = Math.max(unrealizedPnl, -positionSize);

    // Total PnL = realized (from doubles/half-closes) + unrealized
    const totalPnl = realizedPnl + unrealizedPnl;
    const pnlPct = originalBet > 0 ? (totalPnl / originalBet) * 100 : 0;
    const elapsed = (Date.now() - startTime) / 1000;

    // Mutate in place — no array copy. Cap at 600 points to prevent memory growth.
    pnlHistory.push({ time: parseFloat(elapsed.toFixed(1)), value: parseFloat(totalPnl.toFixed(2)) });
    if (pnlHistory.length > 600) pnlHistory.shift();

    set({
      currentPrice: newPrice,
      currentPnl: totalPnl,
      pnlPercent: pnlPct,
      isWinning: totalPnl >= 0,
      elapsedTime: elapsed,
      pnlHistory: pnlHistory,
    });
  },

  doubleDown: () => {
    const { positionSize, originalBet, doublesCount, balance, currentPnl, realizedPnl, currentPrice } = get();
    if (balance < originalBet) return;
    // currentPnl is total (realized + unrealized). Lock unrealized as realized.
    const unrealizedPnl = currentPnl - realizedPnl;
    set({
      realizedPnl: realizedPnl + unrealizedPnl,
      entryPrice: currentPrice,
      positionSize: positionSize + originalBet,
      doublesCount: doublesCount + 1,
      balance: balance - originalBet,
    });
  },

  closeHalf: () => {
    const { positionSize, currentPnl, realizedPnl, balance, currentPrice, entryPrice, leverage, side } = get();
    if (positionSize <= 0) return;
    // currentPnl is total (realized + unrealized). Compute unrealized portion only.
    const unrealizedPnl = currentPnl - realizedPnl;
    const halfUnrealized = unrealizedPnl / 2;
    const halfPos = positionSize / 2;
    // Lock half of unrealized as realized, reset entry to current price.
    set({
      realizedPnl: realizedPnl + halfUnrealized,
      entryPrice: currentPrice,
      positionSize: halfPos,
      balance: balance + halfPos + halfUnrealized,
    });
  },

  closePosition: () => {
    const {
      currentPnl, realizedPnl, balance, positionSize,
      asset, leverage, side, entryPrice, currentPrice,
      elapsedTime, pnlHistory, originalBet, doublesCount, tradeHistory,
    } = get();

    // currentPnl already includes realizedPnl
    const totalPnl = currentPnl;
    const unrealizedPnl = currentPnl - realizedPnl;
    const exitPx = currentPrice;

    const trade = {
      id: Date.now(),
      asset,
      leverage,
      side,
      entryPrice,
      exitPrice: exitPx,
      pnl: totalPnl,
      pnlPercent: originalBet > 0 ? (totalPnl / originalBet) * 100 : 0,
      duration: elapsedTime,
      originalBet,
      doublesCount,
      pnlHistory: [...pnlHistory],
    };

    set({
      // Add back remaining position collateral + unrealized PnL (realized already in balance)
      balance: balance + positionSize + unrealizedPnl,
      exitPrice: exitPx,
      currentScreen: 'results',
      tradeHistory: [trade, ...tradeHistory].slice(0, 20),
    });
  },

  spinAgain: () => {
    const { balance, betAmount } = get();
    // Clamp bet to new balance so spin button works on next screen
    const clampedBet = Math.min(betAmount, Math.max(balance, 1));
    set({
      betAmount: clampedBet,
      asset: null,
      leverage: null,
      side: null,
      entryPrice: null,
      currentPrice: null,
      exitPrice: null,
      positionSize: 0,
      originalBet: 0,
      doublesCount: 0,
      currentPnl: 0,
      pnlPercent: 0,
      pnlHistory: [],
      elapsedTime: 0,
      realizedPnl: 0,
      isWinning: false,
      currentScreen: 'play',
      activeTab: 'play',
    });
  },
}));

export default useGameStore;
