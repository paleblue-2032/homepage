/**
 * gaze-cursor のブラウザ側。
 *
 * カメラ → 視線推定（core.js）→ 制御（controller.js）→ このページの中の仮想カーソル、
 * までをブラウザだけで完結させる。OS のカーソルには触らない。
 *
 * 仮想カーソルは Actuator インターフェースの実装のひとつ。MCU に載せるときは、
 * ここを「モータを回す何か」に差し替えるだけで controller.js はそのまま使える。
 */

import * as core from "./core.js";
import { PointerController } from "./controller.js";
import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const STORE_KEY = "gaze-cursor:calibration:v1";

const CFG = {
  samplesPerPoint: 40,
  settleMs: 550,
  sampleTimeoutMs: 3000,
  minSamplesPerPoint: 12,
  ridgeLambda: 1e-3,
  medianWindow: 3,
  smoothBeta: 0.012,
  smoothHzFast: 1.6,
  smoothHzSlow: 0.4,
  smoothDefault: 28,
  controlHz: 100,
};

const els = {
  stage: document.getElementById("stage"),
  cam: document.getElementById("cam"),
  overlay: document.getElementById("overlay"),
  start: document.getElementById("start"),
  calibrate: document.getElementById("calibrate"),
  track: document.getElementById("track"),
  exit: document.getElementById("exit"),
  targets: document.getElementById("targets"),
  dwell: document.getElementById("dwell"),
  dwellVal: document.getElementById("dwell-val"),
  smooth: document.getElementById("smooth"),
  smoothVal: document.getElementById("smooth-val"),
  pageStatus: document.getElementById("page-status"),
  hudState: document.getElementById("hud-state"),
  hudCalib: document.getElementById("hud-calib"),
  hudLatency: document.getElementById("hud-latency"),
  hudCam: document.getElementById("hud-cam"),
  hudFps: document.getElementById("hud-fps"),
  hudMiss: document.getElementById("hud-miss"),
  hudHint: document.getElementById("hud-hint"),
};

// --- 出力先（Actuator）: ページ内の仮想カーソル ---

const cursor = {
  x: 0,
  y: 0,
  flashUntil: 0,
  lastKey: null,
  rects: null,

  position() {
    return { x: this.x, y: this.y };
  },

  move(dx, dy) {
    const maxX = window.innerWidth;
    const maxY = window.innerHeight;
    this.x = Math.min(Math.max(this.x + dx, 0), maxX);
    this.y = Math.min(Math.max(this.y + dy, 0), maxY);
  },

  recenter() {
    this.x = 0;
    this.y = 0;
  },

  release() {
    /* 押しっぱなしにしないので何もしない */
  },

  click() {
    this.flashUntil = performance.now() + 180;
    const target = this.targetAt(this.x, this.y);
    if (target) {
      const count = target.querySelector(".target-count");
      count.textContent = String(Number(count.textContent) + 1);
      this.lastKey = target.dataset.key;
      els.hudHint.textContent = `${this.lastKey} を注視クリックしました`;
    }
  },

  // 矩形は毎フレーム読むとレイアウトを叩くので、変わったときだけ取り直す
  invalidate() {
    this.rects = null;
  },

  targetAt(x, y) {
    if (!this.rects) {
      this.rects = Array.from(els.targets.children).map((target) => ({
        target,
        rect: target.getBoundingClientRect(),
      }));
    }
    for (const item of this.rects) {
      const { rect } = item;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return item.target;
    }
    return null;
  },

  checkTargets() {
    if (els.stage.hidden) return;
    const hovered = this.targetAt(this.x, this.y);
    for (const target of els.targets.children) {
      target.classList.toggle("is-hover", target === hovered);
    }
  },
};

const state = {
  ctx: null,
  model: null,
  errPx: 0,
  stream: null,
  landmarker: null,
  result: null,
  lastVideoTime: -1,
  filterX: null,
  filterY: null,
  medianX: null,
  medianY: null,
  feature: new Float64Array(core.RAW_FEATURE_COUNT),
  basis: new Float64Array(core.FEATURE_COUNT),
  predicted: new Float64Array(2),
  gaze: { x: 0.5, y: 0.5 },
  gazePx: { x: 0, y: 0 },
  controller: null,
  controlTimer: 0,
  calibrating: false,
  calibTarget: null,
  collecting: null,
  smoothSlider: CFG.smoothDefault,
  dwellMs: Number(els.dwell.value),
  frames: 0,
  statFrames: 0,
  statMisses: 0,
  fps: 0,
  fpsAt: 0,
  statsAt: 0,
  accent: "#d98fae",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const setHint = (text) => {
  els.hudHint.textContent = text || "";
};
const setPageStatus = (text) => {
  els.pageStatus.textContent = text;
};

// --- カメラと推定器 ---

async function ensureLandmarker() {
  if (state.landmarker) return state.landmarker;
  setHint("視線モデルを読み込んでいます...");
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.4,
    minFacePresenceConfidence: 0.4,
    minTrackingConfidence: 0.4,
  });
  try {
    state.landmarker = await FaceLandmarker.createFromOptions(fileset, options("GPU"));
  } catch {
    state.landmarker = await FaceLandmarker.createFromOptions(fileset, options("CPU"));
  }
  return state.landmarker;
}

async function ensureCamera() {
  if (state.stream) return;
  state.stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } },
    audio: false,
  });
  els.cam.srcObject = state.stream;
  await els.cam.play();
  const settings = state.stream.getVideoTracks()[0].getSettings();
  els.hudCam.textContent = `${settings.width}x${settings.height}@${Math.round(settings.frameRate)}`;
}

// --- 推定（core.js を呼ぶだけ） ---

function resetFilters() {
  const cutoff = core.cutoffFromSmoothing(state.smoothSlider, CFG.smoothHzSlow, CFG.smoothHzFast);
  state.filterX = new core.OneEuroFilter(cutoff, CFG.smoothBeta, 1);
  state.filterY = new core.OneEuroFilter(cutoff, CFG.smoothBeta, 1);
  state.medianX = new core.MedianFilter(CFG.medianWindow);
  state.medianY = new core.MedianFilter(CFG.medianWindow);
}

function estimateGaze(landmarks, count, timeMs) {
  if (!state.model) return false;
  if (!core.extractFeatures(landmarks, count, state.feature)) return false;
  core.fillBasis(state.feature, state.basis);
  if (!state.model.predict(state.basis, state.predicted)) return false;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const medianX = state.medianX.push(state.predicted[0] * width);
  const medianY = state.medianY.push(state.predicted[1] * height);
  state.gazePx.x = state.filterX.filter(medianX, timeMs);
  state.gazePx.y = state.filterY.filter(medianY, timeMs);
  state.gaze.x = state.gazePx.x / width;
  state.gaze.y = state.gazePx.y / height;
  return true;
}

// --- キャリブレーション ---

function collectSamples(count, timeoutMs) {
  return new Promise((resolve) => {
    const samples = [];
    const timer = setTimeout(finish, timeoutMs);
    function finish() {
      clearTimeout(timer);
      state.collecting = null;
      resolve(samples);
    }
    state.collecting = (features) => {
      samples.push(Float64Array.from(features));
      if (samples.length >= count) finish();
    };
  });
}

function medianOf(samples, index) {
  const values = samples.map((sample) => sample[index]).sort((a, b) => a - b);
  const mid = values.length >> 1;
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

async function runCalibration() {
  if (!state.stream) {
    setHint("先に START でカメラを起動してください");
    return;
  }
  stopTracking("キャリブレーションのため停止しました");
  els.calibrate.disabled = true;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const fractions = [0.125, 0.5, 0.875];
  const targets = [];
  for (const fy of fractions) for (const fx of fractions) targets.push({ x: fx, y: fy });

  const points = [];
  try {
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      state.calibTarget = {
        x: target.x * width,
        y: target.y * height,
        index: i + 1,
        total: targets.length,
        progress: 0,
      };
      setHint(`${i + 1}/${targets.length} — 点を見つめたままにしてください`);
      await sleep(CFG.settleMs);
      const samples = await collectSamples(CFG.samplesPerPoint, CFG.sampleTimeoutMs);
      if (samples.length < CFG.minSamplesPerPoint) {
        throw new Error(`点 ${i + 1} で顔を検出できませんでした。明るさと距離を確認してください`);
      }
      const features = new Float64Array([medianOf(samples, 0), medianOf(samples, 1), medianOf(samples, 2)]);
      points.push({
        row: Float64Array.from(core.fillBasis(features, new Float64Array(core.FEATURE_COUNT))),
        x: target.x,
        y: target.y,
      });
      if (state.calibTarget) state.calibTarget.progress = 1;
      await sleep(180);
    }

    const fitted = core.calibrate(points, points.length, (width + height) / 2, CFG.ridgeLambda);
    state.model = new core.GazeModel(fitted.scaler, fitted.coefX, fitted.coefY, fitted.errPx);
    state.errPx = fitted.errPx;
    localStorage.setItem(STORE_KEY, JSON.stringify(state.model.toJSON()));
    resetFilters();
    setCalibLabel();
    const droppedNote = fitted.dropped ? `（${fitted.dropped}点は外れ値として除外）` : "";
    setHint(`キャリブレーション完了 — 誤差 約 ${Math.round(fitted.errPx)} px${droppedNote}。START TRACKING で使えます`);
  } catch (err) {
    setHint((err && err.message) || String(err));
  } finally {
    state.calibTarget = null;
    els.calibrate.disabled = false;
  }
}

function setCalibLabel() {
  els.hudCalib.textContent = state.model ? `±${Math.round(state.errPx)}px` : "none";
}

function loadCalibration() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const model = core.GazeModel.fromJSON(JSON.parse(raw));
    if (!model) return;
    state.model = model;
    state.errPx = model.errPx || 0;
  } catch {
    /* 壊れた保存値は無視する */
  }
}

// --- 描画 ---

function resizeOverlay() {
  const dpr = window.devicePixelRatio || 1;
  els.overlay.width = Math.round(window.innerWidth * dpr);
  els.overlay.height = Math.round(window.innerHeight * dpr);
  state.ctx = els.overlay.getContext("2d");
  state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cursor.invalidate();
}

function drawLandmarks(ctx, landmarks, width, height) {
  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.fillStyle = state.accent;
  for (const eye of core.EYES) {
    const iris = landmarks[eye.iris];
    if (!iris) continue;
    const from = landmarks[eye.from];
    const to = landmarks[eye.to];
    const upper = landmarks[eye.upper];
    const lower = landmarks[eye.lower];
    ctx.beginPath();
    ctx.moveTo(from.x * width, from.y * height);
    ctx.lineTo(to.x * width, to.y * height);
    ctx.moveTo(upper.x * width, upper.y * height);
    ctx.lineTo(lower.x * width, lower.y * height);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(iris.x * width, iris.y * height, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCalibrationTarget(ctx, target) {
  const radius = 16;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(target.x, target.y, radius * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = state.accent;
  ctx.fill();
  if (target.progress > 0) {
    ctx.beginPath();
    ctx.arc(target.x, target.y, radius + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * target.progress);
    ctx.strokeStyle = state.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/** 視線の推定位置（細い十字）と、仮想カーソル（丸）を別々に描く。 */
function drawGaze(ctx, gazePoint) {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gazePoint.x - 7, gazePoint.y);
  ctx.lineTo(gazePoint.x + 7, gazePoint.y);
  ctx.moveTo(gazePoint.x, gazePoint.y - 7);
  ctx.lineTo(gazePoint.x, gazePoint.y + 7);
  ctx.stroke();
}

function drawCursor(ctx, point, progress, pressed) {
  ctx.beginPath();
  ctx.arc(point.x, point.y, pressed ? 9 : 7, 0, Math.PI * 2);
  ctx.fillStyle = state.accent;
  ctx.fill();
  if (progress > 0) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function draw() {
  const ctx = state.ctx;
  if (!ctx) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  ctx.clearRect(0, 0, width, height);

  const landmarks = state.result && state.result.faceLandmarks && state.result.faceLandmarks[0];
  if (landmarks && landmarks.length >= core.LANDMARK_COUNT) drawLandmarks(ctx, landmarks, width, height);
  if (state.calibTarget) drawCalibrationTarget(ctx, state.calibTarget);

  cursor.checkTargets();

  if (state.controller && !state.calibrating) {
    const controller = state.controller;
    if (controller.state === ARMED || controller.state === PAUSED) drawGaze(ctx, state.gazePx);
    drawCursor(ctx, cursor, controller.state === ARMED ? controller.dwellProgress : 0,
      performance.now() < cursor.flashUntil);
  } else {
    drawCursor(ctx, cursor, 0, false);
  }
}

// --- メインループ（推定） ---

function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();

  state.frames++;
  if (now - state.fpsAt >= 1000) {
    state.fps = (state.frames * 1000) / (now - state.fpsAt);
    state.frames = 0;
    state.fpsAt = now;
  }

  if (state.stream && state.landmarker && els.cam.readyState >= 2) {
    if (els.cam.currentTime !== state.lastVideoTime) {
      state.lastVideoTime = els.cam.currentTime;
      try {
        state.result = state.landmarker.detectForVideo(els.cam, now);
      } catch {
        state.result = null;
      }
    }
  }

  const landmarks = state.result && state.result.faceLandmarks && state.result.faceLandmarks[0];
  const count = landmarks ? landmarks.length : 0;
  let estimated = false;

  if (landmarks && count >= core.LANDMARK_COUNT) {
    if (state.collecting) {
      if (core.extractFeatures(landmarks, count, state.feature)) {
        state.collecting(Float64Array.from(state.feature));
      }
    } else if (!state.calibrating) {
      estimated = estimateGaze(landmarks, count, now);
    }
  }

  if (state.stream) {
    state.statFrames++;
    if (!estimated) state.statMisses++;
  }

  // 制御側には「観測」として渡すだけ。どう動かすかは controller.js が決める。
  if (estimated && state.controller) {
    state.controller.observeGaze(now, now, state.gaze.x, state.gaze.y, 1);
  }

  if (!els.stage.hidden) draw();

  if (now - state.statsAt >= 400) {
    state.statsAt = now;
    els.hudFps.textContent = state.stream ? state.fps.toFixed(0) : "0";
    const rate = state.stream ? (state.statMisses / Math.max(state.statFrames, 1)) * 100 : 0;
    els.hudMiss.textContent = `${rate.toFixed(0)}%`;
    state.statFrames = 0;
    state.statMisses = 0;
    renderController();
  }
}

/** 制御側の状態を HUD に出す。 */
function renderController() {
  const controller = state.controller;
  if (!controller) {
    els.hudState.textContent = "-";
    els.hudLatency.textContent = "--";
    return;
  }
  const snapshot = controller.snapshot();
  const reason = snapshot.reason && snapshot.state !== ARMED ? ` (${snapshot.reason})` : "";
  els.hudState.textContent = `${snapshot.state}${reason}`;
  els.hudLatency.textContent =
    snapshot.latencyMs === null || snapshot.latencyMs === undefined ? "--" : `${snapshot.latencyMs.toFixed(0)}ms`;
  els.track.textContent = snapshot.state === ARMED ? "STOP TRACKING" : "START TRACKING";
}

// --- UI ---

async function start() {
  els.start.disabled = true;
  try {
    await ensureCamera();
    await ensureLandmarker();
    els.stage.hidden = false;
    resizeOverlay();
    cursor.invalidate();
    cursor.x = window.innerWidth / 2;
    cursor.y = window.innerHeight / 2;
    if (els.stage.requestFullscreen) {
      await els.stage.requestFullscreen().catch(() => {});
    }
    resizeOverlay();
    setPageStatus("running");
    setHint(
      state.model
        ? "前回のキャリブレーションを読み込みました。START TRACKING で使えます"
        : "CALIBRATE を押して、出てくる9点を順に注視してください"
    );
  } catch (err) {
    setPageStatus("カメラを起動できませんでした");
    setHint((err && err.message) || String(err));
  } finally {
    els.start.disabled = false;
  }
}

function startTracking() {
  if (!state.model) {
    setHint("先に CALIBRATE で9点を注視してください");
    return;
  }
  resetFilters();
  state.medianX.reset();
  state.medianY.reset();
  state.controller = new PointerController(cursor, { dwellMs: state.dwellMs });
  state.controller.arm(performance.now(), window.innerWidth, window.innerHeight);
  renderController();
  setHint("視線でカーソルが動きます。止めたいときは Esc");
}

function stopTracking(reason) {
  if (!state.controller) return;
  state.controller.stop(reason || "stopped");
  renderController();
  if (reason) setHint(reason);
}

async function exitStage() {
  if (state.controller) state.controller.stop("exited");
  state.controller = null;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
  state.result = null;
  els.stage.hidden = true;
  setPageStatus("idle");
  renderController();
}

function toggleTracking() {
  if (state.controller && state.controller.state === ARMED) stopTracking("停止しました");
  else startTracking();
}

function bind() {
  els.start.addEventListener("click", start);
  els.calibrate.addEventListener("click", runCalibration);
  els.track.addEventListener("click", toggleTracking);
  els.exit.addEventListener("click", exitStage);

  els.dwell.addEventListener("input", () => {
    state.dwellMs = Number(els.dwell.value);
    els.dwellVal.textContent = `${state.dwellMs}ms`;
    if (state.controller) state.controller.setDwellMs(state.dwellMs);
  });

  els.smooth.addEventListener("input", () => {
    state.smoothSlider = Number(els.smooth.value);
    const cutoff = core.cutoffFromSmoothing(state.smoothSlider, CFG.smoothHzSlow, CFG.smoothHzFast);
    if (state.filterX) {
      state.filterX.setMinCutoff(cutoff);
      state.filterY.setMinCutoff(cutoff);
    }
    els.smoothVal.textContent = els.smooth.value;
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === " ") {
      event.preventDefault();
      toggleTracking();
    } else if (event.key === "Escape") {
      stopTracking("停止しました");
    }
  });

  window.addEventListener("resize", () => {
    if (!els.stage.hidden) {
      resizeOverlay();
      if (state.controller) {
        state.controller.widthPx = window.innerWidth;
        state.controller.heightPx = window.innerHeight;
      }
    }
  });

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) stopTracking("全画面を抜けたので停止しました");
    if (!els.stage.hidden) resizeOverlay();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopTracking("タブが非表示になったので停止しました");
  });
}

function init() {
  state.ctx = els.overlay.getContext("2d");
  state.accent =
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#d98fae";
  state.dwellMs = Number(els.dwell.value);
  state.smoothSlider = Number(els.smooth.value);
  els.dwellVal.textContent = `${state.dwellMs}ms`;
  els.smoothVal.textContent = els.smooth.value;
  loadCalibration();
  resetFilters();
  setCalibLabel();
  bind();
  requestAnimationFrame(frame);

  // 制御ループは推定レートとは別に、固定周期で回す（MCU ではここがタイマ割り込みになる）
  state.controlTimer = setInterval(() => {
    if (state.controller) state.controller.tick(performance.now());
  }, 1000 / CFG.controlHz);

  renderController();
  setPageStatus(state.model ? "ready" : "idle");
}

init();
