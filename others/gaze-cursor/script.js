/**
 * gaze-cursor のブラウザ側（プラットフォーム層）。
 *
 * やることは「視線を推定して、観測として制御側に渡す」だけ。カーソルをどう動かすかは
 * 決めない（それは controller.js / 将来の MCU の仕事）。
 *
 * 推定は core.js（DOM 非依存・移植可能）にある。v2 では頭部姿勢（3Dの剛体合わせ）と
 * 眼球特徴を統合した。詳しくは core.js の冒頭コメントを参照。
 */

import * as core from "./core.js";
import { PointerController, ARMED, PAUSED, STOPPED } from "./controller.js";
import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const STORE_KEY = "gaze-cursor:calibration:v3";

const CFG = {
  // キャリブレーション
  samplesPerTarget: 40,
  settleMs: 550,
  sampleTimeoutMs: 3000,
  minSamplesPerTarget: 12,
  ridgeLambda: 1e-3,
  // 13点。最初の中央で「正面」の基準フレームを取るので、必ず中央から始める。
  targets: [
    { x: 0.5, y: 0.5 },
    { x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.9, y: 0.1 },
    { x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 },
    { x: 0.1, y: 0.9 }, { x: 0.5, y: 0.9 }, { x: 0.9, y: 0.9 },
    { x: 0.3, y: 0.1 }, { x: 0.7, y: 0.1 },
    { x: 0.3, y: 0.9 }, { x: 0.7, y: 0.9 },
  ],
  // 平滑化
  medianWindow: 5,
  smoothBeta: 0.012,
  smoothHzFast: 1.6,
  smoothHzSlow: 0.4,
  smoothDefault: 40,
  // 頭の向き・距離は動きが遅いので強く、眼球は速い（サッカード 30〜80ms）ので軽く。
  // MediaPipe の z は x/y より遥かにノイジーで、姿勢を経由して推定を大きく揺らすため、
  // 特徴量の段階で分けて平滑化する。
  poseSmoothHz: 3.0,
  eyeSmoothHz: 12.0,
  // 制御
  controlHz: 100,
  pauseAfterMs: 400,
  failStopAfterMs: 2500,
  // 制御（推定の揺れを追わないための不感帯。狭くすると敏感だが震えやすい）
  deadzonePx: 40,
  // 推定の品質
  maxRigidResidual: 0.05, // 剛体合わせの残差がこれを超えたら使わない
  maxYawDeg: 60,
  maxPitchDeg: 45,
  blinkRatio: 0.45,
  eyeBaselineFrames: 61,
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
  mode: document.getElementById("mode"),
  camera: document.getElementById("camera"),
  preview: document.getElementById("preview"),
  pageStatus: document.getElementById("page-status"),
  hudState: document.getElementById("hud-state"),
  hudGaze: document.getElementById("hud-gaze"),
  hudPose: document.getElementById("hud-pose"),
  hudQuality: document.getElementById("hud-quality"),
  hudCalib: document.getElementById("hud-calib"),
  hudLatency: document.getElementById("hud-latency"),
  hudCam: document.getElementById("hud-cam"),
  hudStats: document.getElementById("hud-stats"),
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
    this.x = Math.min(Math.max(this.x + dx, 0), window.innerWidth);
    this.y = Math.min(Math.max(this.y + dy, 0), window.innerHeight);
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
  aspect: 16 / 9,
  mode: core.MODE_BOTH,
  // 推定用の作業領域（毎フレーム使い回す）
  poseCloud: new Float64Array(core.POSE_COUNT * 3),
  rotation: new Float64Array(9),
  translation: new Float64Array(3),
  euler: new Float64Array(3),
  eyeFeatures: new Float64Array(2),
  irisLeft: new Float64Array(3),
  irisRight: new Float64Array(3),
  openness: new Float64Array(1),
  basis: new Float64Array(core.FEATURE_COUNT),
  predicted: new Float64Array(2),
  quality: 0,
  poseEver: false,
  // 平滑化
  filterX: null,
  filterY: null,
  medianX: null,
  medianY: null,
  eyeMedian: null,
  poseYaw: null,
  posePitch: null,
  poseScale: null,
  eyeH: null,
  eyeV: null,
  filteredPose: new Float64Array(2),
  filteredEye: new Float64Array(2),
  // 視線
  gaze: { x: 0.5, y: 0.5 },
  gazePx: { x: 0, y: 0 },
  gazeEver: false,
  missRate: 0,
  // 制御
  controller: null,
  controlTimer: 0,
  // キャリブレーション
  calibrating: false,
  calibTarget: null,
  collecting: null,
  // UI
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
const setHint = (text, alert) => {
  const next = text || "";
  if (els.hudHint.textContent === next && els.hudHint.classList.contains("is-alert") === !!alert) return;
  els.hudHint.textContent = next;
  els.hudHint.classList.toggle("is-alert", !!alert);
};
const setPageStatus = (text) => {
  els.pageStatus.textContent = text;
};

// --- カメラと推定器 ---

async function openCamera(deviceId) {
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
  const video = deviceId
    ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } }
    : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } };
  state.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
  els.cam.srcObject = state.stream;
  await els.cam.play();
  const settings = state.stream.getVideoTracks()[0].getSettings();
  els.hudCam.textContent = `${settings.width}x${settings.height}@${Math.round(settings.frameRate)}`;
  state.aspect = settings.width && settings.height ? settings.width / settings.height : 16 / 9;
  await fillCameraList(settings.deviceId);
  warnIfCalibrationStale();
}

/** カメラが複数ある環境で、顔が映る方を選べるようにする。 */
async function fillCameraList(activeId) {
  try {
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
    els.camera.innerHTML = "";
    devices.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || `camera ${index + 1}`;
      els.camera.appendChild(option);
    });
    if (activeId) els.camera.value = activeId;
  } catch {
    /* 列挙できない環境では何もしない */
  }
}

/** 解像度が変わると基準フレームが合わなくなるので、キャリブし直しを促す。 */
function warnIfCalibrationStale() {
  if (!state.model || !state.model.meta || !state.model.meta.aspect) return;
  if (Math.abs(state.model.meta.aspect - state.aspect) > 0.01) {
    setHint("カメラの解像度が変わったので、CALIBRATE をやり直してください", true);
  }
}

async function ensureLandmarker() {
  if (state.landmarker) return state.landmarker;
  setHint("視線モデルを読み込んでいます...");
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.3,
    minFacePresenceConfidence: 0.3,
    minTrackingConfidence: 0.3,
  });
  try {
    state.landmarker = await FaceLandmarker.createFromOptions(fileset, options("GPU"));
  } catch {
    state.landmarker = await FaceLandmarker.createFromOptions(fileset, options("CPU"));
  }
  return state.landmarker;
}

// --- 推定パイプライン ---

function resetFilters() {
  const cutoff = core.cutoffFromSmoothing(state.smoothSlider, CFG.smoothHzSlow, CFG.smoothHzFast);
  state.filterX = new core.OneEuroFilter(cutoff, CFG.smoothBeta, 1);
  state.filterY = new core.OneEuroFilter(cutoff, CFG.smoothBeta, 1);
  state.medianX = new core.MedianFilter(CFG.medianWindow);
  state.medianY = new core.MedianFilter(CFG.medianWindow);
  // 姿勢系は速度に応じた可変にする意味が薄いので beta=0（固定の一次ローパス）で使う
  state.poseYaw = new core.OneEuroFilter(CFG.poseSmoothHz, 0, 1);
  state.posePitch = new core.OneEuroFilter(CFG.poseSmoothHz, 0, 1);
  state.poseScale = new core.OneEuroFilter(CFG.poseSmoothHz, 0, 1);
  state.eyeH = new core.OneEuroFilter(CFG.eyeSmoothHz, 0, 1);
  state.eyeV = new core.OneEuroFilter(CFG.eyeSmoothHz, 0, 1);
}

/**
 * ランドマーク → 平滑化された視線（ビューポート px）。
 * 頭部姿勢（剛体合わせ）と眼球特徴を統合して推定する。使えないフレームは false。
 */
function estimateGaze(landmarks, count, timeMs) {
  const model = state.model;
  if (!model || !model.reference) return false;
  const aspect = state.aspect;

  // 1) 剛体合わせで頭部姿勢を解く
  if (!core.extractPoseCloud(landmarks, count, aspect, state.poseCloud)) return false;
  const scale = core.solveRigidTransform(
    model.reference, state.poseCloud, core.POSE_COUNT, state.rotation, state.translation
  );
  state.quality = core.rigidResidual(
    model.reference, state.poseCloud, core.POSE_COUNT, state.rotation, state.translation, scale
  );
  const residualGate =
    model.meta && model.meta.residualMedian
      ? Math.max(CFG.maxRigidResidual, model.meta.residualMedian * 3)
      : CFG.maxRigidResidual;
  if (!(state.quality <= residualGate)) return false;

  core.eulerFromRotation(state.rotation, state.euler);
  if (Math.abs(state.euler[0]) > CFG.maxYawDeg || Math.abs(state.euler[1]) > CFG.maxPitchDeg) return false;
  state.poseEver = true;

  // 2) 瞬き中は虹彩が当てにならない。ここで観測を出さずに「保持」する
  //    （頭だけの推定に切り替えると、視線との差が大きくて逆にカーソルが跳ねる）
  core.eyeOpenness(landmarks, count, aspect, state.openness);
  state.eyeMedian.push(state.openness[0]);
  const baseline = state.eyeMedian.count >= 5 ? state.eyeMedian.value : 0;
  if (baseline > 0 && state.openness[0] < baseline * CFG.blinkRatio) return false;

  // 3) 眼球特徴。虹彩を基準フレームへ写すので、頭の回転に依存しない
  core.landmarkToIsotropic(landmarks[468], aspect, state.irisLeft);
  core.landmarkToIsotropic(landmarks[473], aspect, state.irisRight);
  core.extractEyeFeatures(
    state.irisLeft, state.irisRight, state.rotation, state.translation, scale, model.reference, state.eyeFeatures
  );

  // 4) 特徴量を平滑化してから回帰に渡す（姿勢は強く、眼球は軽く）
  state.filteredPose[0] = state.poseYaw.filter(state.euler[0], timeMs);
  state.filteredPose[1] = state.posePitch.filter(state.euler[1], timeMs);
  state.filteredEye[0] = state.eyeH.filter(state.eyeFeatures[0], timeMs);
  state.filteredEye[1] = state.eyeV.filter(state.eyeFeatures[1], timeMs);
  const smoothScale = state.poseScale.filter(scale, timeMs);

  // 5) 特徴量 → 推定
  core.fillBasis(state.filteredPose, state.filteredEye, smoothScale, state.basis);
  if (!model.predict(state.basis, state.predicted, state.mode)) return false;

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

/**
 * 各フレームの生データを貯める。あとで「中央で取った正面姿勢」を基準にしてから
 * 特徴量へ変換するため、ここでは加工しない。
 * 1サンプル = 基準用クラウド(REFERENCE_COUNT*3) + 左右の虹彩(3+3)。
 */
function collectSamples(count, timeoutMs) {
  return new Promise((resolve) => {
    const samples = [];
    const timer = setTimeout(finish, timeoutMs);
    function finish() {
      clearTimeout(timer);
      state.collecting = null;
      resolve(samples);
    }
    state.collecting = (landmarks) => {
      const sample = new Float64Array(core.REFERENCE_COUNT * 3 + 6);
      if (!core.extractReferenceCloud(landmarks, landmarks.length, state.aspect, sample)) return;
      const at = core.REFERENCE_COUNT * 3;
      core.landmarkToIsotropic(landmarks[468], state.aspect, sample.subarray(at, at + 3));
      core.landmarkToIsotropic(landmarks[473], state.aspect, sample.subarray(at + 3, at + 6));
      samples.push(sample);
      if (samples.length >= count) finish();
    };
  });
}

function medianOfRows(rows, index) {
  const values = rows.map((row) => row[index]).sort((a, b) => a - b);
  const mid = values.length >> 1;
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

async function runCalibration() {
  if (!state.stream) {
    setHint("先に START でカメラを起動してください", true);
    return;
  }
  stopTracking("キャリブレーションのため停止しました");
  els.calibrate.disabled = true;
  state.poseEver = false;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const targets = CFG.targets;
  const collected = [];

  try {
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      state.calibTarget = { x: target.x * width, y: target.y * height, index: i + 1, total: targets.length, progress: 0 };
      setHint(
        i === 0
          ? `1/${targets.length} — 画面の中央を見て、頭をまっすぐにしてください`
          : `${i + 1}/${targets.length} — 点を見つめたままにしてください`
      );
      await sleep(CFG.settleMs);
      const samples = await collectSamples(CFG.samplesPerTarget, CFG.sampleTimeoutMs);
      if (samples.length < CFG.minSamplesPerTarget) {
        throw new Error(`点 ${i + 1} で顔を検出できませんでした。明るさと距離を確認してください`);
      }
      collected.push({ x: target.x, y: target.y, samples });
      if (state.calibTarget) state.calibTarget.progress = 1;
      await sleep(180);
    }

    // 中央のターゲットの平均を「正面の基準フレーム」にする
    const reference = new Float64Array(core.REFERENCE_COUNT * 3);
    const centerSamples = collected[0].samples;
    for (let i = 0; i < reference.length; i++) {
      let sum = 0;
      for (let s = 0; s < centerSamples.length; s++) sum += centerSamples[s][i];
      reference[i] = sum / centerSamples.length;
    }

    // 各サンプルを基準フレームで解いて特徴量にし、ターゲットごとに中央値を取る
    const rotation = new Float64Array(9);
    const translation = new Float64Array(3);
    const euler = new Float64Array(3);
    const eye = new Float64Array(2);
    const irisLeft = new Float64Array(3);
    const irisRight = new Float64Array(3);
    const basis = new Float64Array(core.FEATURE_COUNT);
    const irisAt = core.REFERENCE_COUNT * 3;
    const residuals = [];
    const points = collected.map((target) => {
      const rows = [];
      for (const sample of target.samples) {
        const cloud = sample.subarray(0, core.POSE_COUNT * 3);
        const scale = core.solveRigidTransform(reference, cloud, core.POSE_COUNT, rotation, translation);
        residuals.push(core.rigidResidual(reference, cloud, core.POSE_COUNT, rotation, translation, scale));
        core.eulerFromRotation(rotation, euler);
        irisLeft.set(sample.subarray(irisAt, irisAt + 3));
        irisRight.set(sample.subarray(irisAt + 3, irisAt + 6));
        core.extractEyeFeatures(irisLeft, irisRight, rotation, translation, scale, reference, eye);
        rows.push(Float64Array.from(core.fillBasis(euler, eye, scale, basis)));
      }
      const row = new Float64Array(core.FEATURE_COUNT);
      for (let j = 0; j < core.FEATURE_COUNT; j++) row[j] = medianOfRows(rows, j);
      return { row, x: target.x, y: target.y };
    });

    // 姿勢の品質ゲートは「この人・このカメラで実際に出た残差」を基準にする。
    // 絶対値で決めると、顔やカメラによっては全フレームを捨てて動かなくなる。
    residuals.sort((a, b) => a - b);
    const residualMedian = residuals[residuals.length >> 1];

    const fitted = core.calibrate(points, points.length, (width + height) / 2, CFG.ridgeLambda);
    state.model = new core.GazeModel(fitted.scaler, fitted.coefX, fitted.coefY, fitted.errPx, reference, {
      aspect: state.aspect,
      width,
      height,
      residualMedian,
    });
    state.errPx = fitted.errPx;
    localStorage.setItem(STORE_KEY, JSON.stringify(state.model.toJSON()));
    resetFilters();
    setCalibLabel();
    const droppedNote = fitted.dropped ? `（${fitted.dropped}点は外れ値として除外）` : "";
    if (residualMedian > 0.02) {
      setHint(
        `キャリブレーション完了 — 誤差 約 ${Math.round(fitted.errPx)} px${droppedNote}。ただし顔の捉え方が不安定です（QUAL ${residualMedian.toFixed(3)}）。明るさと髪・眼鏡の反射を確認してください`,
        true
      );
    } else {
      setHint(
        `キャリブレーション完了 — 誤差 約 ${Math.round(fitted.errPx)} px${droppedNote}。START TRACKING で使えます`
      );
    }
  } catch (err) {
    setHint((err && err.message) || String(err), true);
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
    if (!model || !model.reference) return;
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
  for (const eye of core.EYE_OPEN) {
    const upper = landmarks[eye.upper];
    const lower = landmarks[eye.lower];
    const from = landmarks[eye.from];
    const to = landmarks[eye.to];
    ctx.beginPath();
    ctx.moveTo(from.x * width, from.y * height);
    ctx.lineTo(to.x * width, to.y * height);
    ctx.moveTo(upper.x * width, upper.y * height);
    ctx.lineTo(lower.x * width, lower.y * height);
    ctx.stroke();
  }
  for (const index of [468, 473]) {
    const iris = landmarks[index];
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

function drawGaze(ctx, point) {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(point.x - 7, point.y);
  ctx.lineTo(point.x + 7, point.y);
  ctx.moveTo(point.x, point.y - 7);
  ctx.lineTo(point.x, point.y + 7);
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

  if (state.controller && !state.calibrating && state.model) {
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
      state.collecting(landmarks);
    } else if (!state.calibrating) {
      estimated = estimateGaze(landmarks, count, now);
    }
  }

  if (state.stream) {
    state.statFrames++;
    if (!estimated) state.statMisses++;
  }

  // 制御側には「観測」として渡すだけ。どう動かすかは controller.js が決める。
  if (estimated) {
    state.gazeEver = true;
    if (state.controller) state.controller.observeGaze(now, now, state.gaze.x, state.gaze.y, 1);
  }

  if (!els.stage.hidden) draw();

  if (now - state.statsAt >= 400) {
    state.statsAt = now;
    const rate = state.stream ? state.statMisses / Math.max(state.statFrames, 1) : 0;
    state.missRate = rate;
    els.hudStats.textContent = `${state.stream ? state.fps.toFixed(0) : "0"} / ${(rate * 100).toFixed(0)}%`;
    state.statFrames = 0;
    state.statMisses = 0;
    renderHud();
  }
}

/** 制御側が「動いている最中」か（一時停止も含む）。停止操作の判定に使う。 */
function isActive(controller) {
  return !!controller && (controller.state === ARMED || controller.state === PAUSED);
}

function renderHud() {
  const controller = state.controller;
  if (!controller) {
    els.hudState.textContent = "-";
    els.hudLatency.textContent = "--";
  } else {
    const snapshot = controller.snapshot();
    const reason = snapshot.reason && snapshot.state !== ARMED ? ` (${snapshot.reason})` : "";
    els.hudState.textContent = `${snapshot.state}${reason}`;
    els.hudLatency.textContent =
      snapshot.latencyMs === null || snapshot.latencyMs === undefined ? "--" : `${snapshot.latencyMs.toFixed(0)}ms`;
    els.track.textContent = isActive(controller) ? "STOP TRACKING" : "START TRACKING";
    if (snapshot.state === STOPPED) {
      setHint(
        state.missRate > 0.5
          ? "顔が検出できませんでした。カメラに顔が写る明るさ・距離にしてください（PREVIEW で確認できます）"
          : "視線が途切れたので停止しました。START TRACKING で再開できます",
        true
      );
    } else if (snapshot.state === PAUSED) {
      setHint("視線を待っています（HUD の STATS と QUAL を見てください）", false);
    } else if (snapshot.state === ARMED) {
      setHint("視線でカーソルが動きます。止めたいときは Esc");
    }
  }

  els.hudGaze.textContent = state.gazeEver
    ? `${(state.gaze.x * 100).toFixed(0)}, ${(state.gaze.y * 100).toFixed(0)}`
    : "--, --";
  els.hudPose.textContent = state.poseEver
    ? `${state.euler[0].toFixed(0)}, ${state.euler[1].toFixed(0)}`
    : "--, --";
  els.hudQuality.textContent = state.poseEver ? state.quality.toFixed(3) : "--";
}

// --- UI ---

async function start() {
  els.start.disabled = true;
  try {
    await openCamera(els.camera.value || null);
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
    if (state.model) {
      setHint("前回のキャリブレーションを読み込みました。START TRACKING で使えます");
    } else {
      setHint("CALIBRATE を押して、出てくる13点を順に注視してください", true);
    }
  } catch (err) {
    setPageStatus("カメラを起動できませんでした");
    setHint((err && err.message) || String(err), true);
  } finally {
    els.start.disabled = false;
  }
}

function startTracking() {
  if (!state.model || !state.model.reference) {
    setHint("キャリブレーションがまだです。CALIBRATE を押して、出てくる13点を順に注視してください", true);
    return;
  }
  resetFilters();
  state.medianX.reset();
  state.medianY.reset();
  state.eyeMedian.reset();
  state.gazeEver = false;
  state.poseEver = false;
  state.controller = new PointerController(cursor, {
    dwellMs: state.dwellMs,
    pauseAfterMs: CFG.pauseAfterMs,
    failStopAfterMs: CFG.failStopAfterMs,
    deadzonePx: CFG.deadzonePx,
  });
  state.controller.arm(performance.now(), window.innerWidth, window.innerHeight);
  renderHud();
  setHint("視線でカーソルが動きます。止めたいときは Esc");
}

function stopTracking(reason) {
  if (!state.controller) return;
  state.controller.stop(reason || "stopped");
  renderHud();
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
  renderHud();
}

function toggleTracking() {
  if (isActive(state.controller)) stopTracking("停止しました");
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

  els.mode.addEventListener("change", () => {
    state.mode = els.mode.value;
    setHint(
      state.mode === core.MODE_HEAD
        ? "頭の向きだけで動かします（視線は使いません）"
        : state.mode === core.MODE_GAZE
          ? "視線だけで動かします（頭の向きは使いません）"
          : "視線と頭の向きを統合して動かします"
    );
  });

  els.camera.addEventListener("change", async () => {
    try {
      await openCamera(els.camera.value);
      setHint("カメラを切り替えました");
    } catch (err) {
      setHint(`カメラを切り替えられませんでした: ${err && err.message ? err.message : err}`, true);
    }
  });

  els.preview.addEventListener("click", () => {
    els.stage.classList.toggle("is-preview");
    els.preview.textContent = els.stage.classList.contains("is-preview") ? "PREVIEW ON" : "PREVIEW";
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
  state.mode = els.mode.value;
  els.dwellVal.textContent = `${state.dwellMs}ms`;
  els.smoothVal.textContent = els.smooth.value;
  loadCalibration();
  state.eyeMedian = new core.MedianFilter(CFG.eyeBaselineFrames);
  resetFilters();
  setCalibLabel();
  bind();
  requestAnimationFrame(frame);

  // 制御ループは推定レートとは別に、固定周期で回す（MCU ではここがタイマ割り込みになる）
  state.controlTimer = setInterval(() => {
    if (state.controller) state.controller.tick(performance.now());
  }, 1000 / CFG.controlHz);

  renderHud();
  setPageStatus(state.model ? "ready (キャリブ済み)" : "idle");
}

init();
