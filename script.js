/* Bravefable v2 "Daylight".
   Every scroll-driven visual is a pure function of its section's progress p (0..1),
   recomputed each frame. Scrolling back re-evaluates the same values, so every
   sequence is reversible and deterministic. CSS animations are ambient loops only.

   Process timeline (p through the pinned section):
   0.000-0.262  Scene 1  cursor drops the photo, scanner, trait chips
   0.262-0.505  Scene 2  story cards from STORIES, the first is picked, its child's name types
   0.505-0.850  Scene 3  photo dissolves into cobalt ink, re-forms as the drawn
                         illustration, specks become gold fireflies, pages fly in,
                         the hardcover assembles
   0.850-1.000  Payoff   the book opens onto that child's three pages */
(function () {
  "use strict";

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(x) { return x * x * (3 - 2 * x); }
  function lin(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function seg(p, a, b) { return smooth(lin(p, a, b)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  /* ============ STORIES → DOM (every story fact comes from stories.js) ============ */
  var STORIES = window.STORIES, DEMO = STORIES[0];
  function small(src) { return src.replace(".webp", "-600.webp"); }
  function esc(t) { var d = document.createElement("div"); d.textContent = t; return d.innerHTML; }
  function titleParts(story, name) {
    var t = story.title.replace("{name}", name);
    return { name: name, rest: t.slice(name.length).trim(), full: t };
  }
  function img(src, cls, sizes, lazy) {
    return '<img class="' + cls + '" src="' + small(src) + '" srcset="' + small(src) + ' 600w, ' + src + ' 1200w" sizes="' +
      sizes + '" width="600" height="800" alt=""' + (lazy ? ' loading="lazy"' : "") + ' decoding="async" />';
  }
  /* A story page: the art plus its text printed in the calm ivory top third, sized in cqw so it scales with the page. */
  function fill(text, name) {
    if (name) return text.split("{name}").join(name);
    return text.replace(/(^|[.!?…“]\s*){name}/g, "$1Your child").split("{name}").join("your child");
  }
  function printed(imgHtml, text, name) {
    return '<div class="page">' + imgHtml + '<p class="page__text">' + esc(fill(text, name)) + "</p></div>";
  }
  function page(pg, name, sizes, lazy) { return printed(img(pg.src, "", sizes, lazy), pg.text, name); }
  function palette(st) {
    return "--dom:" + st.palette.dominant + ";--acc:" + st.palette.accent;
  }
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BEATS = ["The feeling shows up", "The mentor shows the way", "Back home, they do it"];
  var STRENGTH = { 3: "Strong evidence", 2: "Related evidence", 1: "Indirect evidence" };

  (function renderStories() {
    var demoTitle = titleParts(DEMO, DEMO.child.name);
    $("[data-photo-img]").src = small(DEMO.child.photo);
    $$("[data-chip]").forEach(function (c, k) { c.textContent = DEMO.child.traits[k]; });
    $("[data-cards]").insertAdjacentHTML("afterbegin", STORIES.map(function (st, k) {
      return '<div class="scard" data-card style="--dom:' + st.palette.dominant + '"><span class="scard__dot"></span>' +
        '<span class="scard__title">' + esc(st.need) + '</span>' +
        (k === 0 ? '<span class="scard__check" data-check><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9" fill="none" stroke="#15171F" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : "") +
        "</div>";
    }).join(""));
    $$("[data-fly-page]").forEach(function (f) { f.innerHTML = page(DEMO.pages[+f.dataset.flyPage], DEMO.child.name, "380px", true); });
    var art = $("[data-art]");
    art.src = small(DEMO.pages[0].src); art.alt = "Cover illustration: " + DEMO.child.name + ", drawn in the story's house style.";
    $("[data-cover-title] .cover__name").textContent = demoTitle.name;
    $("[data-cover-title] .cover__rest").textContent = demoTitle.rest;
    $("[data-payoff-img]").innerHTML = DEMO.pages.map(function (pg) { return page(pg, DEMO.child.name, "(max-width: 820px) 80vw, 420px", true); }).join("");
    $("[data-still-art]").src = small(DEMO.pages[0].src);
    $("[data-still-title] .cover__rest").textContent = titleParts(DEMO, "").rest;
    $("[data-faq-stories]").textContent = "One story for each moment: " +
      STORIES.map(function (st) { return st.need.charAt(0).toLowerCase() + st.need.slice(1); }).join(", ") + ".";

    /* track: the teaser, one card per story; details live in the guide */
    var slot = $("[data-story-slot]");
    slot.insertAdjacentHTML("afterend", STORIES.map(function (st) {
      return '<article class="story" style="' + palette(st) + '">' +
        page(st.pages[0], st.child.name, "(max-width: 820px) 84vw, 380px", false) +
        '<p class="story__need mono">' + esc(st.need) + "</p>" +
        '<h3 class="story__title">' + esc(titleParts(st, st.child.name).full) + "</h3>" +
        '<a class="story__link" href="#guide-' + st.id + '">Read the guide <span aria-hidden="true">→</span></a>' +
        "</article>";
    }).join(""));
    slot.remove();

    /* children wall: sample photo, drawn character on hover, focus or tap */
    $$("[data-count]").forEach(function (el) { el.textContent = STORIES.length; });
    var wall = $("[data-wall]");
    wall.innerHTML = STORIES.map(function (st) {
      var c = st.child;
      return '<li class="tile" style="' + palette(st) + '"><a class="tile__link" href="#guide-' + st.id + '">' +
        '<span class="tile__flip">' +
          '<img class="tile__face" src="' + small(c.photo) + '" width="600" height="600" alt="Sample photo of ' + esc(c.name) + '" decoding="async" />' +
          '<img class="tile__face tile__face--drawn" src="' + small(c.sheet) + '" width="600" height="800" alt="' + esc(c.name) + ', drawn as the hero" decoding="async" />' +
        "</span>" +
        '<span class="tile__cap"><b>' + esc(c.name) + ", " + c.age + "</b><span>" + esc(st.need) + "</span></span>" +
        "</a></li>";
    }).join("");
    var tiles = $$(".tile", wall);
    wall.addEventListener("click", function (e) {
      var tile = e.target.closest(".tile");
      if (!tile || tile.classList.contains("is-drawn") || window.matchMedia("(hover: hover)").matches) return;
      e.preventDefault();
      tiles.forEach(function (t) { t.classList.toggle("is-drawn", t === tile); });
    });
    if (!reduceMotion && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        tiles.forEach(function (t, k) {
          setTimeout(function () { t.classList.add("is-waving"); }, k * 140);
          setTimeout(function () { t.classList.remove("is-waving"); }, 1500 + k * 140);
        });
      }, { threshold: 0.5 });
      io.observe(wall);
    }

    /* guide: one tab and one panel per story, deep-linkable as #guide-<id> */
    var tabsEl = $("[data-guide-tabs]");
    tabsEl.innerHTML = STORIES.map(function (st, k) {
      return '<button class="gtab" type="button" role="tab" id="tab-' + st.id + '" aria-controls="guide-' + st.id + '" aria-selected="' + (k === 0) +
        '" tabindex="' + (k === 0 ? 0 : -1) + '" style="' + palette(st) + '">' +
        '<img src="' + small(st.child.photo) + '" width="600" height="600" alt="" decoding="async" />' +
        '<span><b>' + esc(st.child.name) + '</b><small>' + esc(st.need) + "</small></span></button>";
    }).join("");
    $("[data-guide-panels]").innerHTML = STORIES.map(function (st, k) {
      var c = st.child, named = function (t) { return esc(t.replace("{name}", c.name)); };
      var journey = [
        ['<img src="' + small(c.photo) + '" width="600" height="600" alt="" loading="lazy" decoding="async" />', "Sample photo"],
        ['<img src="' + small(c.sheet) + '" width="600" height="800" alt="" loading="lazy" decoding="async" />', "Drawn as the hero"],
      ].concat(st.pages.map(function (pg, i) { return [page(pg, c.name, "(max-width: 820px) 78vw, 320px", true), BEATS[i]]; }));
      return '<article class="gpanel" role="tabpanel" id="guide-' + st.id + '" aria-labelledby="tab-' + st.id + '" tabindex="0" style="' + palette(st) + '"' + (k ? " hidden" : "") + ">" +
        '<header class="gpanel__head">' +
          '<p class="mono gpanel__need">' + esc(st.need) + "</p>" +
          '<h3 class="gpanel__title">' + named(st.title) + "</h3>" +
          '<p class="gpanel__meta">With ' + esc(st.mentor) + ". " + esc(st.world) + ".<br />" + esc(st.feeling.from) + " → " + esc(st.feeling.to) + "</p>" +
        "</header>" +
        '<ol class="gpanel__journey" aria-label="The journey, in pictures">' + journey.map(function (j, i) {
          return '<li><figure>' + j[0] +
            '<figcaption>' + (i > 1 ? '<span class="mono">' + (i - 1) + "</span> " : "") + esc(j[1]) + "</figcaption></figure></li>";
        }).join("") + "</ol>" +
        '<div class="gpanel__grid">' +
          '<div><section><h4>What it teaches</h4><p class="gpanel__goal">' + esc(st.goal) + "</p></section>" +
          "<section><h4>The technique</h4><ol class=\"gpanel__steps\">" + st.technique.map(function (t) { return "<li>" + named(t) + "</li>"; }).join("") + "</ol>" +
          '<p class="gpanel__chant"><em>“' + esc(st.chant) + "”</em></p></section></div>" +
          "<div><section><h4>What research says</h4><ul class=\"gpanel__research\">" + st.research.map(function (r) {
            return "<li><p>" + esc(r.finding) + '</p><p class="mono"><cite>' + esc(r.cite) + "</cite> · " + STRENGTH[r.strength] + "</p></li>";
          }).join("") + "</ul>" + '<p class="gpanel__caveat">' + esc(st.caveat) + "</p></section>" +
          "<section><h4>At home</h4><ul class=\"gpanel__home\">" + st.atHome.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></section></div>" +
        "</div></article>";
    }).join("");
  })();

  /* ============ GUIDE: tabs (click, arrow keys, #guide-<id>) ============ */
  var gtabs = $$(".gtab"), gpanels = $$(".gpanel");
  function selectStory(i, focus) {
    gtabs.forEach(function (t, k) {
      t.setAttribute("aria-selected", String(k === i));
      t.tabIndex = k === i ? 0 : -1;
      gpanels[k].hidden = k !== i;
    });
    if (focus) gtabs[i].focus();
    gtabs[i].scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  $("[data-guide-tabs]").addEventListener("click", function (e) {
    var t = e.target.closest(".gtab");
    if (!t) return;
    var i = gtabs.indexOf(t);
    selectStory(i, false);
    history.replaceState(null, "", "#guide-" + STORIES[i].id);
  });
  $("[data-guide-tabs]").addEventListener("keydown", function (e) {
    var i = gtabs.indexOf(document.activeElement), n = gtabs.length;
    var next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: n - 1 }[e.key];
    if (i < 0 || next === undefined) return;
    e.preventDefault();
    next = (next + n) % n;
    selectStory(next, true);
    history.replaceState(null, "", "#guide-" + STORIES[next].id);
  });
  function openFromHash() {
    var m = /^#guide-(.+)$/.exec(location.hash);
    var i = m ? STORIES.findIndex(function (st) { return st.id === m[1]; }) : -1;
    if (i < 0) return;
    selectStory(i, false);
    $("[data-guide-tabs]").scrollIntoView({ block: "start" });
  }
  window.addEventListener("hashchange", openFromHash);
  var narrow = window.matchMedia("(max-width: 820px)");

  function progress(el) {
    var dist = el.offsetHeight - window.innerHeight;
    if (dist <= 0) return 0;
    return clamp(-el.getBoundingClientRect().top / dist, 0, 1);
  }

  /* ============ MANIFESTO: word-by-word reveal ============ */
  var manifesto = $("[data-manifesto]");
  var lines = $$("[data-line]");
  var streaks = $("[data-streaks]");
  lines.forEach(function (line) {
    var words = [];
    (function walk(node, italic) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach(function (t) { if (t) words.push({ t: t, i: italic }); });
        else walk(n, italic || n.nodeName === "EM");
      });
    })(line, false);
    line.innerHTML = words.map(function (w) {
      if (/^\s+$/.test(w.t)) return " ";
      return (w.i ? "<em class=\"w\">" : "<span class=\"w\">") + w.t + (w.i ? "</em>" : "</span>");
    }).join("");
    line._w = $$(".w", line);
  });
  function reveal(line, r) {
    var n = line._w.length;
    line._w.forEach(function (w, k) { w.style.opacity = 0.14 + 0.86 * clamp(r * (n + 1.5) - k, 0, 1); });
  }
  function renderManifesto() {
    if (reduceMotion) return;
    var p = progress(manifesto);
    var out1 = seg(p, 0.46, 0.53), in2 = seg(p, 0.51, 0.58);
    reveal(lines[0], lin(p, 0.03, 0.4));
    reveal(lines[1], lin(p, 0.55, 0.92));
    lines[0].style.opacity = 1 - out1;
    lines[0].style.transform = "translateY(" + (-out1 * 40) + "px)";
    lines[1].style.opacity = in2;
    lines[1].style.transform = "translateY(" + ((1 - in2) * 40) + "px)";
    streaks.style.transform = "translate3d(" + lerp(-5, 5, p) + "%," + lerp(-3, 3, p) + "%,0)";
  }

  /* ============ PROCESS: pinned scrollytelling ============ */
  var section = $("[data-pin-section]");
  var stage = $("[data-stage]");
  var panels = $$("[data-panel]");
  var dots = $$(".dots li");
  var dropzone = $("[data-dropzone]"), cue = $("[data-cue]");
  var polaroid = $("[data-polaroid]"), photoBox = $("[data-photo]");
  var scan = $("[data-scan]"), analyse = $("[data-analyse]");
  var chips = $$("[data-chip]");
  var picker = $("[data-picker]"), cards = $$("[data-card]"), check = $("[data-check]");
  var ripple = $("[data-ripple]"), namefield = $("[data-namefield]"), typed = $("[data-typed]");
  var cursor = $("[data-cursor]");
  var canvas = $("[data-fx]"), ctx = canvas.getContext("2d");
  var flies = $$("[data-fly]");
  var book = $("[data-book]"), art = $("[data-art]");
  var chrome = $("[data-chrome]"), edges = $("[data-edges]");
  var payoff = $("[data-payoff]"), payoffImg = $("[data-payoff-img]"), payoffCap = $("[data-payoff-cap]");

  var B = [0, 0.262, 0.505, 0.85, 1];
  var PFADE = 0.02;
  var L = {};
  var dpr = 1;
  var HERO_NAME = DEMO.child.name;

  var photoCols = null;
  (function samplePhoto() {
    var im = new Image();
    im.onload = function () {
      try {
        var c = document.createElement("canvas"); c.width = 24; c.height = 30;
        var g = c.getContext("2d"), r = Math.max(24 / im.width, 30 / im.height);
        g.drawImage(im, (24 - im.width * r) / 2, (30 - im.height * r) / 2, im.width * r, im.height * r);
        var d = g.getImageData(0, 0, 24, 30).data, out = [];
        for (var i = 0; i < 720; i++) out.push([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
        photoCols = out; requestUpdate();
      } catch (e) { /* tainted: keep cobalt-only specks */ }
    };
    im.src = small(DEMO.child.photo);
  })();

  var P = [];
  var targets = null;
  function buildParticles(n) {
    var rnd = mulberry32(20261008);
    P = [];
    for (var i = 0; i < n; i++) {
      var rx = rnd(), ry = rnd();
      P.push({
        rx: rx, ry: ry,
        delay: ry * 0.032 + rnd() * 0.01,
        swirl: (rnd() < 0.5 ? -1 : 1) * (1.3 + rnd() * 1.4),
        orbit: 0.9 + rnd() * 0.9,
        flutter: (rnd() - 0.5) * 34,
        size: 0.7 + rnd() * rnd() * 2.4,
        shade: Math.floor(rnd() * 4),
        star: rnd() < 0.06,
        fly: rnd() < 0.12,
        fdel: rnd(),
        ang: rnd() * Math.PI * 2,
        rad: 0.62 + rnd() * 0.5,
        tpick: rnd(), tjx: rnd(), tjy: rnd(),
        tx: 0.5, ty: 0.5
      });
    }
    assignTargets();
  }
  function assignTargets() {
    for (var i = 0; i < P.length; i++) {
      var q = P[i];
      if (targets && targets.length) {
        var t = targets[Math.floor(q.tpick * targets.length)];
        q.tx = t[0] + (q.tjx - 0.5) / 96; q.ty = t[1] + (q.tjy - 0.5) / 128;
      } else {
        var a = q.tjx * Math.PI * 2, r = Math.sqrt(q.tpick) * 0.3;
        q.tx = 0.5 + Math.cos(a) * r; q.ty = 0.55 + Math.sin(a) * r * 1.2;
      }
    }
  }
  (function sampleArt() {
    var im = new Image();
    im.onload = function () {
      try {
        var c = document.createElement("canvas"); c.width = 96; c.height = 128;
        var cx = c.getContext("2d");
        var r = Math.max(96 / im.width, 128 / im.height), w = im.width * r, h = im.height * r;
        cx.drawImage(im, (96 - w) / 2, (128 - h) / 2, w, h);
        var d = cx.getImageData(0, 0, 96, 128).data, pts = [];
        for (var y = 0; y < 128; y++) for (var x = 0; x < 96; x++) {
          var k = (y * 96 + x) * 4, R = d[k], G = d[k + 1], Bl = d[k + 2];
          if (Bl > R + 30 && Bl > G + 8 && (R + G + Bl) / 3 < 150) pts.push([x / 96, y / 128]);
        }
        if (pts.length > 200) { targets = pts; assignTargets(); requestUpdate(); }
      } catch (e) { /* tainted canvas: keep the fallback shape */ }
    };
    im.src = small(DEMO.pages[0].src);
  })();

  var glow = document.createElement("canvas");
  (function () {
    glow.width = glow.height = 64;
    var g = glow.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,226,150,1)");
    gr.addColorStop(0.25, "rgba(232,180,72,.55)");
    gr.addColorStop(1, "rgba(214,162,74,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  })();
  var SHADES = [[19, 38, 94], [30, 58, 138], [59, 85, 181], [96, 122, 214]];
  var GOLD = [222, 172, 70];

  function layoutPin() {
    var Ws = stage.clientWidth, Hs = stage.clientHeight;
    L.Ws = Ws; L.Hs = Hs; L.cx = Ws / 2; L.cy = Hs / 2;
    L.mobile = Ws < 560;

    var dz = Math.min(Ws * (L.mobile ? 0.62 : 0.6), Hs * 0.84 / 1.22, 420);
    stage.style.setProperty("--dz-w", dz + "px");
    L.pw = dz * 0.76;
    stage.style.setProperty("--pw", L.pw + "px");
    L.ph = polaroid.offsetHeight;

    L.bw = Math.min(Ws * 0.5, Hs * 0.72 * 0.75, 380);
    L.bh = L.bw * 4 / 3;
    stage.style.setProperty("--bw", L.bw + "px");
    L.S0 = Math.min(1.35, (Hs * 0.88) / L.bh, (Ws * 0.84) / L.bw);
    L.k3 = (L.bw * L.S0 * 0.92) / L.pw;

    /* payoff: a landscape photo frame filling the stage */
    L.fw = Ws; L.fh = Math.min(Hs * (L.mobile ? 0.96 : 0.82), Ws * (L.mobile ? 1.15 : 0.78));
    L.fx = 0; L.fy = (Hs - L.fh) / 2;
    payoff.style.width = L.fw + "px"; payoff.style.height = L.fh + "px";
    payoff.style.transform = "translate(" + L.fx + "px," + L.fy + "px)";

    chips.forEach(function (c) { c._w = c.offsetWidth; c._h = c.offsetHeight; });

    var oldT = picker.style.transform, oldO = picker.style.opacity;
    picker.style.transform = "translate(-50%,-50%)";
    cards.forEach(function (c) { c._t = c.style.transform; c.style.transform = "none"; });
    var sr = stage.getBoundingClientRect();
    var c0 = cards[0].getBoundingClientRect(), nf = namefield.getBoundingClientRect(), cr = $("[data-cards]").getBoundingClientRect();
    L.card0 = { x: c0.left - sr.left + c0.width / 2, y: c0.top - sr.top + c0.height / 2 };
    L.name = { x: nf.left - sr.left + nf.width * 0.6, y: nf.top - sr.top + nf.height / 2 };
    ripple.style.left = (c0.left - cr.left + c0.width / 2) + "px";
    ripple.style.top = (c0.top - cr.top + c0.height / 2) + "px";
    picker.style.transform = oldT; picker.style.opacity = oldO;
    cards.forEach(function (c) { c.style.transform = c._t; });

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(Ws * dpr); canvas.height = Math.round(Hs * dpr);
    var n = L.mobile ? 420 : 720;
    if (P.length !== n) buildParticles(n);
    lastDrawn = true;
  }

  function snap(p) {
    if (p < B[1]) return 0.24;
    if (p < B[2]) return 0.48;
    if (p < B[3]) return 0.848;
    return 1;
  }
  function vis(el, o) { el.style.opacity = o; el.style.visibility = o < 0.005 ? "hidden" : "visible"; }

  function renderPin() {
    var raw = progress(section);
    var p = reduceMotion ? snap(raw) : raw;

    var best = 0, bestOp = -1;
    panels.forEach(function (el, i) {
      var pin = i === 0 ? 1 : seg(raw, B[i], B[i] + PFADE);
      var pout = i === panels.length - 1 ? 0 : seg(raw, B[i + 1] - PFADE, B[i + 1]);
      var op = pin * (1 - pout);
      vis(el, op);
      el.style.transform = reduceMotion ? "none" : "translateY(" + ((1 - pin) * 26 - pout * 26) + "px)";
      el.setAttribute("aria-hidden", op < 0.5 ? "true" : "false");
      if (op > bestOp) { bestOp = op; best = i; }
    });
    dots.forEach(function (d, i) { d.classList.toggle("is-active", i === best); });

    var cx = L.cx, cy = L.cy, pw = L.pw, ph = L.ph;

    /* scene 1 */
    var s1out = seg(p, 0.25, 0.28);
    var approach = seg(p, 0.0, 0.025);
    var drag = seg(p, 0.02, 0.115);
    var release = seg(p, 0.115, 0.15);
    vis(dropzone, 1 - s1out);
    cue.style.opacity = 1 - drag;

    var sx = cx + L.Ws * 0.3, sy = cy - L.Hs * 0.24;
    var px, py, rot, sc, pop;
    if (p < 0.39) {
      px = lerp(sx, cx, drag); py = lerp(sy, cy, drag);
      rot = lerp(9, 0, drag); sc = lerp(0.9, 1, drag) * (1 + Math.sin(release * Math.PI) * 0.02);
      pop = 1 - s1out;
    } else {
      var a3 = seg(p, 0.505, 0.545);
      px = cx; py = cy; rot = lerp(-4, 0, a3); sc = lerp(L.k3 * 0.8, L.k3, a3);
      pop = a3 * (1 - seg(p, 0.585, 0.64));
    }
    polaroid.style.transform = "translate(" + (px - pw / 2) + "px," + (py - ph / 2) + "px) rotate(" + rot + "deg) scale(" + sc + ")";
    vis(polaroid, pop);
    polaroid.style.background = p > 0.39 ? "rgba(255,253,248," + (1 - seg(p, 0.56, 0.6)) + ")" : "";
    polaroid.style.boxShadow = p > 0.56 ? "none" : "";
    var dz = seg(p, 0.555, 0.645);
    photoBox.classList.toggle("is-dissolving", p > 0.39 && dz > 0);
    photoBox.style.setProperty("--d", dz);

    var scanOp = seg(p, 0.12, 0.15) * (1 - seg(p, 0.235, 0.26));
    scan.style.opacity = scanOp; analyse.style.opacity = scanOp;

    var anchors = [[-0.52, -0.26], [0.52, -0.06], [-0.5, 0.16], [0.52, 0.34]];
    chips.forEach(function (c, k) {
      var e = seg(p, 0.145 + k * 0.022, 0.175 + k * 0.022);
      var ax = cx + anchors[k][0] * pw * (L.mobile ? 0.92 : 1.04), ay = cy + anchors[k][1] * ph;
      ax = clamp(ax, c._w / 2 + 4, L.Ws - c._w / 2 - 4);
      var x = lerp(cx, ax, lerp(0.55, 1, e)), y = lerp(cy, ay, lerp(0.55, 1, e));
      vis(c, e * (1 - s1out));
      c.style.transform = "translate(" + (x - c._w / 2) + "px," + (y - c._h / 2) + "px) scale(" + lerp(0.8, 1, e) + ")";
    });

    /* scene 2 */
    var pk = seg(p, 0.27, 0.3) * (1 - seg(p, 0.495, 0.525));
    vis(picker, pk);
    picker.style.transform = "translate(-50%,-50%) scale(" + lerp(0.97, 1, seg(p, 0.27, 0.31)) + ")";
    var sel = seg(p, 0.395, 0.425);
    var press = seg(p, 0.385, 0.425), pulse = Math.sin(press * Math.PI);
    cards.forEach(function (c, k) {
      var e = seg(p, 0.285 + k * 0.007, 0.325 + k * 0.007);
      var s = lerp(0.92, 1, e), o = e;
      if (k === 0) s *= 1 + pulse * 0.035 + sel * 0.015;
      else { s *= lerp(1, 0.96, sel); o *= lerp(1, 0.42, sel); }
      c.style.opacity = o;
      c.style.transform = "translateY(" + (1 - e) * 14 + "px) scale(" + s + ")";
    });
    cards[0].classList.toggle("is-selected", sel > 0.5);
    check.style.opacity = sel; check.style.transform = "scale(" + lerp(0.5, 1, sel) + ")";
    ripple.style.opacity = pulse * 0.9;
    ripple.style.transform = "scale(" + lerp(0.35, 1.5, press) + ")";
    namefield.classList.toggle("is-active", p > 0.44 && p < 0.5);
    var nChars = Math.floor(lin(p, 0.445, 0.485) * (HERO_NAME.length + 0.999));
    var nameTxt = HERO_NAME.slice(0, nChars);
    if (typed.textContent !== nameTxt) typed.textContent = nameTxt;

    /* cursor */
    var gx = pw * 0.16, gy = ph * 0.2;
    var c1x = lerp(L.Ws + 30, sx + gx, approach), c1y = lerp(L.Hs * 0.95, sy + gy, approach);
    if (approach >= 1) { c1x = px + gx; c1y = py + gy; }
    c1x += release * 46; c1y += release * 64;
    var vis1 = seg(p, 0, 0.012) * (1 - release);
    var m1 = seg(p, 0.325, 0.385), m2 = seg(p, 0.41, 0.44);
    var c2x = lerp(lerp(L.Ws * 0.96, L.card0.x, m1), L.name.x, m2);
    var c2y = lerp(lerp(L.Hs * 0.98, L.card0.y, m1), L.name.y, m2);
    var vis2 = seg(p, 0.32, 0.345) * (1 - seg(p, 0.47, 0.5));
    var click = Math.sin(seg(p, 0.385, 0.405) * Math.PI) + Math.sin(seg(p, 0.44, 0.455) * Math.PI);
    var useTwo = p > 0.2;
    cursor.style.opacity = reduceMotion ? 0 : (useTwo ? vis2 : vis1);
    cursor.style.transform = "translate(" + (useTwo ? c2x : c1x) + "px," + (useTwo ? c2y : c1y) + "px) scale(" + (1 - click * 0.14) + ")";

    /* scene 3 */
    var S = lerp(L.S0, 1, seg(p, 0.7, 0.8));
    var chr = seg(p, 0.765, 0.835);
    var artOp = seg(p, 0.615, 0.67);
    var tilt = chr * (1 - seg(p, 0.86, 0.9));
    var bookOut = seg(p, 0.905, 0.94);
    book.style.transform = "scale(" + S + ") rotateY(" + (-14 * tilt) + "deg) rotateX(" + (5 * tilt) + "deg)";
    book.style.visibility = artOp > 0 && bookOut < 1 ? "visible" : "hidden";
    book.style.opacity = 1 - bookOut;
    art.style.opacity = artOp;
    chrome.style.opacity = chr;
    edges.style.opacity = chr;

    var starts = [[-0.48, -0.36, -22], [0.5, -0.3, 18], [-0.46, 0.38, 15]];
    flies.forEach(function (f, k) {
      var t = seg(p, 0.695 + k * 0.024, 0.775 + k * 0.024);
      var o = seg(p, 0.69 + k * 0.024, 0.71 + k * 0.024) * (1 - seg(p, 0.775 + k * 0.024, 0.8 + k * 0.024));
      var x = lerp(starts[k][0] * L.Ws, 0, t), y = lerp(starts[k][1] * L.Hs, 0, t);
      vis(f, o);
      f.style.transform = "translate(" + x + "px," + y + "px) rotate(" + lerp(starts[k][2], 0, t) + "deg) scale(" + lerp(0.5, S * 0.98, t) + ")";
    });

    /* payoff: the cover grows into the real photograph */
    var po = seg(p, 0.862, 0.9), grow = seg(p, 0.885, 0.965);
    vis(payoff, po);
    var bx = L.cx - L.bw / 2, by = L.cy - L.bh / 2;
    var it = Math.max(0, lerp(by - L.fy, 0, grow)), il = Math.max(0, lerp(bx - L.fx, 0, grow));
    var ib = Math.max(0, lerp(L.fy + L.fh - (by + L.bh), 0, grow)), ir = Math.max(0, lerp(L.fx + L.fw - (bx + L.bw), 0, grow));
    var rad = lerp(6, 22, grow);
    payoff.style.clipPath = "inset(" + it + "px " + ir + "px " + ib + "px " + il + "px round " + rad + "px)";
    payoffImg.style.transform = "scale(" + lerp(1.3, 1, grow) + ")";
    payoffCap.style.opacity = seg(p, 0.95, 0.98);

    drawFx(p);
  }

  var lastDrawn = false;
  function drawFx(p) {
    var active = (p > 0.55 && p < 0.97 && !reduceMotion) || (reduceMotion && p > 0.6 && p < 0.97);
    if (!active) {
      if (lastDrawn) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); lastDrawn = false; }
      return;
    }
    lastDrawn = true;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var cx = L.cx, cy = L.cy, k3 = L.k3, pw = L.pw, ph = L.ph;
    var photoW = pw * 0.9 * k3, photoH = photoW * 1.25;
    var photoL = cx - (pw * k3) / 2 + pw * 0.05 * k3;
    var photoT = cy - (ph * k3) / 2 + pw * 0.05 * k3;
    var Sf = L.S0, bw = L.bw, bh = L.bh;
    var fadeSpecks = 1 - seg(p, 0.635, 0.675);
    var goldMix = seg(p, 0.62, 0.69);
    var ringRx = Math.min(bw * 1.05, L.Ws / 2 - 10), ringRy = Math.min(bh * 0.7, L.Hs / 2 - 10);

    for (var i = 0; i < P.length; i++) {
      var q = P[i];
      var u = lin(p, 0.555 + q.delay, 0.64 + q.delay);
      if (u <= 0) continue;
      var e = smooth(u);
      var sx = photoL + q.rx * photoW, sy = photoT + q.ry * photoH;
      var tx = cx + (q.tx - 0.5) * bw * Sf, ty = cy + (q.ty - 0.5) * bh * Sf;
      var dx = sx - cx, dy = sy - cy, ca = Math.cos(q.swirl), sa = Math.sin(q.swirl);
      var kx = cx + (dx * ca - dy * sa) * q.orbit, ky = cy + (dx * sa + dy * ca) * q.orbit;
      var it = 1 - e;
      var x = it * it * sx + 2 * it * e * kx + e * e * tx;
      var y = it * it * sy + 2 * it * e * ky + e * e * ty;
      var fl = Math.sin(e * Math.PI) * q.flutter;
      x += fl * 0.6; y -= fl * 0.4;

      var alpha, r = q.size, col = SHADES[q.shade];
      if (photoCols) {
        var pc = photoCols[Math.min(29, Math.floor(q.ry * 30)) * 24 + Math.min(23, Math.floor(q.rx * 24))];
        var ink = smooth(clamp(e / 0.45, 0, 1));
        col = [lerp(pc[0], col[0], ink), lerp(pc[1], col[1], ink), lerp(pc[2], col[2], ink)];
      }
      if (q.fly) {
        var v = seg(p, 0.645 + q.fdel * 0.03, 0.73 + q.fdel * 0.03);
        var ang = q.ang + Math.max(0, p - 0.645) * 1.1 * (q.swirl > 0 ? 1 : -1);
        x = lerp(x, cx + Math.cos(ang) * ringRx * q.rad, v); y = lerp(y, cy + Math.sin(ang) * ringRy * q.rad, v);
        var g = goldMix;
        col = [lerp(col[0], GOLD[0], g), lerp(col[1], GOLD[1], g), lerp(col[2], GOLD[2], g)];
        alpha = 1 - seg(p, 0.86, 0.95);
        r = lerp(q.size, 1.3 + q.size * 0.35, g);
        if (g > 0.02) {
          var gs = (4 + q.size * 2.5) * g;
          ctx.globalAlpha = 0.45 * g * alpha;
          ctx.drawImage(glow, x - gs, y - gs, gs * 2, gs * 2);
        }
      } else {
        alpha = fadeSpecks;
        if (alpha <= 0) continue;
      }
      ctx.globalAlpha = alpha * (0.55 + 0.45 * Math.min(1, u * 3));
      if (q.star && !q.fly) {
        ctx.fillStyle = "rgb(214,224,255)";
        ctx.fillRect(x - 3, y - 0.5, 6, 1); ctx.fillRect(x - 0.5, y - 3, 1, 6);
      } else {
        ctx.fillStyle = "rgb(" + (col[0] | 0) + "," + (col[1] | 0) + "," + (col[2] | 0) + ")";
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ============ HORIZONTAL TRACK ============ */
  var track = $("[data-track]"), row = $("[data-track-row]");
  var T = { on: false, shift: 0 };
  function layoutTrack() {
    T.on = !reduceMotion && !narrow.matches;
    if (!T.on) { track.style.height = ""; row.style.transform = ""; return; }
    T.shift = Math.max(0, row.scrollWidth - window.innerWidth);
    track.style.height = (T.shift + window.innerHeight) + "px";
  }
  function renderTrack() {
    if (!T.on) return;
    row.style.transform = "translate3d(" + (-progress(track) * T.shift) + "px,0,0)";
  }

  /* ============ FLOATING CTA: hidden where the page has its own CTA ============ */
  var floatCta = $("[data-float]");
  var hero = $(".hero");
  var ctaHiders = [section, $("#try"), track, $("#guide"), $("#reserve"), $(".footer")];
  function renderFloat() {
    var vh = window.innerHeight;
    var hide = ctaHiders.some(function (el) {
      var r = el.getBoundingClientRect();
      return r.top < vh * 0.8 && r.bottom > vh * 0.25;
    });
    floatCta.dataset.hidden = String(hide);
    floatCta.dataset.tone = hero.getBoundingClientRect().bottom > vh - 40 ? "dark" : "light";
  }

  /* ============ FIREFLY BURST (seeded SVG) ============ */
  (function buildBurst() {
    var svg = $("[data-burst]"), rnd = mulberry32(7), out = [];
    var rays = 30, per = 9;
    out.push('<circle r="9" style="fill:#F59A23;filter:drop-shadow(0 0 14px rgba(245,154,35,.9))"/>');
    for (var a = 0; a < rays; a++) {
      var ang = (a / rays) * Math.PI * 2 + (rnd() - 0.5) * 0.05;
      var len = per - Math.floor(rnd() * 3);
      for (var k = 0; k < len; k++) {
        var rr = 46 + k * 28 + (rnd() - 0.5) * 8;
        var x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
        var s = Math.max(1.1, 4.6 - k * 0.42) * (0.8 + rnd() * 0.4);
        var o = Math.max(0.18, 1 - k * 0.09);
        var tw = rnd() < 0.45;
        out.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + s.toFixed(2) + '"' +
          (tw ? ' class="tw" style="--o:' + (o * 0.45).toFixed(2) + ';--d:' + (2.2 + rnd() * 2.6).toFixed(2) + 's;--del:-' + (rnd() * 4).toFixed(2) + 's;opacity:' + o.toFixed(2) + '"' : ' opacity="' + o.toFixed(2) + '"') + '/>');
      }
    }
    svg.innerHTML = out.join("");
  })();

  /* ============ TRY IT: one live page from the visitor's photo ============
     data-state on the section is the whole UI state:
     off (no API) → idle → drawing_character → drawing_page → done; errors return to idle with a message.
     The photo and the result live only in this closure, never in storage. */
  (function tryIt() {
    var root = $("[data-try]"), form = $("[data-try-form]", root);
    var fileInput = $("[data-try-file]", root), preview = $("[data-try-preview]", root), drop = $("[data-try-drop]", root);
    var msg = $("[data-try-msg]", root), submit = $("[data-try-submit]", root);
    var status = $("[data-try-status]", root), title = $("[data-try-title]", root), cap = $("[data-try-cap]", root);
    var sample = $("[data-try-sample]", root), sheet = $("[data-try-sheet]", root), pageBox = $("[data-try-page]", root);
    var cta = $("[data-try-cta]", root), reserve = $("[data-try-reserve]", root);
    var RESERVE = reserve.href;
    var photo = null, timer = null;
    var MESSAGES = {
      network: "We couldn't reach the server. Check your connection and try again.",
      404: "This preview expired. Please try again.",
      503: "Live previews are paused for now. Please come back a little later.",
      other: "Something went wrong on our side. Please try again in a minute.",
    };

    $("[data-try-stories]", root).innerHTML = STORIES.map(function (st, k) {
      return '<label class="try__chip" style="' + palette(st) + '"><input type="radio" name="story" value="' + st.id + '"' + (k ? "" : " checked") + " />" +
        "<span>" + esc(st.need) + "</span></label>";
    }).join("");

    function story() { return STORIES.find(function (st) { return st.id === form.story.value; }); }
    function heroName() { return form.name.value.trim().replace(/\s+/g, " "); }
    function setState(s) { root.dataset.state = s; submit.disabled = /^drawing/.test(s); }
    function say(text) { msg.textContent = text || ""; msg.hidden = !text; }
    function showSample() {
      var st = story();
      sample.innerHTML = page(st.pages[1], heroName() || st.child.name, "(max-width: 820px) 92vw, 520px", true);
    }

    function readPhoto(file) {
      say("");
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var r = Math.min(1, 1024 / Math.max(im.naturalWidth, im.naturalHeight));
        var c = document.createElement("canvas");
        c.width = Math.round(im.naturalWidth * r); c.height = Math.round(im.naturalHeight * r);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        photo = c.toDataURL("image/jpeg", 0.88);
        preview.src = photo; preview.hidden = false; drop.classList.add("has-photo");
        $("b", drop).textContent = "Photo added";
      };
      im.onerror = function () { URL.revokeObjectURL(url); say("We couldn't read this photo. Please choose a JPEG or PNG."); };
      im.src = url;
    }
    fileInput.addEventListener("change", function () { if (fileInput.files[0]) readPhoto(fileInput.files[0]); });
    ["dragenter", "dragover"].forEach(function (t) {
      drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("is-over"); });
    });
    ["dragleave", "drop"].forEach(function (t) {
      drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove("is-over"); });
    });
    drop.addEventListener("drop", function (e) { if (e.dataTransfer.files[0]) readPhoto(e.dataTransfer.files[0]); });
    form.addEventListener("input", function (e) { if (root.dataset.state === "idle" && e.target.name !== "email") showSample(); });

    function fail(text) { clearTimeout(timer); setState("idle"); status.textContent = ""; say(text); }
    function api(path, body) {
      return fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (data) {
            if (r.ok) return data;
            throw new Error(r.status === 400 || r.status === 429 ? data.error || MESSAGES.other : MESSAGES[r.status] || MESSAGES.other);
          });
        }, function () { throw new Error(MESSAGES.network); });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (/^drawing/.test(root.dataset.state)) return;
      var email = form.email.value.trim();
      if (!photo) return say("Add a photo of your child first.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return say("Please enter a valid email.");
      if (!form.consent.checked) return say("Please tick the box to confirm you're the parent or guardian.");
      say("");
      var st = story(), name = heroName();
      var who = name || "your child";
      setState("drawing_character");
      title.textContent = ""; sheet.hidden = true; pageBox.innerHTML = ""; cta.hidden = true;
      status.textContent = "Drawing " + who + "…";
      cap.textContent = "Step 1 of 2 · about 15 seconds";
      if (narrow.matches) root.querySelector(".try__result").scrollIntoView({ behavior: "smooth", block: "start" });
      api("/api/simulate", { photo: photo, story: st.id, name: name, email: email, consent: true })
        .then(function (r) { poll(r.job, st, name, email); }, function (err) { fail(err.message); });
    });

    function poll(job, st, name, email) {
      timer = setTimeout(function () {
        api("/api/simulate/" + job).then(function (r) {
          if (r.status === "error") return fail(r.error || MESSAGES.other);
          if (r.sheet && sheet.hidden) {
            sheet.src = r.sheet; sheet.hidden = false;
            setState("drawing_page");
            status.textContent = "Drawing the page…";
            cap.textContent = "Step 2 of 2 · about 20 seconds";
          }
          if (r.status !== "done") return poll(job, st, name, email);
          pageBox.innerHTML = printed('<img src="' + esc(r.page) + '" width="768" height="1024" alt="" />', st.pages[1].text, name);
          setState("done");
          status.textContent = "";
          title.textContent = r.title;
          cap.textContent = "Page 2 of " + r.title + " · a draft preview";
          reserve.textContent = "Reserve " + (name ? name + "'s" : "your") + " book · $10 deposit";
          reserve.href = RESERVE + "?prefilled_email=" + encodeURIComponent(email);
          cta.hidden = false;
        }, function (err) { fail(err.message); });
      }, 2000);
    }

    $("[data-try-again]", root).addEventListener("click", function () {
      sheet.hidden = true; sheet.removeAttribute("src"); pageBox.innerHTML = ""; title.textContent = ""; cta.hidden = true;
      cap.textContent = "Sample page. Yours stars your child.";
      setState("idle"); showSample();
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    showSample();
    fetch("/api/simulate/stats", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (d) { if (typeof d.cap === "number") setState("idle"); }, function () { /* static file: keep "off" */ });
  })();

  /* ============ frame loop ============ */
  var ticking = false;
  function requestUpdate() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  function update() {
    ticking = false;
    renderManifesto();
    renderPin();
    renderTrack();
    renderFloat();
  }
  function relayout() { layoutPin(); layoutTrack(); update(); }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", relayout);
  window.addEventListener("load", function () { relayout(); openFromHash(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  relayout();
})();
