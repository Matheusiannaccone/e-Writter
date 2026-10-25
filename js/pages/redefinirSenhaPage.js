import { showFeedback, clearFeedback, setFieldError, setProcessing, prepareFormValidation } from '../components/feedback.js';
import { updatePassword, getPasswordRecoverySession } from '../services/authService.js';
import { preserveDataSource } from '../components/navigation-context.js';

const form = document.querySelector('#new-password-form');
const button = document.querySelector('#save-button');
const message = document.querySelector('#new-password-message');
const fields = Array.from(form.querySelectorAll('input'));
const validation = prepareFormValidation(form, message, {
  confirmPassword: value => value === form.elements.password.value ? '' : 'As senhas não coincidem.'
});
let ready = false;
let busy = false;
let completed = false;
const retry = document.querySelector('#recovery-retry');

function lock(locked) {
  fields.forEach(field => { field.disabled = locked; });
  button.disabled = locked;
}

async function checkRecovery() {
  if (busy) return;
  busy = true;
  ready = false;
  retry.hidden = true;
  lock(true);
  showFeedback(message, 'Verificando o link de recuperação...', 'loading');
  try {
    const result = await getPasswordRecoverySession();
    if (result.error || !result.data) {
      showFeedback(message, result.error?.message || 'Link inválido ou expirado. Solicite um novo link de recuperação.');
      retry.hidden = result.error?.code !== 'NETWORK_ERROR';
      return;
    }
    ready = true;
    clearFeedback(message);
  } catch {
    showFeedback(message, 'Não foi possível verificar o link. Verifique sua conexão e tente novamente.');
    retry.hidden = false;
  } finally {
    busy = false;
    lock(!ready);
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!ready || busy || completed || !validation.validate()) return;
  busy = true;
  lock(true);
  setProcessing(button, true, 'Salvando...');
  showFeedback(message, 'Salvando nova senha...', 'loading');
  try {
    const result = await updatePassword({ password: form.elements.password.value });
    if (result.error) {
      if (result.error.code === 'VALIDATION_ERROR') {
        clearFeedback(message);
        setFieldError(form.elements.password, result.error.message);
      } else {
        showFeedback(message, result.error.message || 'Não foi possível alterar a senha. Tente novamente.');
        if (['INVALID_RECOVERY_LINK', 'UNAUTHENTICATED'].includes(result.error.code)) ready = false;
      }
      return;
    }
    completed = true;
    form.reset();
    showFeedback(message, result.data?.message || 'Senha alterada com sucesso! Você já pode entrar com a nova senha.', 'success');
  } catch {
    showFeedback(message, 'Não foi possível conectar. Verifique sua conexão e tente novamente.');
  } finally {
    busy = false;
    setProcessing(button, false);
    lock(!ready || completed);
    if (form.elements.password.getAttribute('aria-invalid') === 'true') form.elements.password.focus();
  }
});

retry.addEventListener('click', async () => {
  await checkRecovery();
  if (ready) fields[0].focus();
  else if (!retry.hidden) retry.focus();
});
preserveDataSource(document.querySelectorAll('a[href]'));
checkRecovery();
