// Canvas + keyboard host for the C# emulator. The .NET side owns the VM;
// this file only moves pixels and key events across the boundary.
export function start(dotNetRef, canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d", { alpha: false });
  const img = ctx.createImageData(64, 32);
  const data = img.data;
  const ON = [125, 249, 168]; // phosphor green

  // QWERTY -> CHIP-8 keypad (0x0..0xF), matching the 4x4 layout on screen.
  const MAP = {
    "1": 0x1, "2": 0x2, "3": 0x3, "4": 0xc,
    "q": 0x4, "w": 0x5, "e": 0x6, "r": 0xd,
    "a": 0x7, "s": 0x8, "d": 0x9, "f": 0xe,
    "z": 0xa, "x": 0x0, "c": 0xb, "v": 0xf,
  };

  const held = new Set();

  const onKeyDown = (e) => {
    const code = MAP[e.key.toLowerCase()];
    if (code === undefined) return;
    e.preventDefault();
    if (held.has(code)) return; // ignore auto-repeat
    held.add(code);
    dotNetRef.invokeMethodAsync("Key", code, true);
  };
  const onKeyUp = (e) => {
    const code = MAP[e.key.toLowerCase()];
    if (code === undefined) return;
    if (!held.has(code)) return;
    held.delete(code);
    dotNetRef.invokeMethodAsync("Key", code, false);
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", () => {
    for (const code of held) dotNetRef.invokeMethodAsync("Key", code, false);
    held.clear();
  });

  async function frame() {
    // ~60 Hz via requestAnimationFrame; .NET runs a fixed slice and returns the framebuffer.
    const buffer = await dotNetRef.invokeMethodAsync("Frame");
    for (let i = 0; i < 2048; i++) {
      const j = i << 2;
      const v = buffer[i];
      data[j] = v ? ON[0] : 0;
      data[j + 1] = v ? ON[1] : 0;
      data[j + 2] = v ? ON[2] : 0;
      data[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
