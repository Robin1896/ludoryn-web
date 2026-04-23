// ─────────────────────────────────────────────────────────────────────────────
// Ludoryn UI Sounds — Web Audio API synthesized ASMR-style clicks
// ─────────────────────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function resume() {
  const c = getCtx();
  if (c.state === "suspended") c.resume();
  return c;
}

// Soft tactile pop — for Button / IconButton
export function playClick() {
  const c = resume();
  const t = c.currentTime;

  // Tone
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(420, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.06);
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.09);

  // Soft noise layer for texture
  const bufSize = c.sampleRate * 0.04;
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.06;
  const src = c.createBufferSource();
  src.buffer = buf;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.12, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  src.connect(ng);
  ng.connect(c.destination);
  src.start(t);
}

// Deeper press — for mouse down on Button
export function playPress() {
  const c = resume();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(260, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.05);
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.07);
}

// Crisp tick — for Toggle / nav items
export function playTick() {
  const c = resume();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(350, t + 0.04);
  gain.gain.setValueAtTime(0.14, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

// Soft whoosh — for nav tab switch
export function playNav() {
  const c = resume();
  const t = c.currentTime;
  const bufSize = c.sampleRate * 0.07;
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1800, t);
  filter.frequency.exponentialRampToValueAtTime(600, t + 0.07);
  filter.Q.value = 1.5;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.07, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  src.start(t);
}
