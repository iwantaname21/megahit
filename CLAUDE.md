# MegaHit — Project Guide

## What is this?
MegaHit is an arcade-style leveraged trading game demo. Users spin to get a random asset/leverage/side, watch a live PnL chart, and decide when to close. No real trading — all simulated in the browser.

## Tech Stack
- **React 18 + Vite 5** — SPA, no SSR
- **Tailwind CSS 3** — utility-first styling
- **Zustand** — state management (single store at `src/store.js`)
- **Framer Motion** — screen transitions, button animations, splatters
- **Canvas API** — PnL chart (`PnlChart.jsx`) and ocean background (`OceanBackground.jsx`)
- **Deployed on Vercel** — `vercel --yes --prod --force` to deploy. Auto-deploys on `git push` to main.

## Key Architecture Decisions

### Screens
Four screens rendered via `AnimatePresence mode="popLayout"` in `App.jsx`:
1. **PlayScreen** — bet selection, presets, spin button
2. **LockingScreen** — slot machine reel animation, locks tiles
3. **TradingScreen** — live PnL chart, double/50%/close buttons
4. **ResultsScreen** — flip reveal tiles, final PnL chart, trade details

`mode="popLayout"` was chosen over `mode="wait"` because `wait` caused blank screens when transitioning after tab switches (History → Play → Spin).

### PnL Simulation
- Tick interval: **100ms** (`TICK_MS` in TradingScreen)
- `pnlHistory` is **mutated in place** (push, not spread) to avoid GC pressure
- Capped at **600 points** max to prevent memory growth
- `currentPnl` includes `realizedPnl` — it's the total PnL, not just unrealized
- Volatility formula in `simulation.js` targets ±20-30% PnL per minute at any leverage

### PnL Chart (Canvas)
- Pure `<canvas>` with `requestAnimationFrame` — no Recharts/SVG
- **Per-point interpolation**: every point has displayed x/y that lerps toward target position over the tick interval using ease-out cubic
- **Domain chase**: Y-axis bounds use exponential decay (8% per frame) to avoid choppy rescaling. Expands instantly (never clips), shrinks smoothly.
- **Offscreen canvas**: line + fill drawn on a cached offscreen canvas, then edge-faded with `destination-out` compositing, then composited onto main canvas
- `globalCompositeOperation` must be reset to `source-over` at start of each frame (the edge fade sets it to `destination-out`)
- Canvas dimensions only resize when container size changes (not every frame)
- Holographic dot: RGB hue-cycling with pulsing glow rings. Y-clamped to 22px margin so glow doesn't clip.
- Sparkles: spawn on ±3.5% PnL moves (tracked independently via `lastSparkleAt` ref)
- Right-side percentage axis labels with auto-scaling step intervals

### Double / Close Half Logic
When doubling or closing half:
1. Lock current unrealized PnL as realized
2. Reset `entryPrice` to `currentPrice`
3. Adjust `positionSize`

This prevents retroactive PnL recalculation on the changed position size. The chart stays continuous because `currentPnl = realizedPnl + unrealizedPnl`.

### Visual Design — Apple Liquid Glass
- All cards/buttons use `backdrop-filter: blur()` with transparent backgrounds
- No `saturate()` or `brightness()` modifiers (caused opaque color tints)
- Dark tiles: `rgba(15,15,16,0.7)` — dark but still glass-like
- Buttons: `.glass-btn` (frosted white), `.glass-btn-green` / `.glass-btn-red` (tinted glass), `.glass-btn-close` (clear glass)
- No 3D bottom shadows on any buttons — all flat liquid glass
- Sliding pill for presets: slides on click (spring), fades in on slider (instant position, opacity animation)
- Evening sky gradient: dark gray top → dark blue ocean bottom

### Ocean Background
- Canvas-based, throttled to **30fps**
- 4 wave layers (reduced from 7 for perf), 6px step (reduced from 2px)
- 2 sine functions per wave (reduced from 3)
- Dimensions cached — only resizes on actual window change
- Uses `100vw/100vh` CSS + `Math.max(innerWidth, screen.width)` for pinch-to-zoom stability

### Haptic Feedback
- `src/lib/haptics.js` — uses `navigator.vibrate()` (Android) and AudioContext oscillation (iOS Safari fallback)
- Light tap on all button presses
- Medium tap on double/50%
- Price tick haptic every 200ms, strength scales with PnL movement magnitude
- Slider haptic every 30ms while dragging

### Performance Notes
- `pnlHistory` mutated in place — never `[...spread]`
- `tradeHistory` capped at 20 trades
- Ocean canvas at 30fps, chart canvas at 60fps
- PnlChart domain/position interpolation uses in-place array mutation (no `new Array` per frame)
- Chart refs cleaned up on unmount to prevent memory leaks
- App container fades in after 2 rAF frames + 50ms to let `backdrop-filter` composite before showing UI

## Common Bugs & Fixes

### Blank screen after History → Play → Spin
**Cause**: `AnimatePresence mode="wait"` blocked new screen mount during exit animation. Tab switching confused framer-motion's internal state.
**Fix**: Changed to `mode="popLayout"` with 150ms enter delay.

### Null leverage display ("nullx")
**Cause**: `spinAgain` sets store values to null while exit animation still renders the old screen.
**Fix**: ResultsScreen reads all values from `tradeHistory[0]` (snapshot), not live store. TileTriplet has null guards (`value ?? ''`).

### Chart disappearing
**Cause**: `globalCompositeOperation = 'destination-out'` on offscreen canvas persisted between frames when canvas dimensions were cached (not reset by `canvas.width =`).
**Fix**: Explicitly set `oc.globalCompositeOperation = 'source-over'` at start of each frame.

### PnL chart reset to zero on closeHalf
**Cause**: `closeHalf` reset `entryPrice` to `currentPrice`, so next tick's PnL was ~0 from scratch.
**Fix**: `currentPnl` in `tick()` now computes `realizedPnl + unrealizedPnl`. The realized portion stays baked into the chart line.

### Balance draining too fast
**Cause**: At 1000x leverage, PnL could exceed position size (no liquidation). Also `doubleDown` doubled `positionSize` but PnL was retroactively recalculated from original entry.
**Fix**: PnL capped at `-positionSize`. Double/half reset entry price to current price and lock unrealized as realized.

## Build & Deploy
```bash
cd megahit
npm run build          # Vite production build
git add -A && git commit -m "..." && git push
vercel --yes --prod --force   # Force deploy to production
```

Live URL: https://megahit.vercel.app
GitHub: https://github.com/iwantaname21/megahit
