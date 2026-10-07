import { getMyBooks, createBook, updateBook, publishBook, unpublishBook } from '../services/bookService.js';
import { getChaptersByBook, publishChapter, unpublishChapter } from '../services/chapterService.js';
import { bookBlockers, chapterBlockers } from './publication-rules.js';
import { getGenres } from '../services/genreService.js';
import { uploadBookCover, removeBookCover, getBookCoverUrl } from '../services/imageService.js';

const $ = (selector) => document.querySelector(selector);
const form = $('#book-form');
const status = $('#editor-status');
const picker = $('#book-picker');
const title = $('#book-title');
const description = $('#book-description');
const options = $('#genre-options');
const coverFile = $('#cover-file');
const coverImage = $('#cover-image');
const coverPreview = $('#cover-preview');
const removeCover = $('#remove-cover');
const saveButton = $('#save-book');
let books = [];
let chapters = [];
let publicationRequest = 0;
let chaptersLoading = false;
let genres = [];
let selectedFile = null;
let removeExistingCover = false;
let previewUrl = null;
let coverRequest = 0;
let busy = false;

function message(value, kind = '') {
  status.textContent = value;
  status.dataset.kind = kind;
  status.hidden = !value;
}
function fieldError(element, errorId, value) {
  const error = document.getElementById(errorId);
  error.textContent = value;
  error.hidden = !value;
  element.setAttribute('aria-invalid', String(Boolean(value)));
}
function selectedGenres() {
  return [...options.querySelectorAll('input:checked')].map((input) => Number(input.value));
}
function updateGenreCount() {
  const count = selectedGenres().length;
  $('#genre-count').textContent = count ? `${count} de 3 gêneros selecionados` : 'Nenhum gênero selecionado';
  options.querySelectorAll('input').forEach((input) => {
    input.disabled = !input.checked && count >= 3;
  });
  if (count) fieldError($('#genre-fieldset'), 'genres-error', '');
}
async function showCover() {
  const request = ++coverRequest;
  if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  coverImage.hidden = true;
  coverImage.removeAttribute('src');
  const placeholder = coverPreview.querySelector('.editor__cover-placeholder');
  const caption = placeholder.querySelector('span:last-child');
  placeholder.hidden = false;
  const book = books.find((item) => item.id === picker.value);
  removeCover.hidden = !selectedFile && (!book?.coverPath || removeExistingCover);
  if (selectedFile) {
    previewUrl = URL.createObjectURL(selectedFile);
  } else if (book?.coverPath && !removeExistingCover) {
    caption.textContent = 'Carregando capa…';
    let result;
    try {
      result = await getBookCoverUrl(book.coverPath);
    } catch {
      result = { error: { message: 'Não foi possível carregar a capa.' } };
    }
    if (request !== coverRequest) {
      if (result.data?.url?.startsWith('blob:')) URL.revokeObjectURL(result.data.url);
      return;
    }
    if (result.error) {
      caption.textContent = 'Capa indisponível';
      fieldError(coverFile, 'cover-error', `${result.error.message} Você pode escolher outra imagem.`);
      return;
    }
    previewUrl = result.data.url;
  } else {
    caption.innerHTML = 'Seu mundo<br>começa aqui';
  }
  if (previewUrl) {
    coverImage.src = previewUrl;
    coverImage.hidden = false;
    placeholder.hidden = true;
  }
}
coverImage.addEventListener('error', () => {
  coverImage.hidden = true;
  coverPreview.querySelector('.editor__cover-placeholder').hidden = false;
  coverPreview.querySelector('.editor__cover-placeholder span:last-child').textContent = 'Capa indisponível';
  fieldError(coverFile, 'cover-error', 'Não foi possível mostrar esta capa. Escolha outra imagem.');
});
function setBusy(value) {
  busy = value;
  saveButton.disabled = value;
  document.querySelectorAll('[data-publication-action], #book-publication-action').forEach((button) => { button.disabled = value || button.dataset.blocked === 'true'; });
  picker.disabled = value;
  saveButton.textContent = value ? 'Salvando…' : picker.value ? 'Salvar alterações' : 'Criar rascunho';
}
function renderPicker(selectedId = '') {
  picker.replaceChildren(new Option('Nova obra', ''));
  books.forEach((book) => picker.add(new Option(book.title, book.id)));
  picker.value = selectedId;
  if (picker.value !== selectedId) picker.value = '';
}
function fillForm() {
  const book = books.find((item) => item.id === picker.value);
  title.value = book?.title ?? '';
  description.value = book?.description ?? '';
  const ids = new Set(book?.genres?.map((genre) => genre.id) ?? []);
  options.querySelectorAll('input').forEach((input) => { input.checked = ids.has(Number(input.value)); });
  selectedFile = null;
  removeExistingCover = false;
  coverFile.value = '';
  fieldError(title, 'title-error', '');
  fieldError($('#genre-fieldset'), 'genres-error', '');
  fieldError(coverFile, 'cover-error', '');
  updateGenreCount();
  showCover();
  loadPublication(book);
  $('#save-note').textContent = book?.status === 'published' ? 'As alterações serão salvas na obra publicada.' : 'Sua obra será salva como rascunho.';
  saveButton.textContent = book ? 'Salvar alterações' : 'Criar rascunho';
  message('');
}

function badge(statusValue) {
  const span = document.createElement('span');
  span.className = `editor__badge editor__badge--${statusValue}`;
  span.textContent = statusValue === 'published' ? 'Publicado' : 'Rascunho';
  return span;
}
function renderReasons(container, reasons) {
  container.replaceChildren();
  reasons.forEach((reason) => {
    const item = document.createElement('li');
    item.textContent = reason;
    container.append(item);
  });
  container.hidden = reasons.length === 0;
}
function renderPublication(book) {
  const panel = $('#publication-panel');
  panel.hidden = !book;
  if (!book) return;
  const published = book.status === 'published';
  const statusBadge = $('#book-status-badge');
  statusBadge.className = `editor__badge editor__badge--${book.status}`;
  statusBadge.textContent = published ? 'Publicado' : 'Rascunho';
  $('#book-visibility').textContent = published
    ? 'Esta obra está disponível no catálogo. Somente capítulos publicados podem ser lidos.'
    : 'Esta obra está privada. Mesmo capítulos publicados só ficam visíveis ao público após publicar a obra.';
  const blockers = published ? [] : bookBlockers(book, chapters);
  if (chaptersLoading && !published) blockers.push('Aguarde o carregamento dos capítulos.');
  renderReasons($('#book-blockers'), blockers);
  const bookAction = $('#book-publication-action');
  bookAction.textContent = published ? 'Retirar obra de publicação' : 'Publicar obra';
  bookAction.dataset.blocked = String(blockers.length > 0);
  bookAction.disabled = busy || chaptersLoading || blockers.length > 0;
  bookAction.setAttribute('aria-describedby', blockers.length ? 'book-blockers' : 'book-visibility');
  $('#chapter-count').textContent = chaptersLoading ? 'Carregando…' : `${chapters.length} ${chapters.length === 1 ? 'capítulo' : 'capítulos'}`;
  const list = $('#chapter-list');
  list.replaceChildren();
  if (!chapters.length) {
    const empty = document.createElement('li');
    empty.textContent = chaptersLoading ? 'Carregando capítulos…' : 'Nenhum capítulo nesta obra.';
    list.append(empty);
  }
  const publishedCount = chapters.filter((chapter) => chapter.status === 'published').length;
  chapters.forEach((chapter) => {
    const item = document.createElement('li');
    item.className = 'editor__chapter';
    const top = document.createElement('div');
    top.className = 'editor__chapter-top';
    const name = document.createElement('strong');
    name.textContent = `${String(chapter.position).padStart(2, '0')} · ${chapter.title || 'Sem título'}`;
    top.append(name, badge(chapter.status));
    const reasons = chapter.status === 'published' ? [] : chapterBlockers(chapter);
    if (chapter.status === 'published' && published && publishedCount === 1) {
      reasons.push('Retire a obra de publicação antes de retirar o último capítulo publicado.');
    }
    const note = document.createElement('p');
    note.className = 'editor__help';
    note.textContent = chapter.status === 'published'
      ? (published ? 'Visível para leitores.' : 'Pronto para leitura quando a obra for publicada.')
      : 'Privado para leitores.';
    const reasonList = document.createElement('ul');
    reasonList.className = 'editor__blockers';
    renderReasons(reasonList, reasons);
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'button button--secondary';
    action.dataset.publicationAction = chapter.id;
    action.dataset.blocked = String(reasons.length > 0);
    action.textContent = chapter.status === 'published' ? 'Retirar capítulo de publicação' : 'Publicar capítulo';
    action.disabled = busy || reasons.length > 0;
    item.append(top, note, reasonList, action);
    list.append(item);
  });
}
async function loadPublication(book) {
  const request = ++publicationRequest;
  chapters = [];
  chaptersLoading = Boolean(book);
  renderPublication(book);
  if (!book) return;
  const result = await getChaptersByBook(book.id);
  if (request !== publicationRequest) return;
  chaptersLoading = false;
  if (result.error) {
    message(`Não foi possível carregar os capítulos: ${result.error.message}`, 'error');
    renderPublication(book);
    $('#book-publication-action').disabled = true;
    return;
  }
  chapters = result.data ?? [];
  renderPublication(book);
}
async function changePublication(target) {
  if (busy) return;
  const book = books.find((item) => item.id === picker.value);
  if (!book) return;
  const chapter = target === 'book' ? null : chapters.find((item) => item.id === target);
  if (target !== 'book' && !chapter) return;
  const published = (chapter ?? book).status === 'published';
  const blockers = chapter
    ? (published && book.status === 'published' && chapters.filter((item) => item.status === 'published').length === 1
      ? ['Retire a obra de publicação antes de retirar o último capítulo publicado.']
      : published ? [] : chapterBlockers(chapter))
    : published ? [] : bookBlockers(book, chapters);
  if (blockers.length) { message(blockers.join(' '), 'error'); return; }
  const label = chapter ? `o capítulo “${chapter.title || 'Sem título'}”` : `a obra “${book.title}”`;
  if (!window.confirm(`${published ? 'Retirar de publicação' : 'Publicar'} ${label}?`)) return;
  setBusy(true);
  message(`${published ? 'Retirando de publicação' : 'Publicando'} ${chapter ? 'capítulo' : 'obra'}…`);
  try {
    const result = chapter
      ? await (published ? unpublishChapter(chapter.id) : publishChapter(chapter.id))
      : await (published ? unpublishBook(book.id) : publishBook(book.id));
    if (result.error) throw new Error(result.error.message);
    if (chapter) chapters = chapters.map((item) => item.id === chapter.id ? result.data : item);
    else books = books.map((item) => item.id === book.id ? result.data : item);
    renderPublication(books.find((item) => item.id === picker.value));
    $('#save-note').textContent = books.find((item) => item.id === picker.value)?.status === 'published'
      ? 'As alterações serão salvas na obra publicada.' : 'Sua obra será salva como rascunho.';
    message(chapter
      ? (published ? 'Capítulo retirado de publicação.' : 'Capítulo publicado com sucesso.')
      : (published ? 'Obra retirada de publicação.' : 'Obra publicada com sucesso.'), 'success');
  } catch (error) {
    message(error.message || 'Não foi possível mudar o estado. Tente novamente.', 'error');
  } finally {
    setBusy(false);
    renderPublication(books.find((item) => item.id === picker.value));
  }
}
$('#book-publication-action').addEventListener('click', () => changePublication('book'));
$('#chapter-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-publication-action]');
  if (button) changePublication(button.dataset.publicationAction);
});

function validate() {
  let valid = true;
  const trimmed = title.value.trim();
  fieldError(title, 'title-error', trimmed ? '' : 'Digite um título para sua obra.');
  if (!trimmed) { valid = false; title.focus(); }
  const count = selectedGenres().length;
  fieldError($('#genre-fieldset'), 'genres-error', count >= 1 && count <= 3 ? '' : 'Selecione de 1 a 3 gêneros.');
  if (!count) { if (valid) options.querySelector('input')?.focus(); valid = false; }
  return valid;
}
function validateFile(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Escolha uma imagem JPG, PNG ou WebP.';
  if (file.size > 5 * 1024 * 1024) return 'A imagem deve ter no máximo 5 MB.';
  return '';
}
async function load() {
  try {
    const [genreResult, bookResult] = await Promise.all([getGenres(), getMyBooks()]);
    if (genreResult.error) throw new Error(genreResult.error.message);
    if (bookResult.error && bookResult.error.code !== 'UNAUTHENTICATED') throw new Error(bookResult.error.message);
    genres = genreResult.data;
    books = bookResult.data ?? [];
    genres.forEach((genre) => {
      const label = document.createElement('label');
      label.className = 'editor__genre';
      const input = document.createElement('input');
      input.type = 'checkbox'; input.name = 'genre'; input.value = String(genre.id);
      const text = document.createElement('span'); text.textContent = genre.name;
      label.append(input, text); options.append(label);
    });
    const requestedId = new URLSearchParams(location.search).get('book');
    renderPicker(books.some((book) => book.id === requestedId) ? requestedId : '');
    $('#editor-content').hidden = false;
    fillForm();
    if (bookResult.error?.code === 'UNAUTHENTICATED') message('Entre na sua conta para salvar uma obra. Você já pode preparar o formulário.', 'error');
  } catch (error) {
    message(error.message || 'Não foi possível carregar o ateliê. Atualize a página para tentar novamente.', 'error');
  }
}
options.addEventListener('change', updateGenreCount);
title.addEventListener('input', () => { if (title.value.trim()) fieldError(title, 'title-error', ''); });
picker.addEventListener('change', fillForm);
coverFile.addEventListener('change', () => {
  const file = coverFile.files[0];
  if (!file) return;
  const error = validateFile(file);
  fieldError(coverFile, 'cover-error', error);
  if (error) { coverFile.value = ''; return; }
  selectedFile = file;
  removeExistingCover = false;
  showCover();
});
removeCover.addEventListener('click', () => {
  selectedFile = null;
  coverFile.value = '';
  removeExistingCover = Boolean(picker.value);
  showCover();
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy || !validate()) return;
  setBusy(true);
  message('Salvando sua obra…');
  const data = { title: title.value.trim(), description: description.value.trim() || null, genreIds: selectedGenres() };
  const id = picker.value;
  try {
    const result = id ? await updateBook(id, data) : await createBook(data);
    if (result.error) throw new Error(result.error.code === 'UNAUTHENTICATED' ? 'Entre na sua conta para salvar a obra.' : result.error.message);
    const book = result.data;
    books = [book, ...books.filter((item) => item.id !== book.id)];
    renderPicker(book.id);
    if (selectedFile) {
      message('Obra salva. Enviando capa…');
      const upload = await uploadBookCover(book.id, selectedFile);
      if (upload.error) {
        fieldError(coverFile, 'cover-error', `${upload.error.message} Tente salvar novamente.`);
        message(`Obra salva, mas a capa não foi enviada: ${upload.error.message} Tente salvar novamente.`, 'error');
        return;
      }
      book.coverPath = upload.data.path;
    } else if (removeExistingCover) {
      message('Obra salva. Removendo capa…');
      const removal = await removeBookCover(book.id);
      if (removal.error) {
        fieldError(coverFile, 'cover-error', `${removal.error.message} Tente novamente.`);
        message(`Obra salva, mas a capa não foi removida: ${removal.error.message} Tente novamente.`, 'error');
        return;
      }
      book.coverPath = null;
    }
    fillForm();
    message(id ? 'Alterações salvas.' : 'Rascunho criado. Você pode continuar editando.', 'success');
  } catch (error) {
    message(error.message || 'Não foi possível salvar. Tente novamente.', 'error');
  } finally {
    setBusy(false);
  }
});
load();
