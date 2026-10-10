/**
 * キチガイ風車 — ワンタップ脱出ゲーム。
 *
 * 矢印が回っている風車。矢印が下の自分を指した瞬間にタップして逃げる（縄跳び式）。
 * レベルで回転が速くなり、羽根が 1→4 本まで増え、時々逆回転する。
 * 空振りすると「見られている」メーターが上がり、満タンで "認識" されて終わり。
 *
 * 見た目は全部絵文字。風車は 👆👈😁👉👇 で、danger の瞬間だけ赤く光る。
 */

const DIFF = {
  easy:   { label: "易しい", spin: 150, windowDeg: 42, bladesAt: [6, 13, 21], reverse: false, ramp: 1.07, windowFloor: 26 },
  normal: { label: "普通",   spin: 190, windowDeg: 33, bladesAt: [5, 11, 18], reverse: true,  ramp: 1.09, windowFloor: 20 },
  hard:   { label: "厳しい", spin: 245, windowDeg: 27, bladesAt: [4, 9, 15],  reverse: true,  ramp: 1.11, windowFloor: 16 },
};

const BASE = {
  levelMs: 12000,
  riskPerWhiff: 0.34,
  riskDecayPerSec: 0.12,
  riskRewardOnDodge: 0.28,
  reverseMinMs: 7000,
  reverseMaxMs: 12000,
  graceMs: 1200,
};

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Noto Emoji",sans-serif';
const ARROWS = ["👆", "👉", "👇", "👈"]; // 上・右・下・左
const BEST_KEY = "kichigai-windmill:best";
const MUTE_KEY = "kichigai-windmill:muted";

const WINDMILL_ART = "   👆\n👈😁👉\n   👇";

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const rand = (a, b) => a + Math.random() * (b - a);
const rad = (deg) => (deg * Math.PI) / 180;

// ---------------------------------------------------------------------------
// 音
// ---------------------------------------------------------------------------

class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem(MUTE_KEY) === "1";
  }

  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) this.ctx = new Ctor();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  tone(freq, durMs, type, gain, slideTo) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + durMs / 1000);
    const peak = gain === undefined ? 0.06 : gain;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + durMs / 1000 + 0.02);
  }

  dodge(combo) { this.tone(520 + Math.min(combo, 12) * 30, 80, "triangle", 0.05, 900); }
  whiff() { this.tone(180, 90, "square", 0.04, 120); }
  level() { this.tone(330, 200, "sawtooth", 0.05, 660); }
  reverse() { this.tone(420, 260, "sawtooth", 0.05, 160); }
  hit() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.75);
  }
}

// ---------------------------------------------------------------------------
// ゲーム
// ---------------------------------------------------------------------------

const PHASE = { TITLE: "title", PLAYING: "playing", OVER: "over" };

function rankOf(dodges) {
  if (dodges <= 0) return "風車の餌";
  if (dodges < 5) return "見習い逃走者";
  if (dodges < 12) return "逃走者";
  if (dodges < 20) return "逃走のプロ";
  if (dodges < 32) return "風車の天敵";
  return "風車殺し";
}

class Game {
  constructor(els, sfx) {
    this.els = els;
    this.sfx = sfx;
    this.ctx = els.canvas.getContext("2d");
    this.difficulty = "normal";
    this.best = Number(localStorage.getItem(BEST_KEY) || 0);
    this.phase = PHASE.TITLE;
    this.reset(true);
  }

  reset(idle) {
    const d = DIFF[this.difficulty];
    this.t = 0;
    this.level = 1;
    this.spin = 0;
    this.dir = 1;
    this.spinSpeed = d.spin;
    this.window = d.windowDeg;
    this.bladeCount = 1;
    this.blades = [];
    this.rebuildBlades();
    this.dodges = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.risk = 0;
    this.effects = [];
    this.shake = 0;
    this.flashUntil = 0;
    this.graceUntil = 0;
    this.reverseAt = 0;
    this.deathAt = 0;
    this.overlayShown = false;
    this.hitBlade = null;
    this.face = "😁";
    this.everPlayed = false;
    if (idle) this.phase = PHASE.TITLE;
    this.updateHud();
  }

  rebuildBlades() {
    this.blades = [];
    for (let i = 0; i < this.bladeCount; i++) {
      this.blades.push({ offset: (i * 360) / this.bladeCount, resolved: false, inWin: false });
    }
    // 開始時に窓の中に羽根が居ないように角度をずらす
    let guard = 0;
    while (this.anyInWindow() && guard++ < 360) this.spin += 2;
  }

  anyInWindow() {
    for (const b of this.blades) {
      const s = this.sOf(b);
      if (s <= this.window || s >= 360 - this.window) return true;
    }
    return false;
  }

  sOf(blade) {
    const a = this.spin + blade.offset;
    return ((a - 180) % 360 + 360) % 360; // 180 = 下（自分）
  }

  setDifficulty(key) {
    this.difficulty = DIFF[key] ? key : "normal";
    this.els.difficultyNote.textContent = DIFF[this.difficulty].label;
  }

  play() {
    this.reset(false);
    this.phase = PHASE.PLAYING;
    this.everPlayed = true;
    this.sfx.unlock();
    this.setAnnounce("");
  }

  // --- 更新 ---

  update(dt) {
    const now = performance.now();
    this.shake = Math.max(0, this.shake - dt * 4);

    if (this.phase === PHASE.TITLE) {
      this.spin += dt * 40 * this.dir;
      this.updateEffects(dt);
      return;
    }

    if (this.phase === PHASE.OVER) {
      this.deathAt += dt;
      this.spin += dt * 60;
      this.updateEffects(dt);
      if (!this.overlayShown && this.deathAt > 0.85) this.showResult();
      return;
    }

    // PLAYING
    this.t += dt;
    const d = DIFF[this.difficulty];

    // レベル
    const nextLevel = 1 + Math.floor((this.t * 1000) / BASE.levelMs);
    if (nextLevel > this.level) {
      this.level = nextLevel;
      this.spinSpeed *= d.ramp;
      this.window = Math.max(d.windowFloor, this.window * 0.94);
      const wanted = 1 + d.bladesAt.filter((lv) => this.level >= lv).length;
      if (wanted > this.bladeCount) {
        this.bladeCount = Math.min(4, wanted);
        this.rebuildBlades();
        this.graceUntil = now + BASE.graceMs;
        this.sfx.level();
        this.setAnnounce(`羽根が ${this.bladeCount} 本になった`, false, 1100);
      } else {
        this.sfx.level();
        this.setAnnounce("加速", false, 800);
      }
    }

    // 逆回転
    if (d.reverse && this.level >= 3 && now > this.reverseAt) {
      this.dir *= -1;
      this.reverseAt = now + rand(BASE.reverseMinMs, BASE.reverseMaxMs);
      this.graceUntil = now + 600;
      this.sfx.reverse();
      this.setAnnounce("逆回転 キチガイ", false, 900);
      for (const b of this.blades) b.inWin = false;
    }

    this.spin += this.spinSpeed * this.dir * dt;

    // 羽根の通過判定
    for (const blade of this.blades) {
      const s = this.sOf(blade);
      const inWin = s <= this.window || s >= 360 - this.window;
      if (inWin) {
        blade.inWin = true;
      } else if (blade.inWin) {
        // 窓を抜けた
        blade.inWin = false;
        if (!blade.resolved && now > this.graceUntil && this.phase === PHASE.PLAYING) {
          this.hit(blade);
          return;
        }
        blade.resolved = false;
      }
    }

    // リスク減衰
    this.risk = clamp(this.risk - dt * BASE.riskDecayPerSec, 0, 1);
    this.updateEffects(dt);
    this.updateHud();
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.life -= dt;
      e.y -= e.vy * dt;
      if (e.life <= 0) this.effects.splice(i, 1);
    }
  }

  // --- 入力 ---

  tap() {
    if (this.phase !== PHASE.PLAYING) return;
    const now = performance.now();
    let best = null;
    let bestS = 999;
    for (const blade of this.blades) {
      const s = this.sOf(blade);
      const inWin = s <= this.window || s >= 360 - this.window;
      if (inWin && !blade.resolved) {
        const near = Math.min(s, 360 - s);
        if (near < bestS) { bestS = near; best = blade; }
      }
    }
    if (best) {
      best.resolved = true;
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.dodges += 1;
      this.risk = clamp(this.risk - BASE.riskRewardOnDodge, 0, 1);
      this.sfx.dodge(this.combo);
      this.pop("逃げ", this.els.canvas.clientWidth / 2, window.innerHeight * 0.74, "#d98fae", 26);
      this.updateHud();
    } else {
      this.whiff();
    }
  }

  whiff() {
    if (this.phase !== PHASE.PLAYING) return;
    this.combo = 0;
    this.risk = clamp(this.risk + BASE.riskPerWhiff, 0, 1);
    this.face = "😨";
    setTimeout(() => { if (this.phase === PHASE.PLAYING) this.face = "😁"; }, 260);
    this.sfx.whiff();
    this.pop("👀", this.els.canvas.clientWidth / 2 + rand(-60, 60), window.innerHeight * 0.6, "#e6e6ea", 24);
    this.updateHud();
    if (this.risk >= 1) this.gameOver("recognized");
  }

  hit(blade) {
    this.hitBlade = blade;
    this.setAnnounce('まずい "認識" された', true, 1400);
    this.gameOver("hit");
  }

  gameOver(reason) {
    this.phase = PHASE.OVER;
    this.deathAt = 0;
    this.overlayShown = false;
    this.shake = 1;
    this.flashUntil = performance.now() + 220;
    this.sfx.hit();
    const hit = this.hitBlade ? this.sOf(this.hitBlade) : 0;
    this.hitX = this.cx() + Math.sin(rad(hit + 180)) * this.R();
    this.hitY = this.cy() - Math.cos(rad(hit + 180)) * this.R();
    this.resultReason = reason;
  }

  showResult() {
    this.overlayShown = true;
    const value = this.dodges;
    const isNew = value > this.best;
    if (isNew) {
      this.best = value;
      localStorage.setItem(BEST_KEY, String(this.best));
    }
    this.els.resultDodges.textContent = String(value);
    this.els.resultCombo.textContent = String(this.maxCombo);
    this.els.resultTime.textContent = this.t.toFixed(1);
    this.els.resultBest.textContent = String(this.best);
    this.els.resultRank.textContent = rankOf(value);
    this.els.resultNew.hidden = !isNew;
    this.els.best.textContent = String(this.best);
    this.els.resultOverlay.classList.remove("hidden");
  }

  pop(text, x, y, color, size) {
    this.effects.push({ text, x, y, vy: 60, life: 0.8, maxLife: 0.8, color, size: size || 22 });
  }

  setAnnounce(text, danger, ms) {
    const el = this.els.announce;
    el.textContent = text || "";
    el.classList.toggle("is-on", !!text);
    el.classList.toggle("is-danger", !!danger);
    if (this._announceTimer) clearTimeout(this._announceTimer);
    if (text && ms) {
      this._announceTimer = setTimeout(() => {
        if (el.textContent === text) { el.textContent = ""; el.classList.remove("is-on", "is-danger"); }
      }, ms);
    }
  }

  updateHud() {
    this.els.hudDodges.textContent = String(this.dodges);
    this.els.hudCombo.textContent = this.combo > 0 ? "×" + this.combo : "0";
    this.els.hudTime.textContent = this.t.toFixed(1);
  }

  // --- 幾何 ---

  cx() { return window.innerWidth / 2; }
  cy() { return window.innerHeight * 0.42; }
  R() { return Math.min(window.innerWidth * 0.36, window.innerHeight * 0.32); }

  // --- 描画 ---

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.els.canvas.width = Math.round(window.innerWidth * dpr);
    this.els.canvas.height = Math.round(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._dpr = dpr;
  }

  glyph(ch, x, y, size, alpha) {
    const ctx = this.ctx;
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.font = `${size}px ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ch, x, y);
    ctx.restore();
  }

  draw() {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.save();
    if (this.shake > 0) {
      const amp = this.shake * 12;
      ctx.translate(rand(-amp, amp), rand(-amp, amp));
    }

    // 背景
    const bg = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, Math.max(w, h) * 0.8);
    bg.addColorStop(0, "#191322");
    bg.addColorStop(1, "#0b0910");
    ctx.fillStyle = bg;
    ctx.fillRect(-40, -40, w + 80, h + 80);

    const cx = this.cx();
    const cy = this.cy();
    const R = this.R();

    this.drawGround(ctx, cx, cy, R);
    if (this.phase !== PHASE.TITLE) this.drawRiskRing(ctx, cx, cy, R);
    this.drawWindmill(ctx, cx, cy, R);
    this.drawComboPanic(ctx, w);
    this.drawEffects(ctx);

    ctx.restore();

    if (this.phase === PHASE.OVER && performance.now() < this.flashUntil) {
      ctx.save();
      ctx.globalCompositeOperation = "difference";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  drawGround(ctx, cx, cy, R) {
    const win = this.phase === PHASE.TITLE ? 28 : this.window;
    // 危険ゾーン（下の弧）
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, rad(180 - win - 90), rad(180 + win - 90));
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(184,69,47,0.35)";
    ctx.stroke();
    ctx.restore();

    // 自分
    const y = cy + R;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, y, R * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.restore();
    this.glyph(this.phase === PHASE.OVER ? "😱" : "🙂", cx, y, R * 0.34);
  }

  drawRiskRing(ctx, cx, cy, R) {
    const r = R * 1.18;
    ctx.save();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    if (this.risk > 0.001) {
      ctx.strokeStyle = this.risk > 0.7 ? "#b8452f" : "#d98fae";
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.risk);
      ctx.stroke();
    }
    ctx.restore();

    // 見られている警告
    if (this.risk > 0.55 && this.phase === PHASE.PLAYING) {
      this.glyph("👀", cx + r, cy - r * 0.7, 26, 0.6 + 0.4 * Math.sin(performance.now() / 120));
    }
  }

  drawWindmill(ctx, cx, cy, R) {
    const title = this.phase === PHASE.TITLE;
    const count = title ? 4 : this.bladeCount;
    const offsets = title ? [0, 90, 180, 270] : this.blades.map((b) => b.offset);
    const win = title ? 28 : this.window;

    // 羽根
    for (let i = 0; i < offsets.length; i++) {
      const a = this.spin + offsets[i];
      const px = cx + Math.sin(rad(a)) * R;
      const py = cy - Math.cos(rad(a)) * R;
      const s = ((a - 180) % 360 + 360) % 360;
      const active = title || (s <= win || s >= 360 - win);
      const bucket = ((Math.round(a / 90) % 4) + 4) % 4;
      const ch = ARROWS[bucket];
      if (active && !title) {
        const g = 0.5 + 0.5 * Math.sin(performance.now() / 70);
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, R * 0.24, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(184,69,47,${0.25 + 0.35 * g})`;
        ctx.fill();
        ctx.restore();
      }
      this.glyph(ch, px, py, R * 0.44, active || title ? 1 : 0.5);
    }

    // 中心の顔
    const face = title ? "😁" : (this.phase === PHASE.OVER ? "😵" : this.face);
    this.glyph(face, cx, cy, R * 0.78);
  }

  drawComboPanic(ctx, w) {
    if (this.phase !== PHASE.PLAYING || this.combo < 3) return;
    const n = clamp(1 + Math.floor(this.combo / 4), 1, 8);
    ctx.save();
    ctx.font = `700 ${clamp(w * 0.05, 18, 40)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(230,230,234,0.9)";
    ctx.fillText("逃げろ".repeat(n) + "！", w / 2, 52);
    ctx.restore();
  }

  drawEffects(ctx) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const e of this.effects) {
      const a = clamp(e.life / e.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = e.color;
      ctx.font = `700 ${e.size}px system-ui, sans-serif`;
      ctx.fillText(e.text, e.x, e.y);
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// 起動
// ---------------------------------------------------------------------------

const els = {
  canvas: document.getElementById("game"),
  hudDodges: document.getElementById("hud-dodges"),
  hudCombo: document.getElementById("hud-combo"),
  hudTime: document.getElementById("hud-time"),
  announce: document.getElementById("announce"),
  hint: document.getElementById("hint"),
  titleOverlay: document.getElementById("title"),
  best: document.getElementById("best"),
  titleStatus: document.getElementById("title-status"),
  startBtn: document.getElementById("start"),
  difficultyNote: document.getElementById("difficulty-note"),
  diffBtns: Array.from(document.querySelectorAll(".diff-btn")),
  muteBtn: document.getElementById("mute"),
  resultOverlay: document.getElementById("result"),
  resultDodges: document.getElementById("result-dodges"),
  resultCombo: document.getElementById("result-combo"),
  resultTime: document.getElementById("result-time"),
  resultBest: document.getElementById("result-best"),
  resultRank: document.getElementById("result-rank"),
  resultNew: document.getElementById("result-new"),
  shareBtn: document.getElementById("share"),
  retryBtn: document.getElementById("retry"),
  backTitleBtn: document.getElementById("back-title"),
};

const sfx = new Sfx();
const game = new Game(els, sfx);

function setHint(text, alert) {
  els.hint.textContent = text || "";
  els.hint.classList.toggle("is-alert", !!alert);
}

function showTitle() {
  els.titleOverlay.classList.remove("hidden");
  els.best.textContent = String(game.best);
}

function hideTitle() {
  els.titleOverlay.classList.add("hidden");
}

function startGame() {
  game.play();
  hideTitle();
  els.resultOverlay.classList.add("hidden");
  setHint("");
}

function backToTitle() {
  game.reset(true);
  els.resultOverlay.classList.add("hidden");
  game.setAnnounce("");
  showTitle();
  setHint("");
}

function share() {
  const text = `キチガイ風車から ${game.dodges} 回逃げた（最大コンボ ${game.maxCombo}・生存 ${game.t.toFixed(1)} 秒・${rankOf(game.dodges)}）`;
  const url = location.href;
  const done = () => setHint("結果をコピーしました。貼り付けて自慢してください。", false);
  if (navigator.share) {
    navigator.share({ text, url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text + " " + url).then(done).catch(() => {});
  }
}

// --- 入力 ---

function onTap() {
  sfx.unlock();
  game.tap();
}

function bind() {
  els.startBtn.addEventListener("click", startGame);
  els.retryBtn.addEventListener("click", startGame);
  els.backTitleBtn.addEventListener("click", backToTitle);
  els.shareBtn.addEventListener("click", share);

  els.diffBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      els.diffBtns.forEach((b) => b.classList.toggle("active", b === btn));
      game.setDifficulty(btn.dataset.difficulty);
      if (game.phase === PHASE.TITLE) game.reset(true);
    });
  });

  els.muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    sfx.muted = !sfx.muted;
    localStorage.setItem(MUTE_KEY, sfx.muted ? "1" : "0");
    els.muteBtn.classList.toggle("muted", sfx.muted);
  });

  window.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button, a")) return; // UI 操作は逃げ判定にしない
    onTap();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Spacebar" || e.key === "Enter") {
      e.preventDefault();
      onTap();
    } else if (e.key === "Escape") {
      if (game.phase === PHASE.PLAYING) backToTitle();
    }
  });

  window.addEventListener("resize", () => game.resize());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.phase === PHASE.PLAYING) backToTitle();
  });
}

// --- ループ ---

let last = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.min(dt, 0.05);
  game.update(dt);
  game.draw();
}

function init() {
  game.resize();
  game.setDifficulty("normal");
  game.reset(true);
  els.muteBtn.classList.toggle("muted", sfx.muted);
  bind();
  showTitle();
  requestAnimationFrame(loop);
}

init();
