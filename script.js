const profiles = [
  {
    label: "メイン",
    handle: "@yourname",
    name: "あなたの名前",
    tagline: "ここに一言のキャッチコピー。",
    intro:
      "ここに紹介文を入れます。何をしている人で、どんなことに興味があるのかを2〜3文で。",
    avatar: "assets/avatar-1.svg",
    accent: "#7c5cff",
    accent2: "#23d5cb",
  },
  {
    label: "サブ",
    handle: "@your_sub",
    name: "サブの名前",
    tagline: "もうひとつの顔のキャッチコピー。",
    intro:
      "サブプロフィールの紹介文。メインとは別の活動や趣味、別名義での活動などを書きます。",
    avatar: "assets/avatar-2.svg",
    accent: "#ff7a59",
    accent2: "#ffc14d",
  },
];

const root = document.documentElement;
const tabs = Array.from(document.querySelectorAll(".switch-tab"));
const panel = document.getElementById("profile-panel");
const content = document.getElementById("profile-content");

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
  if (!profile || !content) return;

  root.style.setProperty("--accent", profile.accent);
  root.style.setProperty("--accent-2", profile.accent2);

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
    content.classList.remove("switching");
    void content.offsetWidth;
    content.classList.add("switching");
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

const navToggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("site-nav");

if (navToggle && nav) {
  const closeNav = () => {
    nav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "メニューを開く");
  };

  navToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "メニューを閉じる" : "メニューを開く");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 640) closeNav();
  });
}

const revealEls = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && revealEls.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("visible"));
}
