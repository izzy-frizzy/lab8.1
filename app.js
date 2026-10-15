(function () {
  var KEY = "flashcards:v1";
  var uid = function () { return Math.random().toString(36).slice(2, 9); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  var state = load() || {
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
  };
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

  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function deck() { return state.decks.find(function (d) { return d.id === state.activeId; }); }

  /* ---------- Render ---------- */
  function render() {
    var d = deck();
    els.decks.innerHTML = state.decks.map(function (x) {
      return '<li><button class="deck" type="button" data-action="select-deck" data-deck-id="' + x.id + '"' +
        (x.id === d.id ? ' aria-current="true"' : "") + "><span>" + esc(x.name) +
        '</span><span class="deck-count">' + x.cards.length + "</span></button></li>";
    }).join("");

    els.name.textContent = d.name;
    els.meta.textContent = d.cards.length + (d.cards.length === 1 ? " card" : " cards");
    document.querySelector('[data-action="study"]').disabled = !d.cards.length;

    els.grid.innerHTML = d.cards.length ? d.cards.map(function (c) {
      return '<article class="card" data-id="' + c.id + '">' +
        '<div class="card-flip" role="button" tabindex="0" aria-pressed="false" data-action="flip">' +
          '<div class="card-inner">' +
            '<div class="card-face card-front">' + esc(c.front) + "</div>" +
            '<div class="card-face card-back" aria-hidden="true">' + esc(c.back) + "</div>" +
          "</div></div>" +
        '<div class="card-tools">' +
          '<button class="btn btn--small" type="button" data-action="edit">Edit</button>' +
          '<button class="btn btn--small btn--danger" type="button" data-action="delete">Delete</button>' +
        "</div></article>";
    }).join("") : '<div class="empty">This deck has no cards yet. Select New card to add one.</div>';
  }

  /* ---------- Actions ---------- */
  function flip(card) {
    var on = card.classList.toggle("is-flipped");
    card.querySelector(".card-flip").setAttribute("aria-pressed", on);
    card.querySelector(".card-front").setAttribute("aria-hidden", on);
    card.querySelector(".card-back").setAttribute("aria-hidden", !on);
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
    d.cards = d.cards.filter(function (x) { return x.id !== id; });
    save(); render();
  }

  function armDelete(btn) {
    btn.dataset.armed = "true";
    btn.textContent = "Confirm";
    setTimeout(function () {
      if (btn.isConnected && btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = "Delete"; }
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
      '<div class="card"><div class="card-flip" role="button" tabindex="0" aria-pressed="false" data-study="flip">' +
        '<div class="card-inner"><div class="card-face card-front"></div>' +
        '<div class="card-face card-back" aria-hidden="true"></div></div></div></div>' +
      '<div class="study-progress"><div class="study-progress-fill"></div></div>' +
      '<p class="study-count" aria-live="polite"></p></div>' +
    '<div class="study-nav">' +
      '<button class="btn" type="button" data-study="prev">Previous</button>' +
      '<button class="btn btn--primary" type="button" data-study="next">Next</button></div>' +
    '<p class="study-hint">Left and right arrows move, Space flips, S shuffles, Esc exits.</p>';

  var q = function (s) { return overlay.querySelector(s); };
  var card = q(".card"), inner = q(".card-inner"), flipEl = q(".card-flip");
  var front = q(".card-front"), back = q(".card-back");
  var count = q(".study-count"), fill = q(".study-progress-fill");
  var prev = q('[data-study="prev"]'), next = q('[data-study="next"]');
  q(".study-title").textContent = d.name;

  function setFlipped(on, instant) {
    flipped = on;
    if (instant) inner.style.transition = "none";
    card.classList.toggle("is-flipped", on);
    flipEl.setAttribute("aria-pressed", on);
    front.setAttribute("aria-hidden", on);
    back.setAttribute("aria-hidden", !on);
    if (instant) { void inner.offsetWidth; inner.style.transition = ""; }
  }

  function renderCard() {
    var c = cards[index];
    setFlipped(false, true); // snap to front so the next answer never flashes
    front.textContent = c.front;
    back.textContent = c.back;
    count.textContent = "Card " + (index + 1) + " of " + cards.length;
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
  /* ---------- Delegated events ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-action]");
    if (!t) return;
    var card = t.closest(".card");
    switch (t.dataset.action) {
      case "flip": flip(card); break;
      case "new-card": openDialog(null); break;
      case "edit": openDialog(card.dataset.id); break;
      case "delete": t.dataset.armed ? removeCard(card.dataset.id) : armDelete(t); break;
      case "cancel": els.dialog.close(); break;
      case "select-deck": state.activeId = t.dataset.deckId; save(); render(); break;
      case "study": enterStudyMode(state.activeId); break;
    }
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
    if (editingId) {
      var c = d.cards.find(function (x) { return x.id === editingId; });
      c.front = front; c.back = back;
    } else {
      d.cards.push({ id: uid(), front: front, back: back });
    }
    save(); render(); els.dialog.close();
  });

  render();
})();