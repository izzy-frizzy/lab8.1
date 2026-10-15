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