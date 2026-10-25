import { showFeedback, clearFeedback, setProcessing, prepareFormValidation } from "../components/feedback.js";
import { getCurrentUser } from "../services/authService.js";
import { withDataSource } from "../components/navigation-context.js";
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
let busy = false;
const retryButton = document.querySelector('#profile-retry');
const fields = [displayNameInput, usernameInput, bioInput];
const validation = prepareFormValidation(profileForm, profileMessage, {
  displayName: value => value.trim().length < 1 || value.trim().length > 60 ? 'O nome de exibição deve ter entre 1 e 60 caracteres.' : '',
  username: value => /^[a-z0-9._]{3,30}$/.test(value.trim().toLowerCase()) ? '' : 'Use 3 a 30 caracteres: letras, números, ponto ou sublinhado.',
  bio: value => value.length > 500 ? 'A biografia deve conter no máximo 500 caracteres.' : ''
});

function lock(locked) {
  fields.forEach(field => { field.disabled = locked; });
  saveButton.disabled = locked;
  cancelButton.disabled = locked;
}

function loadFailure(text) {
  profileName.textContent = 'Perfil indisponível';
  profileEmail.textContent = 'Não foi possível carregar as informações.';
  detailEmail.textContent = 'Indisponível';
  showMessage(text);
  retryButton.hidden = false;
}

function showMessage(message, type = "error") {
  showFeedback(profileMessage, message, type);
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
  if (busy) return;
  busy = true;
  lock(true);
  retryButton.hidden = true;
  retryButton.disabled = true;
  showMessage("Carregando informações do perfil...", "loading");
  try {
    const [userResult, profileResult] = await Promise.all([
      getCurrentUser(),
      getMyProfile()
    ]);

    if (userResult?.error?.code === 'UNAUTHENTICATED' || (!userResult?.error && !userResult?.data)) {
      profileName.textContent = 'Sessão encerrada';
      profileEmail.textContent = 'Entre para acessar seu perfil.';
      detailEmail.textContent = 'Indisponível';
      clearFeedback(profileMessage);
      window.location.replace(withDataSource("./login.html?next=perfil.html").href);
      return;
    }

    if (userResult?.error) {
      loadFailure(userResult.error.message || 'Não foi possível verificar sua sessão. Tente novamente.');
      return;
    }

    if (profileResult?.error || !profileResult?.data) {
      loadFailure(
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

    clearFeedback(profileMessage);
  } catch (error) {
    console.error("Não foi possível carregar o perfil:", error);
    loadFailure("Não foi possível carregar seu perfil. Verifique a conexão e tente novamente.");
  } finally {
    busy = false;
    retryButton.disabled = false;
    lock(!savedProfile);
  }
}

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy || !savedProfile || !validation.validate()) return;

  const data = {
    displayName: displayNameInput.value.trim(),
    username: usernameInput.value.trim().toLowerCase(),
    bio: bioInput.value.trim()
  };

  busy = true;
  lock(true);
  setProcessing(saveButton, true, "Salvando...");
  showMessage("Salvando alterações...", "loading");

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

    showMessage("Perfil atualizado com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao salvar o perfil:", error);
    showMessage("Ocorreu um erro ao salvar. Tente novamente.");
  } finally {
    busy = false;
    setProcessing(saveButton, false);
    lock(false);
  }
});

cancelButton.addEventListener("click", () => {
  if (busy || !savedProfile) return;
  validation.clear();

  fillForm(savedProfile);
  showMessage("Alterações não salvas foram descartadas.", "warning");
});

retryButton.addEventListener("click", async () => {
  await loadProfile();
  if (savedProfile) displayNameInput.focus();
  else if (!retryButton.hidden) retryButton.focus();
});
loadProfile();
