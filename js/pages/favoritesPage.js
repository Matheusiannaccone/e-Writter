import { listFavorites, removeFavorite } from "../services/favoriteService.js";
import { onAuthStateChange } from "../services/authService.js";
import { createBookCard } from "../components/book-card.js";
import { showFeedback, clearFeedback } from "../components/feedback.js";

const emptyState = document.querySelector("#favorites-empty");
const favoritesList = document.querySelector("#favorites-list");
const favoritesCount = document.querySelector("#favorites-count");
const message = document.querySelector("#favorites-message");
const retry = document.querySelector("#favorites-retry");
const sessionState = document.querySelector("#favorites-session");
let generation = 0;
let entries = [];

function libraryUrl(path) {
  const url = new URL(path, window.location.href);
  const source = new URLSearchParams(window.location.search).get("datasource");
  if (source === "mock" || source === "supabase") url.searchParams.set("datasource", source);
  return url;
}

for (const link of document.querySelectorAll("[data-library-link]")) {
  link.href = libraryUrl(link.getAttribute("href")).href;
}

function paintCollection() {
  favoritesList.hidden = entries.length === 0;
  emptyState.hidden = entries.length !== 0;
  favoritesCount.textContent = entries.length === 1 ? "1 livro favorito." : `${entries.length} livros favoritos.`;
}

function showSession() {
  generation++;
  entries = [];
  favoritesList.replaceChildren();
  favoritesList.hidden = true;
  favoritesList.setAttribute("aria-busy", "false");
  emptyState.hidden = true;
  retry.hidden = true;
  sessionState.hidden = false;
  favoritesCount.textContent = "Entre na sua conta para consultar seus favoritos.";
  clearFeedback(message);
}

async function removeEntry(entry, card, button, version) {
  if (button.disabled) return;
  button.disabled = true;
  button.textContent = "Removendo...";
  clearFeedback(message);
  try {
    const result = await removeFavorite(entry.bookId);
    if (version !== generation) return;
    if (result?.error?.code === "UNAUTHENTICATED") { showSession(); return; }
    // NOT_FOUND também confirma que este favorito já não existe.
    if (!result || (result.error && result.error.code !== "NOT_FOUND")) throw result?.error;
    const index = entries.indexOf(entry);
    const shouldFocus = card.contains(document.activeElement);
    entries.splice(index, 1);
    card.remove();
    paintCollection();
    showFeedback(message, "Obra removida da Biblioteca.", "success");
    if (shouldFocus) {
      const buttons = favoritesList.querySelectorAll("button");
      (buttons[Math.min(index, buttons.length - 1)] || favoritesCount).focus();
    }
  } catch {
    if (version === generation) showFeedback(message, "Não foi possível remover a obra. Tente novamente.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "Remover da Biblioteca";
  }
}

async function loadFavorites() {
  const version = ++generation;
  entries = [];
  favoritesList.replaceChildren();
  favoritesList.hidden = true;
  favoritesList.setAttribute("aria-busy", "true");
  emptyState.hidden = true;
  sessionState.hidden = true;
  retry.hidden = true;
  favoritesCount.textContent = "Carregando seus favoritos...";
  clearFeedback(message);
  try {
    const result = await listFavorites();
    if (version !== generation) return;
    if (result?.error?.code === "UNAUTHENTICATED") { showSession(); return; }
    if (result?.error || !Array.isArray(result?.data)) throw result?.error;
    const seen = new Set();
    const valid = result.data.filter((entry) => {
      if (typeof entry?.bookId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.bookId) || seen.has(entry.bookId)) return false;
      seen.add(entry.bookId);
      return true;
    });
    const cards = await Promise.all(valid.map(async (entry) => {
      const available = entry.book && typeof entry.book === "object" && !Array.isArray(entry.book);
      const book = available ? { ...entry.book, id: entry.bookId } : { id: entry.bookId, title: "Obra indisponível" };
      const href = libraryUrl("./detalhes-obra.html");
      href.searchParams.set("id", entry.bookId);
      const card = await createBookCard(book, {
        href: href.href,
        author: typeof book.author === "string" ? book.author : book.author?.displayName || book.author?.username,
        genres: book.genres,
        metadata: available ? undefined : "Os dados desta obra não estão disponíveis.",
        showFavoriteButton: false
      });
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button--secondary";
      button.textContent = "Remover da Biblioteca";
      button.setAttribute("aria-label", `Remover ${book.title || "Livro sem título"} da Biblioteca`);
      button.addEventListener("click", () => removeEntry(entry, card, button, version));
      card.append(button);
      return card;
    }));
    if (version !== generation) return;
    entries = valid;
    favoritesList.replaceChildren(...cards);
    paintCollection();
    if (valid.length !== result.data.length) showFeedback(message, "Alguns registros inválidos ou repetidos não foram exibidos.", "warning");
  } catch {
    if (version !== generation) return;
    favoritesCount.textContent = "Não foi possível carregar sua Biblioteca.";
    showFeedback(message, "Falha ao consultar seus favoritos. Tente novamente.", "error");
    retry.hidden = false;
  } finally {
    if (version === generation) favoritesList.setAttribute("aria-busy", "false");
  }
}

retry.addEventListener("click", loadFavorites);
// O callback de autenticação não executa consultas dentro do lock do adapter.
onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") showSession();
  else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
    setTimeout(() => { loadFavorites(); }, 0);
  }
});
loadFavorites();
