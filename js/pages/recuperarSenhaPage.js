import { showFeedback, setProcessing, prepareFormValidation } from '../components/feedback.js';
import { resetPasswordForEmail } from "../services/authService.js";
import { isValidEmail } from '../validation/email.js';

const form=document.querySelector('#reset-form')
const button=document.querySelector('#reset-button')
const message=document.querySelector('#reset-message');

const showMessage = (text, type = 'error') => showFeedback(message, text, type);

const validation = prepareFormValidation(form, message, {
    email: value => isValidEmail(value) ? '' : 'Informe um e-mail válido.'
});

// Uma única chave por origem: nenhum endereço ou dado de conta é persistido.
const COOLDOWN_KEY = 'e-writter-password-recovery-available-at';
const COOLDOWN_MS = 60_000;
let availableAt = 0;
let sending = false;
let storageAvailable = true;
let timer;
const cooldownMessage = document.createElement('p');
cooldownMessage.id = 'reset-cooldown';
cooldownMessage.className = 'form-message';
cooldownMessage.setAttribute('role', 'status');
cooldownMessage.setAttribute('aria-live', 'polite');
cooldownMessage.setAttribute('aria-atomic', 'true');
form.append(cooldownMessage);
button.setAttribute('aria-describedby', cooldownMessage.id);
setProcessing(button, false);

function readDeadline() {
    if (!storageAvailable) return availableAt;
    try {
        const stored = Number(window.localStorage.getItem(COOLDOWN_KEY));
        availableAt = Number.isFinite(stored) && stored > 0 ? stored : 0;
    } catch { storageAvailable = false; }
    return availableAt;
}

function writeDeadline(deadline) {
    availableAt = deadline;
    try { window.localStorage.setItem(COOLDOWN_KEY, String(deadline)); }
    catch { storageAvailable = false; /* Manter o prazo em memória se a persistência falhar. */ }
}

function renderCooldown() {
    const seconds = Math.max(0, Math.ceil((readDeadline() - Date.now()) / 1000));
    button.disabled = sending || seconds > 0;
    if (!sending) {
        button.setAttribute('aria-busy', 'false');
        if (seconds) button.textContent = `Tentar novamente em ${seconds}s`;
        else button.innerHTML = button.dataset.idleLabel;
    }
    // Não anunciar cada segundo: o botão mostra a contagem, a região anuncia o prazo.
    const text = seconds
        ? `Aguarde até ${new Date(availableAt).toLocaleTimeString('pt-BR')} para solicitar novamente, mesmo que altere o e-mail. Os limites do serviço podem exigir uma espera maior.`
        : cooldownMessage.textContent ? 'Você já pode solicitar novamente.' : '';
    if (cooldownMessage.textContent !== text) cooldownMessage.textContent = text;
    if (seconds && !timer) timer = setInterval(renderCooldown, 1000);
    if (!seconds && timer) { clearInterval(timer); timer = undefined; }
    return seconds;
}

async function submitRecovery() {
    if (renderCooldown() || !validation.validate()) return;
    // Reserva compartilhada antes da chamada também bloqueia outra aba durante o envio.
    const reservation = Date.now() + COOLDOWN_MS;
    writeDeadline(reservation);
    setProcessing(button, true, 'Enviando...');
    renderCooldown();
    showMessage('Enviando instruções...', 'loading');
    let keepCooldown = false;
    try {
        const result = await resetPasswordForEmail({ email: form.elements.email.value.trim() });
        if (result?.error) {
            keepCooldown = result.error.code === 'RATE_LIMIT';
            showMessage(result.error.message || 'Não foi possível enviar as instruções.');
            return;
        }
        keepCooldown = true;
        showMessage(result.data?.message || 'Se houver uma conta associada a esse e-mail, você receberá as instruções de recuperação. Verifique também a caixa de spam.', 'success');
    } catch (err) {
        const networkFailure = err?.name === 'AuthRetryableFetchError' || /network|fetch/i.test(err?.message || '');
        showMessage(networkFailure
            ? 'Não foi possível conectar ao servidor. Tente novamente.'
            : 'Não foi possível enviar as instruções. Tente novamente mais tarde.');
    } finally {
        if (keepCooldown) writeDeadline(Math.max(readDeadline(), Date.now() + COOLDOWN_MS));
        else if (readDeadline() === reservation) writeDeadline(0);
    }
}

form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || renderCooldown()) return;
    sending = true;
    try {
        // Web Locks serializa a verificação/reserva entre abas em HTTPS e localhost.
        if (window.navigator?.locks) {
            await window.navigator.locks.request(COOLDOWN_KEY, { ifAvailable: true }, async lock => {
                if (lock) await submitRecovery();
            });
        } else await submitRecovery();
    } finally {
        sending = false;
        setProcessing(button, false);
        renderCooldown();
    }
});
window.addEventListener('storage', event => {
    if (event.key === COOLDOWN_KEY || event.key === null) renderCooldown();
});
window.addEventListener('pageshow', renderCooldown);
window.addEventListener('focus', renderCooldown);
renderCooldown();
for(const a of document.querySelectorAll('[data-page-link]'))
{
    const q=new URLSearchParams(location.search);

    if(q.has('datasource'))a.href+='?'+q.toString();
    }
