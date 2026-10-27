const labels = { error: 'Erro', success: 'Sucesso', warning: 'Atenção', loading: 'Carregando', empty: 'Sem conteúdo' };

export function showFeedback(element, text, kind = 'error') {
  const type = labels[kind] ? kind : 'error';
  element.dataset.type = type;
  element.classList.add('feedback');
  element.hidden = false;
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  element.setAttribute('aria-atomic', 'true');
  element.textContent = `${labels[type]}: ${text}`;
}

export function clearFeedback(element) {
  element.hidden = element.getAttribute('data-feedback-region') == null;
  element.textContent = '';
  element.removeAttribute('data-type');
}

export function setFieldError(field, text) {
  const wrapper = field.closest('.form-field, .field, .profile-detail');
  if (!wrapper) return;
  let error = wrapper.querySelector('.field__error');
  if (!error && text) {
    error = document.createElement('small');
    error.className = 'field__error';
    error.id = `${field.id}-error`;
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
  button.innerHTML = processing ? '<span class="feedback-spinner" aria-hidden="true"></span>' : button.dataset.idleLabel;
  if (processing) button.append(document.createTextNode(label || 'Processando...'));
}

// Mantém validação nativa como fallback quando JavaScript não carrega.
// Erros locais são anunciados pelo foco + aria-describedby, sem alert duplicado.
export function prepareFormValidation(form, message, validators = {}) {
  const fields = Array.from(form.querySelectorAll('input, textarea, select'));
  form.noValidate = true;
  message.classList.add('feedback');
  message.setAttribute('data-feedback-region', '');
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');
  message.setAttribute('aria-atomic', 'true');
  message.hidden = false;
  const errorFor = field => {
    if (field.required && !field.value.trim()) return 'Preencha este campo.';
    const custom = validators[field.name]?.(field.value);
    if (custom) return custom;
    return field.validity.valid ? '' : field.validationMessage;
  };
  fields.forEach(field => field.addEventListener('input', () => {
    if (message.dataset.type !== 'loading') clearFeedback(message);
    fields.filter(item => item.getAttribute('aria-invalid') === 'true').forEach(item => setFieldError(item, errorFor(item)));
  }));
  return {
    validate() {
      clearFeedback(message);
      let first;
      fields.forEach(field => {
        const error = errorFor(field);
        setFieldError(field, error);
        if (error && !first) first = field;
      });
      first?.focus();
      return !first;
    },
    clear() { fields.forEach(field => setFieldError(field, '')); }
  };
}
