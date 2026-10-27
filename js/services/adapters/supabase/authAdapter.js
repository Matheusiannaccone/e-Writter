/**
 * Adapta Supabase Auth ao contrato de authService e normaliza erros conhecidos.
 * Metadados de cadastro alimentam o trigger de profiles; o SDK gerencia a sessão.
 * A recuperação usa a sessão inicializada pelo SDK e informa problemas de redirect/expiração.
 */
import { supabase } from "../../supabaseClient.js";

/**
 * Traduz códigos/status do SDK para categorias de feedback do frontend.
 * Falhas sem classificação conhecida preservam um erro genérico, sem expor detalhes do servidor.
 * @param {object|null} error - Erro retornado ou capturado do SDK.
 * @returns {{code: string, message: string}|null} Erro normalizado ou null em sucesso.
 */
function normalizeAuthError(error) {
  if (!error) {
    return null;
  }

  const message = error.message?.toLowerCase() ?? "";

  if (error.code === 'over_email_send_rate_limit') {
    return { code: 'RATE_LIMIT', message: 'O limite de envio de e-mails foi atingido. Aguarde antes de solicitar novamente.' };
  }
  if (error.status === 429 || error.code === 'over_request_rate_limit') {
    return { code: 'RATE_LIMIT', message: 'Muitas solicitações em pouco tempo. Aguarde antes de tentar novamente.' };
  }

  if (error.name === "AuthRetryableFetchError" || message.includes("network") || message.includes("fetch")) {
    return { code: "NETWORK_ERROR", message: "Não foi possível conectar ao servidor. Tente novamente." };
  }

  if (["otp_expired", "session_expired", "refresh_token_not_found", "refresh_token_already_used", "bad_jwt"].includes(error.code) ||
      message.includes("expired") || message.includes("invalid token")) {
    return { code: "UNAUTHENTICATED", message: "Sessão inválida ou expirada. Entre novamente." };
  }

  if (["weak_password", "same_password"].includes(error.code)) {
    return { code: "VALIDATION_ERROR", message: "Use uma senha diferente da anterior, com pelo menos 6 caracteres e que atenda aos requisitos de segurança." };
  }

  if (error.code === 'invalid_credentials' || message.includes("invalid login credentials")) {
    return {
      code: "UNAUTHENTICATED",
      message: "E-mail ou senha inválidos."
    };
  }

  if (message.includes("auth session missing")) {
    return {
      code: "UNAUTHENTICATED",
      message: "Nenhuma sessão autenticada encontrada."
    };
  }

  if (
    ['email_exists', 'user_already_exists'].includes(error.code) ||
    message.includes("user already registered") ||
    message.includes("already registered")
  ) {
    return {
      code: "CONFLICT",
      message: "Este e-mail já está em uso."
    };
  }

  if (error.code === 'email_address_invalid') {
    return { code: 'VALIDATION_ERROR', message: 'Informe um e-mail válido.' };
  }
  if (error.code === 'email_address_not_authorized') {
    return { code: 'EMAIL_NOT_AUTHORIZED', message: 'O serviço de e-mail não permite enviar para este endereço. Entre em contato com o suporte.' };
  }
  if (['email_provider_disabled', 'signup_disabled'].includes(error.code)) {
    return { code: 'AUTH_UNAVAILABLE', message: 'Esta operação está indisponível no momento. Entre em contato com o suporte.' };
  }
  if (error.code === 'email_not_confirmed') {
    return { code: 'UNAUTHENTICATED', message: 'Confirme seu e-mail antes de entrar.' };
  }
  if (error.code === 'unexpected_failure' || error.status >= 500) {
    return { code: 'UNKNOWN_ERROR', message: 'O serviço não conseguiu concluir a solicitação. Tente novamente mais tarde.' };
  }

  if (
    message.includes("password") ||
    message.includes("email") ||
    message.includes("validation")
  ) {
    return {
      code: "VALIDATION_ERROR",
      message: "Os dados informados são inválidos."
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "Ocorreu um erro inesperado."
  };
}

function normalizeRecoveryError(error) {
  const normalized = normalizeAuthError(error);
  return normalized?.code === 'UNAUTHENTICATED'
    ? { code: 'INVALID_RECOVERY_LINK', message: 'Link inválido ou expirado. Solicite um novo link de recuperação.' }
    : normalized;
}

async function normalizeSignUpError(error, username) {
  if (!error) return null;
  const conflict = { code: 'CONFLICT', message: 'Este nome de usuário já está em uso. Escolha outro username.' };
  const detail = [error.message, error.details, error.constraint].filter(Boolean).join(' ');
  if (error.code === '23505' && /\bprofiles_username_key\b/.test(detail)) return conflict;

  // Auth oculta o SQLSTATE do trigger como unexpected_failure/HTTP 500.
  // O erro genérico sozinho não comprova duplicidade: confirmar no perfil público.
  if ((error.code === 'unexpected_failure' || error.status === 500) &&
      error.message === 'Database error saving new user') {
    try {
      const { data, error: lookupError } = await supabase.from('profiles')
        .select('username').eq('username', username).maybeSingle();
      if (!lookupError && data?.username === username) return conflict;
    } catch { /* Preservar o erro original se a consulta não puder confirmar. */ }
  }
  return normalizeAuthError(error);
}

export const supabaseAuthAdapter = {
  async signUp({ email, password, username, displayName }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName
        }
      }
    });

    const normalizedError = await normalizeSignUpError(error, username);

    if (normalizedError) {
      return {
        data: null,
        error: normalizedError
      };
    }

    return {
      data,
      error: null
    };
  },

  /**
   * Monta o redirect de redefinição no mesmo diretório e solicita o envio uma única vez.
   * @param {{email: string}} data - Endereço a encaminhar ao Auth.
   * @returns {Promise<{data: object|null, error: object|null}>} Resposta de envio ou erro normalizado.
   */
  async resetPasswordForEmail({ email }) {
    const redirect = new URL("redefinir-senha.html", window.location.href);
    if (new URLSearchParams(window.location.search).has("datasource")) redirect.searchParams.set("datasource", "supabase");
    const redirectTo = redirect.href;
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      const normalizedError = normalizeAuthError(error);
      return normalizedError ? { data: null, error: normalizedError } : { data, error: null };
    } catch (error) {
      return { data: null, error: normalizeAuthError(error) };
    }
  },

  /**
   * Rejeita erros na URL e exige sessão não expirada após a inicialização do SDK.
   * A implementação aceita a sessão existente; não exige uma marca adicional de tipo recovery.
   * @returns {Promise<{data: object|null, error: object|null}>} Sessão aceita ou erro de recuperação.
   */
  async getPasswordRecoverySession() {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    if (hash.has("error") || hash.has("error_code") || query.has("error") || query.has("error_code")) {
      return { data: null, error: { code: "INVALID_RECOVERY_LINK", message: "Link inválido ou expirado. Solicite um novo link de recuperação." } };
    }
    // getSession aguarda a inicialização do SDK e a sessão do redirect de recuperação.
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { data: null, error: normalizeRecoveryError(error) };
    }
    if (!data?.session || (data.session.expires_at && data.session.expires_at * 1000 <= Date.now())) {
      return { data: null, error: { code: "INVALID_RECOVERY_LINK", message: "Link inválido ou expirado. Solicite um novo link de recuperação." } };
    }
    return { data: data.session, error: null };
  },

  async updatePassword({ password }) {
    if (typeof password !== "string" || password.length < 6) {
      return { data: null, error: { code: "VALIDATION_ERROR", message: "A senha deve conter pelo menos 6 caracteres." } };
    }
    const recovery = await this.getPasswordRecoverySession();
    if (recovery.error) return recovery;
    const { data, error } = await supabase.auth.updateUser({ password });
    const normalized = normalizeRecoveryError(error);
    return normalized ? { data: null, error: normalized } : { data: data.user, error: null };
  },

  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    const normalizedError = normalizeAuthError(error);

    if (normalizedError) {
      return {
        data: null,
        error: normalizedError
      };
    }

    return {
      data,
      error: null
    };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();

    return {
      data: null,
      error: normalizeAuthError(error)
    };
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();

    return {
      data: data.session,
      error: normalizeAuthError(error)
    };
  },

  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();

    return {
      data: data.user,
      error: normalizeAuthError(error)
    };
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }
};
