const profiles = [
  {
    label: "kanon",
    name: "kanon / paleblue_2032",
    handle: "@kanon_hiiragi",
    tagline: "I live in the terminal with emacs.",
    intro:
      "I use NixOS. I'm interested in XR, HCI, and image processing engineering.",
    avatar: "assets/icon0.png",
    accent: "#d98fae",
    base: "#141017",
  },
  {
    label: "headwind",
    name: "headwind",
    handle: "@headwind_0430",
    tagline: "I'm a student in NIT, Toyama College E Dept.",
    intro:
      "I love traveling. Since I don't have much money, I always take local trains :(",
    avatar: "assets/icon1.png",
    accent: "#8496c6",
    base: "#0a0e17",
  },
];

const root = document.documentElement;
const tabs = Array.from(document.querySelectorAll(".switch-tab"));
const panel = document.getElementById("profile-panel");
const body = document.getElementById("profile-body");

const els = {
  avatar: document.getElementById("profile-avatar"),
  handle: document.getElementById("profile-handle"),
  name: document.getElementById("profile-name"),
  tagline: document.getElementById("profile-tagline"),
  intro: document.getElementById("profile-intro"),
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function renderProfile(index, animate) {
  const profile = profiles[index];
  if (!profile || !body) return;

  root.style.setProperty("--accent", profile.accent);
  root.style.setProperty("--base", profile.base);

  if (els.avatar) {
    els.avatar.src = profile.avatar;
    els.avatar.alt = `${profile.name}のアイコン`;
  }
  if (els.handle) els.handle.textContent = profile.handle;
  if (els.name) els.name.textContent = profile.name;
  if (els.tagline) els.tagline.textContent = profile.tagline;
  if (els.intro) els.intro.textContent = profile.intro;

  tabs.forEach((tab, i) => {
    const selected = i === index;
    const label = tab.querySelector(".switch-label");
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (label && profiles[i]) label.textContent = profiles[i].label;
  });

  if (panel && tabs[index]) {
    panel.setAttribute("aria-labelledby", tabs[index].id);
  }

  if (animate && !reduceMotion.matches) {
    body.classList.remove("switching");
    void body.offsetWidth;
    body.classList.add("switching");
  }
}

tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => renderProfile(i, true));

  tab.addEventListener("keydown", (event) => {
    const handled = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!handled.includes(event.key)) return;
    event.preventDefault();

    let next = i;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (i + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (i - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = tabs.length - 1;
    }

    renderProfile(next, true);
    tabs[next].focus();
  });
});

if (tabs.length) {
  renderProfile(0, false);
}

const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}
