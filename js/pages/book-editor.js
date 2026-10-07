import { getMyBooks, createBook, updateBook } from '../services/bookService.js';
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
  $('#save-note').textContent = book?.status === 'published' ? 'As alterações serão salvas na obra publicada.' : 'Sua obra será salva como rascunho.';
  saveButton.textContent = book ? 'Salvar alterações' : 'Criar rascunho';
  message('');
}
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
