export const BASE_PRICES = {
  BTC: 95000,
  ETH: 3500,
  SOL: 180,
};

export const ASSETS = ['BTC', 'ETH', 'SOL'];
export const LEVERAGES = [500, 600, 700, 800, 900, 1000]; // used for spinning display only
export const SIDES = ['LONG', 'SHORT'];

export function getEntryPrice(asset) {
  const base = BASE_PRICES[asset];
  const offset = (Math.random() - 0.5) * base * 0.008;
  return base + offset;
}

export function randomizeParams() {
  return {
    asset: ASSETS[Math.floor(Math.random() * ASSETS.length)],
    leverage: Math.floor(Math.random() * 501) + 500, // 500-1000 inclusive, any integer
    side: SIDES[Math.floor(Math.random() * SIDES.length)],
  };
}

export function calcPnl({ currentPrice, entryPrice, leverage, side, positionSize }) {
  let priceDiff;
  if (side === 'LONG') {
    priceDiff = (currentPrice - entryPrice) / entryPrice;
  } else {
    priceDiff = (entryPrice - currentPrice) / entryPrice;
  }
  return priceDiff * leverage * positionSize;
}

export function nextPrice(currentPrice, leverage) {
  // Target: ±20-30% PnL per minute at any leverage.
  // 400 ticks/min => std over 1min = sqrt(400) * per-tick-std = 20 * σ.
  // PnL% = priceChange_std / price * leverage ≈ 0.25.
  // σ_tick = 0.25*price / (20*leverage). baseVol = price * 0.0125 / leverage.
  // With uniform dist: std(delta) ≈ baseVol/√3, so we use baseVol * 2 range.
  const baseVolatility = (currentPrice * 0.02165) / leverage;
  const delta = (Math.random() - 0.5) * baseVolatility * 2;
  return currentPrice + delta;
}

export function formatCurrency(val, prefix = true) {
  const abs = Math.abs(val);
  const formatted = abs < 1 ? abs.toFixed(2) : abs.toFixed(2);
  if (prefix) {
    return (val >= 0 ? '+$' : '-$') + formatted;
  }
  return '$' + formatted;
}

export function formatPrice(price, asset) {
  if (asset === 'BTC') return '$' + Math.round(price).toLocaleString();
  if (asset === 'ETH') return '$' + price.toFixed(0);
  return '$' + price.toFixed(2);
}

export function formatDuration(seconds) {
  if (seconds < 60) return seconds.toFixed(1) + 's';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}
