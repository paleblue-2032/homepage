/**
 * キチガイ風車 — ゲーム本体。
 *
 * 「見られる／"認識"される」をコアループにした、視線（またはマウス）で遊ぶゲーム。
 * 風車はこちらの視線を追ってくる。視線を風車に重ねたままにすると「認識」され、
 * 短い猶予のうちに視線を外して逃げる。逃げ切れなければ終わり。
 *
 * 入力は gaze.js が出す「今どこを見ているか（正規化 [0,1]）」だけを消費する。
 * カメラが無い環境でも同じゲームがマウスで動く（入力源を差し替えるだけ）。
 */

import { GazeTracker } from "./gaze.js";

// ---------------------------------------------------------------------------
// 調整パラメータ（難易度ごと）
// ---------------------------------------------------------------------------

const BASE = {
  windmillBaseRadius: 0.13, // 画面の短辺に対する風車の半径
  recognitionRadiusFactor: 0.92, // この比まで重なると「認識」が進む
  breakRadiusFactor: 1.25, // 逃走中、これより外に出れば「見失った」とみなす
  breakHoldMs: 380, // 外に出たままこの時間を保てば逃走成功
  stareDecayFactor: 2.2, // 視線を外したときのメーターの減り
  survivalScorePerSec: 8,
  collectScore: 25,
  escapeScore: 120,
  levelEveryMs: 20000,
  chaseRamp: 1.08, // レベルごとに追跡速度を掛ける
  holdRamp: 0.94,
  escapeRamp: 0.94,
  rampFloor: 0.5,
  targetRadius: 0.05,
  targetDwellMs: 320,
  noFaceGraceMs: 700,
};

const DIFFICULTIES = {
  easy:   { label: "易しい", chaseSpeed: 0.15, holdMs: 560, escapeWindowMs: 2600, targetLifeMs: 5200, spawnEveryMs: 1900 },
  normal: { label: "普通",   chaseSpeed: 0.22, holdMs: 420, escapeWindowMs: 2000, targetLifeMs: 4200, spawnEveryMs: 1600 },
  hard:   { label: "厳しい", chaseSpeed: 0.30, holdMs: 300, escapeWindowMs: 1500, targetLifeMs: 3400, spawnEveryMs: 1350 },
};

const BEST_KEY = "kichigai-windmill:best";
const MUTE_KEY = "kichigai-windmill:muted";

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const rand = (a, b) => a + Math.random() * (b - a);

// ---------------------------------------------------------------------------
// 音（WebAudio の簡易シンセ）
// ---------------------------------------------------------------------------

class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem(MUTE_KEY) === "1";
    this.alarm = null;
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
    g.gain.exponentialRampToValueAtTime(peak, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + durMs / 1000 + 0.02);
  }

  collect() { this.tone(880, 90, "triangle", 0.05, 1320); }
  start() { this.tone(220, 160, "sawtooth", 0.05, 440); }
  recognize() { this.tone(180, 320, "sawtooth", 0.07, 90); }
  escape() { this.tone(520, 220, "triangle", 0.06, 1040); }
  boom() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.7);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.85);
  }

  alarmOn() {
    if (this.alarm || this.muted || !this.ctx) return;
    const tick = () => {
      this.tone(660, 120, "square", 0.05, 990);
    };
    tick();
    this.alarm = setInterval(tick, 260);
  }

  alarmOff() {
    if (this.alarm) clearInterval(this.alarm);
    this.alarm = null;
  }
}

// ---------------------------------------------------------------------------
// ゲーム
// ---------------------------------------------------------------------------

const PHASE = { TITLE: "title", READY: "ready", PLAYING: "playing", ESCAPE: "escape", OVER: "over" };

class Game {
  constructor(els, sfx) {
    this.els = els;
    this.sfx = sfx;
    this.ctx = els.canvas.getContext("2d");

    this.input = { x: 0.5, y: 0.5, present: false, source: "pointer" };
    this.difficulty = "normal";
    this.phase = PHASE.TITLE;
    this.paused = false;
    this.noFaceMs = 0;

    this.t = 0;
    this.score = 0;
    this.level = 1;
    this.startAt = 0;
    this.escapes = 0;

    this.windmill = { x: 0.5, y: 0.32, angle: 0, spin: 1.1, radius: BASE.windmillBaseRadius };
    this.stareMs = 0;
    this.holdMs = DIFFICULTIES.normal.holdMs;
    this.chaseSpeed = DIFFICULTIES.normal.chaseSpeed;
    this.escapeWindowMs = DIFFICULTIES.normal.escapeWindowMs;
    this.escapeLeftMs = 0;
    this.breakMs = 0;
    this.grounds = []; // 的
    this.spawnAcc = 0;
    this.glitch = 0;
    this.mirror = 0;
    this.flashUntil = 0;
    this.shake = 0;
    this.deathAt = 0;
    this.best = Number(localStorage.getItem(BEST_KEY) || 0);
  }

  setDifficulty(key) {
    this.difficulty = DIFFICULTIES[key] ? key : "normal";
    this.els.difficultyNote.textContent = DIFFICULTIES[this.difficulty].label;
  }

  setInputSource(source) {
    this.input.source = source;
    this.els.hudSource.textContent = source === "gaze" ? "視線" : "マウス";
  }

  reset() {
    const d = DIFFICULTIES[this.difficulty];
    this.score = 0;
    this.level = 1;
    this.escapes = 0;
    this.t = 0;
    this.stareMs = 0;
    this.holdMs = d.holdMs;
    this.chaseSpeed = d.chaseSpeed;
    this.escapeWindowMs = d.escapeWindowMs;
    this.escapeLeftMs = 0;
    this.breakMs = 0;
    this.grounds = [];
    this.spawnAcc = 0;
    this.glitch = 0;
    this.mirror = 0;
    this.shake = 0;
    this.noFaceMs = 0;
    this.windmill.x = 0.5;
    this.windmill.y = 0.3;
    this.windmill.angle = 0;
    this.windmill.spin = 1.0;
    this.phase = PHASE.READY;
    this.startAt = performance.now();
    this.updateHud();
  }

  play() {
    this.reset();
    this.phase = PHASE.PLAYING;
    this.sfx.unlock();
    this.sfx.start();
    this.setAnnounce("");
  }

  // --- 更新 ---

  update(dt) {
    if (this.phase === PHASE.READY) this.phase = PHASE.PLAYING;

    const reticle = this.input;
    const wm = this.windmill;
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    wm.radius = BASE.windmillBaseRadius * (this.phase === PHASE.ESCAPE ? 1.12 : 1);

    // 顔が見えないときは進行を止める（カメラ入力のみ）
    const tracking = reticle.source !== "gaze" || reticle.present;
    if (this.phase !== PHASE.OVER) {
      if (tracking) this.noFaceMs = 0;
      else this.noFaceMs += dt * 1000;
    }

    if (this.phase === PHASE.OVER) {
      this.deathAt += dt * 1000;
      this.glitch = 1;
      this.mirror = Math.min(1, this.mirror + dt * 3);
      this.shake = Math.max(0, this.shake - dt * 30);
      wm.angle += dt * 1.5;
      return;
    }

    this.t += dt;
    this.score += BASE.survivalScorePerSec * dt;

    // レベル（時間でじわじわ厳しく）
    const nextLevel = 1 + Math.floor(this.t * 1000 / BASE.levelEveryMs);
    if (nextLevel > this.level) {
      this.level = nextLevel;
      const floor = BASE.rampFloor;
      this.chaseSpeed = DIFFICULTIES[this.difficulty].chaseSpeed *
        Math.max(floor, Math.pow(BASE.chaseRamp, this.level - 1));
      this.holdMs = DIFFICULTIES[this.difficulty].holdMs *
        Math.max(floor, Math.pow(BASE.holdRamp, this.level - 1));
      this.escapeWindowMs = DIFFICULTIES[this.difficulty].escapeWindowMs *
        Math.max(floor, Math.pow(BASE.escapeRamp, this.level - 1));
    }

    const canProgress = this.noFaceMs < BASE.noFaceGraceMs;
    const chaseMul = this.phase === PHASE.ESCAPE ? 1.35 : 1;

    // 風車はこちらの視線を追う
    if (canProgress) {
      const dx = reticle.x - wm.x;
      const dy = reticle.y - wm.y;
      const dist = Math.hypot(dx, dy) || 1e-6;
      const step = this.chaseSpeed * chaseMul * dt;
      if (dist > 1e-4) {
        wm.x += (dx / dist) * Math.min(step, dist);
        wm.y += (dy / dist) * Math.min(step, dist);
      }
      wm.x = clamp(wm.x, 0.1, 0.9);
      wm.y = clamp(wm.y, 0.12, 0.88);
    }

    // 風車の回転は危険度で速くなる
    const speed = 1.0 + this.level * 0.12 + (this.phase === PHASE.ESCAPE ? 3.5 : 0);
    wm.angle += dt * speed;

    // 認識の判定
    if (this.phase === PHASE.PLAYING) {
      const dx = reticle.x - wm.x;
      const dy = reticle.y - wm.y;
      const overlap = Math.hypot(dx, dy) < wm.radius * BASE.recognitionRadiusFactor;
      if (overlap && canProgress && reticle.present) {
        this.stareMs += dt * 1000;
      } else {
        this.stareMs -= dt * 1000 * BASE.stareDecayFactor;
      }
      this.stareMs = clamp(this.stareMs, 0, this.holdMs);
      if (this.stareMs >= this.holdMs) this.recognize();
      this.updateTargets(dt, canProgress);
    } else if (this.phase === PHASE.ESCAPE) {
      this.escapeLeftMs -= dt * 1000;
      const dx = reticle.x - wm.x;
      const dy = reticle.y - wm.y;
      const outside = Math.hypot(dx, dy) > wm.radius * BASE.breakRadiusFactor;
      if (outside && reticle.present) this.breakMs += dt * 1000;
      else this.breakMs -= dt * 1000 * 2;
      this.breakMs = clamp(this.breakMs, 0, BASE.breakHoldMs);
      if (this.breakMs >= BASE.breakHoldMs) this.escape();
      else if (this.escapeLeftMs <= 0) this.gameOver();
    }

    this.glitch = Math.max(0, this.glitch - dt * 2.4);
    this.mirror = Math.max(0, this.mirror - dt * 2.2);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.updateHud();
  }

  recognize() {
    this.phase = PHASE.ESCAPE;
    this.escapeLeftMs = this.escapeWindowMs;
    this.breakMs = 0;
    this.glitch = 1;
    this.mirror = 1;
    this.flashUntil = performance.now() + 260;
    this.shake = 1;
    this.sfx.recognize();
    this.sfx.alarmOn();
    this.setAnnounce('まずい "認識" された — 逃げろ逃げろ逃げろ逃げ');
    this.els.announce.classList.add("is-danger");
  }

  escape() {
    this.phase = PHASE.PLAYING;
    this.stareMs = 0;
    this.breakMs = 0;
    this.score += BASE.escapeScore;
    this.escapes += 1;
    this.glitch = 0.7;
    this.mirror = 0.6;
    this.sfx.alarmOff();
    this.sfx.escape();
    // 見失って、遠くへ跳ぶ
    const angle = Math.random() * Math.PI * 2;
    this.windmill.x = clamp(0.5 + Math.cos(angle) * 0.32, 0.12, 0.88);
    this.windmill.y = clamp(0.5 + Math.sin(angle) * 0.32, 0.14, 0.86);
    this.setAnnounce("見失った — 逃げ切った");
    this.els.announce.classList.remove("is-danger");
    setTimeout(() => {
      if (this.phase === PHASE.PLAYING) this.setAnnounce("");
    }, 900);
  }

  gameOver() {
    this.phase = PHASE.OVER;
    this.deathAt = 0;
    this.glitch = 1;
    this.shake = 1;
    this.sfx.alarmOff();
    this.sfx.boom();
    this.setAnnounce("");
    const value = Math.floor(this.score);
    const isNew = value > this.best;
    if (isNew) {
      this.best = value;
      localStorage.setItem(BEST_KEY, String(this.best));
    }
    this.els.resultScore.textContent = String(value);
    this.els.resultBest.textContent = String(this.best);
    this.els.resultEscapes.textContent = String(this.escapes);
    this.els.resultLevel.textContent = String(this.level);
    this.els.resultNew.hidden = !isNew;
    this.els.best.textContent = String(this.best);
    this.els.resultOverlay.classList.remove("hidden");
  }

  // --- 的 ---

  updateTargets(dt, canProgress) {
    const d = DIFFICULTIES[this.difficulty];
    const wm = this.windmill;
    if (canProgress) {
      this.spawnAcc += dt * 1000;
      if (this.spawnAcc >= d.spawnEveryMs && this.grounds.length < 3) {
        this.spawnAcc = 0;
        this.grounds.push(this.spawnTarget());
      }
    }
    for (let i = this.grounds.length - 1; i >= 0; i--) {
      const g = this.grounds[i];
      g.lifeMs -= dt * 1000;
      if (g.lifeMs <= 0) {
        this.grounds.splice(i, 1);
        continue;
      }
      const near = Math.hypot(this.input.x - g.x, this.input.y - g.y) < BASE.targetRadius;
      if (near && canProgress && this.input.present) g.dwellMs += dt * 1000;
      else g.dwellMs = Math.max(0, g.dwellMs - dt * 900);
      if (g.dwellMs >= BASE.targetDwellMs) {
        this.score += BASE.collectScore;
        this.grounds.splice(i, 1);
        this.sfx.collect();
      }
    }
  }

  spawnTarget() {
    const wm = this.windmill;
    let x = 0.5;
    let y = 0.5;
    for (let attempt = 0; attempt < 24; attempt++) {
      x = rand(0.1, 0.9);
      y = rand(0.12, 0.88);
      if (Math.hypot(x - wm.x, y - wm.y) > 0.34) break;
    }
    return { x, y, lifeMs: DIFFICULTIES[this.difficulty].targetLifeMs, dwellMs: 0, phase: rand(0, Math.PI * 2) };
  }

  // --- UI ---

  setAnnounce(text) {
    const el = this.els.announce;
    if (el.textContent === text) return;
    el.textContent = text;
    el.classList.toggle("is-on", !!text);
  }

  updateHud() {
    this.els.hudScore.textContent = String(Math.floor(this.score));
    this.els.hudLevel.textContent = String(this.level);
    this.els.hudEscapes.textContent = String(this.escapes);
    const meter = clamp(this.stareMs / this.holdMs, 0, 1);
    this.els.hudStare.style.setProperty("--v", (meter * 100).toFixed(1) + "%");
    this.els.hudState.textContent =
      this.phase === PHASE.ESCAPE ? "認識" : meter > 0.5 ? "注視" : "静穏";
    this.els.hudState.classList.toggle("is-danger", this.phase === PHASE.ESCAPE);
  }

  // --- 描画 ---

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.els.canvas.width = Math.round(window.innerWidth * dpr);
    this.els.canvas.height = Math.round(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw() {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.save();
    if (this.shake > 0) {
      const amp = this.shake * 8;
      ctx.translate(rand(-amp, amp), rand(-amp, amp));
    }
    ctx.clearRect(-40, -40, w + 80, h + 80);

    // 背景
    const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
    bg.addColorStop(0, "#191322");
    bg.addColorStop(1, "#0b0910");
    ctx.fillStyle = bg;
    ctx.fillRect(-40, -40, w + 80, h + 80);

    // 逃走中は盤面を左右反転させるときがある（👈 が 🫵 に変わる演出）
    const flip = this.mirror > 0.5;
    if (flip) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    this.drawTargets(ctx, w, h);
    this.drawWindmill(ctx, w, h);
    if (flip) ctx.setTransform((window.devicePixelRatio || 1), 0, 0, (window.devicePixelRatio || 1), 0, 0);

    this.drawReticle(ctx, w, h);
    ctx.restore();

    if (this.glitch > 0.02) this.applyGlitch(w, h);
  }

  drawTargets(ctx, w, h) {
    const minDim = Math.min(w, h);
    for (const g of this.grounds) {
      const x = g.x * w;
      const y = g.y * h;
      const r = BASE.targetRadius * minDim;
      const fade = clamp(g.lifeMs / 900, 0, 1);
      const dwell = g.dwellMs / BASE.targetDwellMs;
      ctx.save();
      ctx.globalAlpha = 0.4 + 0.6 * fade;
      ctx.strokeStyle = "rgba(217,143,174,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      // 十字
      ctx.beginPath();
      ctx.moveTo(x - r, y); ctx.lineTo(x - r * 0.4, y);
      ctx.moveTo(x + r * 0.4, y); ctx.lineTo(x + r, y);
      ctx.moveTo(x, y - r); ctx.lineTo(x, y - r * 0.4);
      ctx.moveTo(x, y + r * 0.4); ctx.lineTo(x, y + r);
      ctx.stroke();
      if (dwell > 0) {
        ctx.beginPath();
        ctx.arc(x, y, r * 0.75, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * dwell);
        ctx.strokeStyle = "rgba(217,143,174,0.95)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawWindmill(ctx, w, h) {
    const wm = this.windmill;
    const minDim = Math.min(w, h);
    const R = wm.radius * minDim;
    const cx = wm.x * w;
    const cy = wm.y * h;
    const meter = clamp(this.stareMs / this.holdMs, 0, 1);
    const danger = this.phase === PHASE.ESCAPE ? 1 : meter;
    const alert = this.phase === PHASE.ESCAPE || this.phase === PHASE.OVER;
    const accent = "#d98fae";
    const hot = `rgba(184,69,47,${0.25 + danger * 0.6})`;

    // 危険オーラ
    if (danger > 0.03) {
      const glow = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 2.1);
      glow.addColorStop(0, `rgba(184,69,47,${0.28 * danger})`);
      glow.addColorStop(1, "rgba(184,69,47,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 2.1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(cx, cy);

    // 回転する矢印（風車の羽根）
    const arrowCount = 4;
    for (let i = 0; i < arrowCount; i++) {
      const a = wm.angle + (i * Math.PI * 2) / arrowCount;
      ctx.save();
      ctx.rotate(a);
      const inward = alert;
      const inner = inward ? R * 1.85 : R * 1.05;
      const outer = inward ? R * 1.15 : R * 1.9;
      const col = alert ? hot : `rgba(230,230,234,${0.5 + danger * 0.4})`;
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = Math.max(2, R * 0.06);
      ctx.beginPath();
      ctx.moveTo(inner, 0);
      ctx.lineTo(outer, 0);
      ctx.stroke();
      // 矢じり（外向き or 内向き）
      const dir = inward ? -1 : 1;
      const tip = outer;
      const base = outer - dir * R * 0.26;
      ctx.beginPath();
      ctx.moveTo(tip, 0);
      ctx.lineTo(base, -R * 0.16);
      ctx.lineTo(base, R * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 頭（顔）
    const faceR = R;
    ctx.save();
    if (this.phase === PHASE.ESCAPE) ctx.rotate(Math.sin(this.t * 30) * 0.03);
    ctx.beginPath();
    ctx.arc(0, 0, faceR, 0, Math.PI * 2);
    const faceGrad = ctx.createRadialGradient(-faceR * 0.3, -faceR * 0.35, faceR * 0.1, 0, 0, faceR);
    faceGrad.addColorStop(0, alert ? "#3a1d1d" : "#241d2e");
    faceGrad.addColorStop(1, "#120e18");
    ctx.fillStyle = faceGrad;
    ctx.fill();
    ctx.lineWidth = Math.max(2, R * 0.05);
    ctx.strokeStyle = alert ? "rgba(184,69,47,0.9)" : "rgba(255,255,255,0.16)";
    ctx.stroke();
    ctx.restore();

    // 目
    const eyeY = -faceR * 0.22;
    const eyeX = faceR * 0.42;
    ctx.strokeStyle = alert ? "#f0d9d4" : "#e6e6ea";
    ctx.fillStyle = alert ? "#f0d9d4" : "#e6e6ea";
    ctx.lineWidth = Math.max(2, R * 0.09);
    ctx.lineCap = "round";
    if (!alert) {
      // 目を細めた「^ ^」
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(sx * eyeX, eyeY + faceR * 0.06, faceR * 0.2, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      }
    } else {
      // 見開いた目。瞳孔はこちらの視線を追う
      const lookX = clamp((this.input.x - wm.x) * 6, -1, 1) * faceR * 0.12;
      const lookY = clamp((this.input.y - wm.y) * 6, -1, 1) * faceR * 0.12;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(sx * eyeX, eyeY, faceR * 0.19, faceR * 0.24, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sx * eyeX + lookX, eyeY + lookY, faceR * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 口（笑い）。危険なほど広がる
    const grin = alert ? 1 : 0.35 + danger * 0.5;
    ctx.strokeStyle = alert ? "#c14a34" : "#cfc6d6";
    ctx.lineWidth = Math.max(2, R * 0.07);
    ctx.beginPath();
    ctx.arc(0, faceR * 0.12, faceR * 0.55, Math.PI * (0.12 + (1 - grin) * 0.2), Math.PI * (0.88 - (1 - grin) * 0.2));
    ctx.stroke();
    if (alert) {
      // 歯
      ctx.strokeStyle = "rgba(240,217,212,0.85)";
      ctx.lineWidth = Math.max(1, R * 0.03);
      for (let k = -2; k <= 2; k++) {
        const tx = k * faceR * 0.16;
        const ty = faceR * 0.12 + faceR * 0.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx, ty - faceR * 0.16);
        ctx.stroke();
      }
    }

    // 認識中は手（🫵）が迫る
    if (alert && this.phase !== PHASE.OVER) {
      this.drawHands(ctx, faceR);
    }
    ctx.restore();

    // 注視メーター（風車の周りのリング）
    if (this.phase === PHASE.PLAYING && meter > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * meter);
      ctx.strokeStyle = meter > 0.6 ? "#b8452f" : accent;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    // 逃走の残りゲージ
    if (this.phase === PHASE.ESCAPE) {
      const frac = clamp(this.escapeLeftMs / this.escapeWindowMs, 0, 1);
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.75, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.strokeStyle = "rgba(184,69,47,0.85)";
      ctx.lineWidth = 3;
      ctx.stroke();
      // 見切れれば「逃げ」成功。外に出た保持の進捗
      const brk = this.breakMs / BASE.breakHoldMs;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.95, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * brk);
      ctx.strokeStyle = "rgba(230,230,234,0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  drawHands(ctx, R) {
    // 下から伸びる指。左右で少し対称を崩し、反転演出と合わせて「間違い」に見せる
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(sx * R * 0.9, R * 1.15);
      ctx.rotate(sx * -0.15);
      ctx.fillStyle = "rgba(240,217,212,0.9)";
      ctx.beginPath();
      ctx.roundRect(-R * 0.16, 0, R * 0.32, R * 0.7, R * 0.12);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-R * 0.08, -R * 0.3, R * 0.16, R * 0.45, R * 0.08);
      ctx.fill();
      ctx.restore();
    }
  }

  drawReticle(ctx, w, h) {
    if (this.phase === PHASE.TITLE || this.phase === PHASE.OVER) return;
    const x = this.input.x * w;
    const y = this.input.y * h;
    const present = this.input.source !== "gaze" || this.input.present;
    ctx.save();
    ctx.globalAlpha = present ? 0.95 : 0.3;
    ctx.strokeStyle = this.phase === PHASE.ESCAPE ? "#b8452f" : "#d98fae";
    ctx.lineWidth = 1.5;
    const r = 11;
    ctx.beginPath();
    ctx.moveTo(x - r, y); ctx.lineTo(x - r * 0.35, y);
    ctx.moveTo(x + r * 0.35, y); ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r); ctx.lineTo(x, y - r * 0.35);
    ctx.moveTo(x, y + r * 0.35); ctx.lineTo(x, y + r);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.restore();
  }

  applyGlitch(w, h) {
    const ctx = this.ctx;
    const amount = this.glitch;
    const slices = 3 + Math.floor(amount * 6);
    const dpr = window.devicePixelRatio || 1;
    for (let i = 0; i < slices; i++) {
      const sy = Math.random() * h;
      const sh = rand(6, 34) * amount;
      const dx = rand(-26, 26) * amount;
      ctx.drawImage(
        this.els.canvas,
        0, sy * dpr, w * dpr, sh * dpr,
        dx * dpr, sy * dpr, w * dpr, sh * dpr
      );
    }
    if (this.glitch > 0.4) {
      ctx.save();
      ctx.globalCompositeOperation = "difference";
      ctx.fillStyle = `rgba(255,255,255,${0.06 * amount})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  drawDeathCloseup(ctx, w, h) {
    // game over: 顔がドアップで迫る
    const k = clamp(this.deathAt / 600, 0, 1);
    const R = Math.max(w, h) * (0.25 + k * 0.9);
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = "#0b0910";
    ctx.fillRect(0, 0, w, h);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    g.addColorStop(0, "#3a1d1d");
    g.addColorStop(1, "#120e18");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(184,69,47,0.9)";
    ctx.lineWidth = Math.max(3, R * 0.02);
    ctx.stroke();
    // 目
    const eyeY = cy - R * 0.22;
    const eyeX = R * 0.42;
    ctx.fillStyle = "#f0d9d4";
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + sx * eyeX, eyeY, R * 0.19, R * 0.24, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "#f0d9d4";
      ctx.lineWidth = Math.max(2, R * 0.02);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + sx * eyeX, eyeY, R * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#c14a34";
    ctx.lineWidth = Math.max(3, R * 0.018);
    ctx.beginPath();
    ctx.arc(cx, cy + R * 0.12, R * 0.55, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// 起動
// ---------------------------------------------------------------------------

const els = {
  canvas: document.getElementById("game"),
  titleOverlay: document.getElementById("title"),
  best: document.getElementById("best"),
  titleStatus: document.getElementById("title-status"),
  hudScore: document.getElementById("hud-score"),
  hudLevel: document.getElementById("hud-level"),
  hudEscapes: document.getElementById("hud-escapes"),
  hudStare: document.getElementById("hud-stare"),
  hudState: document.getElementById("hud-state"),
  hudSource: document.getElementById("hud-source"),
  announce: document.getElementById("announce"),
  hint: document.getElementById("hint"),
  resultOverlay: document.getElementById("result"),
  resultScore: document.getElementById("result-score"),
  resultBest: document.getElementById("result-best"),
  resultEscapes: document.getElementById("result-escapes"),
  resultLevel: document.getElementById("result-level"),
  resultNew: document.getElementById("result-new"),
  startBtn: document.getElementById("start"),
  retryBtn: document.getElementById("retry"),
  backTitleBtn: document.getElementById("back-title"),
  difficultyNote: document.getElementById("difficulty-note"),
  calibrateBtn: document.getElementById("calibrate"),
  muteBtn: document.getElementById("mute"),
  previewBtn: document.getElementById("preview"),
  modeBtns: Array.from(document.querySelectorAll(".mode-card")),
  diffBtns: Array.from(document.querySelectorAll(".diff-btn")),
};

const sfx = new Sfx();
const game = new Game(els, sfx);
let tracker = null;
let inputMode = "gaze"; // "gaze" | "pointer"
let hasPlayed = false;

function setHint(text, alert) {
  for (const el of [els.hint, els.titleStatus]) {
    if (!el) continue;
    el.textContent = text || "";
    el.classList.toggle("is-alert", !!alert);
  }
}

function hideTitle() {
  els.titleOverlay.classList.add("hidden");
  game.resize();
  if (tracker) tracker.onResize();
}

function showTitle() {
  els.titleOverlay.classList.remove("hidden");
  els.best.textContent = String(game.best);
}

function selectedMode() {
  const checked = document.querySelector(".mode-card.selected");
  return checked ? checked.dataset.mode : "gaze";
}

function selectedDifficulty() {
  const active = document.querySelector(".diff-btn.active");
  return active ? active.dataset.difficulty : "normal";
}

// --- 入力 ---

function setupPointerInput() {
  const move = (clientX, clientY) => {
    if (game.input.source !== "pointer") return;
    game.input.x = clamp(clientX / window.innerWidth, 0, 1);
    game.input.y = clamp(clientY / window.innerHeight, 0, 1);
    game.input.present = true;
  };
  window.addEventListener("pointermove", (e) => move(e.clientX, e.clientY));
  window.addEventListener("pointerdown", (e) => move(e.clientX, e.clientY));
  window.addEventListener("touchmove", (e) => {
    if (e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
}

function setupGazeInput() {
  tracker = new GazeTracker({
    onSample: (x, y, present) => {
      if (game.input.source !== "gaze") return;
      if (present) {
        game.input.x = clamp(x, 0, 1);
        game.input.y = clamp(y, 0, 1);
      }
      game.input.present = present;
    },
    onStatus: (text, alert) => setHint(text, alert),
  });
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  tracker.setAccent(accent || "#d98fae");
}

// --- 起動フロー ---

async function startGame() {
  const mode = selectedMode();
  game.setDifficulty(selectedDifficulty());
  inputMode = mode === "pointer" ? "pointer" : "gaze";
  game.setInputSource(inputMode);
  sfx.unlock();

  if (inputMode === "pointer") {
    game.setInputSource("pointer");
    game.input.present = true;
    els.resultOverlay.classList.add("hidden");
    hideTitle();
    game.play();
    setHint("マウス（またはタッチ）で遊んでいます。視線で遊ぶには「Webカメラで目が合う」を選んでください。");
    hasPlayed = true;
    return;
  }

  // 視線モード: カメラが用意できるまではタイトルのダイアログに状況を出す
  if (!tracker.stream) {
    setHint("カメラと視線モデルを準備しています…");
    try {
      await tracker.prepare();
    } catch (err) {
      setHint(`カメラを起動できませんでした（${(err && err.message) || err}）。「マウスで遊ぶ」で試せます。`, true);
      return;
    }
  }

  const needsCalibration = !tracker.isCalibrated() || forceCalibrate;
  forceCalibrate = false;
  if (needsCalibration) {
    hideTitle();
    setHint("キャリブレーションを始めます。出てくる13点を順に目で追ってください。");
    try {
      const res = await tracker.calibrate();
      setHint(`キャリブレーション完了 — ${res.note}。はじめます。`);
    } catch (err) {
      setHint(`${(err && err.message) || err}。もう一度 CALIBRATE するか、「マウスで遊ぶ」を選んでください。`, true);
      showTitle();
      return;
    }
  } else {
    setHint(`前回のキャリブレーションを読み込みました（誤差 約 ${tracker.calibrationErrorPx()}px）。`);
  }

  tracker.start();
  game.setInputSource("gaze");
  els.resultOverlay.classList.add("hidden");
  hideTitle();
  game.play();
  hasPlayed = true;
}

let forceCalibrate = false;

async function recalibrate() {
  if (!tracker || !tracker.stream) {
    setHint("先に「Webカメラで目が合う」で開始してください。", true);
    return;
  }
  game.phase = PHASE.TITLE;
  hideTitle();
  setHint("キャリブレーションをやり直します。出てくる13点を順に目で追ってください。");
  try {
    const res = await tracker.calibrate();
    setHint(`キャリブレーション完了 — ${res.note}`);
  } catch (err) {
    setHint(`${(err && err.message) || err}`, true);
    return;
  }
  game.play();
}

function backToTitle() {
  game.phase = PHASE.TITLE;
  sfx.alarmOff();
  els.resultOverlay.classList.add("hidden");
  els.announce.classList.remove("is-danger");
  game.setAnnounce("");
  if (tracker) tracker.setPreview(false);
  els.previewBtn.classList.remove("active");
  showTitle();
  setHint("");
}

// --- ループ ---

let last = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.min(dt, 0.05);

  const active = game.phase === PHASE.PLAYING || game.phase === PHASE.ESCAPE || game.phase === PHASE.READY;
  if (active) game.update(dt);
  else if (game.phase === PHASE.OVER) game.update(dt);

  const ctx = game.ctx;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (game.phase === PHASE.OVER) {
    game.drawDeathCloseup(ctx, w, h);
    if (game.glitch > 0.02) game.applyGlitch(w, h);
  } else if (game.phase === PHASE.TITLE) {
    ctx.clearRect(0, 0, w, h);
  } else {
    game.draw();
  }

  // 顔が見えないときの注意
  if (game.phase === PHASE.PLAYING && game.input.source === "gaze" && game.noFaceMs > BASE.noFaceGraceMs) {
    if (els.hint.textContent !== "顔が見えません。カメラに顔を映してください。") {
      setHint("顔が見えません。カメラに顔を映してください。", true);
    }
  } else if (game.phase === PHASE.PLAYING && els.hint.classList.contains("is-alert")) {
    setHint("");
  }
}

// --- 配線 ---

function bind() {
  els.modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      els.modeBtns.forEach((b) => {
        const on = b === btn;
        b.classList.toggle("selected", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
      });
    });
  });

  els.diffBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      els.diffBtns.forEach((b) => b.classList.toggle("active", b === btn));
      game.setDifficulty(btn.dataset.difficulty);
    });
  });

  els.startBtn.addEventListener("click", startGame);
  els.retryBtn.addEventListener("click", startGame);
  els.backTitleBtn.addEventListener("click", backToTitle);
  els.calibrateBtn.addEventListener("click", () => {
    forceCalibrate = true;
    if (game.phase === PHASE.OVER || game.phase === PHASE.TITLE) {
      startGame();
    } else {
      recalibrate();
    }
  });

  els.muteBtn.addEventListener("click", () => {
    sfx.muted = !sfx.muted;
    localStorage.setItem(MUTE_KEY, sfx.muted ? "1" : "0");
    els.muteBtn.classList.toggle("muted", sfx.muted);
    if (sfx.muted) sfx.alarmOff();
  });

  els.previewBtn.addEventListener("click", () => {
    if (!tracker) return;
    const on = !els.previewBtn.classList.contains("active");
    els.previewBtn.classList.toggle("active", on);
    tracker.setPreview(on);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (game.phase === PHASE.PLAYING || game.phase === PHASE.ESCAPE) backToTitle();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (tracker) tracker.onResize();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && sfx.alarm) sfx.alarmOff();
  });
}

function init() {
  game.resize();
  game.phase = PHASE.TITLE;
  game.setDifficulty("normal");
  game.setInputSource("gaze");
  game.best = Number(localStorage.getItem(BEST_KEY) || 0);
  els.muteBtn.classList.toggle("muted", sfx.muted);
  setupPointerInput();
  setupGazeInput();
  bind();
  showTitle();
  requestAnimationFrame(loop);
}

init();
