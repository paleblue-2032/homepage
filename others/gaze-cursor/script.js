import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const BRIDGE_FALLBACK = "http://127.0.0.1:8765";
const STORE_KEY = "gaze-cursor:calibration:v1";

const CFG = {
  samplesPerPoint: 40,
  settleMs: 550,
  sampleTimeoutMs: 3000,
  minSamplesPerPoint: 12,
  ridgeLambda: 1e-3,
  maxStepPx: 220,
  medianWindow: 3,
  smoothingDefault: 28,
  minCutoffFast: 1.6,
  minCutoffSlow: 0.4,
  euroBeta: 0.012,
  feedbackTimeoutMs: 600,
  recenterCooldownMs: 1200,
  minStepPx: 1.5,
  dwellRadiusPx: 48,
  dwellRearmFactor: 2.5,
  dwellCooldownMs: 700,
  latencyWindow: 30,
};

// 虹彩の位置を「目頭-目尻の線分」と「上瞼-下瞼の線分」に射影して比率にする。
// 左右の目は鏡像の並びなので、同じ順序で射影すると水平成分が逆に動いて平均で打ち消し合う。
// 添字は 33↔263 / 133↔362 がそれぞれ鏡像の対応なので、2つ目の目は順序を逆にして
// 両目の軸が画像上で同じ向き（x が増える向き）になるようにしている。
const EYES = [
  { from: 33, to: 133, upper: 159, lower: 145, iris: 468 },
  { from: 362, to: 263, upper: 386, lower: 374, iris: 473 },
];

const els = {
  stage: document.getElementById("stage"),
  cam: document.getElementById("cam"),
  overlay: document.getElementById("overlay"),
  start: document.getElementById("start"),
  calibrate: document.getElementById("calibrate"),
  track: document.getElementById("track"),
  exit: document.getElementById("exit"),
  dwell: document.getElementById("dwell"),
  dwellVal: document.getElementById("dwell-val"),
  smooth: document.getElementById("smooth"),
  smoothVal: document.getElementById("smooth-val"),
  pageStatus: document.getElementById("page-status"),
  hudTracking: document.getElementById("hud-tracking"),
  hudCalib: document.getElementById("hud-calib"),
  hudFps: document.getElementById("hud-fps"),
  hudMiss: document.getElementById("hud-miss"),
  hudLatency: document.getElementById("hud-latency"),
  hudCam: document.getElementById("hud-cam"),
  hudHint: document.getElementById("hud-hint"),
};

const state = {
  ctx: null,
  stream: null,
  landmarker: null,
  result: null,
  lastVideoTime: -1,
  lastDetectAt: 0,
  cal: null,
  collecting: null,
  calibTarget: null,
  tracking: false,
  pointer: { x: 0, y: 0 },
  pointerAt: -1e9,
  recenteredAt: -1e9,
  movePending: false,
  smooth: null,
  history: [],
  filterX: null,
  filterY: null,
  smoothValue: CFG.smoothingDefault,
  latencies: [],
  moveSentAt: 0,
  dwell: { anchorX: 0, anchorY: 0, since: 0, progress: 0, lastClick: -1e9, cooldown: false, ready: false },
  dwellMs: 900,
  frames: 0,
  statFrames: 0,
  statMisses: 0,
  fps: 0,
  fpsAt: 0,
  statsAt: 0,
  accent: "#d98fae",
};

let bridgeCache;

// --- 小物 ---

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const dot = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
};

function median(values) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function smoothingFactor(dt, cutoff) {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

// 1€ filter (Casiez et al. 2012)。速く動いているときは遮断周波数を上げて遅れを減らし、
// 止まっているときは下げて震えを消す。固定の指数移動平均だと「震えを消す」と
// 「遅れを減らす」が同じパラメータで綱引きになるが、これは速度で自動的に切り替わる。
class OneEuroFilter {
  constructor(minCutoff, beta) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = 1;
    this.reset();
  }

  reset() {
    this.value = null;
    this.rate = 0;
    this.time = 0;
  }

  filter(next, time) {
    if (this.value === null) {
      this.value = next;
      this.time = time;
      return next;
    }
    const dt = Math.min(Math.max((time - this.time) / 1000, 1e-3), 0.1);
    this.time = time;
    const rate = (next - this.value) / dt;
    this.rate += smoothingFactor(dt, this.dCutoff) * (rate - this.rate);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.rate);
    this.value += smoothingFactor(dt, cutoff) * (next - this.value);
    return this.value;
  }
}

// SMOOTH スライダー (0-100) → 静止時の遮断周波数。小さいほど平滑化が強い。
function cutoffFromSmoothing(value) {
  return CFG.minCutoffFast + (CFG.minCutoffSlow - CFG.minCutoffFast) * clamp01(value / 100);
}

function setHint(text) {
  els.hudHint.textContent = text || "";
}

function setPageStatus(text) {
  els.pageStatus.textContent = text;
}

function setTrackingLabel() {
  // 状態は HUD に、ボタンは「押すと何が起きるか」が分かる動詞にする
  els.hudTracking.textContent = state.tracking ? "ON" : "OFF";
  els.track.textContent = state.tracking ? "STOP TRACKING" : "START TRACKING";
}

function setCalibLabel() {
  state.cal
    ? (els.hudCalib.textContent = `±${Math.round(state.cal.errPx)}px`)
    : (els.hudCalib.textContent = "none");
}

// --- bridge ---

async function bridgeBase() {
  // 失敗は覚えない（bridge を後から起動しても START で繋がるように）
  if (bridgeCache) return bridgeCache;
  const probe = async (base) => {
    try {
      const res = await fetch(`${base}/api/status`, { cache: "no-store" });
      const data = await res.json();
      return data && data.ok ? data : null;
    } catch {
      return null;
    }
  };
  const same = await probe("");
  if (same) {
    bridgeCache = { base: "", info: same };
    return bridgeCache;
  }
  const remote = await probe(BRIDGE_FALLBACK);
  bridgeCache = remote ? { base: BRIDGE_FALLBACK, info: remote } : null;
  return bridgeCache;
}

async function post(path, body, keepalive) {
  const bridge = await bridgeBase();
  if (!bridge) return null;
  try {
    const res = await fetch(bridge.base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
      cache: "no-store",
      keepalive: !!keepalive,
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// --- 視線の特徴量 ---

function projectRatio(point, from, to) {
  const vx = to.x - from.x;
  const vy = to.y - from.y;
  const len2 = vx * vx + vy * vy;
  if (len2 < 1e-9) return 0.5;
  return ((point.x - from.x) * vx + (point.y - from.y) * vy) / len2;
}

function extractFeatures(lm) {
  let hSum = 0;
  let vSum = 0;
  for (const eye of EYES) {
    const iris = lm[eye.iris];
    if (!iris) return null;
    hSum += projectRatio(iris, lm[eye.from], lm[eye.to]);
    vSum += projectRatio(iris, lm[eye.upper], lm[eye.lower]);
  }
  const scale = Math.hypot(lm[133].x - lm[33].x, lm[133].y - lm[33].y);
  if (!(scale > 1e-6)) return null;
  return { h: hSum / EYES.length, v: vSum / EYES.length, scale };
}

// 目・頭の動きをそのまま特徴量にする。scale（両目間距離）はカメラへの寄り引きを吸収する。
// 項を増やすと9点に対して自由度が足りなくなり、1点の失敗が回帰全体を歪めるので6項で止める。
function basis(f) {
  return [1, f.h, f.v, f.h * f.h, f.v * f.v, f.scale];
}

function medianFeatures(samples) {
  return {
    h: median(samples.map((s) => s.h)),
    v: median(samples.map((s) => s.v)),
    scale: median(samples.map((s) => s.scale)),
  };
}

// --- 回帰 ---

function makeScaler(rows) {
  const m = rows[0].length;
  const mean = new Array(m).fill(0);
  const std = new Array(m).fill(1);
  for (let j = 1; j < m; j++) {
    mean[j] = rows.reduce((acc, r) => acc + r[j], 0) / rows.length;
    const variance = rows.reduce((acc, r) => acc + (r[j] - mean[j]) ** 2, 0) / rows.length;
    std[j] = Math.sqrt(variance) || 1;
  }
  return { mean, std };
}

function applyScaler(scaler, row) {
  const out = new Array(row.length);
  for (let j = 0; j < row.length; j++) {
    out[j] = j === 0 ? 1 : (row[j] - scaler.mean[j]) / scaler.std[j];
  }
  return out;
}

// リッジ回帰を正規方程式 + ガウス・ジョルダンで解く（x/y それぞれ 7 係数）
function solveRidge(rows, targets) {
  const m = rows[0].length;
  const mat = Array.from({ length: m }, () => new Float64Array(m + 1));
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    for (let r = 0; r < m; r++) {
      for (let c = 0; c < m; c++) mat[r][c] += row[r] * row[c];
      mat[r][m] += row[r] * targets[i];
    }
  }
  let trace = 0;
  for (let i = 0; i < m; i++) trace += mat[i][i];
  trace /= m;
  for (let i = 0; i < m; i++) mat[i][i] += CFG.ridgeLambda * Math.max(trace, 1e-9);

  for (let col = 0; col < m; col++) {
    let pivot = col;
    for (let r = col + 1; r < m; r++) {
      if (Math.abs(mat[r][col]) > Math.abs(mat[pivot][col])) pivot = r;
    }
    if (pivot !== col) [mat[col], mat[pivot]] = [mat[pivot], mat[col]];
    const diag = mat[col][col];
    if (Math.abs(diag) < 1e-12) continue;
    for (let c = col; c <= m; c++) mat[col][c] /= diag;
    for (let r = 0; r < m; r++) {
      if (r === col) continue;
      const factor = mat[r][col];
      if (!factor) continue;
      for (let c = col; c <= m; c++) mat[r][c] -= factor * mat[col][c];
    }
  }
  return mat.map((row) => row[m]);
}

function fitModel(points) {
  const scaler = makeScaler(points.map((p) => p.row));
  const rows = points.map((p) => applyScaler(scaler, p.row));
  const coefX = solveRidge(rows, points.map((p) => p.x));
  const coefY = solveRidge(rows, points.map((p) => p.y));
  return { scaler, coefX, coefY };
}

const avgDim = () => (window.innerWidth + window.innerHeight) / 2;

// 外れ値は「その点を抜いて作ったモデルで、その点を予測したときの誤差」で見つける。
// 1点だけ大きく外していると、残差の中央値まで一緒に膨らんで隠れてしまうため、
// 自分自身を含めない予測誤差のほうが遥かに判別しやすい。
function leaveOneOutResiduals(points) {
  return points.map((point, i) => {
    const rest = points.filter((_, j) => j !== i);
    if (rest.length < 5) return 0;
    const model = fitModel(rest);
    const row = applyScaler(model.scaler, point.row);
    return Math.hypot(dot(model.coefX, row) - point.x, dot(model.coefY, row) - point.y);
  });
}

const rms = (values) => Math.sqrt(values.reduce((a, v) => a + v * v, 0) / values.length);
const leaveOneOutRms = (points) => rms(leaveOneOutResiduals(points));

// 9点に対して6項なので、1点でも大きく外すと回帰全体が引きずられる。
// 「どの1点を除くと残りの予測誤差が最も良くなるか」を総当たりで見て、
// はっきり良くなる（半分以下）ならそれは外れ値とみなして捨てる。
function fitWithRejection(points) {
  let kept = points;
  let score = leaveOneOutRms(points);

  if (points.length > 6) {
    let worstIndex = -1;
    let bestScore = score;
    for (let i = 0; i < points.length; i++) {
      const candidate = leaveOneOutRms(points.filter((_, j) => j !== i));
      if (candidate < bestScore) {
        bestScore = candidate;
        worstIndex = i;
      }
    }
    if (worstIndex >= 0 && bestScore < score * 0.5) {
      kept = points.filter((_, i) => i !== worstIndex);
      score = bestScore;
    }
  }

  // 表示する誤差は leave-one-out の RMS（in-sample より実際に近い）
  return { model: fitModel(kept), errPx: score * avgDim(), dropped: points.length - kept.length };
}

function predict(features) {
  if (!state.cal) return null;
  const row = applyScaler(state.cal.scaler, basis(features));
  const x = dot(state.cal.coefX, row);
  const y = dot(state.cal.coefY, row);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: clamp01(x), y: clamp01(y) };
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
      samples.push(features);
      if (samples.length >= count) finish();
    };
  });
}

async function runCalibration() {
  if (!state.stream) {
    setHint("先に START でカメラを起動してください");
    return;
  }
  if (state.tracking) stopTracking("キャリブレーションのため停止しました");

  state.collecting = null;
  els.calibrate.disabled = true;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const fractions = [0.125, 0.5, 0.875];
  const targets = [];
  for (const fy of fractions) {
    for (const fx of fractions) targets.push({ x: fx, y: fy });
  }

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
      points.push({
        row: basis(medianFeatures(samples)),
        x: target.x,
        y: target.y,
      });
      if (state.calibTarget) state.calibTarget.progress = 1;
      await sleep(180);
    }

    const fitted = fitWithRejection(points);
    state.cal = { ...fitted.model, errPx: fitted.errPx };
    resetFilters();
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        scaler: state.cal.scaler,
        coefX: state.cal.coefX,
        coefY: state.cal.coefY,
        errPx: state.cal.errPx,
      })
    );
    setCalibLabel();
    const droppedNote = fitted.dropped ? `（${fitted.dropped}点は外れ値として除外）` : "";
    setHint(
      `キャリブレーション完了 — 誤差 約 ${Math.round(fitted.errPx)} px${droppedNote}。START TRACKING で使えます`
    );
  } catch (err) {
    setHint((err && err.message) || String(err));
  } finally {
    state.calibTarget = null;
    els.calibrate.disabled = false;
  }
}

function loadCalibration() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved || !saved.coefX || !saved.scaler) return;
    state.cal = saved;
    setCalibLabel();
  } catch {
    /* 壊れた保存値は無視する */
  }
}

// --- カーソル制御 (位置フィードバック付きの閉ループ) ---

async function recenter(now) {
  if (state.movePending || now - state.recenteredAt < CFG.recenterCooldownMs) return;
  state.recenteredAt = now;
  state.pointer = { x: 0, y: 0 };
  state.pointerAt = now;
  resetFilters();
  await post("/api/recenter");
}

async function sendMove(dx, dy) {
  state.movePending = true;
  state.moveSentAt = performance.now();
  const res = await post("/api/move", { dx, dy });
  state.movePending = false;
  if (!res) {
    stopTracking("bridge への送信に失敗しました");
    return;
  }
  if (res.enabled === false) stopTracking("bridge 側で停止しています");
}

function updateDwell(target, now) {
  const dwell = state.dwell;
  const radius = CFG.dwellRadiusPx;

  if (!dwell.ready) {
    dwell.anchorX = target.x;
    dwell.anchorY = target.y;
    dwell.since = now;
    dwell.ready = true;
    dwell.progress = 0;
    return;
  }

  const toAnchor = Math.hypot(target.x - dwell.anchorX, target.y - dwell.anchorY);

  if (dwell.cooldown) {
    if (toAnchor > radius * CFG.dwellRearmFactor && now - dwell.lastClick > CFG.dwellCooldownMs) {
      dwell.cooldown = false;
      dwell.anchorX = target.x;
      dwell.anchorY = target.y;
      dwell.since = now;
    }
    dwell.progress = 0;
    return;
  }

  // 視線が大きく動いたらアンカーを置き直す（止まった場所でだけ時間を数える）
  if (toAnchor > radius * CFG.dwellRearmFactor) {
    dwell.anchorX = target.x;
    dwell.anchorY = target.y;
    dwell.since = now;
    dwell.progress = 0;
    return;
  }

  const elapsed = now - dwell.since;
  dwell.progress = clamp01(elapsed / state.dwellMs);
  if (elapsed >= state.dwellMs && toAnchor <= radius) {
    dwell.cooldown = true;
    dwell.lastClick = now;
    dwell.progress = 0;
    post("/api/click", { button: "left" });
  }
}

function resetFilters() {
  const cutoff = cutoffFromSmoothing(state.smoothValue);
  state.filterX = new OneEuroFilter(cutoff, CFG.euroBeta);
  state.filterY = new OneEuroFilter(cutoff, CFG.euroBeta);
  state.smooth = null;
  state.history = [];
}

function stepTracking(features, now) {
  const raw = predict(features);
  if (!raw) return;
  const width = window.innerWidth;
  const height = window.innerHeight;

  // 直近3フレームの中央値で、瞬きなどによる単発のスパイクを落とす
  state.history.push({ x: raw.x * width, y: raw.y * height });
  if (state.history.length > CFG.medianWindow) state.history.shift();
  const med = {
    x: median(state.history.map((p) => p.x)),
    y: median(state.history.map((p) => p.y)),
  };

  const target = {
    x: state.filterX.filter(med.x, now),
    y: state.filterY.filter(med.y, now),
  };
  state.smooth = target;

  if (now - state.pointerAt > CFG.feedbackTimeoutMs) {
    recenter(now);
    return;
  }

  if (!state.movePending) {
    const errX = target.x - state.pointer.x;
    const errY = target.y - state.pointer.y;
    const distance = Math.hypot(errX, errY);
    if (distance > CFG.minStepPx) {
      const scale = Math.min(1, CFG.maxStepPx / distance);
      sendMove(errX * scale, errY * scale);
    }
  }

  updateDwell(target, now);
}

function startTracking() {
  if (!state.cal) {
    setHint("先に CALIBRATE で9点を注視してください");
    return;
  }
  state.tracking = true;
  resetFilters();
  state.pointer = { x: 0, y: 0 };
  state.pointerAt = performance.now();
  state.recenteredAt = -1e9;
  state.dwell = {
    anchorX: 0,
    anchorY: 0,
    since: performance.now(),
    progress: 0,
    lastClick: -1e9,
    cooldown: false,
    ready: false,
  };
  setTrackingLabel();
  setHint("視線でカーソルが動きます。止めたいときは Esc");
  state.movePending = true; // 原点合わせが終わるまで移動を送らない
  post("/api/recenter")
    .then(() => post("/api/enable"))
    .then(() => {
      state.movePending = false;
    });
}

function stopTracking(reason) {
  if (!state.tracking) return;
  state.tracking = false;
  state.smooth = null;
  state.dwell.progress = 0;
  state.moveSentAt = 0;
  setTrackingLabel();
  if (reason) setHint(reason);
  post("/api/stop", {}, true);
}

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
}

// --- 描画 ---

function resizeOverlay() {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  els.overlay.width = Math.round(width * dpr);
  els.overlay.height = Math.round(height * dpr);
  state.ctx = els.overlay.getContext("2d");
  state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawLandmarks(ctx, lm, width, height) {
  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.fillStyle = state.accent;
  for (const eye of EYES) {
    const outer = lm[eye.outer];
    const inner = lm[eye.inner];
    const upper = lm[eye.upper];
    const lower = lm[eye.lower];
    const iris = lm[eye.iris];
    if (!iris) continue;
    ctx.beginPath();
    ctx.moveTo(outer.x * width, outer.y * height);
    ctx.lineTo(inner.x * width, inner.y * height);
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

function drawGaze(ctx, point, progress) {
  ctx.strokeStyle = state.accent;
  ctx.lineWidth = 1.5;
  const size = 9;
  ctx.beginPath();
  ctx.moveTo(point.x - size, point.y);
  ctx.lineTo(point.x + size, point.y);
  ctx.moveTo(point.x, point.y - size);
  ctx.lineTo(point.x, point.y + size);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = state.accent;
  ctx.fill();

  if (progress > 0) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
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

  const lm = state.result && state.result.faceLandmarks && state.result.faceLandmarks[0];
  if (lm && lm.length >= 478) drawLandmarks(ctx, lm, width, height);
  if (state.calibTarget) drawCalibrationTarget(ctx, state.calibTarget);
  if (state.tracking && state.smooth) drawGaze(ctx, state.smooth, state.dwell.progress);
}

// --- メインループ ---

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

  const lm = state.result && state.result.faceLandmarks && state.result.faceLandmarks[0];
  const features = lm && lm.length >= 478 ? extractFeatures(lm) : null;
  if (features && state.collecting) state.collecting(features);

  if (state.tracking && features) stepTracking(features, now);
  else if (state.tracking && now - state.pointerAt > CFG.feedbackTimeoutMs) recenter(now);

  if (!els.stage.hidden) draw();

  if (state.stream) {
    state.statFrames++;
    if (!features) state.statMisses++;
  }
  if (now - state.statsAt >= 400) {
    state.statsAt = now;
    els.hudFps.textContent = state.stream ? state.fps.toFixed(0) : "0";
    const rate = state.stream ? (state.statMisses / Math.max(state.statFrames, 1)) * 100 : 0;
    els.hudMiss.textContent = `${rate.toFixed(0)}%`;
    els.hudLatency.textContent = state.latencies.length ? `${median(state.latencies).toFixed(1)}ms` : "--";
    state.statFrames = 0;
    state.statMisses = 0;
  }
}

// --- UI ---

function toggleTracking() {
  if (state.tracking) stopTracking("追跡を停止しました");
  else startTracking();
}

async function start() {
  els.start.disabled = true;
  try {
    const bridge = await bridgeBase();
    if (!bridge) {
      setPageStatus("bridge: 未接続 — python3 others/gaze-cursor/bridge.py を実行してください");
      setHint("ローカルのブリッジに接続できません");
      return;
    }
    setPageStatus(
      `bridge: 接続OK${bridge.info.dry_run ? " (dry-run: カーソルは動きません)" : ""}`
    );
    await ensureCamera();
    await ensureLandmarker();
    const settings = state.stream.getVideoTracks()[0].getSettings();
    els.hudCam.textContent = `${settings.width}x${settings.height}@${Math.round(settings.frameRate)}`;
    state.latencies = [];
    els.stage.hidden = false;
    resizeOverlay();
    if (els.stage.requestFullscreen) {
      await els.stage.requestFullscreen().catch(() => {});
    }
    setHint(
      state.cal
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

function exitStage() {
  stopTracking("終了しました");
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
  state.result = null;
  els.stage.hidden = true;
  setPageStatus("bridge: 待機中");
}

function bind() {
  els.start.addEventListener("click", start);
  els.calibrate.addEventListener("click", runCalibration);
  els.track.addEventListener("click", toggleTracking);
  els.exit.addEventListener("click", exitStage);

  els.dwell.addEventListener("input", () => {
    state.dwellMs = Number(els.dwell.value);
    els.dwellVal.textContent = `${state.dwellMs}ms`;
  });

  els.smooth.addEventListener("input", () => {
    state.smoothValue = Number(els.smooth.value);
    const cutoff = cutoffFromSmoothing(state.smoothValue);
    if (state.filterX) {
      state.filterX.minCutoff = cutoff;
      state.filterY.minCutoff = cutoff;
    }
    els.smoothVal.textContent = els.smooth.value;
  });

  window.addEventListener("mousemove", (event) => {
    // 送信から「カーソルが実際に動いた」と分かるまでの時間を測る（体感遅延に一番近い）
    const reacted = state.moveSentAt && (event.clientX !== state.pointer.x || event.clientY !== state.pointer.y);
    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
    state.pointerAt = performance.now();
    if (state.moveSentAt) {
      const roundTrip = state.pointerAt - state.moveSentAt;
      if (reacted && roundTrip < 200) {
        state.latencies.push(roundTrip);
        if (state.latencies.length > CFG.latencyWindow) state.latencies.shift();
      }
      state.moveSentAt = 0;
    }
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
    if (!els.stage.hidden) resizeOverlay();
  });

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && state.tracking) {
      stopTracking("全画面を抜けたので停止しました");
    }
    if (!els.stage.hidden) resizeOverlay();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopTracking("タブが非表示になったので停止しました");
  });

  window.addEventListener("pagehide", () => {
    state.tracking = false;
    post("/api/stop", {}, true);
  });
}

function init() {
  state.ctx = els.overlay.getContext("2d");
  state.accent =
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#d98fae";
  state.dwellMs = Number(els.dwell.value);
  state.smoothValue = Number(els.smooth.value);
  els.dwellVal.textContent = `${state.dwellMs}ms`;
  els.smoothVal.textContent = els.smooth.value;
  loadCalibration();
  resetFilters();
  setTrackingLabel();
  setCalibLabel();
  bind();
  requestAnimationFrame(frame);

  bridgeBase().then((bridge) => {
    if (bridge) {
      setPageStatus(
        `bridge: 接続OK${bridge.info.dry_run ? " (dry-run: カーソルは動きません)" : ""}`
      );
    } else {
      setPageStatus("bridge: 未接続 — python3 others/gaze-cursor/bridge.py を実行してください");
    }
  });
}

init();
