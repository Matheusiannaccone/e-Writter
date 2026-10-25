// Compartilha falhas detectadas pelas páginas com a navegação, sem criar uma sessão paralela.
const verificationListeners = new Set();
export function onSessionVerificationFailure(callback) {
  verificationListeners.add(callback);
  return () => verificationListeners.delete(callback);
}
export function reportSessionVerificationFailure(reason) {
  for (const callback of verificationListeners) {
    try { callback(reason); } catch { /* Isola consumidores da interface. */ }
  }
}
