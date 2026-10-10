#!/usr/bin/env python3
"""gaze-cursor のローカルブリッジ。

ページ側（script.js）が MediaPipe で推定した視線をこのブリッジに送り、
ここが /dev/uinput に仮想マウスを作ってカーソルを動かす。
カーソル操作はブラウザからは触れないので、この1プロセスだけが境界になる。

    python3 others/gaze-cursor/bridge.py
    → http://127.0.0.1:8765/others/gaze-cursor/ を開く

Python の標準ライブラリだけで動く。root も ydotool も pip も要らない
（/dev/uinput に書き込み権限があること。多くのディストリで video か専用グループ、
このマシンでは ACL で付いていた）。
"""

from __future__ import annotations

import argparse
import fcntl
import json
import math
import mimetypes
import os
import signal
import struct
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

# --- Linux 入力サブシステムの定数 (ioctl.h / input-event-codes.h) ---
_IOC_WRITE = 1


def _IOC(direction: int, type_char: str, nr: int, size: int) -> int:
    return (direction << 30) | (size << 16) | (ord(type_char) << 8) | nr


def _IO(type_char: str, nr: int) -> int:
    return (ord(type_char) << 8) | nr


UI_SET_EVBIT = _IOC(_IOC_WRITE, "U", 100, 4)
UI_SET_KEYBIT = _IOC(_IOC_WRITE, "U", 101, 4)
UI_SET_RELBIT = _IOC(_IOC_WRITE, "U", 102, 4)
UI_SET_PROPBIT = _IOC(_IOC_WRITE, "U", 110, 4)
UI_DEV_SETUP = _IOC(_IOC_WRITE, "U", 3, 92)  # struct uinput_setup
UI_DEV_CREATE = _IO("U", 1)
UI_DEV_DESTROY = _IO("U", 2)

EV_SYN, EV_KEY, EV_REL = 0x00, 0x01, 0x02
SYN_REPORT = 0x00
REL_X, REL_Y, REL_WHEEL = 0x00, 0x01, 0x08
BTN_LEFT, BTN_RIGHT, BTN_MIDDLE = 0x110, 0x111, 0x112
INPUT_PROP_POINTER = 0x00

BUS_USB = 0x03
DEVICE_NAME = b"gaze-cursor virtual mouse"

BUTTONS = {"left": BTN_LEFT, "right": BTN_RIGHT, "middle": BTN_MIDDLE}

# /api/move 1回で動かせる上限 (px)。暴走したときの最終的な歯止め。
HARD_STEP_LIMIT = 4000
RECENTER_STEP = 8000


class UinputMouse:
    """uinput の仮想マウス。相対移動とボタン操作だけを提供する。"""

    def __init__(self) -> None:
        self.path = "/dev/uinput"
        self.fd: int | None = None
        self.created = False
        self._lock = threading.Lock()
        self._open()

    def _open(self) -> None:
        fd = os.open(self.path, os.O_WRONLY | os.O_NONBLOCK)
        try:
            self._configure(fd)
        except Exception:
            os.close(fd)
            raise
        self.fd = fd

    def _configure(self, fd: int) -> None:
        for event_type in (EV_KEY, EV_REL, EV_SYN):
            fcntl.ioctl(fd, UI_SET_EVBIT, event_type)
        for code in (BTN_LEFT, BTN_RIGHT, BTN_MIDDLE):
            fcntl.ioctl(fd, UI_SET_KEYBIT, code)
        for code in (REL_X, REL_Y, REL_WHEEL):
            fcntl.ioctl(fd, UI_SET_RELBIT, code)
        try:
            fcntl.ioctl(fd, UI_SET_PROPBIT, INPUT_PROP_POINTER)
        except OSError:
            pass
        setup = struct.pack("HHHH80sI", BUS_USB, 0x1D6B, 0x0111, 0x0001, DEVICE_NAME[:79], 0)
        fcntl.ioctl(fd, UI_DEV_SETUP, setup)
        fcntl.ioctl(fd, UI_DEV_CREATE)
        self.created = True
        time.sleep(0.35)  # udev / libinput がデバイスを掴むのを待つ

    def _emit(self, event_type: int, code: int, value: int) -> None:
        if self.fd is not None:
            os.write(self.fd, struct.pack("llHHi", 0, 0, event_type, code, value))

    def _sync(self) -> None:
        self._emit(EV_SYN, SYN_REPORT, 0)

    def move(self, dx: int, dy: int) -> None:
        if self.fd is None or (dx == 0 and dy == 0):
            return
        with self._lock:
            if dx:
                self._emit(EV_REL, REL_X, dx)
            if dy:
                self._emit(EV_REL, REL_Y, dy)
            self._sync()

    def button(self, name: str, pressed: bool) -> None:
        with self._lock:
            self._emit(EV_KEY, BUTTONS[name], 1 if pressed else 0)
            self._sync()

    def click(self, name: str = "left") -> None:
        with self._lock:
            code = BUTTONS[name]
            self._emit(EV_KEY, code, 1)
            self._sync()
        time.sleep(0.012)
        with self._lock:
            self._emit(EV_KEY, code, 0)
            self._sync()

    def scroll(self, amount: int) -> None:
        if not amount:
            return
        with self._lock:
            self._emit(EV_REL, REL_WHEEL, amount)
            self._sync()

    def close(self) -> None:
        if self.fd is None:
            return
        if self.created:
            try:
                fcntl.ioctl(self.fd, UI_DEV_DESTROY)
            except OSError:
                pass
        try:
            os.close(self.fd)
        except OSError:
            pass
        self.fd = None
        self.created = False


class NullMouse:
    """--no-uinput 用。カーソルに触らず API だけ確認する。"""

    def __init__(self) -> None:
        self.path = None
        self.moves = 0
        self.clicks = 0

    def move(self, dx: int, dy: int) -> None:
        self.moves += 1

    def button(self, name: str, pressed: bool) -> None:
        pass

    def click(self, name: str = "left") -> None:
        self.clicks += 1

    def scroll(self, amount: int) -> None:
        pass

    def close(self) -> None:
        pass


class GazeServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, addr, handler, *, mouse, web_dir: Path, max_step: int, verbose: bool) -> None:
        super().__init__(addr, handler)
        self.mouse = mouse
        self.web_dir = web_dir
        self.max_step = max_step
        self.verbose = verbose
        self.enabled = True
        self.moves = 0
        self.clicks = 0
        self.pressed: set[str] = set()
        self.res_x = 0.0
        self.res_y = 0.0
        self.lock = threading.Lock()

    def release_all(self) -> None:
        with self.lock:
            for name in list(self.pressed):
                self.mouse.button(name, False)
                self.pressed.discard(name)

    def stop(self) -> None:
        self.enabled = False
        self.release_all()

    def log(self, *parts) -> None:
        if self.verbose:
            print(*parts, file=sys.stderr, flush=True)


class Handler(BaseHTTPRequestHandler):
    server_version = "gaze-cursor"
    protocol_version = "HTTP/1.1"
    # 既定では TCP_NODELAY を立てないため、小さなレスポンスが Nagle + 遅延 ACK で
    # 40ms 程度スタックする。カーソル制御では効いてくるので必ず無効化する。
    disable_nagle_algorithm = True

    @property
    def gaze(self) -> GazeServer:
        return self.server  # type: ignore[return-value]

    def log_message(self, fmt, *args) -> None:
        pass

    # --- レスポンス ---
    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, obj, status: int = 200) -> None:
        self._send(status, json.dumps(obj).encode(), "application/json; charset=utf-8")

    def _read_json(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            return {}
        if length <= 0 or length > 1 << 20:
            return {}
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return {}
        return data if isinstance(data, dict) else {}

    @staticmethod
    def _number(data: dict, key: str) -> float:
        value = data.get(key, 0.0)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return 0.0
        return float(value) if math.isfinite(value) else 0.0

    # --- ルーティング ---
    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/status":
            self._json(
                {
                    "ok": True,
                    "enabled": self.gaze.enabled,
                    "moves": self.gaze.moves,
                    "clicks": self.gaze.clicks,
                    "pressed": sorted(self.gaze.pressed),
                    "dry_run": isinstance(self.gaze.mouse, NullMouse),
                    "device": self.gaze.mouse.path,
                    "max_step": self.gaze.max_step,
                }
            )
            return
        self._serve_static(path)

    def do_HEAD(self) -> None:
        self.do_GET()

    def do_POST(self) -> None:
        route = {
            "/api/move": self._api_move,
            "/api/click": self._api_click,
            "/api/button": self._api_button,
            "/api/recenter": self._api_recenter,
            "/api/scroll": self._api_scroll,
            "/api/stop": self._api_stop,
            "/api/enable": self._api_enable,
        }.get(urlparse(self.path).path)
        if route is None:
            self._json({"ok": False, "error": "unknown endpoint"}, 404)
            return
        try:
            route(self._read_json())
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as exc:
            self.gaze.log("error:", self.path, repr(exc))
            try:
                self._json({"ok": False, "error": str(exc)}, 500)
            except OSError:
                pass

    # --- API ---
    def _api_move(self, data: dict) -> None:
        if not self.gaze.enabled:
            self._json({"ok": False, "enabled": False})
            return
        dx = self._number(data, "dx")
        dy = self._number(data, "dy")
        distance = math.hypot(dx, dy)
        limit = min(self.gaze.max_step, HARD_STEP_LIMIT)
        if distance > limit:
            scale = limit / distance
            dx *= scale
            dy *= scale
        if distance < 1e-9:
            self._json({"ok": True, "moved": False})
            return
        with self.gaze.lock:
            # 1px 未満の端数は捨てずに持ち越す（60Hz で小刻みに送られてくるため）
            self.gaze.res_x += dx
            self.gaze.res_y += dy
            step_x = int(self.gaze.res_x)
            step_y = int(self.gaze.res_y)
            self.gaze.res_x -= step_x
            self.gaze.res_y -= step_y
        moved = bool(step_x or step_y)
        if moved:
            self.gaze.mouse.move(step_x, step_y)
            self.gaze.moves += 1
        self._json({"ok": True, "moved": moved, "dx": step_x, "dy": step_y})

    def _api_click(self, data: dict) -> None:
        if not self.gaze.enabled:
            self._json({"ok": False, "enabled": False})
            return
        button = data.get("button", "left")
        if button not in BUTTONS:
            self._json({"ok": False, "error": "bad button"}, 400)
            return
        self.gaze.mouse.click(button)
        self.gaze.clicks += 1
        self._json({"ok": True})

    def _api_button(self, data: dict) -> None:
        if not self.gaze.enabled:
            self._json({"ok": False, "enabled": False})
            return
        button = data.get("button", "left")
        if button not in BUTTONS:
            self._json({"ok": False, "error": "bad button"}, 400)
            return
        pressed = bool(data.get("pressed"))
        self.gaze.mouse.button(button, pressed)
        with self.gaze.lock:
            self.gaze.pressed.add(button) if pressed else self.gaze.pressed.discard(button)
        self._json({"ok": True})

    def _api_recenter(self, data: dict) -> None:
        """左上に張り付かせて仮想カーソルの位置を既知にする（相対デバイスの原点合わせ）。"""
        if not self.gaze.enabled:
            self._json({"ok": False, "enabled": False})
            return
        with self.gaze.lock:
            self.gaze.res_x = 0.0
            self.gaze.res_y = 0.0
        self.gaze.mouse.move(-RECENTER_STEP, -RECENTER_STEP)
        time.sleep(0.04)
        self._json({"ok": True})

    def _api_scroll(self, data: dict) -> None:
        if not self.gaze.enabled:
            self._json({"ok": False, "enabled": False})
            return
        amount = max(-10, min(10, int(self._number(data, "dy"))))
        if amount:
            self.gaze.mouse.scroll(amount)
        self._json({"ok": True})

    def _api_stop(self, data: dict) -> None:
        self.gaze.stop()
        self._json({"ok": True, "enabled": False})

    def _api_enable(self, data: dict) -> None:
        self.gaze.enabled = True
        self._json({"ok": True, "enabled": True})

    # --- 静的ファイル ---
    def _serve_static(self, path: str) -> None:
        rel = unquote(path).lstrip("/")
        if rel == "" or rel.endswith("/"):
            rel += "index.html"
        candidate = (self.gaze.web_dir / rel).resolve()
        if not candidate.is_relative_to(self.gaze.web_dir) or not candidate.is_file():
            self._send(404, b"not found", "text/plain; charset=utf-8")
            return
        content_type, _ = mimetypes.guess_type(str(candidate))
        if candidate.suffix == ".mjs":
            content_type = "text/javascript"
        self._send(200, candidate.read_bytes(), content_type or "application/octet-stream")


def default_web_dir() -> Path:
    # others/gaze-cursor/bridge.py → リポジトリのルート（homepage/）
    return Path(__file__).resolve().parents[2]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="gaze-cursor local bridge")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--web-dir", default=None, help="配信するディレクトリ（既定: リポジトリのルート）")
    parser.add_argument("--max-step", type=int, default=600, help="/api/move 1回あたりの移動量上限 (px)")
    parser.add_argument("--no-uinput", action="store_true", help="仮想マウスを作らず API だけ動かす")
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--self-test", action="store_true", help="仮想マウスを作って移動とクリックを試して終了")
    return parser


def run_self_test() -> int:
    print("uinput に仮想マウスを作ります...")
    try:
        mouse = UinputMouse()
    except OSError as exc:
        print(f"失敗: {exc}", file=sys.stderr)
        print("/dev/uinput への書き込み権限を確認してください。", file=sys.stderr)
        return 1
    try:
        names = []
        for entry in sorted(os.listdir("/sys/class/input")):
            try:
                names.append(Path(f"/sys/class/input/{entry}/device/name").read_text().strip())
            except OSError:
                pass
        found = [name for name in names if "gaze" in name]
        print("カーネルが認識したデバイス:", found or "なし")
        for _ in range(10):
            mouse.move(6, 6)
            time.sleep(0.02)
        print("相対移動 10 回 — カーソルが動いたか目視で確認してください")
        time.sleep(0.2)
        mouse.click("left")
        print("左クリック 1 回（クリック先に注意）")
    finally:
        mouse.close()
    print("self-test 完了")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.self_test:
        return run_self_test()

    web_dir = Path(args.web_dir).resolve() if args.web_dir else default_web_dir()
    if not (web_dir / "others" / "gaze-cursor" / "index.html").is_file():
        print(f"ページが見つかりません: {web_dir}/others/gaze-cursor/", file=sys.stderr)
        print("--web-dir でリポジトリのルートを指定してください。", file=sys.stderr)
        return 1

    # 先に待ち受けを確保する。ポートが埋まっていたときに仮想マウスを作らずに済む。
    try:
        server = GazeServer(
            (args.host, args.port),
            Handler,
            mouse=None,
            web_dir=web_dir,
            max_step=args.max_step,
            verbose=args.verbose,
        )
    except OSError as exc:
        print(f"{args.host}:{args.port} を待ち受けできません: {exc}", file=sys.stderr)
        print("別のポートを使うには --port を指定してください。", file=sys.stderr)
        return 1

    try:
        mouse = NullMouse() if args.no_uinput else UinputMouse()
    except OSError as exc:
        server.server_close()
        print(f"/dev/uinput を開けません: {exc}", file=sys.stderr)
        print("--no-uinput を付ければカーソル以外の動作確認はできます。", file=sys.stderr)
        return 1
    server.mouse = mouse

    shutting_down = threading.Event()

    def shutdown(signum, frame) -> None:
        if shutting_down.is_set():
            return
        shutting_down.set()
        print("\n停止します。仮想マウスを破棄します。")
        server.stop()
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print(f"gaze-cursor bridge: http://{args.host}:{args.port}/others/gaze-cursor/ を開いてください")
    print(f"  配信ディレクトリ: {web_dir}")
    print(f"  仮想マウス: {'無効 (--no-uinput)' if args.no_uinput else mouse.path}")
    try:
        server.serve_forever(poll_interval=0.2)
    finally:
        server.stop()
        mouse.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
