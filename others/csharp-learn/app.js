(function () {
  "use strict";

  var STORE_KEY = "csharp-learn:v1";
  var LESSONS = window.LESSONS;
  var byId = {};
  LESSONS.forEach(function (l) { byId[l.id] = l; });

  function defaultState() {
    return { version: 1, answers: {}, last: null, updatedAt: 0 };
  }

  var state = load();
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultState();
      var s = JSON.parse(raw);
      return { version: 1, answers: s.answers || {}, last: s.last || null, updatedAt: s.updatedAt || 0 };
    } catch (e) {
      return defaultState();
    }
  }
  function save() {
    state.updatedAt = Date.now();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage full / blocked */ }
  }

  function answersOf(id) { return state.answers[id] || []; }
  function isDone(id) {
    var l = byId[id];
    var a = answersOf(id);
    return l.questions.every(function (q, i) { return a[i] === q.answer; });
  }
  function doneCount() {
    return LESSONS.filter(function (l) { return isDone(l.id); }).length;
  }

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;";
    });
  }

  var KEYWORDS = {};
  ("using namespace class public private static void int double string bool var new if else for foreach while return true false null switch case break default try catch finally throw this base override virtual get set in out ref is as async await List Console").split(" ").forEach(function (k) { KEYWORDS[k] = 1; });

  function highlight(code) {
    var re = /(\/\/[^\n]*)|(\$?@?"(?:""|\\.|[^"\\])*")|(\b\d+(?:\.\d+)?[fFdDmMlL]?\b)|(\b[A-Za-z_]\w*\b)/g;
    var out = "", last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      if (m[1]) out += '<span class="c">' + esc(m[1]) + "</span>";
      else if (m[2]) out += '<span class="s">' + esc(m[2]) + "</span>";
      else if (m[3]) out += '<span class="n">' + esc(m[3]) + "</span>";
      else out += KEYWORDS[m[4]] ? '<span class="k">' + esc(m[4]) + "</span>" : esc(m[4]);
      last = re.lastIndex;
    }
    return out + esc(code.slice(last));
  }
  function codeBlock(code) {
    return '<pre class="code"><code>' + highlight(code) + "</code></pre>";
  }

  function header() {
    var done = doneCount(), total = LESSONS.length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    return '' +
      '<header class="top">' +
        '<div class="top-row">' +
          '<a class="brand" href="#/" data-action="home">C# ドリル</a>' +
          '<span class="count">' + done + " / " + total + " 完了</span>" +
        "</div>" +
        '<div class="bar"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
      "</header>";
  }

  function renderHome() {
    var target = (state.last && byId[state.last]) ? state.last : (LESSONS.find(function (l) { return !isDone(l.id); }) || {}).id;
    var resume = "";
    if (target) {
      var label = state.last ? "続きから" : "はじめる";
      resume = '<button class="primary resume" data-action="open" data-id="' + target + '">' + label + " — " + esc(byId[target].title) + "</button>";
    }

    var sections = [];
    LESSONS.forEach(function (l) {
      var sec = sections.filter(function (s) { return s.name === l.section; })[0];
      if (!sec) { sec = { name: l.section, items: [] }; sections.push(sec); }
      sec.items.push(l);
    });

    var list = sections.map(function (sec) {
      var items = sec.items.map(function (l) {
        var a = answersOf(l.id);
        var correct = l.questions.filter(function (q, i) { return a[i] === q.answer; }).length;
        var done = isDone(l.id);
        return '<a class="lesson ' + (done ? "done" : "") + '" href="#/l/' + l.id + '" data-action="open" data-id="' + l.id + '">' +
          '<span class="dot">' + (done ? "✓" : "") + "</span>" +
          '<span class="lesson-main">' +
            '<span class="lesson-title">' + esc(l.title) + "</span>" +
            '<span class="lesson-sub">' + l.questions.length + " 問 ・ 正解 " + correct + "</span>" +
          "</span>" +
        "</a>";
      }).join("");
      return '<section class="sec"><h2 class="sec-title">' + esc(sec.name) + "</h2>" + items + "</section>";
    }).join("");

    return header() +
      '<main class="view">' +
        resume +
        list +
        '<section class="sec">' +
          '<h2 class="sec-title">進捗の保存</h2>' +
          '<p class="note">進捗はこの端末のブラウザに自動保存されます。機種変更やデータ削除に備えて、書き出しておけます。</p>' +
          '<div class="row">' +
            '<button data-action="export">書き出す</button>' +
            '<button data-action="import">読み込む</button>' +
            '<button class="danger" data-action="reset">リセット</button>' +
          "</div>" +
          '<input type="file" id="importFile" accept="application/json,.json" hidden />' +
          '<p class="note small">最終更新: ' + (state.updatedAt ? new Date(state.updatedAt).toLocaleString() : "まだ") + "</p>" +
        "</section>" +
      "</main>";
  }

  function renderLesson(id) {
    var l = byId[id];
    if (!l) return renderHome();
    var a = answersOf(id);

    var qs = l.questions.map(function (q, i) {
      var chosen = a[i];
      var answered = chosen !== undefined && chosen !== null;
      var ok = answered && chosen === q.answer;
      var opts = q.options.map(function (o, j) {
        var cls = "opt";
        if (answered) {
          if (j === q.answer) cls += " correct";
          else if (j === chosen) cls += " wrong";
          else cls += " muted";
        }
        return '<button class="' + cls + '" data-action="answer" data-id="' + id + '" data-q="' + i + '" data-choice="' + j + '"' + (answered ? " disabled" : "") + ">" + esc(o) + "</button>";
      }).join("");
      var fb = answered
        ? '<p class="fb ' + (ok ? "ok" : "ng") + '">' + (ok ? "正解！" : "おしい。") + " " + esc(q.explain || "") + "</p>"
        : "";
      return '<div class="q">' +
        '<p class="q-text">' + (i + 1) + ". " + esc(q.q) + "</p>" +
        (q.code ? codeBlock(q.code) : "") +
        '<div class="opts">' + opts + "</div>" +
        fb +
      "</div>";
    }).join("");

    var idx = LESSONS.findIndex(function (x) { return x.id === id; });
    var prev = LESSONS[idx - 1];
    var next = LESSONS[idx + 1];
    var done = isDone(id);
    var correct = l.questions.filter(function (q, i) { return a[i] === q.answer; }).length;

    return header() +
      '<main class="view">' +
        '<a class="back" href="#/" data-action="home">← 一覧</a>' +
        '<h1 class="title">' + esc(l.title) + "</h1>" +
        '<p class="meta">' + esc(l.section) + " ・ " + correct + " / " + l.questions.length + " 正解" + (done ? " ・ 完了" : "") + "</p>" +
        '<div class="body">' + l.body + "</div>" +
        codeBlock(l.code) +
        '<h2 class="sec-title">確認クイズ</h2>' +
        qs +
        '<nav class="pager">' +
          (prev ? '<button data-action="open" data-id="' + prev.id + '">← 前へ</button>' : "<span></span>") +
          (next ? '<button class="primary" data-action="open" data-id="' + next.id + '">次へ →</button>' : '<a class="primary btnlink" href="#/" data-action="home">一覧へ</a>') +
        "</nav>" +
      "</main>";
  }

  function render() {
    var hash = location.hash || "#/";
    var m = hash.match(/^#\/l\/(.+)$/);
    var app = document.getElementById("app");
    if (m && byId[m[1]]) {
      state.last = m[1];
      save();
      app.innerHTML = renderLesson(m[1]);
    } else {
      app.innerHTML = renderHome();
    }
    window.scrollTo(0, 0);
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var action = el.dataset.action;
    if (action === "home") { location.hash = "#/"; }
    else if (action === "open") { location.hash = "#/l/" + el.dataset.id; }
    else if (action === "answer") {
      var id = el.dataset.id, qi = Number(el.dataset.q), choice = Number(el.dataset.choice);
      if (!state.answers[id]) state.answers[id] = [];
      state.answers[id][qi] = choice;
      save();
      render();
    } else if (action === "export") { exportProgress(); }
    else if (action === "import") { document.getElementById("importFile").click(); }
    else if (action === "reset") {
      if (confirm("進捗をリセットします。よろしいですか？")) {
        state = defaultState();
        save();
        if (location.hash === "#/") render(); else location.hash = "#/";
      }
    }
  });

  document.addEventListener("change", function (e) {
    if (e.target && e.target.id === "importFile") {
      var f = e.target.files && e.target.files[0];
      if (f) importProgress(f);
      e.target.value = "";
    }
  });

  function exportProgress() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "csharp-learn-progress.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function importProgress(file) {
    file.text().then(function (text) {
      var s = JSON.parse(text);
      if (!s || typeof s !== "object" || !s.answers) throw new Error("形式が違います");
      state = { version: 1, answers: s.answers || {}, last: s.last || null, updatedAt: s.updatedAt || 0 };
      save();
      render();
      alert("読み込みました");
    }).catch(function (err) {
      alert("読み込みに失敗しました: " + err.message);
    });
  }

  window.addEventListener("hashchange", render);
  render();
})();
