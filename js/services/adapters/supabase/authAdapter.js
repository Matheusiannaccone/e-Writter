// services/adapters/supabase/authAdapter.js
// Este arquivo contém funções para operações de autenticação usando Supabase.
// As funções lançam erros indicando que não foram implementadas.

import { supabase } from "../../supabaseClient.js";

function normalizeAuthError(error) {
  if (!error) {
    return null;
  }

  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("invalid login credentials")) {
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
    message.includes("user already registered") ||
    message.includes("already registered")
  ) {
    return {
      code: "CONFLICT",
      message: "Este e-mail já está em uso."
    };
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

  if (
    message.includes("network") ||
    message.includes("fetch")
  ) {
    return {
      code: "NETWORK_ERROR",
      message: "Não foi possível conectar ao servidor."
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "Ocorreu um erro inesperado."
  };
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