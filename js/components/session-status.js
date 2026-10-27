/**
 * Canal de eventos em memória entre verificações das páginas e o cabeçalho.
 * Transporta apenas o motivo da falha; não armazena usuário, token ou sessão.
 */
const verificationListeners = new Set();
/**
 * Assina falhas de verificação detectadas por outros componentes.
 * @param {function(string): void} callback - Recebe guest ou error nos fluxos atuais.
 * @returns {function(): boolean} Função para remover a inscrição.
 */
export function onSessionVerificationFailure(callback) {
  verificationListeners.add(callback);
  return () => verificationListeners.delete(callback);
}
/**
 * Notifica consumidores isolando exceções síncronas de cada callback.
 * @param {string} reason - Motivo informado pela verificação.
 * @returns {void} Não modifica a sessão de autenticação.
 */
export function reportSessionVerificationFailure(reason) {
  for (const callback of verificationListeners) {
    try { callback(reason); } catch { /* Isola consumidores da interface. */ }
  }
}
