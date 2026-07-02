// ============================================================
// This file controls PAGE 2 — blowing out the candles.
// Big picture of what happens:
//   1. We read the card the person made on page 1 out of localStorage.
//   2. We draw some candles on the cake.
//   3. We turn on the microphone and watch how loud it is.
//   4. When it's loud for long enough (a "blow"), we put the
//      candles out, burst confetti, and play a little tune.
// ============================================================

// ---- 1. Load the card data — from Firestore if this is a shared link,
//         otherwise from localStorage (same-device preview) ----
const presetGradients = {
  'bg-sunset': 'linear-gradient(135deg, #FF8C69, #FF5D8F)',
  'bg-teal': 'linear-gradient(135deg, #2EC4B6, #1B9AAA)',
  'bg-gold': 'linear-gradient(135deg, #FFC145, #FF8C69)',
  'bg-plum': 'linear-gradient(135deg, #2B1B34, #5D3A7A)',
};

function applyCardData(data) {
  const name = data.name || '';
  const message = data.message || 'Hope your day is amazing!';

  document.getElementById('candleName').textContent = name;
  document.getElementById('afterName').textContent = name ? `, ${name}!` : '!';
  document.getElementById('afterText').textContent = message;

  if (data.font) {
    document.querySelectorAll('.candle-heading, .after-message h2').forEach((el) => {
      el.classList.add(data.font);
    });
  }

  if (data.bg) {
    const color = data.bg.type === 'color' ? data.bg.value : presetGradients[data.bg.value];
    if (color) {
      document.body.style.background = `radial-gradient(circle at top, ${color}, var(--plum) 120%)`;
    }
  }
}

const candleParams = new URLSearchParams(window.location.search);
const sharedId = candleParams.get('id');

if (sharedId) {
  db.collection('cards').doc(sharedId).get().then((doc) => {
    applyCardData(doc.exists ? doc.data() : {});
  }).catch((err) => {
    console.error(err);
    applyCardData({});
  });
} else {
  const saved = JSON.parse(localStorage.getItem('birthdayCard') || '{}');
  applyCardData(saved);
}

// ---- 2. Build the candles on the cake ----
const candleGroup = document.getElementById('candleGroup');
const CANDLE_COUNT = 5;
const startX = 140;
const spacing = 30;
const baseY = 150; // top of the top tier

for (let i = 0; i < CANDLE_COUNT; i++) {
  const x = startX + i * spacing;

  const stick = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  stick.setAttribute('x', x - 4);
  stick.setAttribute('y', baseY - 34);
  stick.setAttribute('width', 8);
  stick.setAttribute('height', 34);
  stick.setAttribute('rx', 2);
  stick.setAttribute('fill', i % 2 === 0 ? '#FFC145' : '#2EC4B6');
  candleGroup.appendChild(stick);

  const smoke = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  smoke.setAttribute('class', 'smoke');
  smoke.setAttribute('d', `M ${x} ${baseY - 36} q 4 -8 0 -16 q -4 -8 0 -16`);
  smoke.setAttribute('stroke', '#cfcfcf');
  smoke.setAttribute('stroke-width', '2');
  smoke.setAttribute('fill', 'none');
  smoke.setAttribute('id', `smoke-${i}`);
  candleGroup.appendChild(smoke);

  const flame = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  flame.setAttribute('class', 'flame');
  flame.setAttribute('id', `flame-${i}`);
  flame.setAttribute('d', `M ${x} ${baseY - 34} C ${x - 6} ${baseY - 44}, ${x + 6} ${baseY - 50}, ${x} ${baseY - 58} C ${x - 6} ${baseY - 50}, ${x + 6} ${baseY - 44}, ${x} ${baseY - 34} Z`);
  flame.setAttribute('fill', '#FF8C69');
  flame.style.animationDelay = `${i * 0.07}s`;
  candleGroup.appendChild(flame);
}

let candlesOut = false;

function blowOutCandles() {
  if (candlesOut) return;
  candlesOut = true;

  document.querySelectorAll('.flame').forEach((f) => f.classList.add('out'));
  document.querySelectorAll('.smoke').forEach((s) => s.classList.add('show'));

  micBtn.style.display = 'none';
  fallbackBtn.style.display = 'none';
  document.querySelector('.breath-meter-wrap').style.display = 'none';

  launchConfetti();
  playCelebrationSound();

  document.getElementById('afterMessage').classList.add('show');
}

// ---- 3. Microphone-based blow detection ----
const micBtn = document.getElementById('micBtn');
const fallbackBtn = document.getElementById('fallbackBtn');
const breathFill = document.getElementById('breathFill');

const BLOW_THRESHOLD = 32;      // how loud counts as "blowing" (0-100 scale)
const BLOW_SUSTAIN_MS = 350;    // how long it must stay loud before we trigger

let audioCtx, analyser, dataArray, rafId;
let loudSince = null;

micBtn.addEventListener('click', async () => {
  micBtn.disabled = true;
  micBtn.textContent = 'Listening… blow now!';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    listenLoop();
  } catch (err) {
    micBtn.textContent = '🎤 Enable microphone';
    micBtn.disabled = false;
    alert("We couldn't access your microphone. You can use the 'No mic?' button instead.");
  }
});

function listenLoop() {
  if (candlesOut) return;

  analyser.getByteFrequencyData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
  const average = sum / dataArray.length; // roughly 0-255
  const level = Math.min(100, Math.round((average / 90) * 100));

  breathFill.style.width = level + '%';

  if (level >= BLOW_THRESHOLD) {
    if (loudSince === null) loudSince = performance.now();
    if (performance.now() - loudSince >= BLOW_SUSTAIN_MS) {
      blowOutCandles();
      return;
    }
  } else {
    loudSince = null;
  }

  rafId = requestAnimationFrame(listenLoop);
}

// ---- Fallback for people without a mic (or who don't want to grant access) ----
fallbackBtn.addEventListener('click', () => {
  // animate the breath meter filling up so it still feels satisfying
  let level = 0;
  const fill = setInterval(() => {
    level += 8;
    breathFill.style.width = Math.min(level, 100) + '%';
    if (level >= 100) {
      clearInterval(fill);
      blowOutCandles();
    }
  }, 40);
});

// ---- 4a. Confetti (plain canvas, no libraries needed) ----
const canvas = document.getElementById('confettiCanvas');
const ctx = canvas.getContext('2d');
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function launchConfetti() {
  const colors = ['#FF5D8F', '#FFC145', '#2EC4B6', '#FF8C69', '#FFF8F0'];
  const pieces = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.5,
    size: 6 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    speedY: 2 + Math.random() * 3,
    speedX: -2 + Math.random() * 4,
    rotation: Math.random() * 360,
    spin: -6 + Math.random() * 12,
  }));

  let frame = 0;
  const maxFrames = 260;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.rotation += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    frame++;
    if (frame < maxFrames) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  draw();
}

// ---- 4b. Celebration sound, built with the Web Audio API (no sound file needed) ----
function playCelebrationSound() {
  const ctxA = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6 — a happy little run
  const now = ctxA.currentTime;

  notes.forEach((freq, i) => {
    const osc = ctxA.createOscillator();
    const gain = ctxA.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const start = now + i * 0.14;
    const end = start + 0.3;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.25, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, end);

    osc.connect(gain);
    gain.connect(ctxA.destination);
    osc.start(start);
    osc.stop(end + 0.05);
  });
}
