(function () {
  var uid = function () { return Math.random().toString(36).slice(2, 9); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  function createDefaultState() { return {
    activeId: "es",
    decks: [
      { id: "es", name: "Spanish basics", cards: [
        { id: uid(), front: "¿Cómo te llamas?", back: "What is your name?" },
        { id: uid(), front: "La biblioteca", back: "The library" },
        { id: uid(), front: "Tengo hambre", back: "I am hungry" } ] },
      { id: "bio", name: "Biology", cards: [
        { id: uid(), front: "Powerhouse of the cell?", back: "Mitochondria" } ] },
      { id: "cap", name: "World capitals", cards: [
        { id: uid(), front: "Capital of Canada?", back: "Ottawa" } ] }
    ]
  }; }
  var state = loadState(createDefaultState);
  var query = "";
  var editingId = null;

  var els = {
    decks: document.getElementById("deck-list"),
    grid: document.getElementById("card-grid"),
    name: document.getElementById("deck-name"),
    meta: document.getElementById("deck-meta"),
    dialog: document.getElementById("card-dialog"),
    form: document.getElementById("card-form"),
    title: document.getElementById("dialog-title")
  };

  function save() { saveState(state); }
  function deck() { return state.decks.find(function (d) { return d.id === state.activeId; }); }

  /* ---------- Render ---------- */
  function render() {
    var d = deck();
    els.decks.innerHTML = state.decks.map(function (x) {
      return '<li><button class="deck" type="button" data-action="select-deck" data-deck-id="' + x.id + '"' +
        (x.id === d.id ? ' aria-current="true"' : "") + "><span>" + esc(x.name) +
        '</span><span class="deck-count">' + x.cards.length + '<span class="sr-only"> ' + (x.cards.length === 1 ? "card" : "cards") + "</span></span></button></li>";
    }).join("");

    els.name.textContent = d.name;
    var q = query.trim().toLowerCase();
    var shown = q ? d.cards.filter(function (c) {
      return (c.front + "\n" + c.back).toLowerCase().indexOf(q) !== -1;
    }) : d.cards;
    els.meta.textContent = q
      ? shown.length + " of " + d.cards.length + (d.cards.length === 1 ? " card matches" : " cards match")
      : d.cards.length + (d.cards.length === 1 ? " card" : " cards");
    document.querySelector('[data-action="study"]').disabled = !d.cards.length;

    els.grid.innerHTML = shown.length ? shown.map(function (c) {
      var name = esc(c.front.length > 40 ? c.front.slice(0, 40) + "\u2026" : c.front);
      return '<article class="card" data-id="' + c.id + '">' +
        '<div class="card-flip" role="button" tabindex="0" aria-describedby="flip-hint" data-action="flip">' +
          '<div class="card-inner">' +
            '<div class="card-face card-front">' + esc(c.front) + "</div>" +
            '<div class="card-face card-back" aria-hidden="true">' + esc(c.back) + "</div>" +
          "</div></div>" +
        '<div class="card-tools">' +
          '<button class="btn btn--small" type="button" data-action="edit" aria-label="Edit card: ' + name + '">Edit</button>' +
          '<button class="btn btn--small btn--danger" type="button" data-action="delete" aria-label="Delete card: ' + name + '">Delete</button>' +
        "</div></article>";
    }).join("") : (d.cards.length
      ? emptyState({ icon: "search", title: "No cards match \u201c" + esc(query.trim()) + "\u201d",
          text: "Check the spelling or try a shorter word. Search looks at both sides of every card in this deck.",
          action: "clear-search", label: "Clear search" })
      : emptyState({ icon: "cards", title: "No cards in this deck yet",
          text: "Add a card with a question on the front and the answer on the back. Once the deck has cards, select Study to practice them.",
          action: "new-card", label: "Add your first card" }));
  }

  /* ---------- Actions ---------- */
  function flip(card) {
    var on = card.classList.toggle("is-flipped");
    card.querySelector(".card-front").setAttribute("aria-hidden", on);
    card.querySelector(".card-back").setAttribute("aria-hidden", !on);
    announce((on ? "Answer: " : "Question: ") + card.querySelector(on ? ".card-back" : ".card-front").textContent);
  }

  function openDialog(id) {
    editingId = id;
    var c = id && deck().cards.find(function (x) { return x.id === id; });
    els.title.textContent = c ? "Edit card" : "New card";
    els.form.elements.front.value = c ? c.front : "";
    els.form.elements.back.value = c ? c.back : "";
    els.dialog.showModal();
    els.form.elements.front.focus();
  }

  function removeCard(id) {
    var d = deck();
    var el = els.grid.querySelector('[data-id="' + id + '"]');
    var pos = Array.prototype.indexOf.call(els.grid.children, el);
    d.cards = d.cards.filter(function (x) { return x.id !== id; });
    save(); render();
    var flips = els.grid.querySelectorAll(".card-flip");
    var target = flips[Math.min(pos, flips.length - 1)] || els.grid.querySelector("[data-action]") || els.name;
    target.focus();
    announce("Card deleted. " + d.cards.length + (d.cards.length === 1 ? " card" : " cards") + " left in this deck.");
  }

  function armDelete(btn) {
    var label = btn.getAttribute("aria-label");
    btn.dataset.armed = "true";
    btn.textContent = "Confirm";
    btn.setAttribute("aria-label", label.replace("Delete card", "Confirm delete of card"));
    announce("Select Confirm again within 3 seconds to delete this card.");
    setTimeout(function () {
      if (btn.isConnected && btn.dataset.armed) {
        delete btn.dataset.armed; btn.textContent = "Delete"; btn.setAttribute("aria-label", label);
      }
    }, 3000);
  }

  /* ---------- Study mode ---------- */
  var exitStudy = null;

  function enterStudyMode(deckId) {
    if (exitStudy) return;
    var d = state.decks.find(function (x) { return x.id === deckId; });
    if (!d || !d.cards.length) return;

    var cards = d.cards.slice();
    var index = 0;
    var flipped = false;
    var opener = document.activeElement;
    var appRoot = document.querySelector(".app");

    var overlay = document.createElement("div");
    overlay.className = "study";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Study " + d.name);
    overlay.innerHTML =
      '<div class="study-bar"><h2 class="study-title"></h2>' +
        '<button class="btn" type="button" data-study="exit">Exit</button></div>' +
      '<div class="study-body">' +
        '<div class="card"><div class="card-flip" role="button" tabindex="0" aria-describedby="flip-hint" data-study="flip">' +
          '<div class="card-inner"><div class="card-face card-front"></div>' +
          '<div class="card-face card-back" aria-hidden="true"></div></div></div></div>' +
        '<div class="study-progress"><div class="study-progress-fill"></div></div>' +
        '<p class="study-count"></p></div>' +
      '<div class="study-nav">' +
        '<button class="btn" type="button" data-study="prev">Previous</button>' +
        '<button class="btn btn--primary" type="button" data-study="next">Next</button></div>' +
      '<p class="study-hint">Left and right arrows move, Space flips, S shuffles, Esc exits.</p>' +
      '<p class="sr-only" role="status" aria-live="polite" data-study-live></p>';

    var q = function (s) { return overlay.querySelector(s); };
    var card = q(".card"), inner = q(".card-inner"), flipEl = q(".card-flip");
    var front = q(".card-front"), back = q(".card-back");
    var count = q(".study-count"), fill = q(".study-progress-fill");
    var prev = q('[data-study="prev"]'), next = q('[data-study="next"]');
    var live = q("[data-study-live]");
    q(".study-title").textContent = d.name;

    function setFlipped(on, instant) {
      flipped = on;
      if (instant) inner.style.transition = "none";
      card.classList.toggle("is-flipped", on);
      front.setAttribute("aria-hidden", on);
      back.setAttribute("aria-hidden", !on);
      if (instant) { void inner.offsetWidth; inner.style.transition = ""; }
      if (!instant) live.textContent = on ? "Answer: " + back.textContent : "Question: " + front.textContent;
    }

    function renderCard() {
      var c = cards[index];
      setFlipped(false, true); // snap to front so the next answer never flashes
      front.textContent = c.front;
      back.textContent = c.back;
      count.textContent = "Card " + (index + 1) + " of " + cards.length;
      live.textContent = count.textContent + ". Question: " + c.front;
      fill.style.width = ((index + 1) / cards.length * 100) + "%";
      prev.setAttribute("aria-disabled", index === 0);
      next.textContent = index === cards.length - 1 ? "Finish" : "Next";
    }

    function go(delta) {
      var i = index + delta;
      if (i < 0) return;
      if (i >= cards.length) { exit(); return; }
      index = i;
      renderCard();
    }

    function shuffle() {
      for (var i = cards.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp;
      }
      index = 0;
      renderCard();
    }

    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var onButton = e.target.closest && e.target.closest("button");
      switch (e.key) {
        case "Escape": e.preventDefault(); exit(); break;
        case "ArrowRight": e.preventDefault(); go(1); break;
        case "ArrowLeft": e.preventDefault(); go(-1); break;
        case "ArrowUp":
        case "ArrowDown": e.preventDefault(); setFlipped(!flipped); break;
        case " ":
        case "Enter":
          if (onButton) return; // let focused buttons act natively
          e.preventDefault(); setFlipped(!flipped); break;
        case "s":
        case "S": shuffle(); break;
      }
    }

    function onClick(e) {
      var t = e.target.closest("[data-study]");
      if (!t) return;
      switch (t.dataset.study) {
        case "flip": setFlipped(!flipped); break;
        case "prev": go(-1); break;
        case "next": go(1); break;
        case "exit": exit(); break;
      }
    }

    function exit() {
      document.removeEventListener("keydown", onKey);
      overlay.removeEventListener("click", onClick);
      overlay.remove();
      appRoot.inert = false;
      exitStudy = null;
      if (opener && opener.focus) opener.focus();
    }

    exitStudy = exit;
    appRoot.inert = true;
    document.body.appendChild(overlay);
    document.addEventListener("keydown", onKey);
    overlay.addEventListener("click", onClick);
    renderCard();
    flipEl.focus();
  }

  /* ---------- Accessibility helpers ---------- */
  function announce(msg) {
    var a = document.getElementById("announcer");
    a.textContent = "";
    setTimeout(function () { a.textContent = msg; }, 50);
  }

  var SVG = '<svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
  var ICONS = {
    cards: SVG + '<rect x="10" y="12" width="26" height="30" rx="3"/><path d="M16 8h22a3 3 0 0 1 3 3v26"/><path d="M17 24h12M17 31h8"/></svg>',
    search: SVG + '<circle cx="21" cy="21" r="11"/><path d="M30 30l11 11"/><path d="M16 21h10"/></svg>'
  };

  // Empty-state component. title and text must already be HTML-safe.
  function emptyState(o) {
    return '<div class="empty">' +
      '<span class="empty-icon">' + ICONS[o.icon] + "</span>" +
      '<h3 class="empty-title">' + o.title + "</h3>" +
      '<p class="empty-text">' + o.text + "</p>" +
      '<button class="btn btn--primary" type="button" data-action="' + o.action + '">' + o.label + "</button>" +
    "</div>";
  }

  /* ---------- Search ---------- */
  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  }
  var applySearch = debounce(function (value) { query = value; render(); }, 300);

  /* ---------- Delegated events ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-action]");
    if (!t) return;
    var card = t.closest(".card");
    switch (t.dataset.action) {
      case "flip": flip(card); break;
      case "new-card": openDialog(null); break;
      case "study": enterStudyMode(state.activeId); break;
      case "clear-search":
        var box = document.getElementById("search");
        box.value = ""; query = ""; render(); box.focus(); break;
      case "edit": openDialog(card.dataset.id); break;
      case "delete": t.dataset.armed ? removeCard(card.dataset.id) : armDelete(t); break;
      case "cancel": els.dialog.close(); break;
      case "select-deck": state.activeId = t.dataset.deckId; save(); render(); break;
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target.id === "search") applySearch(e.target.value);
  });

  document.addEventListener("keydown", function (e) {
    var t = e.target.closest && e.target.closest('[data-action="flip"]');
    if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); flip(t.closest(".card")); }
  });

  document.addEventListener("submit", function (e) {
    if (e.target !== els.form) return;
    e.preventDefault();
    var front = els.form.elements.front.value.trim();
    var back = els.form.elements.back.value.trim();
    if (!front || !back) return;
    var d = deck();
    var savedId, wasEditing = !!editingId;
    if (editingId) {
      var c = d.cards.find(function (x) { return x.id === editingId; });
      c.front = front; c.back = back; savedId = c.id;
    } else {
      savedId = uid();
      d.cards.push({ id: savedId, front: front, back: back });
    }
    save(); render(); els.dialog.close();
    var saved = els.grid.querySelector('[data-id="' + savedId + '"] .card-flip');
    (saved || els.name).focus();
    announce(wasEditing ? "Card updated." : "Card added.");
  });

  render();
})();
/* storage.js
 * Versioned localStorage persistence with safe fallbacks.
 * Load it with a classic script tag before app.js so these functions exist.
 * Then: var state = loadState(createDefaultState); saveState(state);
 */
var STORAGE_KEY = "flashcards:state";
var LEGACY_KEY = "flashcards:v1";   // v1 saved the bare state object, no envelope
var STORAGE_VERSION = 2;

// Each entry upgrades data from version N to N + 1.
var MIGRATIONS = {
  1: function (data) { return data; }   // v1 -> v2: same shape, now wrapped in an envelope
};

function migrateState(data, fromVersion) {
  for (var v = fromVersion; v < STORAGE_VERSION; v++) {
    if (!MIGRATIONS[v]) return null;
    data = MIGRATIONS[v](data);
  }
  return data;
}

// Returns a clean copy of the state, or null if it can't be trusted.
function sanitizeState(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.decks)) return null;

  var decks = raw.decks.filter(function (d) {
    return d && typeof d.id === "string" && typeof d.name === "string" && Array.isArray(d.cards);
  }).map(function (d) {
    return {
      id: d.id,
      name: d.name,
      cards: d.cards.filter(function (c) {
        return c && typeof c.id === "string" && typeof c.front === "string" && typeof c.back === "string";
      }).map(function (c) {
        return { id: c.id, front: c.front, back: c.back };
      })
    };
  });
  if (!decks.length) return null;

  var activeId = decks.some(function (d) { return d.id === raw.activeId; }) ? raw.activeId : decks[0].id;
  return { activeId: activeId, decks: decks };
}

// Never throws. If the stored text is corrupt, a copy is kept under key + ":corrupt".
function readJSON(key) {
  var text = null;
  try {
    text = localStorage.getItem(key);
    if (text === null) return { found: false };
    return { found: true, value: JSON.parse(text) };
  } catch (e) {
    if (text !== null) { try { localStorage.setItem(key + ":corrupt", text); } catch (e2) {} }
    return { found: true, error: e };
  }
}

// createDefault: a state object, or a function that returns one.
function loadState(createDefault) {
  var fallback = typeof createDefault === "function" ? createDefault : function () { return createDefault; };
  var current = readJSON(STORAGE_KEY);
  var state = null;

  if (current.found) {
    var env = current.value;
    // Data written by a newer version of the app can't be read safely, so it falls back.
    if (!current.error && env && typeof env.version === "number" && env.version <= STORAGE_VERSION) {
      state = sanitizeState(migrateState(env.data, env.version));
    }
  } else {
    var legacy = readJSON(LEGACY_KEY);
    if (legacy.found && !legacy.error) state = sanitizeState(migrateState(legacy.value, 1));
  }
  return state || fallback();
}

// Returns true on success, false if storage is full, blocked or unavailable.
function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION,
      savedAt: Date.now(),
      data: state
    }));
    localStorage.removeItem(LEGACY_KEY);
    return true;
  } catch (e) {
    return false;
  }
}