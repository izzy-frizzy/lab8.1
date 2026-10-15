
/* =========================
   Deck data
========================= */

// In-memory data; resets when the page reloads.
let decks = [
    { id: 1, name: "JavaScript" },
    { id: 2, name: "HTML & CSS" },
    { id: 3, name: "TypeScript" }
];

let nextId = 4;
let selectedDeckId = null;
let editingDeckId = null;
let openerElement = null;

/* =========================
   DOM elements
========================= */

const addDeckButton = document.getElementById("addDeckButton");
const deckList = document.getElementById("deckList");
const deckTitle = document.getElementById("deckTitle");

const modal = document.getElementById("deckModal");
const modalTitle = document.getElementById("modalTitle");
const deckForm = document.getElementById("deckForm");
const deckName = document.getElementById("deckName");
const deckError = document.getElementById("deckError");
const cancelDeck = document.getElementById("cancelDeck");

/* =========================
   READ: Render decks
========================= */

function renderDecks() {
    deckList.replaceChildren();

    decks.forEach((deck) => {
        const item = document.createElement("li");
        item.className = "deck-item";

        if (deck.id === selectedDeckId) {
            item.classList.add("selected");
        }

        // Select deck
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = deck.name;

        if (deck.id === selectedDeckId) {
            link.setAttribute("aria-current", "page");
        }

        link.addEventListener("click", (event) => {
            event.preventDefault();
            selectedDeckId = deck.id;
            renderDecks();
            updateMainContent();
        });

        // Edit button
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.setAttribute(
            "aria-label",
            `Edit ${deck.name} deck`
        );

        editButton.addEventListener("click", () => {
            openModal(editButton, deck);
        });

        // Delete button
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute(
            "aria-label",
            `Delete ${deck.name} deck`
        );

        deleteButton.addEventListener("click", () => {
            deleteDeck(deck.id);
        });

        item.append(link, editButton, deleteButton);
        deckList.appendChild(item);
    });
}

/* =========================
   Update main content
========================= */

function updateMainContent() {
    const deck = decks.find(
        (item) => item.id === selectedDeckId
    );

    deckTitle.textContent = deck
        ? deck.name
        : "Select a deck";
}

/* =========================
   CREATE and UPDATE
   Open modal
========================= */

function openModal(opener, deck = null) {
    // Remember the element that opened the modal.
    openerElement = opener;
    editingDeckId = deck ? deck.id : null;

    modalTitle.textContent = deck
        ? "Edit deck"
        : "Create deck";

    deckName.value = deck ? deck.name : "";
    deckError.textContent = "";

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");

    // Move keyboard focus inside the dialog.
    deckName.focus();
}

function closeModal() {
    if (modal.hidden) return;

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");

    deckForm.reset();
    deckError.textContent = "";

    editingDeckId = null;

    // Return focus to the opener if it still exists.
    if (openerElement && openerElement.isConnected) {
        openerElement.focus();
    } else {
        addDeckButton.focus();
    }
}

/* =========================
   CREATE and UPDATE
   Save form
========================= */

deckForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = deckName.value.trim();

    if (!name) {
        deckError.textContent = "Please enter a deck name.";
        deckName.focus();
        return;
    }

    const duplicate = decks.some((deck) =>
        deck.name.toLowerCase() === name.toLowerCase()
        && deck.id !== editingDeckId
    );

    if (duplicate) {
        deckError.textContent =
            "A deck with that name already exists.";
        deckName.focus();
        return;
    }

    if (editingDeckId !== null) {
        // UPDATE existing deck
        const deck = decks.find(
            (item) => item.id === editingDeckId
        );

        if (deck) {
            deck.name = name;
        }
    } else {
        // CREATE new deck
        const newDeck = {
            id: nextId++,
            name: name
        };

        decks.push(newDeck);
        selectedDeckId = newDeck.id;
    }

    renderDecks();
    updateMainContent();
    closeModal();
});

/* =========================
   DELETE
========================= */

function deleteDeck(id) {
    const deck = decks.find((item) => item.id === id);

    if (!deck) return;

    if (!confirm(`Delete the "${deck.name}" deck?`)) {
        return;
    }

    decks = decks.filter((item) => item.id !== id);

    if (selectedDeckId === id) {
        selectedDeckId = null;
    }

    renderDecks();
    updateMainContent();

    // Keep keyboard focus on a sensible control.
    addDeckButton.focus();
}

/* =========================
   Modal controls
========================= */

addDeckButton.addEventListener("click", () => {
    openModal(addDeckButton);
});

cancelDeck.addEventListener("click", closeModal);

// Close when clicking the backdrop.
modal.addEventListener("click", (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// Close with Escape and trap keyboard focus.
modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = modal.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), ' +
        'a[href], select:not(:disabled), ' +
        'textarea:not(:disabled), ' +
        '[tabindex]:not([tabindex="-1"])'
    );

    const focusable = Array.from(focusableElements).filter(
        (element) =>
            !element.hidden &&
            element.getAttribute("aria-hidden") !== "true"
    );

    if (focusable.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (
        event.shiftKey &&
        (document.activeElement === first ||
         !modal.contains(document.activeElement))
    ) {
        event.preventDefault();
        last.focus();
    } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
         !modal.contains(document.activeElement))
    ) {
        event.preventDefault();
        first.focus();
    }
});

/* =========================
   Initial render
========================= */

renderDecks();
updateMainContent();

/* =========================
   Flashcard data
========================= */

// Each card belongs to a deck.
let cards = [
    {
        id: 1,
        deckId: 1,
        question: "What is JavaScript?",
        answer: "A programming language for interactive websites."
    },
    {
        id: 2,
        deckId: 1,
        question: "What is a variable?",
        answer: "A named container for storing a value."
    }
];

let nextCardId = 3;
let editingCardId = null;

/* =========================
   DOM elements
========================= */

const cardList = document.getElementById("cardList");
const cardForm = document.getElementById("cardForm");
const cardFormTitle = document.getElementById("cardFormTitle");
const cardQuestion = document.getElementById("cardQuestion");
const cardAnswer = document.getElementById("cardAnswer");
const cardFormError = document.getElementById("cardFormError");
const addCardButton = document.getElementById("addCardButton");
const cancelCardButton = document.getElementById("cancelCardButton");
const cardCount = document.getElementById("cardCount");

/* =========================
   READ: Render cards
========================= */

function renderCards() {
    cardList.replaceChildren();

    const deckCards = cards.filter(
        card => card.deckId === selectedDeckId
    );

    cardCount.textContent =
        `${deckCards.length} card${deckCards.length === 1 ? "" : "s"}`;

    addCardButton.disabled = selectedDeckId === null;

    deckCards.forEach(card => {
        const article = document.createElement("article");
        article.className = "card";
        article.dataset.id = card.id;

        const inner = document.createElement("div");
        inner.className = "card-inner";

        const front = document.createElement("div");
        front.className = "card-face card-front";

        const questionTitle = document.createElement("h3");
        questionTitle.textContent = card.question;

        const flipButton = document.createElement("button");
        flipButton.type = "button";
        flipButton.dataset.action = "flip";
        flipButton.textContent = "Reveal Answer";
        flipButton.setAttribute("aria-pressed", "false");

        front.append(questionTitle, flipButton);

        const back = document.createElement("div");
        back.className = "card-face card-back";

        const answerTitle = document.createElement("h3");
        answerTitle.textContent = "Answer";

        const answerText = document.createElement("p");
        answerText.textContent = card.answer;

        const hideButton = document.createElement("button");
        hideButton.type = "button";
        hideButton.dataset.action = "flip";
        hideButton.textContent = "Show Question";
        hideButton.setAttribute("aria-pressed", "true");

        back.append(answerTitle, answerText, hideButton);

        const actions = document.createElement("div");
        actions.className = "card-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.dataset.action = "edit";
        editButton.textContent = "Edit";
        editButton.setAttribute(
            "aria-label",
            `Edit card: ${card.question}`
        );

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.dataset.action = "delete";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute(
            "aria-label",
            `Delete card: ${card.question}`
        );

        actions.append(editButton, deleteButton);
        inner.append(front, back);
        article.append(inner, actions);
        cardList.appendChild(article);
    });
}

/* =========================
   CREATE: Open editor
========================= */

addCardButton.addEventListener("click", () => {
    if (selectedDeckId === null) return;

    editingCardId = null;
    cardForm.reset();
    cardFormError.textContent = "";
    cardFormTitle.textContent = "Create flashcard";

    cardForm.hidden = false;
    cardQuestion.focus();
});

/* =========================
   CREATE and UPDATE: Save
========================= */

cardForm.addEventListener("submit", event => {
    event.preventDefault();

    const question = cardQuestion.value.trim();
    const answer = cardAnswer.value.trim();

    if (!question || !answer) {
        cardFormError.textContent =
            "Please enter both a question and an answer.";
        return;
    }

    if (editingCardId !== null) {
        // UPDATE existing card
        const card = cards.find(
            item => item.id === editingCardId
        );

        if (card) {
            card.question = question;
            card.answer = answer;
        }
    } else {
        // CREATE new card
        cards.push({
            id: nextCardId++,
            deckId: selectedDeckId,
            question,
            answer
        });
    }

    cardForm.hidden = true;
    editingCardId = null;

    renderCards();
    addCardButton.focus();
});

/* =========================
   Cancel editing
========================= */

cancelCardButton.addEventListener("click", () => {
    cardForm.hidden = true;
    cardForm.reset();
    cardFormError.textContent = "";
    editingCardId = null;
    addCardButton.focus();
});

/* =========================
   Event delegation
========================= */

// One click listener handles every card and its buttons.
cardList.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button || !cardList.contains(button)) return;

    const article = button.closest(".card");
    if (!article) return;

    const id = Number(article.dataset.id);
    const action = button.dataset.action;

    if (action === "flip") {
        const flipped = article.classList.toggle("is-flipped");

        // Keep both buttons' accessible states in sync.
        article.querySelectorAll('[data-action="flip"]')
            .forEach(flipButton => {
                flipButton.setAttribute(
                    "aria-pressed",
                    String(flipped)
                );
            });

        return;
    }

    if (action === "edit") {
        const card = cards.find(item => item.id === id);
        if (!card) return;

        editingCardId = card.id;

        cardQuestion.value = card.question;
        cardAnswer.value = card.answer;
        cardFormError.textContent = "";
        cardFormTitle.textContent = "Edit flashcard";

        cardForm.hidden = false;
        cardQuestion.focus();

        return;
    }

    if (action === "delete") {
        const card = cards.find(item => item.id === id);
        if (!card) return;

        if (!confirm("Delete this flashcard?")) return;

        cards = cards.filter(item => item.id !== id);

        renderCards();
        addCardButton.focus();
    }
});

/* =========================
   Refresh main content
========================= */

// Replace the previous updateMainContent function.
function updateMainContent() {
    const deck = decks.find(
        item => item.id === selectedDeckId
    );

    deckTitle.textContent = deck
        ? deck.name
        : "Select a deck";

    cardForm.hidden = true;
    editingCardId = null;

    renderCards();
}

// Initial render
updateMainContent();
