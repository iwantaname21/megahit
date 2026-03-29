// Haptic feedback using the Vibration API (Android) and
// AudioContext workaround for iOS Safari (no Vibration API).
// Falls back silently on unsupported browsers.

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// iOS Safari doesn't support navigator.vibrate, but we can create
// a tiny silent oscillation that triggers the taptic engine via AudioContext.
function iosHaptic(duration = 10, strength = 0.3) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 150; // low frequency for tactile feel
    gain.gain.value = Math.min(strength, 0.5); // keep it subtle
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch (e) {
    // silently fail
  }
}

// Light tap — button press
export function hapticLight() {
  if (navigator.vibrate) {
    navigator.vibrate(8);
  } else {
    iosHaptic(8, 0.15);
  }
}

// Medium tap — slider interaction, moderate events
export function hapticMedium() {
  if (navigator.vibrate) {
    navigator.vibrate(15);
  } else {
    iosHaptic(15, 0.25);
  }
}

// Heavy tap — significant events
export function hapticHeavy() {
  if (navigator.vibrate) {
    navigator.vibrate(25);
  } else {
    iosHaptic(25, 0.4);
  }
}

// Price tick haptic — strength scales with price movement magnitude
// magnitude: 0-1 normalized value of how much the price moved
export function hapticPriceTick(magnitude) {
  const clamped = Math.min(Math.max(magnitude, 0), 1);
  if (clamped < 0.05) return; // skip tiny movements

  const duration = Math.round(5 + clamped * 20); // 5-25ms
  const strength = 0.05 + clamped * 0.4; // 0.05-0.45

  if (navigator.vibrate) {
    navigator.vibrate(duration);
  } else {
    iosHaptic(duration, strength);
  }
}

// Slider haptic — fires as user drags, subtle continuous feedback
export function hapticSlider() {
  if (navigator.vibrate) {
    navigator.vibrate(5);
  } else {
    iosHaptic(5, 0.1);
  }
}
