
const emptyState = document.querySelector("#my-books-empty");
const booksList = document.querySelector("#my-books-list");
const booksCount = document.querySelector("#my-books-count");

// A interface começa vazia até conectarmos o serviço de livros.
function loadMyBooks() {
  emptyState.hidden = false;
  booksList.hidden = true;
  booksCount.textContent = "Nenhum livro foi carregado ainda.";
}

loadMyBooks();
