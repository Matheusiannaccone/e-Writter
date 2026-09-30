import { getAuthAdapter } from "./dataSource.js";

export async function signUp({ email, password, username, displayName }) {
  return getAuthAdapter().signUp({
    email,
    password,
    username,
    displayName
  });
}

export async function signIn({ email, password }) {
  return getAuthAdapter().signIn({
    email,
    password
  });
}

export async function signOut() {
  return getAuthAdapter().signOut();
}

export async function getSession() {
  return getAuthAdapter().getSession();
}

export async function getCurrentUser() {
  return getAuthAdapter().getCurrentUser();
}

export function onAuthStateChange(callback) {
  return getAuthAdapter().onAuthStateChange(callback);
}
export async function resetPasswordForEmail({ email }) {
  return getAuthAdapter().resetPasswordForEmail({ email });
}
