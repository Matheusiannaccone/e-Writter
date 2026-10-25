import { createSessionBoundary } from '../components/session-boundary.js';
// Implementação original de Lucas Emmanoel, recuperada do PR #44 em 0.43.0.
// Integração da página e proteção dos estados assíncronos adicionadas posteriormente.
import { getMyBooks } from "../services/bookService.js";
import { editorUrl, syncEditorLinks } from "../components/editor-navigation.js";
import {
  getChaptersByBook,
  createChapter,
  updateChapter
} from "../services/chapterService.js";

const bookSelect = document.querySelector("#chapter-book-select");
const newChapterButton = document.querySelector("#chapter-new-button");
const chapterList = document.querySelector("#chapter-list");
const listState = document.querySelector("#chapter-list-state");
const chapterForm = document.querySelector("#chapter-form");
const chapterTitle = document.querySelector("#chapter-title");
const chapterContent = document.querySelector("#chapter-content");
const characterCount = document.querySelector("#chapter-character-count");
const formMessage = document.querySelector("#chapter-form-message");
const formMode = document.querySelector("#chapter-form-mode");
const formTitle = document.querySelector("#chapter-form-title");
const saveButton = document.querySelector("#chapter-save-button");
const cancelButton = document.querySelector("#chapter-cancel-button");

let selectedChapterId = null;
let isSaving = false;
let chaptersReady = false;
let isLoading = false;
let chapterRequest = 0;
let sessionExpired = false;
const sessionBoundary = createSessionBoundary({ reload: loadMyBooks, clear(reason) {
  chapterRequest++; sessionExpired = true; chaptersReady = false; isLoading = false; isSaving = false;
  selectedChapterId = null; chapterTitle.value = ''; chapterContent.value = '';
  bookSelect.replaceChildren(); bookSelect.disabled = true; chapterList.replaceChildren();
  formMode.textContent = 'NOVO RASCUNHO'; formTitle.textContent = 'Escrever capítulo';
  cancelButton.hidden = true; clearFormMessage(); updateCharacterCount(); syncBackLink(); syncControls();
  setListState(reason === 'error' ? 'Não foi possível verificar sua sessão. Recarregue para tentar novamente.' : reason === 'checking' ? 'Verificando sessão...' : 'Entre na sua conta para editar capítulos.', 'error');
} });

function serviceMessage(error, fallback) {
  if (error?.code === "UNAUTHENTICATED") {
    sessionBoundary.invalidate('guest');
    sessionExpired = true;
    return "Entre na sua conta para editar capítulos.";
  }
  return error?.message || fallback;
}

function syncControls() {
  const unavailable = isSaving || isLoading || !chaptersReady || !bookSelect.value || sessionExpired;
  saveButton.disabled = unavailable;
  cancelButton.disabled = unavailable;
  newChapterButton.disabled = unavailable;
  chapterTitle.disabled = unavailable;
  chapterContent.disabled = unavailable;
  if (sessionExpired) bookSelect.disabled = true;
  chapterForm.setAttribute("aria-busy", String(isSaving));
  chapterList.setAttribute("aria-busy", String(isLoading));
  chapterList.querySelectorAll("button").forEach((button) => { button.disabled = unavailable; });
}

function syncBackLink() {
  syncEditorLinks(bookSelect.value);
}

function showFormMessage(message, type = "error") {
  formMessage.textContent = message;
  formMessage.dataset.type = type;
  formMessage.hidden = false;
}

function clearFormMessage() {
  formMessage.textContent = "";
  formMessage.hidden = true;
  delete formMessage.dataset.type;
}

function setListState(message, type = "info") {
  listState.textContent = message;
  listState.dataset.type = type;
  listState.hidden = !message;
}

function updateCharacterCount() {
  characterCount.textContent =
    `${chapterContent.value.length.toLocaleString("pt-BR")} / 15.000`;
}

function resetChapterForm() {
  selectedChapterId = null;
  chapterForm.reset();

  formMode.textContent = "NOVO RASCUNHO";
  formTitle.textContent = "Escrever capítulo";
  saveButton.textContent = "Salvar rascunho";

  cancelButton.hidden = true;
  syncControls();

  clearFormMessage();
  updateCharacterCount();
}

function setFormBusy(busy) {
  isSaving = busy;

  bookSelect.disabled = busy;
  syncControls();

  saveButton.textContent = busy
    ? "Salvando..."
    : selectedChapterId
      ? "Salvar alterações"
      : "Salvar rascunho";
}

function createChapterListItem(chapter) {
  const item = document.createElement("li");
  item.className = "chapter-list-item";

  const details = document.createElement("div");
  details.className = "chapter-list-details";

  const title = document.createElement("strong");
  title.className = "chapter-list-title";
  title.textContent =
    chapter.title?.trim() ||
    `Capítulo ${chapter.position} — Sem título`;

  const metadata = document.createElement("span");
  metadata.className = "chapter-list-meta";
  metadata.textContent =
    `Capítulo ${chapter.position} · ${
      chapter.status === "published" ? "Publicado" : "Rascunho"
    }`;

  details.append(title, metadata);

  const editButton = document.createElement("button");
  editButton.className = "button button--secondary chapter-edit-button";
  editButton.type = "button";
  editButton.textContent = "Editar";
  editButton.setAttribute(
    "aria-label",
    `Editar ${title.textContent}`
  );

  editButton.addEventListener("click", () => {
    beginEditing(chapter);
  });

  item.append(details, editButton);

  return item;
}

function renderChapterList(chapters) {
  chapterList.replaceChildren();

  if (chapters.length === 0) {
    setListState(
      "Esta obra ainda não possui capítulos. Crie o primeiro ao lado.",
      "empty"
    );
    return;
  }

  setListState(
    `${chapters.length} ${
      chapters.length === 1
        ? "capítulo encontrado"
        : "capítulos encontrados"
    }.`,
    "success"
  );

  chapters.forEach((chapter) => {
    chapterList.append(createChapterListItem(chapter));
  });
}

function beginEditing(chapter) {
  if (isSaving || isLoading || !chaptersReady || sessionExpired) return;
  selectedChapterId = chapter.id;

  chapterTitle.value = chapter.title ?? "";
  chapterContent.value = chapter.content ?? "";

  formMode.textContent =
    chapter.status === "published"
      ? "EDITANDO CAPÍTULO PUBLICADO"
      : "EDITANDO RASCUNHO";

  formTitle.textContent = `Editar capítulo ${chapter.position}`;
  saveButton.textContent = "Salvar alterações";
  cancelButton.hidden = false;

  clearFormMessage();
  updateCharacterCount();
  chapterTitle.focus();
}

async function loadChapters(bookId) {
  const token = sessionBoundary.capture();
  const request = ++chapterRequest;
  chaptersReady = false;
  isLoading = Boolean(bookId);
  resetChapterForm();
  chapterList.replaceChildren();

  if (!bookId) {
    setListState("Selecione uma obra para visualizar seus capítulos.");
    syncControls();
    return false;
  }

  setListState("Carregando capítulos...");
  syncControls();

  try {
    const result = await getChaptersByBook(bookId);
    if (request !== chapterRequest || bookSelect.value !== bookId) return false;
    if (!await sessionBoundary.accept(token, result)) return false;

    if (result?.error) {
      setListState(
        serviceMessage(result.error, "Não foi possível carregar os capítulos."),
        "error"
      );
      return false;
    }

    if (!Array.isArray(result?.data)) throw new Error("Resposta de capítulos inválida.");

    renderChapterList(
      Array.isArray(result?.data) ? result.data : []
    );

    chaptersReady = true;
    return true;
  } catch (error) {
    if (request !== chapterRequest || bookSelect.value !== bookId || !await sessionBoundary.accept(token)) return false;
    console.error("Erro ao carregar capítulos:", error);

    setListState(
      "Ocorreu um erro ao carregar os capítulos. Tente novamente.",
      "error"
    );
    return false;
  } finally {
    if (request === chapterRequest) {
      isLoading = false;
      syncControls();
    }
  }
}

async function loadMyBooks() {
  const token = sessionBoundary.capture();
  bookSelect.disabled = true;

  bookSelect.replaceChildren(
    new Option("Carregando suas obras...", "")
  );

  setListState("Carregando suas obras...");

  try {
    if (!await sessionBoundary.accept(token)) return;
    sessionExpired = false;
    const result = await getMyBooks();
    if (!await sessionBoundary.accept(token, result)) return;

    if (result?.error) {
      bookSelect.replaceChildren(
        new Option("Não foi possível carregar as obras", "")
      );

      setListState(
        serviceMessage(result.error, "Não foi possível carregar suas obras."),
        "error"
      );
      return;
    }

    if (!Array.isArray(result?.data)) throw new Error("Resposta de obras inválida.");
    const books = result.data;

    bookSelect.replaceChildren(
      new Option(
        books.length
          ? "Selecione uma obra..."
          : "Você ainda não possui obras",
        ""
      )
    );

    books.forEach((book) => {
      const option = new Option(
        book.title || "Obra sem título",
        book.id
      );

      bookSelect.add(option);
    });

    const params = new URLSearchParams(window.location.search);
    const requestedBookId = params.get("bookId");

    if (
      requestedBookId &&
      books.some((book) => book.id === requestedBookId)
    ) {
      bookSelect.value = requestedBookId;
    }

    bookSelect.disabled = books.length === 0;
    syncBackLink();

    if (bookSelect.value) {
      await loadChapters(bookSelect.value);
    } else if (books.length === 0) {
      setListState(
        "Você precisa ter uma obra para começar a escrever capítulos.",
        "empty"
      );
    } else if (requestedBookId) {
      setListState("A obra solicitada não está entre suas obras. Selecione uma obra disponível.", "error");
    } else {
      setListState(
        "Selecione uma obra para visualizar seus capítulos."
      );
    }
  } catch (error) {
    if (!await sessionBoundary.accept(token)) return;
    console.error("Erro ao carregar suas obras:", error);

    bookSelect.replaceChildren(
      new Option("Erro ao carregar obras", "")
    );

    setListState(
      "Ocorreu um erro ao carregar suas obras. Tente novamente.",
      "error"
    );
  } finally {
    syncControls();
  }
}

bookSelect.addEventListener("change", () => {
  if (isSaving || sessionExpired) return;
  const nextUrl = editorUrl(window.location.href, bookSelect.value);
  window.history.replaceState({}, "", nextUrl.href);
  syncBackLink();

  loadChapters(bookSelect.value);
});

newChapterButton.addEventListener("click", () => {
  if (newChapterButton.disabled) return;
  resetChapterForm();
  chapterTitle.focus();
});

cancelButton.addEventListener("click", () => {
  if (cancelButton.disabled) return;
  resetChapterForm();
  chapterTitle.focus();
});

chapterContent.addEventListener("input", updateCharacterCount);

chapterForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSaving || isLoading || sessionExpired) return;

  const bookId = bookSelect.value;

  if (!bookId || !chaptersReady) {
    showFormMessage("Selecione uma obra antes de salvar o capítulo.");
    return;
  }

  const data = {
    title: chapterTitle.value.trim(),
    content: chapterContent.value
  };

  if (!data.title) {
    showFormMessage("Informe um título para o capítulo.");
    chapterTitle.focus();
    return;
  }

  if (!data.content.trim()) {
    showFormMessage("Escreva o conteúdo do capítulo antes de salvar.");
    chapterContent.focus();
    return;
  }

  if (data.content.length > 15000) {
    showFormMessage(
      "O conteúdo ultrapassou o limite de 15.000 caracteres."
    );
    return;
  }

  const token = sessionBoundary.capture();
  clearFormMessage();
  setFormBusy(true);

  try {
    const wasEditing = Boolean(selectedChapterId);

    const result = wasEditing
      ? await updateChapter(selectedChapterId, data)
      : await createChapter(bookId, data);

    if (!await sessionBoundary.accept(token, result)) return;
    if (result?.error) {
      showFormMessage(
        serviceMessage(result.error, "Não foi possível salvar o capítulo.")
      );
      return;
    }

    if (!result?.data?.id) throw new Error("Resposta de salvamento inválida.");

    resetChapterForm();

    const refreshed = await loadChapters(bookId);
    if (!sessionBoundary.current(token)) return;

    showFormMessage(
      !refreshed
        ? "Capítulo salvo, mas a lista não pôde ser atualizada. Selecione a obra novamente ou recarregue a página antes de continuar."
        : wasEditing
        ? "Alterações do capítulo salvas com sucesso."
        : "Rascunho do capítulo criado com sucesso.",
      "success"
    );
  } catch (error) {
    if (!await sessionBoundary.accept(token)) return;
    console.error("Erro ao salvar capítulo:", error);

    showFormMessage(
      "Ocorreu um erro ao salvar. Verifique sua conexão e tente novamente."
    );
  } finally {
    if (!sessionBoundary.current(token)) return;
    setFormBusy(false);
  }
});

syncBackLink();
loadMyBooks();
