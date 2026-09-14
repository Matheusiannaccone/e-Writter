// services/adapters/mock/authAdapter.js
// Este arquivo contém funções de mock para simular operações de autenticação.
// As funções lançam erros indicando que não foram implementadas.

import { mockUsers, mockProfiles } from "./mockData.js";

let currentUser = null;
let currentSession = null;

const authListeners = [];

function notifyAuthStateChange(event, session) {
  authListeners.forEach((callback) => {
    callback(event, session);
  });
}

export const mockAuthAdapter = {
  async signUp({ email, password, username, displayName }) {
    if (!email || !password || !username || !displayName) {
        return {
        data: null,
        error: {
            code: "VALIDATION_ERROR",
            message: "Preencha todos os campos obrigatórios."
        }
        };
    }

    if (password.length < 6) {
        return {
        data: null,
        error: {
            code: "VALIDATION_ERROR",
            message: "A senha deve conter pelo menos 6 caracteres."
        }
        };
    }

    if (username.length < 3 || username.length > 30) {
        return {
        data: null,
        error: {
            code: "VALIDATION_ERROR",
            message: "O nome de usuário deve conter entre 3 e 30 caracteres."
        }
        };
    }

    if (username !== username.trim()) {
        return {
        data: null,
        error: {
            code: "VALIDATION_ERROR",
            message: "O nome de usuário não pode começar ou terminar com espaços."
        }
        };
    }

    if (username !== username.toLowerCase()) {
        return {
        data: null,
        error: {
            code: "VALIDATION_ERROR",
            message: "O nome de usuário deve usar apenas letras minúsculas."
        }
        };
    }

    if (!/^[a-z0-9._]+$/.test(username)) {
        return {
        data: null,
        error: {
            code: "VALIDATION_ERROR",
            message: "O nome de usuário contém caracteres inválidos."
        }
        };
    }

    if (displayName !== displayName.trim()) {
        return {
        data: null,
        error: {
            code: "VALIDATION_ERROR",
            message: "O nome de exibição não pode começar ou terminar com espaços."
        }
        };
    }

    if (displayName.length > 60) {
        return {
        data: null,
        error: {
            code: "VALIDATION_ERROR",
            message: "O nome de exibição deve conter no máximo 60 caracteres."
        }
        };
    }

    const emailExists = mockUsers.some(
        (user) => user.email === email
    );

    if (emailExists) {
        return {
        data: null,
        error: {
            code: "CONFLICT",
            message: "O e-mail já está em uso."
        }
        };
    }

    const usernameExists = mockProfiles.some(
        (profile) => profile.username === username
    );

    if (usernameExists) {
        return {
        data: null,
        error: {
            code: "CONFLICT",
            message: "O nome de usuário já está em uso."
        }
        };
    }

    const newUser = {
        id: `mock-user-${mockUsers.length + 1}`,
        email,
        password,
        username,
        displayName
    };

    mockUsers.push(newUser);

    // Simula o trigger que cria o profile após o cadastro.
    const now = new Date().toISOString();

    mockProfiles.push({
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.displayName,
        bio: null,
        avatarPath: null,
        createdAt: now,
        updatedAt: now
    });

    currentUser = {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        displayName: newUser.displayName
    };

    currentSession = {
        user: currentUser
    };

    notifyAuthStateChange("SIGNED_IN", currentSession);

    return {
        data: currentSession,
        error: null
    };
},

  async signIn({ email, password }) {
    const user = mockUsers.find(
        (item) => item.email === email && item.password === password
    );

    if (!user) {
        return {
            data: null,
            error: {
                code: "UNAUTHENTICATED",
                message: "E-mail ou senha inválidos"
            }
        };
    }

    currentUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName
    };

    currentSession = {
        user: currentUser
    };

    notifyAuthStateChange("SIGNED_IN", currentSession);

    return {
        data: currentSession,
        error: null
    };
},

  async signOut() {
    currentUser = null;
    currentSession = null;

    notifyAuthStateChange("SIGNED_OUT", null);

    return {
        data: null,
        error: null
    };
  },

  async getSession() {
    return {
        data: currentSession,
        error: null
    }
  },

  async getCurrentUser() {
    if (!currentUser) {
        return {
            data: null,
            error: {
                code: "UNAUTHENTICATED",
                message: "Nenhuma sessão autenticada encontrada."
            }
        };
    }

    return {
        data: currentUser,
        error: null
    };
  },

  onAuthStateChange(callback) {
    authListeners.push(callback);

    return {
        data: {
            subscription: {
                unsubscribe() {
                  const index = authListeners.indexOf(callback);

                  if (index !== -1) {
                    authListeners.splice(index, 1);
                  }
                }
            }
        }
    }
  }
};