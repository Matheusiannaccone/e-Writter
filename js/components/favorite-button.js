import { getCurrentUser, onAuthStateChange } from "../services/authService.js";
import { withDataSource } from "./navigation-context.js";
import { isFavorite, addFavorite, removeFavorite } from "../services/favoriteService.js";

// Uma instância por obra; cada ação consulta o estado persistido antes de mutar.
export function createFavoriteButton(book) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "favorite-button";
  const feedback = document.createElement("span");
  feedback.className = "favorite-feedback";
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  const element = document.createElement("div");
  element.className = "favorite-control";
  element.append(button, feedback);
  let active = false;
  let busy = false;

  function paint() {
    button.textContent = active ? "♥ Na biblioteca" : "♡ Adicionar à biblioteca";
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", `${active ? "Remover" : "Adicionar"} ${book.title} ${active ? "da" : "à"} biblioteca`);
    button.disabled = busy;
  }

  async function refresh() {
    busy = true;
    paint();
    try {
      const user = await getCurrentUser();
      if (user.error || !user.data) {
        active = false;
        feedback.textContent = "Entre na sua conta para salvar esta obra.";
        return;
      }
      const result = await isFavorite(book.id);
      if (result.error) throw result.error;
      active = result.data === true;
      feedback.textContent = "";
    } catch {
      feedback.textContent = "Não foi possível consultar sua biblioteca.";
    } finally {
      busy = false;
      paint();
    }
  }

  button.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    paint();
    try {
      const user = await getCurrentUser();
      if (user.error || !user.data) {
        feedback.replaceChildren("Entre na sua conta para salvar esta obra. ");
        const link = document.createElement("a");
        link.href = withDataSource("./login.html").href;
        link.textContent = "Entrar";
        feedback.append(link);
        return;
      }
      const result = active ? await removeFavorite(book.id) : await addFavorite(book.id);
      if (result.error) {
        if (result.error.code === "CONFLICT") active = true;
        else if (result.error.code === "NOT_FOUND" && active) active = false;
        else throw result.error;
      } else active = !active;
      feedback.textContent = active ? "Obra adicionada à biblioteca." : "Obra removida da biblioteca.";
    } catch (error) {
      feedback.textContent = error?.code === "UNAUTHENTICATED" ? "Sessão encerrada. Entre novamente." : "Não foi possível atualizar sua biblioteca. Tente novamente.";
    } finally {
      busy = false;
      paint();
    }
  });
  onAuthStateChange(() => { refresh(); });
  paint();
  refresh();
  return element;
}
