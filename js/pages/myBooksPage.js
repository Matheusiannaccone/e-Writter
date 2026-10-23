
import { getMyBooks } from "../services/bookService.js";
import { createBookCard } from "../components/book-card.js";
import { showFeedback, clearFeedback } from "../components/feedback.js";

const emptyState = document.querySelector("#my-books-empty");
const booksList = document.querySelector("#my-books-list");
const booksCount = document.querySelector("#my-books-count");
const booksMessage = document.querySelector("#my-books-message");

function setLoading() {
  emptyState.hidden = true;
  booksList.hidden = true;
  booksList.replaceChildren();
  booksCount.textContent = "Carregando suas obras...";
  clearFeedback(booksMessage);
}

function showEmpty() {
  emptyState.hidden = false;
  booksList.hidden = true;
  booksCount.textContent = "Você ainda não possui livros.";
}

function showError(message) {
  emptyState.hidden = true;
  booksList.hidden = true;
  booksCount.textContent = "Não foi possível carregar suas obras.";
  showFeedback(booksMessage, message, "error");
}

function getBookStatus(book) {
  if (book.status !== "published") {
    return "Rascunho";
  }

  const statuses = {
    ongoing: "Em andamento",
    completed: "Concluído",
    discontinued: "Descontinuado"
  };

  return statuses[book.publicationStatus] || "Publicado";
}

async function loadMyBooks() {
  setLoading();

  try {
    const result = await getMyBooks();

    if (result?.error) {
      showError(
        result.error.message || "Não foi possível consultar seus livros."
      );
      return;
    }

    if (!Array.isArray(result?.data)) {
      showError("A resposta da consulta de livros é inválida.");
      return;
    }

    const books = result.data;

    if (books.length === 0) {
      showEmpty();
      return;
    }

    const cards = await Promise.all(
      books.map((book) => {
        const href = new URL("./book-editor.html", window.location.href);
        href.searchParams.set("id", book.id);

        return createBookCard(book, {
          href: href.href,
          genres: book.genres,
          metadata: getBookStatus(book)
        });
      })
    );

    booksList.classList.add("book-grid");
    booksList.replaceChildren(...cards);

    booksList.hidden = false;
    emptyState.hidden = true;

    booksCount.textContent =
      books.length === 1
        ? "1 livro encontrado."
        : `${books.length} livros encontrados.`;

    clearFeedback(booksMessage);
  } catch (error) {
    console.error("Erro ao carregar Meus Livros:", error);
    showError("Ocorreu um erro ao carregar sua biblioteca.");
  }
}

loadMyBooks();
