import { create } from 'zustand';
import { randomizeParams, getEntryPrice, calcPnl, nextPrice } from './lib/simulation';

const useGameStore = create((set, get) => ({
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
    const { betAmount, balance } = get();
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
    const { currentPrice, entryPrice, leverage, side, positionSize, pnlHistory, startTime } = get();
    if (!currentPrice || !entryPrice || !leverage) return;

    const newPrice = nextPrice(currentPrice, leverage);
    let pnl = calcPnl({ currentPrice: newPrice, entryPrice, leverage, side, positionSize });

    // Cap loss at position size (simulated liquidation — can't lose more than collateral)
    pnl = Math.max(pnl, -positionSize);

    const pnlPct = positionSize > 0 ? (pnl / positionSize) * 100 : 0;
    const elapsed = (Date.now() - startTime) / 1000;

    set({
      currentPrice: newPrice,
      currentPnl: pnl,
      pnlPercent: pnlPct,
      isWinning: pnl >= 0,
      elapsedTime: elapsed,
      pnlHistory: [...pnlHistory, { time: parseFloat(elapsed.toFixed(1)), value: parseFloat(pnl.toFixed(2)) }],
    });
  },

  doubleDown: () => {
    const { positionSize, originalBet, doublesCount, balance } = get();
    if (balance < originalBet) return;
    set({
      positionSize: positionSize * 2,
      doublesCount: doublesCount + 1,
      balance: balance - originalBet,
    });
  },

  closeHalf: () => {
    const { positionSize, currentPnl, realizedPnl, balance } = get();
    const halfPnl = currentPnl / 2;
    const halfPos = positionSize / 2;
    set({
      positionSize: halfPos,
      realizedPnl: realizedPnl + halfPnl,
      balance: balance + halfPos + halfPnl,
    });
  },

  closePosition: () => {
    const {
      currentPnl, realizedPnl, balance, positionSize,
      asset, leverage, side, entryPrice, currentPrice,
      elapsedTime, pnlHistory, originalBet, doublesCount, tradeHistory,
    } = get();

    const totalPnl = currentPnl + realizedPnl;
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
      balance: balance + positionSize + currentPnl,
      exitPrice: exitPx,
      currentScreen: 'results',
      tradeHistory: [trade, ...tradeHistory],
    });
  },

  spinAgain: () => {
    set({
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
    });
  },
}));

export default useGameStore;
