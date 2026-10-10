(function () {
  "use strict";

  var STORE_KEY = "csharp-learn:v1";
  var LESSONS = window.LESSONS;
  var PLACEMENT = window.PLACEMENT;
  var LEVELS = window.LEVELS;
  var DRILL_SIZE = 10;
  var byId = {};
  LESSONS.forEach(function (l) { byId[l.id] = l; });

  function defaultState() {
    return {
      version: 1,
      answers: {},
      last: null,
      level: null,
      check: { answers: [], skipped: false },
      drill: { best: 0, answered: 0, correct: 0, runs: 0 },
      updatedAt: 0
    };
  }

  var state = load();
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultState();
      var s = JSON.parse(raw);
      return {
        version: 1,
        answers: s.answers || {},
        last: s.last || null,
        level: s.level || null,
        check: { answers: (s.check && s.check.answers) || [], skipped: !!(s.check && s.check.skipped) },
        drill: {
          best: (s.drill && s.drill.best) || 0,
          answered: (s.drill && s.drill.answered) || 0,
          correct: (s.drill && s.drill.correct) || 0,
          runs: (s.drill && s.drill.runs) || 0
        },
        updatedAt: s.updatedAt || 0
      };
    } catch (e) {
      return defaultState();
    }
  }
  function save() {
    state.updatedAt = Date.now();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* blocked */ }
  }

  // ---------- grading ----------
  function norm(v) {
    return String(v == null ? "" : v).trim().toLowerCase()
      .replace(/["'`「」『』]/g, "")
      .replace(/\s+/g, " ");
  }
  function isCorrect(q, val) {
    if (val === undefined || val === null) return false;
    if (q.type === "input") {
      return q.answers.some(function (a) { return norm(a) === norm(val); });
    }
    return val === q.answer;
  }
  function correctText(q) {
    return q.type === "input" ? q.answers[0] : q.options[q.answer];
  }

  function answersOf(id) { return state.answers[id] || []; }
  function isDone(id) {
    var l = byId[id];
    var a = answersOf(id);
    return l.questions.every(function (q, i) { return isCorrect(q, a[i]); });
  }
  function doneCount() { return LESSONS.filter(function (l) { return isDone(l.id); }).length; }

  function levelForScore(score) { return score <= 3 ? LEVELS[0] : score <= 6 ? LEVELS[1] : LEVELS[2]; }
  function levelById(id) { return LEVELS.filter(function (l) { return l.id === id; })[0] || null; }
  function startId() {
    var lv = state.level ? levelById(state.level) : null;
    return (lv && byId[lv.start]) ? lv.start : LESSONS[0].id;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;";
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
  function codeBlock(code) { return '<pre class="code"><code>' + highlight(code) + "</code></pre>"; }
  // 本文に直接書いたコード（<pre class="code" data-code>）をハイライトする。
  function decorate(root) {
    Array.prototype.forEach.call(root.querySelectorAll("pre[data-code]"), function (p) {
      p.innerHTML = "<code>" + highlight(p.textContent.replace(/^\n+|\n+$/g, "")) + "</code>";
      p.removeAttribute("data-code");
    });
  }

  function header() {
    var done = doneCount(), total = LESSONS.length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    var lv = state.level ? levelById(state.level) : null;
    return '<header class="top">' +
      '<div class="top-row">' +
        '<a class="brand" href="#/" data-action="home">csharp-learn</a>' +
        (lv ? '<span class="badge">' + lv.badge + " " + esc(lv.name) + "</span>" : "") +
        '<span class="count">' + done + " / " + total + " 完了</span>" +
      "</div>" +
      '<div class="bar"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
    "</header>";
  }

  // ---------- one question block (choice or input) ----------
  function questionHtml(q, value, ctx, num) {
    var answered = value !== undefined && value !== null;
    var ok = answered && isCorrect(q, value);
    var locked = answered && ok;
    var head = '<p class="q-text">' + (num ? num + ". " : "") + esc(q.q) + "</p>";
    var code = q.code ? codeBlock(q.code) : "";
    var area;

    if (q.type === "input") {
      var iid = "ans-" + ctx.scope + "-" + (ctx.id || "d") + "-" + ctx.q;
      var mode = q.mode === "numeric" ? ' inputmode="numeric"' : "";
      area = '<div class="inputrow">' +
        '<input id="' + iid + '" class="answer-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"' + mode +
          ' data-scope="' + ctx.scope + '"' + (ctx.id ? ' data-id="' + ctx.id + '"' : "") + ' data-q="' + ctx.q + '"' +
          ' value="' + (answered ? esc(String(value)) : "") + '"' + (locked ? " disabled" : "") + ">" +
        (locked ? '<span class="mark ok">✓</span>' : '<button class="primary small" data-action="submit" data-scope="' + ctx.scope + '"' + (ctx.id ? ' data-id="' + ctx.id + '"' : "") + ' data-q="' + ctx.q + '" data-input="' + iid + '">判定</button>') +
        "</div>";
    } else {
      var opts = q.options.map(function (o, j) {
        var cls = "opt";
        if (answered) {
          if (j === q.answer) cls += " correct";
          else if (j === value) cls += " wrong";
          else if (locked) cls += " muted";
        }
        var dis = locked || (j === q.answer && answered) ? " disabled" : "";
        return '<button class="' + cls + '" data-action="answer" data-scope="' + ctx.scope + '"' + (ctx.id ? ' data-id="' + ctx.id + '"' : "") + ' data-q="' + ctx.q + '" data-choice="' + j + '"' + dis + ">" + esc(o) + "</button>";
      }).join("");
      area = '<div class="opts">' + opts + "</div>";
    }

    var fb = "";
    if (answered) {
      fb = ok
        ? '<p class="fb ok">正解！ ' + esc(q.explain || "") + "</p>"
        : '<p class="fb ng">おしい。正解は「' + esc(correctText(q)) + '」。' + esc(q.explain || "") + "</p>";
    }
    return '<div class="q ' + (ok ? "q-ok" : "") + '">' + head + code + area + fb + "</div>";
  }

  // ---------- level check ----------
  function renderCheck() {
    var a = state.check.answers;
    var i = a.length;
    if (i < PLACEMENT.length) {
      var q = PLACEMENT[i];
      var pct = Math.round((i / PLACEMENT.length) * 100);
      var opts = q.options.map(function (o, j) {
        return '<button class="opt" data-action="check" data-choice="' + j + '">' + esc(o) + "</button>";
      }).join("");
      return header() +
        '<main class="view check">' +
          '<h1 class="title">レベルチェック</h1>' +
          '<p class="meta">全 ' + PLACEMENT.length + " 問。コードの読み書きだけでなく、コンパイルの仕組みやオブジェクト指向も出ます。できなくて大丈夫、始める場所を決めるだけです。</p>" +
          '<div class="bar"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="q" style="margin-top:20px">' +
            '<p class="q-text">Q' + (i + 1) + ". " + esc(q.q) + "</p>" +
            (q.code ? codeBlock(q.code) : "") +
            '<div class="opts">' + opts + "</div>" +
          "</div>" +
          '<p class="note"><a href="#/" data-action="checkskip">あとで受ける</a></p>' +
        "</main>";
    }

    var score = a.filter(function (v, k) { return v === PLACEMENT[k].answer; }).length;
    var lv = levelForScore(score);
    var start = byId[lv.start] || LESSONS[0];
    return header() +
      '<main class="view check">' +
        '<h1 class="title">診断結果</h1>' +
        '<div class="result">' +
          '<div class="result-badge">' + lv.badge + "</div>" +
          '<div class="result-name">' + esc(lv.name) + "</div>" +
          '<p class="note">' + PLACEMENT.length + " 問中 " + score + " 問 正解。" + esc(lv.desc) + "</p>" +
          '<p class="note">おすすめの開始位置: <strong>' + esc(start.title) + "</strong></p>" +
        "</div>" +
        '<button class="primary" data-action="home">このレベルで始める</button>' +
        '<div class="row" style="margin-top:10px"><button data-action="recheck">もう一度受ける</button></div>' +
      "</main>";
  }

  // ---------- home ----------
  function renderHome() {
    var start = startId();
    var target = (state.last && byId[state.last]) ? state.last : start;
    var resume = "";
    if (target) {
      var label = state.last ? "続きから" : "ここから始める";
      resume = '<button class="primary resume" data-action="open" data-id="' + target + '">' + label + " — " + esc(byId[target].title) + "</button>";
    }

    var prompt = "";
    if (!state.level) {
      prompt = '<a class="prompt" href="#/check" data-action="noop"><strong>まずレベルチェック</strong><span>' + PLACEMENT.length + '問。コードから仕組み・オブジェクト指向まで、始める場所を決めます →</span></a>';
    }

    var d = state.drill;
    var drillCard = '<a class="prompt drill" href="#/drill" data-action="noop"><strong>ランダム演習</strong><span>全レッスンから' + DRILL_SIZE + '問をランダム出題。ベスト ' + d.best + " / " + DRILL_SIZE + " ・ 累計 " + d.correct + " / " + d.answered + " 正解 →</span></a>";

    var lv = state.level ? levelById(state.level) : null;
    var startIdx = LESSONS.findIndex(function (l) { return l.id === start; });

    var sections = [];
    LESSONS.forEach(function (l) {
      var sec = sections.filter(function (s) { return s.name === l.section; })[0];
      if (!sec) { sec = { name: l.section, items: [] }; sections.push(sec); }
      sec.items.push(l);
    });

    var list = sections.map(function (sec) {
      var items = sec.items.map(function (l) {
        var a = answersOf(l.id);
        var correct = l.questions.filter(function (q, i) { return isCorrect(q, a[i]); }).length;
        var done = isDone(l.id);
        var idx = LESSONS.indexOf(l);
        var tag = "";
        if (state.level) {
          if (idx === startIdx) tag = '<span class="tag here">ここから</span>';
          else if (idx < startIdx) tag = '<span class="tag skip">スキップ可</span>';
        }
        return '<a class="lesson ' + (done ? "done" : "") + '" href="#/l/' + l.id + '" data-action="open" data-id="' + l.id + '">' +
          '<span class="dot">' + (done ? "✓" : "") + "</span>" +
          '<span class="lesson-main">' +
            '<span class="lesson-title">' + esc(l.title) + tag + "</span>" +
            '<span class="lesson-sub">' + l.questions.length + " 問 ・ 正解 " + correct + "</span>" +
          "</span>" +
        "</a>";
      }).join("");
      return '<section class="sec"><h2 class="sec-title">' + esc(sec.name) + "</h2>" + items + "</section>";
    }).join("");

    return header() +
      '<main class="view">' +
        prompt +
        resume +
        drillCard +
        list +
        '<section class="sec">' +
          '<h2 class="sec-title">設定</h2>' +
          (lv ? '<p class="note">現在のレベル: ' + lv.badge + " " + esc(lv.name) + "</p>" : "") +
          '<div class="row"><button data-action="recheck">レベルチェックをやり直す</button></div>' +
        "</section>" +
        '<section class="sec">' +
          '<h2 class="sec-title">進捗の保存</h2>' +
          '<p class="note">進捗はこの端末のブラウザに自動保存されます。機種変更やデータ削除に備えて、書き出しておけます。</p>' +
          '<div class="row">' +
            '<button data-action="export">書き出す</button>' +
            '<button data-action="import">読み込む</button>' +
            '<button class="danger" data-action="reset">リセット</button>' +
          "</div>" +
          '<input type="file" id="importFile" accept="application/json,.json" hidden />' +
        "</section>" +
      "</main>";
  }

  // ---------- lesson ----------
  function renderLesson(id) {
    var l = byId[id];
    if (!l) return renderHome();
    var a = answersOf(id);

    var qs = l.questions.map(function (q, i) {
      return questionHtml(q, a[i], { scope: "lesson", id: id, q: i }, i + 1);
    }).join("");

    var idx = LESSONS.findIndex(function (x) { return x.id === id; });
    var prev = LESSONS[idx - 1];
    var next = LESSONS[idx + 1];
    var done = isDone(id);
    var correct = l.questions.filter(function (q, i) { return isCorrect(q, a[i]); }).length;

    return header() +
      '<main class="view">' +
        '<a class="back" href="#/" data-action="home">← 一覧</a>' +
        '<h1 class="title">' + esc(l.title) + "</h1>" +
        '<p class="meta">' + esc(l.section) + " ・ " + correct + " / " + l.questions.length + " 正解" + (done ? " ・ 完了" : "") + "</p>" +
        '<div class="body">' + l.body + "</div>" +
        (l.code ? codeBlock(l.code) : "") +
        '<h2 class="sec-title">確認クイズ（選択 ' + l.questions.filter(function (q) { return q.type !== "input"; }).length + ' 問 / 入力 ' + l.questions.filter(function (q) { return q.type === "input"; }).length + " 問）</h2>" +
        qs +
        '<nav class="pager">' +
          (prev ? '<button data-action="open" data-id="' + prev.id + '">← 前へ</button>' : "<span></span>") +
          (next ? '<button class="primary" data-action="open" data-id="' + next.id + '">次へ →</button>' : '<a class="primary btnlink" href="#/" data-action="home">一覧へ</a>') +
        "</nav>" +
      "</main>";
  }

  // ---------- random drill ----------
  var drill = null;

  function newDrill() {
    var pool = [];
    LESSONS.forEach(function (l) {
      l.questions.forEach(function (q, qi) { pool.push({ lesson: l.title, q: q }); });
    });
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return { items: pool.slice(0, Math.min(DRILL_SIZE, pool.length)), i: 0, results: {}, finished: false };
  }
  function drillCorrect() {
    if (!drill) return 0;
    return drill.items.filter(function (it, k) { return isCorrect(it.q, drill.results[k]); }).length;
  }
  function finishDrill() {
    if (!drill || drill.finished) return;
    drill.finished = true;
    var sc = drillCorrect();
    state.drill.best = Math.max(state.drill.best, sc);
    state.drill.answered += drill.items.length;
    state.drill.correct += sc;
    state.drill.runs += 1;
    save();
  }

  function renderDrill() {
    if (!drill) drill = newDrill();
    if (drill.i >= drill.items.length) {
      var sc = drillCorrect();
      var total = drill.items.length;
      return header() +
        '<main class="view">' +
          '<h1 class="title">ランダム演習 結果</h1>' +
          '<div class="result">' +
            '<div class="result-badge">' + sc + " / " + total + "</div>" +
            '<div class="result-name">' + (sc === total ? "満点！" : sc >= total / 2 ? "いい調子" : "もう一周しよう") + "</div>" +
            '<p class="note">ベスト ' + state.drill.best + " / " + DRILL_SIZE + " ・ 累計 " + state.drill.correct + " / " + state.drill.answered + " 正解</p>" +
          "</div>" +
          '<button class="primary" data-action="drillagain">もう一度</button>' +
          '<div class="row" style="margin-top:10px"><a class="btnlink" href="#/" data-action="home">一覧へ</a></div>' +
        "</main>";
    }
    var item = drill.items[drill.i];
    var val = drill.results[drill.i];
    var answered = val !== undefined && val !== null;
    var ok = answered && isCorrect(item.q, val);
    var pct = Math.round((drill.i / drill.items.length) * 100);
    return header() +
      '<main class="view">' +
        '<a class="back" href="#/" data-action="home">← 一覧</a>' +
        '<h1 class="title">ランダム演習</h1>' +
        '<p class="meta">' + (drill.i + 1) + " / " + drill.items.length + " 問 ・ 正解 " + drillCorrect() + " ・ " + esc(item.lesson) + "</p>" +
        '<div class="bar"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
        '<div style="margin-top:18px">' + questionHtml(item.q, val, { scope: "drill", q: drill.i }, 0) + "</div>" +
        (answered
          ? '<nav class="pager"><button class="primary" data-action="drillnext">' + (drill.i + 1 < drill.items.length ? "次の問題 →" : "結果を見る") + "</button></nav>"
          : "") +
      "</main>";
  }

  function render() {
    var hash = location.hash || "#/";
    var app = document.getElementById("app");
    var lm = hash.match(/^#\/l\/(.+)$/);
    if (lm && byId[lm[1]]) {
      state.last = lm[1];
      save();
      app.innerHTML = renderLesson(lm[1]);
    } else if (hash === "#/check") {
      app.innerHTML = renderCheck();
    } else if (hash === "#/drill") {
      app.innerHTML = renderDrill();
    } else {
      if (!state.level && !state.check.skipped) { location.replace("#/check"); return; }
      app.innerHTML = renderHome();
    }
    decorate(app);
    window.scrollTo(0, 0);
  }

  function storeAnswer(scope, id, q, value) {
    if (scope === "drill") {
      if (drill) drill.results[q] = value;
    } else {
      if (!state.answers[id]) state.answers[id] = [];
      state.answers[id][q] = value;
    }
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var action = el.dataset.action;
    if (action === "home" || action === "noop") { location.hash = "#/"; }
    else if (action === "open") { location.hash = "#/l/" + el.dataset.id; }
    else if (action === "answer") {
      storeAnswer(el.dataset.scope, el.dataset.id, Number(el.dataset.q), Number(el.dataset.choice));
      save(); render();
    } else if (action === "submit") {
      var inp = document.getElementById(el.dataset.input);
      if (!inp || inp.disabled) return;
      storeAnswer(el.dataset.scope, el.dataset.id, Number(el.dataset.q), inp.value);
      save(); render();
    } else if (action === "check") {
      state.check.answers.push(Number(el.dataset.choice));
      if (state.check.answers.length >= PLACEMENT.length) {
        var sc = state.check.answers.filter(function (v, k) { return v === PLACEMENT[k].answer; }).length;
        state.level = levelForScore(sc).id;
      }
      save(); render();
    } else if (action === "checkskip") { state.check.skipped = true; save(); location.hash = "#/"; }
    else if (action === "recheck") {
      state.check.answers = []; state.check.skipped = false; state.level = null;
      save(); location.hash = "#/check"; render();
    } else if (action === "drillnext") {
      drill.i += 1;
      if (drill.i >= drill.items.length) finishDrill();
      save(); render();
    } else if (action === "drillagain") {
      drill = newDrill(); save(); render();
    } else if (action === "export") { exportProgress(); }
    else if (action === "import") { document.getElementById("importFile").click(); }
    else if (action === "reset") {
      if (confirm("進捗をリセットします。よろしいですか？")) {
        state = defaultState(); drill = null; save(); location.hash = "#/"; render();
      }
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var t = e.target;
    if (t && t.classList && t.classList.contains("answer-input") && !t.disabled) {
      e.preventDefault();
      storeAnswer(t.dataset.scope, t.dataset.id, Number(t.dataset.q), t.value);
      save(); render();
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
      state = {
        version: 1,
        answers: s.answers || {},
        last: s.last || null,
        level: s.level || null,
        check: { answers: (s.check && s.check.answers) || [], skipped: !!(s.check && s.check.skipped) },
        drill: {
          best: (s.drill && s.drill.best) || 0,
          answered: (s.drill && s.drill.answered) || 0,
          correct: (s.drill && s.drill.correct) || 0,
          runs: (s.drill && s.drill.runs) || 0
        },
        updatedAt: s.updatedAt || 0
      };
      save(); render();
      alert("読み込みました");
    }).catch(function (err) { alert("読み込みに失敗しました: " + err.message); });
  }

  window.addEventListener("hashchange", render);
  render();
})();
