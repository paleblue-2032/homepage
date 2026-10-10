/**
 * キチガイ風車 — 視線入力モジュール（ブラウザ側）。
 *
 * 推定そのものは gaze-core.js（homepage/others/gaze-cursor/core.js から移植）にある。
 * ここがやるのは「カメラを開く / 13点でキャリブする / 毎フレーム視線を推定して
 * 観測として外に出す」だけ。ゲーム側はこの観測（正規化座標 [0,1]）を消費するだけで、
 * 推定の中身には踏み込まない。カメラを開けない環境ではゲームがマウス入力へ落とす。
 *
 * カメラ映像はブラウザの中だけで使う。どこにも送信しない。
 */

import * as core from "./gaze-core.js";
import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const STORE_KEY = "kichigai-windmill:calibration:v1";

const CFG = {
  samplesPerTarget: 36,
  settleMs: 520,
  sampleTimeoutMs: 3000,
  minSamplesPerTarget: 12,
  ridgeLambda: 1e-3,
  // 13点。最初の中央で「正面」の基準姿勢を取るので、必ず中央から始める。
  targets: [
    { x: 0.5, y: 0.5 },
    { x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.9, y: 0.1 },
    { x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 },
    { x: 0.1, y: 0.9 }, { x: 0.5, y: 0.9 }, { x: 0.9, y: 0.9 },
    { x: 0.3, y: 0.1 }, { x: 0.7, y: 0.1 },
    { x: 0.3, y: 0.9 }, { x: 0.7, y: 0.9 },
  ],
  medianWindow: 5,
  smoothBeta: 0.012,
  smoothHzFast: 1.6,
  smoothHzSlow: 0.4,
  poseSmoothHz: 3.0,
  eyeSmoothHz: 12.0,
  maxRigidResidual: 0.05,
  maxYawDeg: 60,
  maxPitchDeg: 45,
  blinkRatio: 0.45,
  eyeBaselineFrames: 61,
};

const STATE = {
  idle: "idle",
  loading: "loading",
  calibrating: "calibrating",
  tracking: "tracking",
  error: "error",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function medianOfRows(rows, index) {
  const values = rows.map((row) => row[index]).sort((a, b) => a - b);
  const mid = values.length >> 1;
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

export class GazeTracker {
  constructor(options) {
    const opts = options || {};
    this.onSample = opts.onSample || (() => {});
    this.onStatus = opts.onStatus || (() => {});

    this.state = STATE.idle;
    this.stream = null;
    this.landmarker = null;
    this.result = null;
    this.lastVideoTime = -1;
    this.aspect = 16 / 9;
    this.model = null;
    this.errPx = 0;

    // 観測
    this.gaze = { x: 0.5, y: 0.5 };
    this.gazePx = { x: 0, y: 0 };
    this.present = false;
    this.gazeEver = false;
    this.quality = 0;

    this.mode = core.MODE_BOTH;

    // 推定の作業領域（毎フレーム使い回す）
    this.poseCloud = new Float64Array(core.POSE_COUNT * 3);
    this.rotation = new Float64Array(9);
    this.translation = new Float64Array(3);
    this.euler = new Float64Array(3);
    this.eyeFeatures = new Float64Array(2);
    this.irisLeft = new Float64Array(3);
    this.irisRight = new Float64Array(3);
    this.openness = new Float64Array(1);
    this.basis = new Float64Array(core.FEATURE_COUNT);
    this.predicted = new Float64Array(2);
    this.filteredPose = new Float64Array(2);
    this.filteredEye = new Float64Array(2);

    this.filterX = null;
    this.filterY = null;
    this.medianX = null;
    this.medianY = null;
    this.eyeMedian = null;
    this.poseYaw = null;
    this.posePitch = null;
    this.poseScale = null;
    this.eyeH = null;
    this.eyeV = null;

    this.collecting = null;
    this.calibTarget = null;
    this.rafId = 0;
    this.running = false;
    this.preview = false;

    // カメラ映像（環境確認用に薄く出す）
    this.video = document.createElement("video");
    this.video.playsInline = true;
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.className = "gaze-video";
    document.body.appendChild(this.video);

    // キャリブ用オーバーレイ
    this.overlay = document.createElement("canvas");
    this.overlay.className = "gaze-calib";
    document.body.appendChild(this.overlay);
    this.ctx = this.overlay.getContext("2d");
    this.accent = "#d98fae";

    this.resetFilters();
    this.eyeMedian = new core.MedianFilter(CFG.eyeBaselineFrames);
    this.loadCalibration();
  }

  setAccent(color) {
    if (color) this.accent = color;
  }

  isCalibrated() {
    return !!(this.model && this.model.reference);
  }

  calibrationErrorPx() {
    return Math.round(this.errPx);
  }

  resetFilters() {
    const cutoff = core.cutoffFromSmoothing(40, CFG.smoothHzSlow, CFG.smoothHzFast);
    this.filterX = new core.OneEuroFilter(cutoff, CFG.smoothBeta, 1);
    this.filterY = new core.OneEuroFilter(cutoff, CFG.smoothBeta, 1);
    this.medianX = new core.MedianFilter(CFG.medianWindow);
    this.medianY = new core.MedianFilter(CFG.medianWindow);
    this.poseYaw = new core.OneEuroFilter(CFG.poseSmoothHz, 0, 1);
    this.posePitch = new core.OneEuroFilter(CFG.poseSmoothHz, 0, 1);
    this.poseScale = new core.OneEuroFilter(CFG.poseSmoothHz, 0, 1);
    this.eyeH = new core.OneEuroFilter(CFG.eyeSmoothHz, 0, 1);
    this.eyeV = new core.OneEuroFilter(CFG.eyeSmoothHz, 0, 1);
  }

  async listCameras() {
    try {
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
      return devices.map((device, index) => ({ id: device.deviceId, label: device.label || `camera ${index + 1}` }));
    } catch {
      return [];
    }
  }

  async openCamera(deviceId) {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    const video = deviceId
      ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
      : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };
    this.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    this.video.srcObject = this.stream;
    await this.video.play();
    const settings = this.stream.getVideoTracks()[0].getSettings();
    this.aspect = settings.width && settings.height ? settings.width / settings.height : 16 / 9;
    if (this.model && this.model.meta && this.model.meta.aspect &&
        Math.abs(this.model.meta.aspect - this.aspect) > 0.01) {
      this.onStatus("カメラの解像度が変わったので、キャリブレーションをやり直してください", true);
    }
    return settings;
  }

  setPreview(on) {
    this.preview = !!on;
    this.video.classList.toggle("is-preview", this.preview);
  }

  async ensureModel() {
    if (this.landmarker) return this.landmarker;
    this.state = STATE.loading;
    this.onStatus("視線モデルを読み込んでいます…");
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
      this.landmarker = await FaceLandmarker.createFromOptions(fileset, options("GPU"));
    } catch {
      this.landmarker = await FaceLandmarker.createFromOptions(fileset, options("CPU"));
    }
    return this.landmarker;
  }

  /** カメラとモデルを用意する。start() を呼ぶまで推定は回さない。 */
  async prepare(deviceId) {
    await this.openCamera(deviceId);
    await this.ensureModel();
    this.state = STATE.idle;
    return this;
  }

  start() {
    if (this.running) return;
    this.running = true;
    if (!this.eyeMedian) this.eyeMedian = new core.MedianFilter(CFG.eyeBaselineFrames);
    const loop = () => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(loop);
      this.frame();
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.present = false;
  }

  destroy() {
    this.stop();
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video.parentNode) this.video.parentNode.removeChild(this.video);
    if (this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
  }

  // --- フレーム ---

  frame() {
    const now = performance.now();
    if (this.stream && this.landmarker && this.video.readyState >= 2) {
      if (this.video.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = this.video.currentTime;
        try {
          this.result = this.landmarker.detectForVideo(this.video, now);
        } catch {
          this.result = null;
        }
      }
    }

    const landmarks = this.result && this.result.faceLandmarks && this.result.faceLandmarks[0];
    const count = landmarks ? landmarks.length : 0;
    let estimated = false;

    if (landmarks && count >= core.LANDMARK_COUNT) {
      if (this.collecting) {
        this.collecting(landmarks);
      } else {
        estimated = this.estimateGaze(landmarks, count, now);
      }
    }

    this.present = estimated;
    if (estimated) this.gazeEver = true;
    this.onSample(this.gaze.x, this.gaze.y, estimated, this.quality);

    if (this.calibTarget) this.drawCalibration();
    else if (this.overlay.dataset.on === "1") this.clearOverlay();
  }

  estimateGaze(landmarks, count, timeMs) {
    const model = this.model;
    if (!model || !model.reference) return false;
    const aspect = this.aspect;

    if (!core.extractPoseCloud(landmarks, count, aspect, this.poseCloud)) return false;
    const scale = core.solveRigidTransform(
      model.reference, this.poseCloud, core.POSE_COUNT, this.rotation, this.translation
    );
    this.quality = core.rigidResidual(
      model.reference, this.poseCloud, core.POSE_COUNT, this.rotation, this.translation, scale
    );
    const residualGate =
      model.meta && model.meta.residualMedian
        ? Math.max(CFG.maxRigidResidual, model.meta.residualMedian * 3)
        : CFG.maxRigidResidual;
    if (!(this.quality <= residualGate)) return false;

    core.eulerFromRotation(this.rotation, this.euler);
    if (Math.abs(this.euler[0]) > CFG.maxYawDeg || Math.abs(this.euler[1]) > CFG.maxPitchDeg) return false;

    core.eyeOpenness(landmarks, count, aspect, this.openness);
    this.eyeMedian.push(this.openness[0]);
    const baseline = this.eyeMedian.count >= 5 ? this.eyeMedian.value : 0;
    if (baseline > 0 && this.openness[0] < baseline * CFG.blinkRatio) return false;

    core.landmarkToIsotropic(landmarks[468], aspect, this.irisLeft);
    core.landmarkToIsotropic(landmarks[473], aspect, this.irisRight);
    core.extractEyeFeatures(
      this.irisLeft, this.irisRight, this.rotation, this.translation, scale, model.reference, this.eyeFeatures
    );

    this.filteredPose[0] = this.poseYaw.filter(this.euler[0], timeMs);
    this.filteredPose[1] = this.posePitch.filter(this.euler[1], timeMs);
    this.filteredEye[0] = this.eyeH.filter(this.eyeFeatures[0], timeMs);
    this.filteredEye[1] = this.eyeV.filter(this.eyeFeatures[1], timeMs);
    const smoothScale = this.poseScale.filter(scale, timeMs);

    core.fillBasis(this.filteredPose, this.filteredEye, smoothScale, this.basis);
    if (!model.predict(this.basis, this.predicted, this.mode)) return false;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const medianX = this.medianX.push(this.predicted[0] * width);
    const medianY = this.medianY.push(this.predicted[1] * height);
    this.gazePx.x = this.filterX.filter(medianX, timeMs);
    this.gazePx.y = this.filterY.filter(medianY, timeMs);
    this.gaze.x = this.gazePx.x / width;
    this.gaze.y = this.gazePx.y / height;
    return true;
  }

  // --- キャリブレーション ---

  collectSamples(count, timeoutMs) {
    return new Promise((resolve) => {
      const samples = [];
      const finish = () => {
        clearTimeout(timer);
        this.collecting = null;
        resolve(samples);
      };
      const timer = setTimeout(finish, timeoutMs);
      this.collecting = (landmarks) => {
        const sample = new Float64Array(core.REFERENCE_COUNT * 3 + 6);
        if (!core.extractReferenceCloud(landmarks, landmarks.length, this.aspect, sample)) return;
        const at = core.REFERENCE_COUNT * 3;
        core.landmarkToIsotropic(landmarks[468], this.aspect, sample.subarray(at, at + 3));
        core.landmarkToIsotropic(landmarks[473], this.aspect, sample.subarray(at + 3, at + 6));
        samples.push(sample);
        if (samples.length >= count) finish();
      };
    });
  }

  async calibrate() {
    if (!this.stream) throw new Error("先にカメラを起動してください");
    const wasRunning = this.running;
    if (wasRunning) this.stop();
    this.state = STATE.calibrating;
    this.overlay.dataset.on = "1";
    this.resizeOverlay();

    const width = window.innerWidth;
    const height = window.innerHeight;
    const targets = CFG.targets;
    const collected = [];

    try {
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        this.calibTarget = { x: target.x * width, y: target.y * height, index: i + 1, total: targets.length, progress: 0 };
        this.onStatus(
          i === 0
            ? `1/${targets.length} — 画面の中央を見て、頭をまっすぐに`
            : `${i + 1}/${targets.length} — 点を見つめたまま`
        );
        await sleep(CFG.settleMs);
        const samples = await this.collectSamples(CFG.samplesPerTarget, CFG.sampleTimeoutMs);
        if (samples.length < CFG.minSamplesPerTarget) {
          throw new Error(`点 ${i + 1} で顔を検出できませんでした。明るさと距離を確認してください`);
        }
        collected.push({ x: target.x, y: target.y, samples });
        if (this.calibTarget) this.calibTarget.progress = 1;
        await sleep(150);
      }

      // 中央の平均を「正面の基準姿勢」にする
      const reference = new Float64Array(core.REFERENCE_COUNT * 3);
      const centerSamples = collected[0].samples;
      for (let i = 0; i < reference.length; i++) {
        let sum = 0;
        for (let s = 0; s < centerSamples.length; s++) sum += centerSamples[s][i];
        reference[i] = sum / centerSamples.length;
      }

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

      residuals.sort((a, b) => a - b);
      const residualMedian = residuals[residuals.length >> 1];

      const fitted = core.calibrate(points, points.length, (width + height) / 2, CFG.ridgeLambda);
      this.model = new core.GazeModel(fitted.scaler, fitted.coefX, fitted.coefY, fitted.errPx, reference, {
        aspect: this.aspect,
        width,
        height,
        residualMedian,
      });
      this.errPx = fitted.errPx;
      localStorage.setItem(STORE_KEY, JSON.stringify(this.model.toJSON()));
      this.resetFilters();
      this.eyeMedian.reset();

      const droppedNote = fitted.dropped ? `（${fitted.dropped}点は外れ値として除外）` : "";
      const err = Math.round(fitted.errPx);
      const caution = residualMedian > 0.02
        ? "。ただし顔の捉え方が不安定です（明るさ・眼鏡の反射を確認）"
        : "";
      return { errPx: err, dropped: fitted.dropped, residualMedian, note: `誤差 約 ${err}px${droppedNote}${caution}` };
    } finally {
      this.calibTarget = null;
      this.overlay.dataset.on = "0";
      this.clearOverlay();
      this.state = STATE.idle;
    }
  }

  loadCalibration() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const model = core.GazeModel.fromJSON(JSON.parse(raw));
      if (!model || !model.reference) return;
      this.model = model;
      this.errPx = model.errPx || 0;
    } catch {
      /* 壊れた保存値は無視する */
    }
  }

  clearCalibration() {
    localStorage.removeItem(STORE_KEY);
    this.model = null;
    this.errPx = 0;
  }

  // --- キャリブの点を描く ---

  resizeOverlay() {
    const dpr = window.devicePixelRatio || 1;
    this.overlay.width = Math.round(window.innerWidth * dpr);
    this.overlay.height = Math.round(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  clearOverlay() {
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  drawCalibration() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const target = this.calibTarget;
    if (!target) return;
    const radius = 16;
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(target.x, target.y, radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = this.accent;
    ctx.fill();
    if (target.progress > 0) {
      ctx.beginPath();
      ctx.arc(target.x, target.y, radius + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * target.progress);
      ctx.strokeStyle = this.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  onResize() {
    if (this.overlay.dataset.on === "1") this.resizeOverlay();
  }
}

export { STATE as GAZE_STATE };
