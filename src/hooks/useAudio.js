import { useState, useCallback, useRef } from 'react';

/**
 * Audio hook using the Web Audio API to synthesize sound effects.
 * No audio files required — all sounds are generated procedurally.
 *
 * Handles browser autoplay policy by deferring AudioContext creation
 * until the first user gesture (click / keypress / touch).
 */
export function useAudio() {
  const [isMuted, setIsMuted] = useState(false);
  const ctxRef = useRef(null);
  const ambientRef = useRef(null);
  const ambientWantedRef = useRef(false); // track whether ambient should be playing

  /** Get or create a running AudioContext. Sets up statechange listener
   *  to rebuild ocean ambient if the context gets suspended then resumed. */
  async function getCtx() {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      try {
        ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        // Listen for state changes — rebuild ocean if context resumes from suspension
        ctxRef.current.addEventListener('statechange', () => {
          const ctx = ctxRef.current;
          if (ctx && ctx.state === 'running' && ambientWantedRef.current && !ambientRef.current) {
            buildOcean(ctx, ambientRef);
          }
        });
      } catch (e) {
        return null;
      }
    }
    if (ctxRef.current.state === 'suspended') {
      try {
        await ctxRef.current.resume();
      } catch (e) {
        return null;
      }
    }
    return ctxRef.current;
  }

  const playSound = useCallback(async (name) => {
    if (isMuted) return;
    try {
      const ctx = await getCtx();
      if (!ctx || ctx.state === 'closed') return;
      switch (name) {
        case 'sonar':   playSonar(ctx);   break;
        case 'cannon':  playCannon(ctx);  break;
        case 'hit':     playHit(ctx);     break;
        case 'miss':    playMiss(ctx);    break;
        case 'sink':    playSink(ctx);    break;
        case 'victory': playVictory(ctx); break;
        case 'defeat':  playDefeat(ctx);  break;
      }
    } catch (e) { /* silently ignore */ }
  }, [isMuted]);

  /** Start ocean waves ambient. If browser blocks autoplay, defers until first click. */
  const startAmbient = useCallback(() => {
    if (isMuted || ambientRef.current) return;
    ambientWantedRef.current = true;

    async function tryStart() {
      if (ambientRef.current) return;
      const ctx = await getCtx();
      if (!ctx || ctx.state === 'closed') return;

      if (ctx.state === 'suspended') {
        // Autoplay blocked — wait for first user gesture
        const onInteract = () => {
          ctx.resume().then(() => {
            if (ctx.state === 'running' && !ambientRef.current) {
              buildOcean(ctx, ambientRef);
            }
          });
          cleanup();
        };
        const cleanup = () => {
          document.removeEventListener('click', onInteract);
          document.removeEventListener('keydown', onInteract);
          document.removeEventListener('touchstart', onInteract);
        };
        document.addEventListener('click', onInteract, { once: true });
        document.addEventListener('keydown', onInteract, { once: true });
        document.addEventListener('touchstart', onInteract, { once: true });
        return;
      }

      buildOcean(ctx, ambientRef);
    }

    tryStart();
  }, [isMuted]);

  /** Stop ocean waves with a gentle fade-out. */
  const stopAmbient = useCallback(() => {
    ambientWantedRef.current = false;
    const amb = ambientRef.current;
    if (!amb) return;
    ambientRef.current = null;

    try {
      const ctx = ctxRef.current;
      if (ctx && ctx.state !== 'closed' && amb.masterGain) {
        amb.masterGain.gain.setValueAtTime(amb.masterGain.gain.value, ctx.currentTime);
        amb.masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        const stopTime = ctx.currentTime + 1.6;
        if (amb.nodes) {
          for (const node of amb.nodes) {
            try { node.stop(stopTime); } catch (e) { /* ok */ }
          }
        }
      }
    } catch (e) { /* silently ignore */ }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      if (newMuted) stopAmbient();
      return newMuted;
    });
  }, [stopAmbient]);

  return { playSound, isMuted, toggleMute, startAmbient, stopAmbient };
}

// ─── Ocean Ambient Builder ──────────────────────────────────────

/** Build the layered ocean waves audio graph. */
function buildOcean(ctx, ambientRef) {
  if (ambientRef.current) return;

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.1;
  masterGain.connect(ctx.destination);

  const nodes = [];

  const layers = [
    { lfoRate: 0.12, filterFreq: 300, vol: 0.5, q: 0.4 },
    { lfoRate: 0.18, filterFreq: 500, vol: 0.35, q: 0.6 },
    { lfoRate: 0.25, filterFreq: 700, vol: 0.2, q: 0.8 },
  ];

  for (const layer of layers) {
    const bufLen = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0;
    for (let i = 0; i < bufLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      data[i] = (b0 + b1 + white * 0.1) * 0.4;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = layer.filterFreq;
    filter.Q.value = layer.q;

    const layerGain = ctx.createGain();
    layerGain.gain.value = layer.vol;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = layer.lfoRate;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = layer.vol * 0.6;
    lfo.connect(lfoDepth).connect(layerGain.gain);
    lfo.start();

    noise.connect(filter).connect(layerGain).connect(masterGain);
    noise.start();

    nodes.push(noise, filter, layerGain, lfo, lfoDepth);
  }

  ambientRef.current = { nodes, masterGain };
}

// ─── Sound Synthesizers ──────────────────────────────────────────

function out(ctx, volume = 0.4) {
  const g = ctx.createGain();
  g.gain.value = volume;
  g.connect(ctx.destination);
  return g;
}

function playSonar(ctx) {
  const now = ctx.currentTime;
  const master = out(ctx, 0.25);
  function ping(t, freq, dur) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.6, t + dur * 0.05);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(env).connect(master);
    osc.start(t);
    osc.stop(t + dur);
  }
  ping(now, 1200, 0.5);
  ping(now + 0.6, 1600, 0.4);
}

function playCannon(ctx) {
  const now = ctx.currentTime;
  const master = out(ctx, 0.35);
  const bufSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const nf = ctx.createBiquadFilter();
  nf.type = 'lowpass';
  nf.frequency.value = 400;
  noise.connect(nf).connect(master);
  noise.start(now);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.8, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc.connect(env).connect(master);
  osc.start(now);
  osc.stop(now + 0.3);
}

function playHit(ctx) {
  const now = ctx.currentTime;
  const master = out(ctx, 0.35);
  const len = ctx.sampleRate * 0.5;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.12));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.exponentialRampToValueAtTime(100, now + 0.4);
  noise.connect(filter).connect(master);
  noise.start(now);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, now);
  osc.frequency.exponentialRampToValueAtTime(25, now + 0.5);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.6, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc.connect(env).connect(master);
  osc.start(now);
  osc.stop(now + 0.5);
}

function playMiss(ctx) {
  const now = ctx.currentTime;
  const master = out(ctx, 0.15);
  const len = ctx.sampleRate * 0.2;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.06));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.Q.value = 0.5;
  noise.connect(filter).connect(master);
  noise.start(now);
}

function playSink(ctx) {
  const now = ctx.currentTime;
  const master = out(ctx, 0.3);
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 1.2);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.25, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + 1.0);
  osc.connect(filter).connect(env).connect(master);
  osc.start(now);
  osc.stop(now + 1.3);
  playHit(ctx);
}

function playVictory(ctx) {
  const now = ctx.currentTime;
  const master = out(ctx, 0.2);
  [523, 659, 784, 1047].forEach((freq, i) => {
    const t = now + i * 0.18;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.5, t + 0.04);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(env).connect(master);
    osc.start(t);
    osc.stop(t + 0.65);
  });
}

function playDefeat(ctx) {
  const now = ctx.currentTime;
  const master = out(ctx, 0.2);
  [440, 370, 330, 220].forEach((freq, i) => {
    const t = now + i * 0.3;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.4, t + 0.04);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc.connect(env).connect(master);
    osc.start(t);
    osc.stop(t + 0.85);
  });
}
