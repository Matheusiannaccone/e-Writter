import { getMyBooks } from "../services/bookService.js";
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
  chapterTitle.disabled = isSaving;
  chapterContent.disabled = isSaving;

  clearFormMessage();
  updateCharacterCount();
}

function setFormBusy(busy) {
  isSaving = busy;

  saveButton.disabled = busy;
  cancelButton.disabled = busy;
  newChapterButton.disabled = busy || !bookSelect.value;
  bookSelect.disabled = busy;
  chapterTitle.disabled = busy;
  chapterContent.disabled = busy;

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
  editButton.className = "editor-secondary-button chapter-edit-button";
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
  resetChapterForm();
  chapterList.replaceChildren();

  if (!bookId) {
    setListState("Selecione uma obra para visualizar seus capítulos.");
    newChapterButton.disabled = true;
    return;
  }

  setListState("Carregando capítulos...");
  newChapterButton.disabled = true;

  try {
    const result = await getChaptersByBook(bookId);

    if (result?.error) {
      setListState(
        result.error.message || "Não foi possível carregar os capítulos.",
        "error"
      );
      return;
    }

    renderChapterList(
      Array.isArray(result?.data) ? result.data : []
    );

    newChapterButton.disabled = false;
  } catch (error) {
    console.error("Erro ao carregar capítulos:", error);

    setListState(
      "Ocorreu um erro ao carregar os capítulos. Tente novamente.",
      "error"
    );
  }
}

async function loadMyBooks() {
  bookSelect.disabled = true;

  bookSelect.replaceChildren(
    new Option("Carregando suas obras...", "")
  );

  setListState("Carregando suas obras...");

  try {
    const result = await getMyBooks();

    if (result?.error) {
      bookSelect.replaceChildren(
        new Option("Não foi possível carregar as obras", "")
      );

      setListState(
        result.error.message || "Não foi possível carregar suas obras.",
        "error"
      );
      return;
    }

    const books = Array.isArray(result?.data) ? result.data : [];

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
    } else if (books.length === 1) {
      bookSelect.value = books[0].id;
    }

    bookSelect.disabled = false;
    newChapterButton.disabled = !bookSelect.value;

    if (bookSelect.value) {
      await loadChapters(bookSelect.value);
    } else if (books.length === 0) {
      setListState(
        "Você precisa ter uma obra para começar a escrever capítulos.",
        "empty"
      );
    } else {
      setListState(
        "Selecione uma obra para visualizar seus capítulos."
      );
    }
  } catch (error) {
    console.error("Erro ao carregar suas obras:", error);

    bookSelect.replaceChildren(
      new Option("Erro ao carregar obras", "")
    );

    setListState(
      "Ocorreu um erro ao carregar suas obras. Tente novamente.",
      "error"
    );
  }
}

bookSelect.addEventListener("change", () => {
  const params = new URLSearchParams(window.location.search);

  if (bookSelect.value) {
    params.set("bookId", bookSelect.value);
  } else {
    params.delete("bookId");
  }

  const query = params.toString();

  const nextUrl =
    `${window.location.pathname}` +
    `${query ? `?${query}` : ""}` +
    `${window.location.hash}`;

  window.history.replaceState({}, "", nextUrl);

  loadChapters(bookSelect.value);
});

newChapterButton.addEventListener("click", () => {
  resetChapterForm();
  chapterTitle.focus();
});

cancelButton.addEventListener("click", () => {
  resetChapterForm();
});

chapterContent.addEventListener("input", updateCharacterCount);

chapterForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSaving) return;

  const bookId = bookSelect.value;

  if (!bookId) {
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

  clearFormMessage();
  setFormBusy(true);

  try {
    const wasEditing = Boolean(selectedChapterId);

    const result = wasEditing
      ? await updateChapter(selectedChapterId, data)
      : await createChapter(bookId, data);

    if (result?.error) {
      showFormMessage(
        result.error.message || "Não foi possível salvar o capítulo."
      );
      return;
    }

    resetChapterForm();

    await loadChapters(bookId);

    showFormMessage(
      wasEditing
        ? "Alterações do capítulo salvas com sucesso."
        : "Rascunho do capítulo criado com sucesso.",
      "success"
    );
  } catch (error) {
    console.error("Erro ao salvar capítulo:", error);

    showFormMessage(
      "Ocorreu um erro ao salvar. Verifique sua conexão e tente novamente."
    );
  } finally {
    setFormBusy(false);
  }
});

loadMyBooks();