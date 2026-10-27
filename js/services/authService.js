/**
 * Fachada de autenticação usada pelas páginas e pelos componentes de sessão.
 * Encaminha chamadas ao adapter selecionado por dataSource, sem transformar respostas.
 * Erros retornados e exceções do adapter continuam sob responsabilidade do consumidor.
 */
import { getAuthAdapter } from "./dataSource.js";

/**
 * Cadastra a conta e encaminha os metadados usados para criar o perfil.
 * @param {{email: string, password: string, username: string, displayName: string}} data - Dados da conta.
 * @returns {Promise<{data: object|null, error: object|null}>} Dados de cadastro; a sessão pode ser nula quando há confirmação por e-mail.
 */
export async function signUp({ email, password, username, displayName }) {
  return getAuthAdapter().signUp({
    email,
    password,
    username,
    displayName
  });
}

/**
 * Inicia a sessão; o conteúdo de data segue o adapter ativo.
 * @param {{email: string, password: string}} credentials - Credenciais informadas no formulário.
 * @returns {Promise<{data: object|null, error: object|null}>} Sessão Mock ou resposta de login do Supabase.
 */
export async function signIn({ email, password }) {
  return getAuthAdapter().signIn({
    email,
    password
  });
}

/**
 * Solicita o encerramento da sessão. O consumidor deve verificar error antes de anunciar sucesso.
 * @returns {Promise<{data: null, error: object|null}>} Resultado da tentativa de saída.
 */
export async function signOut() {
  return getAuthAdapter().signOut();
}

/**
 * Consulta a sessão disponibilizada pelo adapter, inclusive ausência de sessão sem erro.
 * @returns {Promise<{data: object|null, error: object|null}>} Sessão atual ou null.
 */
export async function getSession() {
  return getAuthAdapter().getSession();
}

/**
 * Consulta a identidade atual para os fluxos que exigem usuário autenticado.
 * @returns {Promise<{data: object|null, error: object|null}>} Usuário ou erro, incluindo UNAUTHENTICATED.
 */
export async function getCurrentUser() {
  return getAuthAdapter().getCurrentUser();
}

/**
 * Assina eventos de autenticação. A inscrição retornada permite chamar unsubscribe.
 * @param {function(string, object|null): void} callback - Recebe evento e sessão.
 * @returns {{data: {subscription: {unsubscribe: function(): void}}}} Inscrição fornecida pelo adapter.
 */
export function onAuthStateChange(callback) {
  return getAuthAdapter().onAuthStateChange(callback);
}
/**
 * Solicita recuperação; no Mock apenas simula o envio, sem consultar a existência da conta.
 * @param {{email: string}} data - Endereço de recuperação.
 * @returns {Promise<{data: object|null, error: object|null}>} Resultado do envio ou da simulação.
 */
export async function resetPasswordForEmail({ email }) {
  return getAuthAdapter().resetPasswordForEmail({ email });
}

/**
 * Consulta a sessão aceita pelo fluxo de redefinição de senha do adapter.
 * @returns {Promise<{data: object|null, error: object|null}>} Sessão válida ou erro de recuperação.
 */
export async function getPasswordRecoverySession() {
  return getAuthAdapter().getPasswordRecoverySession();
}

/**
 * Encaminha a nova senha; o adapter valida a senha e a sessão de recuperação.
 * @param {{password: string}} data - Nova senha.
 * @returns {Promise<{data: object|null, error: object|null}>} Usuário atualizado ou erro.
 */
export async function updatePassword({ password }) {
  return getAuthAdapter().updatePassword({ password });
}
