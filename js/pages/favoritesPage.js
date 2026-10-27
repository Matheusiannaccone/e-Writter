/**
 * Controla a coleção pessoal com uma consulta de favoritos e cards compartilhados.
 * Filtra relações inválidas/repetidas e protege listagem e remoção contra mudanças de sessão.
 */
import { createSessionBoundary } from '../components/session-boundary.js';
import { listFavorites, removeFavorite } from "../services/favoriteService.js";
import { createBookCard } from "../components/book-card.js";
import { showFeedback, clearFeedback } from "../components/feedback.js";
import { bookDetailsUrl, preserveDataSource } from "../components/navigation-context.js";

const emptyState = document.querySelector("#favorites-empty");
const favoritesList = document.querySelector("#favorites-list");
const favoritesCount = document.querySelector("#favorites-count");
const message = document.querySelector("#favorites-message");
const retry = document.querySelector("#favorites-retry");
const sessionState = document.querySelector("#favorites-session");
let generation = 0;
let entries = [];

preserveDataSource(document.querySelectorAll("[data-library-link]"));

const sessionBoundary = createSessionBoundary({ reload: loadFavorites, clear(reason) {
  showSession();
  if (reason === 'error') {
    sessionState.hidden = true; retry.hidden = false;
    favoritesCount.textContent = 'Não foi possível verificar sua sessão.';
    showFeedback(message, 'Verifique a conexão e tente novamente.', 'error');
  } else if (reason === 'checking') {
    sessionState.hidden = true; favoritesCount.textContent = 'Verificando sessão...';
  }
} });

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

/**
 * Remove o favorito e concilia a interface também quando o service responde NOT_FOUND.
 * @param {object} entry - Registro de favorito associado ao card.
 * @param {HTMLElement} card - Card removido após confirmação.
 * @param {HTMLButtonElement} button - Ação bloqueada enquanto a remoção está pendente.
 * @param {number} version - Geração da listagem que criou o card.
 * @returns {Promise<void>} Atualiza contagem e foco se a coleção ainda for a atual.
 */
async function removeEntry(entry, card, button, version) {
  if (button.disabled) return;
  const token = sessionBoundary.capture();
  button.disabled = true;
  button.textContent = "Removendo...";
  clearFeedback(message);
  try {
    const result = await removeFavorite(entry.bookId);
    if (version !== generation || !await sessionBoundary.accept(token, result)) return;
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
    if (!sessionBoundary.current(token)) return;
    button.disabled = false;
    button.textContent = "Remover da Biblioteca";
  }
}

/**
 * Consulta a coleção e prepara os cards antes de substituir a listagem.
 * A geração local evita que uma recarga/remoção antiga modifique a coleção atual.
 * @returns {Promise<void>} Diferencia vazio, sessão ausente, falha e dados indisponíveis.
 */
async function loadFavorites() {
  const version = ++generation;
  const token = sessionBoundary.capture();
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
    if (!await sessionBoundary.accept(token)) return;
    const result = await listFavorites();
    if (version !== generation || !await sessionBoundary.accept(token, result)) return;
    if (result?.error?.code === "UNAUTHENTICATED") { showSession(); return; }
    if (result?.error || !Array.isArray(result?.data)) throw result?.error;
    const seen = new Set();
    const isBookId = (id) => typeof id === "string"
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const valid = result.data.filter((entry) => {
      const book = entry?.book;
      if (!isBookId(entry?.bookId) || !book || typeof book !== "object" || Array.isArray(book)
        || !isBookId(book.id) || book.id !== entry.bookId || seen.has(entry.bookId)) return false;
      seen.add(entry.bookId);
      return true;
    });
    const cards = await Promise.all(valid.map(async (entry) => {
      const book = entry.book;
      const href = bookDetailsUrl(entry.bookId);
      const card = await createBookCard(book, {
        href: href.href,
        author: typeof book.author === "string" ? book.author : book.author?.displayName || book.author?.username,
        genres: book.genres,
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
    if (version !== generation || !await sessionBoundary.accept(token)) return;
    entries = valid;
    favoritesList.replaceChildren(...cards);
    paintCollection();
    if (result.data.length && !valid.length) {
      emptyState.hidden = true;
      showFeedback(message, "Nenhuma obra disponível para exibir. Os favoritos retornados estão indisponíveis ou são inválidos.", "warning");
    } else if (valid.length !== result.data.length) {
      showFeedback(message, "Alguns registros inválidos ou repetidos não foram exibidos.", "warning");
    }
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
loadFavorites();
