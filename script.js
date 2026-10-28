// ===== Mahir Bahasa Arab — Game Logic =====

const STORAGE_KEY = "mahir-arab-highscores-v1";
const CATEGORY_KEYS = Object.keys(QUESTION_BANK);

// ---------- Sound (Web Audio, synthesized — no audio files needed) ----------
const SoundFX = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, start, duration, type = "sine", peakGain = 0.22) {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + start);
    gain.gain.setValueAtTime(0, ac.currentTime + start);
    gain.gain.linearRampToValueAtTime(peakGain, ac.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(ac.currentTime + start);
    osc.stop(ac.currentTime + start + duration + 0.05);
  }

  return {
    setEnabled(v) { enabled = v; },
    isEnabled() { return enabled; },
    correct() {
      if (!enabled) return;
      tone(523.25, 0, 0.12, "triangle");     // C5
      tone(659.25, 0.1, 0.12, "triangle");   // E5
      tone(783.99, 0.2, 0.22, "triangle");   // G5
    },
    wrong() {
      if (!enabled) return;
      tone(220, 0, 0.18, "sawtooth", 0.15);
      tone(164.81, 0.12, 0.26, "sawtooth", 0.15);
    },
    click() {
      if (!enabled) return;
      tone(440, 0, 0.06, "square", 0.08);
    },
    finishGood() {
      if (!enabled) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.12, 0.25, "triangle"));
    },
    finishMeh() {
      if (!enabled) return;
      tone(392, 0, 0.3, "sine", 0.18);
    },
  };
})();

// ---------- High scores ----------
function loadScores() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveScore(catKey, score) {
  const scores = loadScores();
  if (!scores[catKey] || score > scores[catKey]) scores[catKey] = score;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  return scores[catKey];
}
function getBest(catKey) { return loadScores()[catKey] || 0; }

// ---------- Confetti ----------
const Confetti = (() => {
  const canvas = document.getElementById("confetti-canvas");
  const ctx = canvas.getContext("2d");
  let particles = [];
  let running = false;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  const colors = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6C63FF", "#8d7bff", "#2ecc71"];

  function burst(count = 90) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.3,
        vx: (Math.random() - 0.5) * 9,
        vy: Math.random() * -9 - 3,
        size: Math.random() * 7 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 12,
        life: 0,
      });
    }
    if (!running) { running = true; loop(); }
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.vy += 0.22;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    particles = particles.filter(p => p.y < canvas.height + 50 && p.life < 240);
    if (particles.length > 0) {
      requestAnimationFrame(loop);
    } else {
      running = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  return { burst };
})();

// ---------- Screen management ----------
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.dataset.active = (s.id === id) ? "true" : "false");
}

// ---------- Shuffle helper ----------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Game state ----------
let game = null;

function buildQuestionQueue(catKeys) {
  let pool = [];
  catKeys.forEach(ck => {
    QUESTION_BANK[ck].questions.forEach(q => pool.push({ ...q, cat: ck }));
  });
  return shuffle(pool);
}

function startGame(catKeys, label) {
  const queue = buildQuestionQueue(catKeys);
  game = {
    catKeys,
    label,
    queue,
    index: 0,
    score: 0,
    correctCount: 0,
    lives: 3,
    locked: false,
  };
  showScreen("screen-game");
  renderHearts();
  updateProgress();
  renderQuestion();
}

function renderHearts() {
  const el = document.getElementById("hearts");
  el.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const span = document.createElement("span");
    span.textContent = "❤️";
    if (i >= game.lives) span.classList.add("heart-lost");
    el.appendChild(span);
  }
}

function updateProgress() {
  const pct = Math.min(100, (game.index / game.queue.length) * 100);
  document.getElementById("progress-fill").style.width = pct + "%";
  document.getElementById("score-value").textContent = game.score;
}

function renderQuestion() {
  if (game.index >= game.queue.length || game.lives <= 0) {
    return endGame();
  }
  game.locked = false;
  const item = game.queue[game.index];
  const catInfo = QUESTION_BANK[item.cat];

  const chip = document.getElementById("category-chip");
  chip.textContent = `${catInfo.emoji} ${catInfo.title}`;
  chip.style.background = catInfo.color;

  document.getElementById("arabic-word").textContent = item.ar;
  document.getElementById("question-text").textContent = item.q;

  const optionsGrid = document.getElementById("options-grid");
  optionsGrid.innerHTML = "";

  const letters = ["A", "B", "C", "D"];
  const order = item.options.map((text, i) => ({ text, isCorrect: i === item.answer }));
  const shuffled = shuffle(order);

  shuffled.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.dataset.correct = opt.isCorrect ? "true" : "false";
    btn.innerHTML = `<span class="opt-letter">${letters[i]}</span>${opt.text}`;
    btn.addEventListener("click", () => handleAnswer(btn, opt.isCorrect, optionsGrid));
    optionsGrid.appendChild(btn);
  });

  updateProgress();
}

function handleAnswer(btn, isCorrect, grid) {
  if (game.locked) return;
  game.locked = true;
  SoundFX.click();

  const allBtns = Array.from(grid.children);
  allBtns.forEach(b => b.disabled = true);

  if (isCorrect) {
    btn.classList.add("correct");
    allBtns.forEach(b => { if (b !== btn) b.classList.add("dim"); });
    game.score += 10;
    game.correctCount += 1;
    SoundFX.correct();
    showFeedback("Benar! 🎉", "correct");
  } else {
    btn.classList.add("wrong");
    const correctBtn = allBtns.find(b => b.dataset.correct === "true");
    allBtns.forEach(b => {
      if (b === btn || b === correctBtn) return;
      b.classList.add("dim");
    });
    if (correctBtn) correctBtn.classList.add("correct");
    game.lives -= 1;
    SoundFX.wrong();
    showFeedback("Kurang tepat, coba lagi ya 💪", "wrong");
    renderHearts();
  }

  setTimeout(() => {
    game.index += 1;
    renderQuestion();
  }, 1100);
}

function showFeedback(text, cls) {
  const banner = document.getElementById("feedback-banner");
  const textEl = document.getElementById("feedback-text");
  textEl.textContent = text;
  banner.className = "feedback-banner show " + cls;
  setTimeout(() => { banner.className = "feedback-banner " + cls; }, 950);
}

function endGame() {
  const total = game.queue.length === 0 ? 1 : Math.min(game.index, game.queue.length);
  const pct = game.correctCount / (total || 1);

  // Save high score (per combined category key)
  const comboKey = game.catKeys.slice().sort().join("+");
  const best = saveScore(comboKey, game.score);

  document.getElementById("stat-correct").textContent = `${game.correctCount}/${total}`;
  document.getElementById("stat-score").textContent = game.score;
  document.getElementById("stat-best").textContent = best;

  const starsEl = document.getElementById("result-stars");
  const starSpans = starsEl.querySelectorAll("span");
  let starCount = 1;
  if (game.lives <= 0) starCount = 0;
  else if (pct >= 0.9) starCount = 3;
  else if (pct >= 0.6) starCount = 2;
  starSpans.forEach((s, i) => s.classList.toggle("lit", i < starCount));

  const titleEl = document.getElementById("result-title");
  const subEl = document.getElementById("result-sub");
  const emojiEl = document.getElementById("result-emoji");

  if (game.lives <= 0) {
    titleEl.textContent = "Nyawa Habis!";
    subEl.textContent = `Kamu menjawab ${game.correctCount} dari ${total} soal. Yuk coba lagi!`;
    emojiEl.textContent = "💔";
    SoundFX.finishMeh();
  } else if (starCount === 3) {
    titleEl.textContent = "Luar Biasa!";
    subEl.textContent = `Sempurna! ${game.correctCount}/${total} benar pada materi ${game.label}.`;
    emojiEl.textContent = "🏆";
    SoundFX.finishGood();
    Confetti.burst(140);
  } else if (starCount === 2) {
    titleEl.textContent = "Kerja Bagus!";
    subEl.textContent = `${game.correctCount}/${total} benar pada materi ${game.label}. Sedikit lagi sempurna!`;
    emojiEl.textContent = "🎉";
    SoundFX.finishGood();
    Confetti.burst(70);
  } else {
    titleEl.textContent = "Terus Berlatih!";
    subEl.textContent = `${game.correctCount}/${total} benar pada materi ${game.label}. Kamu pasti bisa lebih baik!`;
    emojiEl.textContent = "📚";
    SoundFX.finishMeh();
  }

  showScreen("screen-result");
  renderHome(); // refresh best-score chips in background
}

// ---------- Home screen rendering ----------
function renderHome() {
  const grid = document.getElementById("category-grid");
  grid.innerHTML = "";
  CATEGORY_KEYS.forEach(key => {
    const cat = QUESTION_BANK[key];
    const best = getBest(key);
    const card = document.createElement("div");
    card.className = "cat-card";
    card.style.setProperty("--cat-color", cat.color);
    card.innerHTML = `
      <div class="cat-stripe"></div>
      <span class="cat-emoji">${cat.emoji}</span>
      <div class="cat-ar">${cat.title.split(" (")[1]?.replace(")", "") || ""}</div>
      <div class="cat-title">${cat.title.split(" (")[0]}</div>
      <div class="cat-sub">${cat.subtitle} · ${cat.questions.length} soal</div>
      ${best ? `<div class="cat-best">🏅 Rekor: ${best}</div>` : ""}
    `;
    card.addEventListener("click", () => {
      SoundFX.click();
      startGame([key], cat.subtitle);
    });
    grid.appendChild(card);
  });
}

// ---------- Init ----------
function init() {
  renderHome();

  document.getElementById("btn-mix").addEventListener("click", () => {
    SoundFX.click();
    startGame(CATEGORY_KEYS, "Campuran");
  });
  document.getElementById("btn-quit").addEventListener("click", () => {
    SoundFX.click();
    showScreen("screen-home");
    renderHome();
  });
  document.getElementById("btn-retry").addEventListener("click", () => {
    SoundFX.click();
    startGame(game.catKeys, game.label);
  });
  document.getElementById("btn-home").addEventListener("click", () => {
    SoundFX.click();
    showScreen("screen-home");
    renderHome();
  });

  const soundToggle = document.getElementById("sound-toggle");
  soundToggle.addEventListener("click", () => {
    const next = !SoundFX.isEnabled();
    SoundFX.setEnabled(next);
    soundToggle.textContent = next ? "🔊" : "🔇";
    if (next) SoundFX.click();
  });
}

document.addEventListener("DOMContentLoaded", init);
