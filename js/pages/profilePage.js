
import { getCurrentUser } from "../services/authService.js";

const profileName = document.querySelector("#profile-name");
const profileEmail = document.querySelector("#profile-email");
const displayName = document.querySelector("#profile-display-name");
const detailEmail = document.querySelector("#profile-detail-email");
const profileMessage = document.querySelector("#profile-message");

async function loadProfile() {
  try {
    const result = await getCurrentUser();

    if (result?.error || !result?.data) {
      window.location.replace("../index.html?next=pages/perfil.html");
      return;
    }

    const user = result.data;

    const name =
      user.user_metadata?.display_name ||
      user.displayName ||
      user.user_metadata?.username ||
      user.username ||
      "Leitor do E-writter";

    const email = user.email || "E-mail não informado";

    profileName.textContent = name;
    profileEmail.textContent = email;
    displayName.textContent = name;
    detailEmail.textContent = email;
    profileMessage.textContent =
      "Estas informações foram carregadas a partir da sua sessão.";
  } catch (error) {
    console.error("Não foi possível carregar o perfil:", error);
    profileName.textContent = "Não foi possível carregar o perfil";
    profileEmail.textContent = "";
    profileMessage.textContent =
      "Ocorreu um erro ao consultar sua conta. Tente entrar novamente.";
  }
}

loadProfile();
