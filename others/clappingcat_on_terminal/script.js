(function () {
  const frames = window.CLPCAT_FRAMES || [];
  const pre = document.getElementById("cat-frame");
  if (!frames.length || !pre) return;

  const fpsInput = document.getElementById("cat-fps");
  const fpsLabel = document.getElementById("cat-fps-label");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  let fps = fpsInput ? Number(fpsInput.value) || 12 : 12;
  let index = 0;
  let timer = null;

  function render() {
    pre.textContent = frames[index];
  }

  function tick() {
    index = (index + 1) % frames.length;
    render();
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function start() {
    stop();
    if (reduce.matches) return;
    timer = setInterval(tick, Math.round(1000 / fps));
  }

  function setFps(value) {
    fps = value;
    if (fpsLabel) fpsLabel.textContent = fps + " fps";
    if (!reduce.matches) start();
  }

  if (fpsInput) {
    fpsInput.value = String(fps);
    fpsInput.addEventListener("input", () => setFps(Number(fpsInput.value) || 12));
  }
  if (fpsLabel) fpsLabel.textContent = fps + " fps";

  render();
  start();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
})();
