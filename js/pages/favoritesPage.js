
const emptyState = document.querySelector("#favorites-empty");
const favoritesList = document.querySelector("#favorites-list");
const favoritesCount = document.querySelector("#favorites-count");

// A interface começa vazia até conectarmos o sistema de favoritos.
function loadFavorites() {
  emptyState.hidden = false;
  favoritesList.hidden = true;
  favoritesCount.textContent = "Nenhum livro favorito foi carregado ainda.";
}

loadFavorites();
