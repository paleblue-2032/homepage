const profiles = [
  {
    label: "メイン",
    name: "あなたの名前",
    handle: "@yourname",
    tagline: "ここに一言のキャッチコピー。",
    intro:
      "ここに紹介文を入れます。何をしている人で、どんなことに興味があるのかを2〜3文で。",
    avatar: "assets/avatar-1.svg",
    accent: "#d98fae",
    base: "#141017",
  },
  {
    label: "サブ",
    name: "サブの名前",
    handle: "@your_sub",
    tagline: "もうひとつの顔のキャッチコピー。",
    intro:
      "サブプロフィールの紹介文。メインとは別の活動や趣味、別名義での活動などを書きます。",
    avatar: "assets/avatar-2.svg",
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
