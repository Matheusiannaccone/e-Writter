const labels = { error: 'Erro', success: 'Sucesso', warning: 'Atenção', loading: 'Carregando', empty: 'Sem conteúdo' };

export function showFeedback(element, text, kind = 'error') {
  element.textContent = `${labels[kind] || labels.error}: ${text}`;
  element.dataset.type = kind;
  element.classList.add('feedback');
  element.hidden = false;
  element.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  element.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
}

export function clearFeedback(element) {
  element.hidden = true;
  element.textContent = '';
  element.removeAttribute('data-type');
}

export function setFieldError(field, text) {
  const wrapper = field.closest('.form-field, .field');
  if (!wrapper) return;
  let error = wrapper.querySelector('.field__error');
  if (!error && text) {
    error = document.createElement('small');
    error.className = 'field__error';
    error.id = `${field.id}-error`;
    error.setAttribute('role', 'alert');
    wrapper.append(error);
  }
  if (error) { error.textContent = text; error.hidden = !text; }
  const describedby = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  const filteredIds = describedby.filter(id => id !== error?.id);
  if (text && error) {
    filteredIds.push(error.id);
    field.setAttribute('aria-invalid', 'true');
  } else {
    field.removeAttribute('aria-invalid');
  }
  if (filteredIds.length) {
    field.setAttribute('aria-describedby', filteredIds.join(' '));
  } else {
    field.removeAttribute('aria-describedby');
  }
}

export function setProcessing(button, processing, label) {
  if (!button.dataset.idleLabel) button.dataset.idleLabel = button.innerHTML;
  button.disabled = processing;
  button.setAttribute('aria-busy', String(processing));
  button.innerHTML = processing ? `<span class="feedback-spinner" aria-hidden="true"></span>${label}` : button.dataset.idleLabel;
}
