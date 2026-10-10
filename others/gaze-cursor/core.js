/**
 * gaze-cursor の推定側コア（移植可能な部分）。
 *
 * ここには「目のランドマーク → 画面座標」の推定と、その平滑化だけを置く。
 * DOM・カメラ・通信・タイマーに一切触らないので、C++ / Rust へはこのファイルの
 * 構造体と関数をそのまま写せる。プラットフォーム側（script.js）はこのファイルを
 * 呼ぶだけにしてある。
 *
 * 移植しやすくするための約束:
 *   1. ホットパスでメモリを確保しない。作業配列は呼び出し側が用意して渡す。
 *   2. 失敗は戻り値で返す（例外を投げない）。
 *   3. 状態は明示的に持つ（クロージャやグローバルに隠さない）。
 *   4. 単位を名前に書く（Ms / Px / Ratio / Norm / Hz）。
 *   5. async / Promise を使わない（コアは同期のみ）。
 *
 * C++ / Rust への対応の目安:
 *   Float64Array(6)              -> std::array<double,6> / [f64; 6]
 *   class OneEuroFilter          -> struct OneEuroFilter + impl
 *   calibrate(points, ...)       -> fn calibrate(&[CalibrationPoint], ...) -> Calibration
 *   { mean, std, coefX, coefY }  -> 同じ意味の構造体
 */

// ---------------------------------------------------------------------------
// ランドマーク → 特徴量
// ---------------------------------------------------------------------------

export const LANDMARK_COUNT = 478;

/** 生の特徴量の数（h, v, scale）。 */
export const RAW_FEATURE_COUNT = 3;

/** 回帰に使う基底の数（1, h, v, h^2, v^2, scale）。9点に対して6項で余裕を持たせる。 */
export const FEATURE_COUNT = 6;

/**
 * 虹彩の位置を「目頭-目尻」と「上瞼-下瞼」の線分に射影した比率で表す。
 * 添字は MediaPipe FaceLandmarker の 478 点モデル。33↔263 / 133↔362 が鏡像の
 * 対応なので、2つ目の目は順序を逆にして、両目の軸が画像上で同じ向き（x が増える
 * 向き）になるようにしている。揃えないと左右が逆向きに動いて平均で打ち消し合う。
 */
export const EYES = [
  { from: 33, to: 133, upper: 159, lower: 145, iris: 468 },
  { from: 362, to: 263, upper: 386, lower: 374, iris: 473 },
];

/** 線分 a→b 上への点 p の射影比。a で 0、b で 1。軸に直交するズレは無視する。 */
export function projectRatio(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy;
  if (len2 < 1e-9) return 0.5;
  return ((px - ax) * vx + (py - ay) * vy) / len2;
}

/**
 * ランドマーク列から生の特徴量を作る。out は長さ RAW_FEATURE_COUNT。
 *   out[0] = h  （両目の虹彩水平比率の平均）
 *   out[1] = v  （両目の虹彩垂直比率の平均）
 *   out[2] = scale（両目内側の距離。カメラへの寄り引きを表す）
 * ランドマークが足りない / 縮退している場合は false を返す。
 */
export function extractFeatures(landmarks, count, out) {
  if (count < LANDMARK_COUNT) return false;

  let hSum = 0;
  let vSum = 0;
  for (let e = 0; e < EYES.length; e++) {
    const eye = EYES[e];
    const iris = landmarks[eye.iris];
    const from = landmarks[eye.from];
    const to = landmarks[eye.to];
    const upper = landmarks[eye.upper];
    const lower = landmarks[eye.lower];
    hSum += projectRatio(iris.x, iris.y, from.x, from.y, to.x, to.y);
    vSum += projectRatio(iris.x, iris.y, upper.x, upper.y, lower.x, lower.y);
  }

  const inner = landmarks[133];
  const outer = landmarks[33];
  const scale = Math.hypot(outer.x - inner.x, outer.y - inner.y);
  if (!(scale > 1e-6)) return false;

  out[0] = hSum / EYES.length;
  out[1] = vSum / EYES.length;
  out[2] = scale;
  return true;
}

/** 生の特徴量 → 回帰の基底。out は長さ FEATURE_COUNT。 */
export function fillBasis(feature, out) {
  const h = feature[0];
  const v = feature[1];
  out[0] = 1;
  out[1] = h;
  out[2] = v;
  out[3] = h * h;
  out[4] = v * v;
  out[5] = feature[2];
  return out;
}

// ---------------------------------------------------------------------------
// スカラー用のフィルタ
// ---------------------------------------------------------------------------

/** 遮断周波数 cutoffHz の一次ローパスの係数。dtSec はサンプル間隔 [s]。 */
export function smoothingFactor(dtSec, cutoffHz) {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / dtSec);
}

/**
 * 1€ filter (Casiez et al. 2012) の1次元版。
 * 速く動いているときは遮断周波数を上げて遅れを減らし、止まっているときは下げて
 * 震えを消す。固定の指数移動平均だと「震えを消す」と「遅れを減らす」が同じ
 * パラメータで綱引きになるが、これは速度で自動的に切り替わる。
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

  /** next を時刻 timeMs [ms] で与える。戻り値は平滑化された値。 */
  filter(next, timeMs) {
    if (!this.started) {
      this.value = next;
      this.timeMs = timeMs;
      this.started = true;
      return next;
    }
    // dt が 0 や異常に大きい場合でも破綻しないよう挟む
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

/**
 * 直近 size サンプルの中央値。リングバッファと作業配列を確保済みなので
 * push の中でメモリを確保しない。瞬きなどによる単発のスパイク落としに使う。
 */
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
  const t = slider < 0 ? 0 : slider > 100 ? 100 : slider / 100;
  return maxCutoffHz + (minCutoffHz - maxCutoffHz) * t;
}

// ---------------------------------------------------------------------------
// キャリブレーション（バッチ処理）
// ---------------------------------------------------------------------------

/**
 * 各特徴量を平均0・標準偏差1に正規化する。列0（バイアス項）は触らない。
 * 正規化しないとリッジの効き方が特徴量のスケールに引きずられる。
 */
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

/** 正規化した行を out に書く（確保なし）。 */
export function applyScaler(scaler, row, out) {
  for (let j = 0; j < FEATURE_COUNT; j++) {
    out[j] = j === 0 ? 1 : (row[j] - scaler.mean[j]) / scaler.std[j];
  }
  return out;
}

/**
 * リッジ回帰を正規方程式 + ガウス・ジョルダンで解く。
 * rows は count 行 FEATURE_COUNT 列（正規化済み）、targets は長さ count。
 * 戻り値は長さ FEATURE_COUNT の係数。
 */
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

/** points から線形モデル（正規化 + x/y の係数）を作る。indices が null なら全点。 */
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

/**
 * leave-one-out の各点誤差。out は長さ count。
 * 1点だけ大きく外していると、残差の中央値まで一緒に膨らんで隠れてしまうので、
 * 自分自身を含めないモデルで予測した誤差のほうが遥かに判別しやすい。
 */
export function leaveOneOutResiduals(points, count, lambda, out) {
  const others = new Float64Array(count);
  const row = new Float64Array(FEATURE_COUNT);
  for (let i = 0; i < count; i++) {
    let n = 0;
    for (let j = 0; j < count; j++) if (j !== i) others[n++] = j;
    if (n < 5) {
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
 * points: 長さ count の配列。各要素は { row: 長さ FEATURE_COUNT の基底, x, y }。
 *   x, y は画面の正規化座標 [0,1]。
 * screenPx: 誤差を px で表すための代表長（例: (幅+高さ)/2）。
 * lambda: リッジの係数。
 *
 * 戻り値は GazeModel に渡す一式 + 誤差 + 除外した点数。
 * errPx は leave-one-out の RMS なので in-sample より実際に近い値になる。
 */
export function calibrate(points, count, screenPx, lambda) {
  const loo = new Float64Array(count);
  leaveOneOutResiduals(points, count, lambda, loo);
  const reference = rms(loo, count);

  // 9点に対して6項なので、1点でも大きく外すと回帰全体が引きずられる。
  // 「どの1点を除くと残りの予測誤差が最も良くなるか」を総当たりで見て、
  // はっきり良くなる（半分以下）ならそれは外れ値とみなして捨てる。
  let indices = null;
  let keptCount = count;
  if (count > 6) {
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
// モデル本体
// ---------------------------------------------------------------------------

/** 正規化座標 [0,1] を出す推定器。基底を渡すと画面の正規化座標を返す。 */
export class GazeModel {
  constructor(scaler, coefX, coefY, errPx) {
    this.scaler = scaler;
    this.coefX = coefX;
    this.coefY = coefY;
    this.errPx = errPx || 0;
    this.scaled = new Float64Array(FEATURE_COUNT);
  }

  /** 基底 row（長さ FEATURE_COUNT）→ out[0], out[1] に正規化座標 [0,1]。 */
  predict(row, out) {
    applyScaler(this.scaler, row, this.scaled);
    let x = 0;
    let y = 0;
    for (let j = 0; j < FEATURE_COUNT; j++) {
      // キャリブレーションで見ていない領域まで外挿すると推定が暴れるので、
      // 標準化した値を ±4σ で頭打ちにする（平均から 4 標準偏差より外は信じない）。
      let z = this.scaled[j];
      if (z > 4) z = 4;
      else if (z < -4) z = -4;
      x += this.coefX[j] * z;
      y += this.coefY[j] * z;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    out[0] = x < 0 ? 0 : x > 1 ? 1 : x;
    out[1] = y < 0 ? 0 : y > 1 ? 1 : y;
    return true;
  }

  toJSON() {
    return {
      mean: Array.from(this.scaler.mean),
      std: Array.from(this.scaler.std),
      coefX: Array.from(this.coefX),
      coefY: Array.from(this.coefY),
      errPx: this.errPx,
    };
  }

  static fromJSON(data) {
    if (!data || !data.coefX || !data.mean || !data.std) return null;
    return new GazeModel(
      { mean: Float64Array.from(data.mean), std: Float64Array.from(data.std) },
      Float64Array.from(data.coefX),
      Float64Array.from(data.coefY),
      data.errPx
    );
  }
}
