/**
 * gaze-cursor の推定側コア（移植可能な部分）v2。
 *
 * v1 は「虹彩の比率＋両目間距離」を画像座標のまま回帰していたため、頭が動くと
 * 特徴量が一緒に動いてしまい、頭を振ると破綻した。v2 は:
 *
 *   1. 478点ランドマーク（z 付き）から剛体の顔モデルを Kabsch/Horn 法で当てて
 *      頭部姿勢（yaw/pitch/roll）とスケール（距離）を求める
 *   2. 虹彩をその剛体変換で「基準フレーム」（キャリブ時に正面を向いていた姿勢）へ
 *      写してから比率を取る。こうすると眼球特徴が頭の回転に依存しない
 *   3. 頭部姿勢と眼球特徴の両方を特徴量にして回帰する
 *      → 視線が読めないフレーム（瞬き）は眼球特徴を基準値に置き換えれば
 *        自動的に「頭の向きだけ」での推定に落ちる（融合）
 *
 * DOM もブラウザ API もカメラも触らない。移植のための約束は v1 と同じ:
 *   ホットパスで確保しない / 例外を投げない / 状態は明示的に持つ /
 *   単位を名前に書く（Normalized / Px / Ratio / Deg / Hz）/ async なし。
 *
 * 座標系: 画像は x が幅・y が高さの正規化なので、そのままでは等方でない。
 * 3D を扱うので「画像の高さ」を単位に揃えた等方座標に変換してから使う
 * （X = x * aspect, Y = y, Z = z * aspect。aspect = 幅/高さ）。
 */

// ---------------------------------------------------------------------------
// 使うランドマーク
// ---------------------------------------------------------------------------

/**
 * 頭部姿勢を解くための剛体ランドマーク。顔全体に散らばっていて、
 * 表情で大きく動かない点を選んである（目頭・目尻 / 鼻筋 / 鼻先 / 顎 / 頬 / 口角 / 額）。
 */
export const POSE_LANDMARKS = [
  33, 133, 362, 263, // 目頭・目尻
  168, 6, 197, 195, // 鼻筋
  1, 4, // 鼻先
  152, // 顎先
  234, 454, // 頬
  61, 291, // 口角
  10, // 額
];
export const POSE_COUNT = POSE_LANDMARKS.length;

/** 眼球特徴を基準フレームで測るために必要な瞼のランドマーク。 */
export const LID_LANDMARKS = [159, 145, 386, 374];
/** 基準フレームとして保存する点数（剛体 + 瞼）。 */
export const REFERENCE_COUNT = POSE_COUNT + LID_LANDMARKS.length;

/** 回帰に使う基底の数: [1, h, v, h^2, v^2, sin(yaw), sin(pitch), scale]。 */
export const FEATURE_COUNT = 8;

/** 特徴量の添字。 */
export const F_BIAS = 0;
export const F_EYE_H = 1;
export const F_EYE_V = 2;
export const F_EYE_H2 = 3;
export const F_EYE_V2 = 4;
export const F_YAW = 5;
export const F_PITCH = 6;
export const F_SCALE = 7;

export const LANDMARK_COUNT = 478;

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

// 基準フレーム内でのランドマーク添字（REFERENCE の並びは POSE → LID）
const REF_INDEX = {};
POSE_LANDMARKS.forEach((index, i) => { REF_INDEX[index] = i; });
LID_LANDMARKS.forEach((index, i) => { REF_INDEX[index] = POSE_COUNT + i; });

/** 左右の目。軸は基準フレーム（正面）での並びなので、画像の向きを気にしなくてよい。 */
const EYES = [
  { iris: 468, from: REF_INDEX[33], to: REF_INDEX[133], upper: REF_INDEX[159], lower: REF_INDEX[145] },
  { iris: 473, from: REF_INDEX[362], to: REF_INDEX[263], upper: REF_INDEX[386], lower: REF_INDEX[374] },
];

/** 目の開き具合を測るための上下の瞼（左右）。 */
export const EYE_OPEN = [
  { upper: 159, lower: 145, from: 33, to: 133 },
  { upper: 386, lower: 374, from: 362, to: 263 },
];

// ---------------------------------------------------------------------------
// ランドマーク → クラウド（等方座標）
// ---------------------------------------------------------------------------

function putPoint(out, index, landmark, aspect) {
  out[index * 3] = landmark.x * aspect;
  out[index * 3 + 1] = landmark.y;
  out[index * 3 + 2] = (landmark.z || 0) * aspect;
}

/** 頭部姿勢を解くための剛体クラウド。out は POSE_COUNT*3。 */
export function extractPoseCloud(landmarks, count, aspect, out) {
  if (count < LANDMARK_COUNT) return false;
  for (let i = 0; i < POSE_COUNT; i++) putPoint(out, i, landmarks[POSE_LANDMARKS[i]], aspect);
  return true;
}

/** 基準フレーム用のクラウド（剛体 + 瞼）。out は REFERENCE_COUNT*3。 */
export function extractReferenceCloud(landmarks, count, aspect, out) {
  if (!extractPoseCloud(landmarks, count, aspect, out)) return false;
  for (let i = 0; i < LID_LANDMARKS.length; i++) {
    putPoint(out, POSE_COUNT + i, landmarks[LID_LANDMARKS[i]], aspect);
  }
  return true;
}

/**
 * 目の開き具合（上下の瞼の距離 / 目頭-目尻の距離）。
 * 瞬きの最中は虹彩の位置が当てにならないので、この値でフレームを捨てる。
 * 個人差が大きいので絶対値ではなく普段の値（中央値）との比で使う。
 */
export function eyeOpenness(landmarks, count, aspect, out) {
  if (count < LANDMARK_COUNT) return false;
  let sum = 0;
  for (let e = 0; e < EYE_OPEN.length; e++) {
    const eye = EYE_OPEN[e];
    const upper = landmarks[eye.upper];
    const lower = landmarks[eye.lower];
    const from = landmarks[eye.from];
    const to = landmarks[eye.to];
    const height = Math.hypot((lower.x - upper.x) * aspect, lower.y - upper.y);
    const width = Math.hypot((to.x - from.x) * aspect, to.y - from.y);
    if (width > 1e-6) sum += height / width;
  }
  out[0] = sum / EYE_OPEN.length;
  return true;
}

// ---------------------------------------------------------------------------
// 剛体合わせ（Kabsch / Horn のクォータニオン法）
// ---------------------------------------------------------------------------

const scratch = {
  centroidRef: new Float64Array(3),
  centroidObs: new Float64Array(3),
  covariance: new Float64Array(9),
  normal: new Float64Array(16),
};

function centroid(cloud, count, out) {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < count; i++) {
    x += cloud[i * 3];
    y += cloud[i * 3 + 1];
    z += cloud[i * 3 + 2];
  }
  out[0] = x / count;
  out[1] = y / count;
  out[2] = z / count;
  return out;
}

/**
 * 基準クラウド → 観測クラウド の最良の相似変換（回転 R・スケール s・平行移動 t）を求める。
 * Horn の方法: 4x4 の対称行列の最大固有ベクトル（＝クォータニオン）をべき乗法で出す。
 * SVD が要らないので移植しやすい（3x3 の固有分解を書かなくて済む）。
 *
 * outRotation は 9 要素（行優先）、outTranslation は 3 要素。戻り値はスケール。
 */
export function solveRigidTransform(reference, observed, count, outRotation, outTranslation) {
  centroid(reference, count, scratch.centroidRef);
  centroid(observed, count, scratch.centroidObs);

  const rc = scratch.centroidRef;
  const oc = scratch.centroidObs;
  const cov = scratch.covariance;
  cov.fill(0);

  let refEnergy = 0;
  let obsEnergy = 0;
  for (let i = 0; i < count; i++) {
    const rx = reference[i * 3] - rc[0];
    const ry = reference[i * 3 + 1] - rc[1];
    const rz = reference[i * 3 + 2] - rc[2];
    const ox = observed[i * 3] - oc[0];
    const oy = observed[i * 3 + 1] - oc[1];
    const oz = observed[i * 3 + 2] - oc[2];
    refEnergy += rx * rx + ry * ry + rz * rz;
    obsEnergy += ox * ox + oy * oy + oz * oz;
    // S_ab = Σ (基準)_a (観測)_b。この向きでないと回転が逆になる（符号規約）
    cov[0] += rx * ox; cov[1] += rx * oy; cov[2] += rx * oz;
    cov[3] += ry * ox; cov[4] += ry * oy; cov[5] += ry * oz;
    cov[6] += rz * ox; cov[7] += rz * oy; cov[8] += rz * oz;
  }

  const sxx = cov[0], sxy = cov[1], sxz = cov[2];
  const syx = cov[3], syy = cov[4], syz = cov[5];
  const szx = cov[6], szy = cov[7], szz = cov[8];

  const N = scratch.normal;
  N[0] = sxx + syy + szz; N[1] = syz - szy; N[2] = szx - sxz; N[3] = sxy - syx;
  N[4] = syz - szy; N[5] = sxx - syy - szz; N[6] = sxy + syx; N[7] = szx + sxz;
  N[8] = szx - sxz; N[9] = sxy + syx; N[10] = -sxx + syy - szz; N[11] = syz + szy;
  N[12] = sxy - syx; N[13] = szx + sxz; N[14] = syz + szy; N[15] = -sxx - syy + szz;

  // べき乗法。初期値をいくつか試して、いちばん伸びる固有ベクトルを採る。
  let best = null;
  const seeds = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  for (let s = 0; s < seeds.length; s++) {
    let w = seeds[s][0];
    let x = seeds[s][1];
    let y = seeds[s][2];
    let z = seeds[s][3];
    let norm = Math.hypot(w, x, y, z) || 1;
    w /= norm; x /= norm; y /= norm; z /= norm;
    let magnitude = 0;
    for (let iteration = 0; iteration < 120; iteration++) {
      const nw = N[0] * w + N[1] * x + N[2] * y + N[3] * z;
      const nx = N[4] * w + N[5] * x + N[6] * y + N[7] * z;
      const ny = N[8] * w + N[9] * x + N[10] * y + N[11] * z;
      const nz = N[12] * w + N[13] * x + N[14] * y + N[15] * z;
      magnitude = Math.hypot(nw, nx, ny, nz);
      if (!(magnitude > 1e-12)) break;
      w = nw / magnitude; x = nx / magnitude; y = ny / magnitude; z = nz / magnitude;
    }
    if (magnitude > 1e-12 && (!best || magnitude > best.magnitude)) {
      best = { magnitude, w, x, y, z };
    }
  }

  const w = best ? best.w : 1;
  const x = best ? best.x : 0;
  const y = best ? best.y : 0;
  const z = best ? best.z : 0;

  outRotation[0] = w * w + x * x - y * y - z * z;
  outRotation[1] = 2 * (x * y - w * z);
  outRotation[2] = 2 * (x * z + w * y);
  outRotation[3] = 2 * (x * y + w * z);
  outRotation[4] = w * w - x * x + y * y - z * z;
  outRotation[5] = 2 * (y * z - w * x);
  outRotation[6] = 2 * (x * z - w * y);
  outRotation[7] = 2 * (y * z + w * x);
  outRotation[8] = w * w - x * x - y * y + z * z;

  const scale = refEnergy > 1e-12 ? Math.sqrt(obsEnergy / refEnergy) : 1;
  const R = outRotation;
  outTranslation[0] = oc[0] - scale * (R[0] * rc[0] + R[1] * rc[1] + R[2] * rc[2]);
  outTranslation[1] = oc[1] - scale * (R[3] * rc[0] + R[4] * rc[1] + R[5] * rc[2]);
  outTranslation[2] = oc[2] - scale * (R[6] * rc[0] + R[7] * rc[1] + R[8] * rc[2]);
  return scale;
}

/** 合わせ残差（基準を変換して観測と比べた RMS）。頭部姿勢の品質指標に使う。 */
export function rigidResidual(reference, observed, count, rotation, translation, scale) {
  const R = rotation;
  const t = translation;
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const rx = reference[i * 3];
    const ry = reference[i * 3 + 1];
    const rz = reference[i * 3 + 2];
    const px = scale * (R[0] * rx + R[1] * ry + R[2] * rz) + t[0];
    const py = scale * (R[3] * rx + R[4] * ry + R[5] * rz) + t[1];
    const pz = scale * (R[6] * rx + R[7] * ry + R[8] * rz) + t[2];
    const dx = px - observed[i * 3];
    const dy = py - observed[i * 3 + 1];
    const dz = pz - observed[i * 3 + 2];
    sum += dx * dx + dy * dy + dz * dz;
  }
  return Math.sqrt(sum / count);
}

/** 回転行列から yaw/pitch/roll [度]。R = Rz(roll) Ry(yaw) Rx(pitch) の並びで読む。 */
export function eulerFromRotation(rotation, out) {
  const R = rotation;
  const yaw = Math.asin(Math.max(-1, Math.min(1, -R[6])));
  const pitch = Math.atan2(R[7], R[8]);
  const roll = Math.atan2(R[3], R[0]);
  out[0] = (yaw * 180) / Math.PI;
  out[1] = (pitch * 180) / Math.PI;
  out[2] = (roll * 180) / Math.PI;
  return out;
}

/** 等方座標の点を基準フレームへ写す（回転とスケールを戻す）。out は長さ3。 */
export function toReferenceFrame(point, rotation, translation, scale, out) {
  const R = rotation;
  const dx = point[0] - translation[0];
  const dy = point[1] - translation[1];
  const dz = point[2] - translation[2];
  const inv = scale > 1e-9 ? 1 / scale : 1;
  out[0] = (R[0] * dx + R[3] * dy + R[6] * dz) * inv;
  out[1] = (R[1] * dx + R[4] * dy + R[7] * dz) * inv;
  out[2] = (R[2] * dx + R[5] * dy + R[8] * dz) * inv;
  return out;
}

/** 3D 点をクラウド内の線分 a→b に射影した比。a で 0、b で 1。 */
export function projectRatio3D(px, py, pz, cloud, aIndex, bIndex) {
  const ax = cloud[aIndex * 3];
  const ay = cloud[aIndex * 3 + 1];
  const az = cloud[aIndex * 3 + 2];
  const vx = cloud[bIndex * 3] - ax;
  const vy = cloud[bIndex * 3 + 1] - ay;
  const vz = cloud[bIndex * 3 + 2] - az;
  const len2 = vx * vx + vy * vy + vz * vz;
  if (len2 < 1e-12) return 0.5;
  return ((px - ax) * vx + (py - ay) * vy + (pz - az) * vz) / len2;
}

const irisScratch = new Float64Array(3);

/** ランドマーク1点を等方座標（X = x*aspect, Y = y, Z = z*aspect）にして out[0..2] に書く。 */
export function landmarkToIsotropic(landmark, aspect, out) {
  out[0] = landmark.x * aspect;
  out[1] = landmark.y;
  out[2] = (landmark.z || 0) * aspect;
  return out;
}

/**
 * 頭の回転に依存しない眼球特徴（基準フレームでの虹彩位置の比）を出す。
 * iris は等方座標の点（landmarkToIsotropic を通したもの）。
 * out[0] = h（目頭→目尻）、out[1] = v（上瞼→下瞼）。
 */
export function extractEyeFeatures(irisLeft, irisRight, rotation, translation, scale, reference, out) {
  const irises = [irisLeft, irisRight];
  let hSum = 0;
  let vSum = 0;
  for (let e = 0; e < EYES.length; e++) {
    const eye = EYES[e];
    toReferenceFrame(irises[e], rotation, translation, scale, irisScratch);
    hSum += projectRatio3D(irisScratch[0], irisScratch[1], irisScratch[2], reference, eye.from, eye.to);
    vSum += projectRatio3D(irisScratch[0], irisScratch[1], irisScratch[2], reference, eye.upper, eye.lower);
  }
  out[0] = hSum / EYES.length;
  out[1] = vSum / EYES.length;
  return true;
}

/**
 * 特徴量 → 回帰の基底。out は長さ FEATURE_COUNT。
 * pose は [yawDeg, pitchDeg]、eye は [h, v]、scale は剛体合わせのスケール。
 */
export function fillBasis(pose, eye, scale, out) {
  const h = eye[0];
  const v = eye[1];
  out[F_BIAS] = 1;
  out[F_EYE_H] = h;
  out[F_EYE_V] = v;
  out[F_EYE_H2] = h * h;
  out[F_EYE_V2] = v * v;
  out[F_YAW] = Math.sin((pose[0] * Math.PI) / 180);
  out[F_PITCH] = Math.sin((pose[1] * Math.PI) / 180);
  out[F_SCALE] = scale;
  return out;
}

// ---------------------------------------------------------------------------
// フィルタ
// ---------------------------------------------------------------------------

/** 遮断周波数 cutoffHz の一次ローパスの係数。dtSec はサンプル間隔 [s]。 */
export function smoothingFactor(dtSec, cutoffHz) {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / dtSec);
}

/**
 * 1€ filter (Casiez et al. 2012) の1次元版。
 * 速く動いているときは遮断周波数を上げて遅れを減らし、止まっているときは下げて震えを消す。
 */
export class OneEuroFilter {
  constructor(minCutoffHz, beta, dCutoffHz) {
    this.minCutoffHz = minCutoffHz;
    this.beta = beta;
    this.dCutoffHz = dCutoffHz === undefined ? 1 : dCutoffHz;
    this.reset();
  }

  reset() {
    this.value = 0;
    this.rate = 0;
    this.timeMs = 0;
    this.started = false;
  }

  setMinCutoff(hz) {
    this.minCutoffHz = hz;
  }

  filter(next, timeMs) {
    if (!this.started) {
      this.value = next;
      this.timeMs = timeMs;
      this.started = true;
      return next;
    }
    let dtSec = (timeMs - this.timeMs) / 1000;
    if (!(dtSec > 1e-3)) dtSec = 1e-3;
    if (dtSec > 0.1) dtSec = 0.1;
    this.timeMs = timeMs;
    const rate = (next - this.value) / dtSec;
    this.rate += smoothingFactor(dtSec, this.dCutoffHz) * (rate - this.rate);
    const cutoffHz = this.minCutoffHz + this.beta * Math.abs(this.rate);
    this.value += smoothingFactor(dtSec, cutoffHz) * (next - this.value);
    return this.value;
  }
}

/** 直近 size サンプルの中央値。作業配列を確保済みなので push でメモリを確保しない。 */
export class MedianFilter {
  constructor(size) {
    this.size = size;
    this.buffer = new Float64Array(size);
    this.work = new Float64Array(size);
    this.count = 0;
    this.index = 0;
    this.value = 0;
  }

  reset() {
    this.count = 0;
    this.index = 0;
    this.value = 0;
  }

  push(v) {
    this.buffer[this.index] = v;
    this.index = (this.index + 1) % this.size;
    if (this.count < this.size) this.count++;
    for (let i = 0; i < this.count; i++) this.work[i] = this.buffer[i];
    for (let i = 1; i < this.count; i++) {
      const x = this.work[i];
      let j = i - 1;
      while (j >= 0 && this.work[j] > x) {
        this.work[j + 1] = this.work[j];
        j--;
      }
      this.work[j + 1] = x;
    }
    const n = this.count;
    this.value = n % 2 ? this.work[(n - 1) >> 1] : (this.work[(n >> 1) - 1] + this.work[n >> 1]) / 2;
    return this.value;
  }
}

/** SMOOTH スライダー (0-100) → 静止時の遮断周波数 [Hz]。小さいほど平滑化が強い。 */
export function cutoffFromSmoothing(slider, minCutoffHz, maxCutoffHz) {
  return maxCutoffHz + (minCutoffHz - maxCutoffHz) * clamp01(slider / 100);
}

// ---------------------------------------------------------------------------
// キャリブレーション（リッジ回帰 + leave-one-out 外れ値除去）
// ---------------------------------------------------------------------------

export function makeScaler(rows, count) {
  const mean = new Float64Array(FEATURE_COUNT);
  const std = new Float64Array(FEATURE_COUNT);
  std[0] = 1;
  for (let j = 1; j < FEATURE_COUNT; j++) {
    let sum = 0;
    for (let i = 0; i < count; i++) sum += rows[i][j];
    mean[j] = sum / count;
    let variance = 0;
    for (let i = 0; i < count; i++) {
      const d = rows[i][j] - mean[j];
      variance += d * d;
    }
    variance /= count;
    std[j] = Math.sqrt(variance) || 1;
  }
  return { mean, std };
}

export function applyScaler(scaler, row, out) {
  for (let j = 0; j < FEATURE_COUNT; j++) {
    out[j] = j === 0 ? 1 : (row[j] - scaler.mean[j]) / scaler.std[j];
  }
  return out;
}

/** リッジ回帰を正規方程式 + ガウス・ジョルダンで解く。 */
export function solveRidge(rows, targets, count, lambda) {
  const m = FEATURE_COUNT;
  const mat = [];
  for (let r = 0; r < m; r++) mat.push(new Float64Array(m + 1));

  for (let i = 0; i < count; i++) {
    const row = rows[i];
    const target = targets[i];
    for (let r = 0; r < m; r++) {
      const rv = row[r];
      for (let c = 0; c < m; c++) mat[r][c] += rv * row[c];
      mat[r][m] += rv * target;
    }
  }

  let trace = 0;
  for (let i = 0; i < m; i++) trace += mat[i][i];
  trace /= m;
  const penalty = lambda * (trace > 1e-9 ? trace : 1e-9);
  for (let i = 0; i < m; i++) mat[i][i] += penalty;

  for (let col = 0; col < m; col++) {
    let pivot = col;
    for (let r = col + 1; r < m; r++) {
      if (Math.abs(mat[r][col]) > Math.abs(mat[pivot][col])) pivot = r;
    }
    if (pivot !== col) {
      const swap = mat[col];
      mat[col] = mat[pivot];
      mat[pivot] = swap;
    }
    const diag = mat[col][col];
    if (Math.abs(diag) < 1e-12) continue;
    for (let c = col; c <= m; c++) mat[col][c] /= diag;
    for (let r = 0; r < m; r++) {
      if (r === col) continue;
      const factor = mat[r][col];
      if (factor === 0) continue;
      for (let c = col; c <= m; c++) mat[r][c] -= factor * mat[col][c];
    }
  }

  const coef = new Float64Array(m);
  for (let i = 0; i < m; i++) coef[i] = mat[i][m];
  return coef;
}

export function fitModel(points, indices, count, lambda) {
  const rawRows = [];
  const targetsX = new Float64Array(count);
  const targetsY = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const point = points[indices === null ? i : indices[i]];
    rawRows.push(point.row);
    targetsX[i] = point.x;
    targetsY[i] = point.y;
  }
  const scaler = makeScaler(rawRows, count);
  const normalized = [];
  for (let i = 0; i < count; i++) {
    const outRow = new Float64Array(FEATURE_COUNT);
    applyScaler(scaler, rawRows[i], outRow);
    normalized.push(outRow);
  }
  return {
    scaler,
    coefX: solveRidge(normalized, targetsX, count, lambda),
    coefY: solveRidge(normalized, targetsY, count, lambda),
  };
}

export function leaveOneOutResiduals(points, count, lambda, out) {
  const others = new Float64Array(count);
  const row = new Float64Array(FEATURE_COUNT);
  for (let i = 0; i < count; i++) {
    let n = 0;
    for (let j = 0; j < count; j++) if (j !== i) others[n++] = j;
    if (n < FEATURE_COUNT) {
      out[i] = 0;
      continue;
    }
    const fitted = fitModel(points, others, n, lambda);
    applyScaler(fitted.scaler, points[i].row, row);
    let px = 0;
    let py = 0;
    for (let j = 0; j < FEATURE_COUNT; j++) {
      px += fitted.coefX[j] * row[j];
      py += fitted.coefY[j] * row[j];
    }
    const dx = px - points[i].x;
    const dy = py - points[i].y;
    out[i] = Math.sqrt(dx * dx + dy * dy);
  }
  return out;
}

function rms(values, count) {
  let sum = 0;
  for (let i = 0; i < count; i++) sum += values[i] * values[i];
  return Math.sqrt(sum / count);
}

/**
 * キャリブレーション点から回帰モデルを解く。
 * FEATURE_COUNT が 8 に増えたので 13 点以上を想定している
 * （点が少なすぎると 1 点の失敗が全体を歪めるのは v1 で確認済み）。
 */
export function calibrate(points, count, screenPx, lambda) {
  const loo = new Float64Array(count);
  leaveOneOutResiduals(points, count, lambda, loo);
  const reference = rms(loo, count);

  let indices = null;
  let keptCount = count;
  if (count > FEATURE_COUNT) {
    const subsetLoo = new Float64Array(count);
    const without = new Float64Array(count);
    let worstIndex = -1;
    let bestScore = reference;
    for (let i = 0; i < count; i++) {
      let n = 0;
      for (let j = 0; j < count; j++) if (j !== i) without[n++] = j;
      const subset = [];
      for (let k = 0; k < n; k++) subset.push(points[without[k]]);
      leaveOneOutResiduals(subset, n, lambda, subsetLoo);
      const score = rms(subsetLoo, n);
      if (score < bestScore) {
        bestScore = score;
        worstIndex = i;
      }
    }
    if (worstIndex >= 0 && bestScore < reference * 0.5) {
      indices = [];
      for (let i = 0; i < count; i++) if (i !== worstIndex) indices.push(i);
      keptCount = indices.length;
    }
  }

  const inliers = [];
  for (let i = 0; i < keptCount; i++) inliers.push(points[indices === null ? i : indices[i]]);
  const model = fitModel(points, indices, keptCount, lambda);

  const finalLoo = new Float64Array(keptCount);
  leaveOneOutResiduals(inliers, keptCount, lambda, finalLoo);

  return {
    scaler: model.scaler,
    coefX: model.coefX,
    coefY: model.coefY,
    errPx: rms(finalLoo, keptCount) * screenPx,
    dropped: count - keptCount,
    inliers: keptCount,
  };
}

// ---------------------------------------------------------------------------
// モデル
// ---------------------------------------------------------------------------

export const MODE_BOTH = "both";
export const MODE_GAZE = "gaze";
export const MODE_HEAD = "head";

export class GazeModel {
  constructor(scaler, coefX, coefY, errPx, reference, meta) {
    this.scaler = scaler;
    this.coefX = coefX;
    this.coefY = coefY;
    this.errPx = errPx || 0;
    this.reference = reference || null; // 基準フレーム（REFERENCE_COUNT*3）
    this.meta = meta || {};
    this.scaled = new Float64Array(FEATURE_COUNT);
  }

  /**
   * 基底 row → out[0], out[1] に正規化座標 [0,1]。
   * mode でどちらの情報を使うか選べる（使わない方は標準化後 0 = 平均に固定する）。
   */
  predict(row, out, mode) {
    const useGaze = mode !== MODE_HEAD;
    const useHead = mode !== MODE_GAZE;
    applyScaler(this.scaler, row, this.scaled);
    let x = 0;
    let y = 0;
    for (let j = 0; j < FEATURE_COUNT; j++) {
      const isEye = j === F_EYE_H || j === F_EYE_V || j === F_EYE_H2 || j === F_EYE_V2;
      const isHead = j === F_YAW || j === F_PITCH;
      if ((isEye && !useGaze) || (isHead && !useHead)) continue;
      // キャリブレーションで見ていない領域まで外挿すると推定が暴れるので ±4σ で頭打ち
      let z = this.scaled[j];
      if (z > 4) z = 4;
      else if (z < -4) z = -4;
      x += this.coefX[j] * z;
      y += this.coefY[j] * z;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    out[0] = clamp01(x);
    out[1] = clamp01(y);
    return true;
  }

  toJSON() {
    return {
      mean: Array.from(this.scaler.mean),
      std: Array.from(this.scaler.std),
      coefX: Array.from(this.coefX),
      coefY: Array.from(this.coefY),
      errPx: this.errPx,
      reference: this.reference ? Array.from(this.reference) : null,
      meta: this.meta,
    };
  }

  static fromJSON(data) {
    if (!data || !data.coefX || !data.mean || !data.std) return null;
    // 特徴量の数が変わった世代のデータは使わない
    if (data.mean.length !== FEATURE_COUNT || data.coefX.length !== FEATURE_COUNT) return null;
    return new GazeModel(
      { mean: Float64Array.from(data.mean), std: Float64Array.from(data.std) },
      Float64Array.from(data.coefX),
      Float64Array.from(data.coefY),
      data.errPx,
      data.reference ? Float64Array.from(data.reference) : null,
      data.meta || {}
    );
  }
}
