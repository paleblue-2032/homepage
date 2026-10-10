/**
 * gaze-cursor の制御側コア（移植可能な部分）。
 *
 * 推定側（core.js）が「今どこを見ているか」を出し、こちらが「どう動かすか」を決める。
 * DOM もブラウザ API も触らず、出力は下の Actuator インターフェース越しだけなので、
 * C++ / Rust へはこのクラスと構造体をそのまま写せる。
 *
 * Actuator インターフェース（出力先。MCU に置き換えるときはこの5つを実装する）:
 *   position()    -> {x, y} | null   現在位置 [px]。分からなければ null
 *   move(dx, dy)                    相対移動 [px]
 *   click()                         左クリック
 *   release()                       押しっぱなしを解除（停止時は必ず呼ぶ）
 *   recenter()                      位置を既知にする（左上に張り付ける等）
 *
 * 移植のための約束は core.js と同じ:
 *   ホットパスで確保しない / 例外を投げない / 状態は明示的に持つ / 単位を名前に書く / async なし。
 *   時刻は全部引数で受け取る（時計を注入できるのでテストが決定的になる）。
 */

export const DISARMED = "disarmed";
export const ARMED = "armed";
export const PAUSED = "paused";
export const STOPPED = "stopped";

export const DEFAULT_CONFIG = {
  dwellMs: 900,
  dwellRadiusPx: 48,
  dwellRearmFactor: 2.5,
  dwellCooldownMs: 700,
  maxStepPx: 220,
  deadzonePx: 1.5,
  pauseAfterMs: 250,
  failStopAfterMs: 1500,
  recenterCooldownMs: 1200,
  latencySamples: 30,
};

function median(values) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * 状態遷移:
 *   disarmed --arm()--> armed --観測が途切れる--> paused --復帰--> armed
 *                        |                          |
 *                        +---- 途切れが続く --------+--> stopped --arm()--> armed
 */
export class PointerController {
  constructor(actuator, config) {
    this.actuator = actuator;
    this.config = Object.assign({}, DEFAULT_CONFIG, config || {});

    this.state = DISARMED;
    this.reason = "";
    this.widthPx = 0;
    this.heightPx = 0;

    this.gazeX = 0.5;
    this.gazeY = 0.5;
    this.gazeAt = -1e9;
    this.gazeSampleAt = -1e9;
    this.hasGaze = false;
    this.posX = 0;
    this.posY = 0;
    this.recenteredAt = -1e9;
    this.dwellAnchorX = 0;
    this.dwellAnchorY = 0;
    this.dwellSince = 0;
    this.dwellReady = false;
    this.dwellCooldown = false;
    this.dwellLastClick = -1e9;
    this.dwellProgress = 0;
    this.latencies = [];
    this.latencyMs = null;
    this.moves = 0;
    this.clicks = 0;
  }

  setDwellMs(ms) {
    this.config.dwellMs = Math.min(Math.max(ms, 100), 5000);
  }

  /** 使える状態にする。位置が不明なら原点を取り直す。 */
  arm(nowMs, widthPx, heightPx) {
    this.widthPx = widthPx;
    this.heightPx = heightPx;
    this.state = ARMED;
    this.reason = "";
    this.gazeAt = nowMs;   // 観測が来ないまま長引いたら要再アームにするための時計
    this.hasGaze = false;  // 最初の観測が来るまでは動かさない
    this.dwellReady = false;
    this.dwellProgress = 0;
    this.dwellCooldown = false;
    this.recenter(nowMs);
  }

  stop(reason) {
    this.releaseButtons();
    this.state = STOPPED;
    this.reason = reason || "stopped";
    this.dwellProgress = 0;
    this.dwellCooldown = false;
  }

  /** 視線の観測。confidence が 0 の観測は「無かったこと」にする。 */
  observeGaze(nowMs, sampleMs, x, y, confidence) {
    if (!(confidence > 0)) return;
    this.gazeX = x < 0 ? 0 : x > 1 ? 1 : x;
    this.gazeY = y < 0 ? 0 : y > 1 ? 1 : y;
    this.gazeAt = nowMs;
    this.gazeSampleAt = sampleMs;
    this.hasGaze = true;
    // 短い途切れからは自動で復帰する（長引いたら tick() が stopped にする）
    if (this.state === PAUSED) {
      this.state = ARMED;
      this.reason = "";
    }
  }

  /** 一定周期で呼ぶ。判断は全部ここに集約してある。 */
  tick(nowMs) {
    if (this.state === DISARMED || this.state === STOPPED) return;

    // 1) 観測が長く途切れたら要再アームにする。
    const age = nowMs - this.gazeAt;
    if (age > this.config.failStopAfterMs) {
      this.releaseButtons();
      this.state = STOPPED;
      this.reason = "gaze lost";
      this.dwellProgress = 0;
      return;
    }

    // 2) まだ一度も観測が来ていない、または短く途切れたなら動かさない。
    //    arm しただけで既定値の方を向いて飛ばないようにする。
    if (!this.hasGaze || age > this.config.pauseAfterMs) {
      if (this.state === ARMED) {
        this.state = PAUSED;
        this.reason = this.hasGaze ? "no gaze" : "waiting for gaze";
        this.releaseButtons();
      }
      this.dwellProgress = 0;
      this.dwellReady = false;
      return;
    }

    // 「そのサンプルを取ってから制御が反映するまで」を測る（体感遅延に一番近い）
    const latency = nowMs - this.gazeSampleAt;
    if (latency >= 0 && latency < 1000) {
      this.latencies.push(latency);
      if (this.latencies.length > this.config.latencySamples) this.latencies.shift();
      this.latencyMs = median(this.latencies);
    }

    const targetX = this.gazeX * this.widthPx;
    const targetY = this.gazeY * this.heightPx;

    // 2) 現在位置。分からなければ原点を取り直す。
    const position = this.actuator.position();
    if (position) {
      this.posX = position.x;
      this.posY = position.y;
    } else if (nowMs - this.recenteredAt > this.config.recenterCooldownMs) {
      this.recenter(nowMs);
      return;
    }

    // 3) 目標へ寄せる。1周期の移動量に上限を入れて、比例制御で収束させる。
    const errorX = targetX - this.posX;
    const errorY = targetY - this.posY;
    const distance = Math.hypot(errorX, errorY);
    if (distance > this.config.deadzonePx) {
      const scale = Math.min(1, this.config.maxStepPx / distance);
      const stepX = Math.round(errorX * scale);
      const stepY = Math.round(errorY * scale);
      if (stepX || stepY) {
        this.actuator.move(stepX, stepY);
        this.moves++;
      }
    }

    // 4) 注視クリック。止まった場所でだけ時間を数える。
    this.updateDwell(targetX, targetY, nowMs);
  }

  updateDwell(targetX, targetY, nowMs) {
    const { dwellRadiusPx: radius, dwellRearmFactor: rearm, dwellCooldownMs: cooldown } = this.config;

    if (!this.dwellReady) {
      this.dwellAnchorX = targetX;
      this.dwellAnchorY = targetY;
      this.dwellSince = nowMs;
      this.dwellReady = true;
      this.dwellProgress = 0;
      return;
    }

    const toAnchor = Math.hypot(targetX - this.dwellAnchorX, targetY - this.dwellAnchorY);

    if (this.dwellCooldown) {
      if (toAnchor > radius * rearm && nowMs - this.dwellLastClick > cooldown) {
        this.dwellCooldown = false;
        this.dwellAnchorX = targetX;
        this.dwellAnchorY = targetY;
        this.dwellSince = nowMs;
      }
      this.dwellProgress = 0;
      return;
    }

    // 視線が大きく動いたらアンカーを置き直す（止まった場所でだけ時間を数える）
    if (toAnchor > radius * rearm) {
      this.dwellAnchorX = targetX;
      this.dwellAnchorY = targetY;
      this.dwellSince = nowMs;
      this.dwellProgress = 0;
      return;
    }

    const elapsed = nowMs - this.dwellSince;
    this.dwellProgress = Math.min(Math.max(elapsed / this.config.dwellMs, 0), 1);
    if (elapsed >= this.config.dwellMs && toAnchor <= radius) {
      this.dwellCooldown = true;
      this.dwellLastClick = nowMs;
      this.dwellProgress = 0;
      this.actuator.click();
      this.clicks++;
    }
  }

  recenter(nowMs) {
    this.recenteredAt = nowMs;
    if (this.actuator.recenter) this.actuator.recenter();
    const position = this.actuator.position();
    this.posX = position ? position.x : 0;
    this.posY = position ? position.y : 0;
  }

  releaseButtons() {
    if (this.actuator.release) this.actuator.release();
  }

  snapshot() {
    return {
      state: this.state,
      reason: this.reason,
      dwell: this.dwellProgress,
      moves: this.moves,
      clicks: this.clicks,
      latencyMs: this.latencyMs,
    };
  }
}
