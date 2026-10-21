
import { getCurrentUser } from "../services/authService.js";
import {
  getMyProfile,
  updateMyProfile
} from "../services/profileService.js";

const profileName = document.querySelector("#profile-name");
const profileEmail = document.querySelector("#profile-email");
const detailEmail = document.querySelector("#profile-detail-email");
const profileMessage = document.querySelector("#profile-message");

const profileForm = document.querySelector("#profile-form");
const displayNameInput = document.querySelector("#profile-display-name-input");
const usernameInput = document.querySelector("#profile-username-input");
const bioInput = document.querySelector("#profile-bio-input");
const saveButton = document.querySelector("#profile-save-button");
const cancelButton = document.querySelector("#profile-cancel-button");

let savedProfile = null;

function showMessage(message) {
  profileMessage.textContent = message;
}

function fillForm(profile) {
  displayNameInput.value = profile.displayName || "";
  usernameInput.value = profile.username || "";
  bioInput.value = profile.bio || "";
}

function updateProfileHeader(profile, email) {
  const name = profile.displayName || profile.username || "Leitor do E-writter";

  profileName.textContent = name;
  profileEmail.textContent = email || "E-mail não informado";
  detailEmail.textContent = email || "E-mail não informado";
}

async function loadProfile() {
  try {
    const [userResult, profileResult] = await Promise.all([
      getCurrentUser(),
      getMyProfile()
    ]);

    if (userResult?.error || !userResult?.data) {
      window.location.replace("../index.html?next=pagesHTML/perfil.html");
      return;
    }

    if (profileResult?.error || !profileResult?.data) {
      showMessage(
        profileResult?.error?.message ||
        "Não foi possível carregar os dados do perfil."
      );
      return;
    }

    const user = userResult.data;
    const profile = profileResult.data;
    const email = user.email || "E-mail não informado";

    savedProfile = {
      displayName: profile.displayName || "",
      username: profile.username || "",
      bio: profile.bio || ""
    };

    fillForm(savedProfile);
    updateProfileHeader(savedProfile, email);

    showMessage("Suas informações estão prontas para edição.");
  } catch (error) {
    console.error("Não foi possível carregar o perfil:", error);
    showMessage("Ocorreu um erro ao carregar seu perfil.");
  }
}

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = {
    displayName: displayNameInput.value.trim(),
    username: usernameInput.value.trim().toLowerCase(),
    bio: bioInput.value.trim()
  };

  if (data.displayName.length < 1 || data.displayName.length > 60) {
    showMessage("O nome de exibição deve ter entre 1 e 60 caracteres.");
    displayNameInput.focus();
    return;
  }

  if (
    data.username.length < 3 ||
    data.username.length > 30 ||
    !/^[a-z0-9._]+$/.test(data.username)
  ) {
    showMessage(
      "O nome de usuário deve ter entre 3 e 30 caracteres e usar apenas letras sem acento, números, ponto ou sublinhado."
    );
    usernameInput.focus();
    return;
  }

  if (data.bio.length > 500) {
    showMessage("A biografia deve conter no máximo 500 caracteres.");
    bioInput.focus();
    return;
  }

  saveButton.disabled = true;
  showMessage("Salvando alterações...");

  try {
    const result = await updateMyProfile(data);

    if (result?.error || !result?.data) {
      showMessage(
        result?.error?.message ||
        "Não foi possível salvar as alterações."
      );
      return;
    }

    savedProfile = {
      displayName: result.data.displayName || "",
      username: result.data.username || "",
      bio: result.data.bio || ""
    };

    fillForm(savedProfile);
    updateProfileHeader(
      savedProfile,
      detailEmail.textContent
    );

    showMessage("Perfil atualizado com sucesso!");
  } catch (error) {
    console.error("Erro ao salvar o perfil:", error);
    showMessage("Ocorreu um erro ao salvar. Tente novamente.");
  } finally {
    saveButton.disabled = false;
  }
});

cancelButton.addEventListener("click", () => {
  if (!savedProfile) return;

  fillForm(savedProfile);
  showMessage("Alterações não salvas foram descartadas.");
});

loadProfile();
