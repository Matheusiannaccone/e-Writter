import { createFavoriteSession } from "./favorite-session.js";
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

  const session = createFavoriteSession(element, { reload: refresh, clear(reason) {
    active = false; busy = false;
    feedback.textContent = reason === 'error' ? 'Não foi possível verificar sua sessão. Tente novamente.' : reason === 'checking' ? 'Verificando sessão...' : 'Entre na sua conta para salvar esta obra.';
    paint();
  } });

  function paint() {
    button.textContent = active ? "♥ Na biblioteca" : "♡ Adicionar à biblioteca";
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", `${active ? "Remover" : "Adicionar"} ${book.title} ${active ? "da" : "à"} biblioteca`);
    button.disabled = busy;
  }

  async function refresh() {
    const token = session.next();
    busy = true;
    paint();
    try {
      if (!await session.accept(token)) return;
      const result = await isFavorite(book.id);
      if (!await session.accept(token, result)) return;
      if (result.error) throw result.error;
      active = result.data === true;
      feedback.textContent = "";
    } catch {
      if (!session.current(token)) return;
      feedback.textContent = "Não foi possível consultar sua biblioteca.";
    } finally {
      if (!session.current(token)) return;
      busy = false;
      paint();
    }
  }

  button.addEventListener("click", async () => {
    if (busy) return;
    const token = session.capture();
    busy = true;
    paint();
    try {
      if (!await session.accept(token)) {
        if (feedback.textContent.startsWith('Entre')) {
          const link = document.createElement('a');
          link.href = withDataSource('./login.html').href; link.textContent = 'Entrar'; feedback.append(' ', link);
        }
        return;
      }
      const result = active ? await removeFavorite(book.id) : await addFavorite(book.id);
      if (!await session.accept(token, result)) return;
      if (result.error) {
        if (result.error.code === "CONFLICT") active = true;
        else if (result.error.code === "NOT_FOUND" && active) active = false;
        else throw result.error;
      } else active = !active;
      feedback.textContent = active ? "Obra adicionada à biblioteca." : "Obra removida da biblioteca.";
    } catch (error) {
      if (!session.current(token)) return;
      feedback.textContent = error?.code === "UNAUTHENTICATED" ? "Sessão encerrada. Entre novamente." : "Não foi possível atualizar sua biblioteca. Tente novamente.";
    } finally {
      if (!session.current(token)) return;
      busy = false;
      paint();
    }
  });
  paint();
  refresh();
  return element;
}
