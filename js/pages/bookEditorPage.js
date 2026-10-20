import { getCurrentUser, signOut } from "../services/authService.js";

const userButton = document.querySelector("#editor-user-button");
const dropdown = document.querySelector("#editor-user-dropdown");
const logoutButton = document.querySelector("#editor-logout-button");
const userName = document.querySelector("#editor-user-name");
const userEmail = document.querySelector("#editor-user-email");

function showMenu(open) {
  dropdown.hidden = !open;
  userButton.setAttribute("aria-expanded", String(open));
}

async function protectEditor() {
  try {
    const result = await getCurrentUser();
    if (result?.error || !result?.data) {
      window.location.replace("index.html?next=BookEditor.html");
      return;
    }

    const user = result.data;
    userName.textContent = user.user_metadata?.display_name || user.displayName || user.user_metadata?.username || user.username || "Minha conta";
    userEmail.textContent = user.email || "Sessão ativa";
  } catch (error) {
    console.error("Não foi possível verificar a sessão:", error);
    window.location.replace("index.html?next=BookEditor.html");
  }
}

userButton.addEventListener("click", () => {
  showMenu(dropdown.hidden);
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("#editor-user-menu")) showMenu(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") showMenu(false);
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutButton.textContent = "Saindo...";
  try {
    const result = await signOut();
    if (result?.error) {
      logoutButton.disabled = false;
      logoutButton.innerHTML = '<span aria-hidden="true">↪</span> Tentar novamente';
      console.error("Erro ao sair:", result.error);
      return;
    }
    window.location.replace("index.html");
  } catch (error) {
    console.error("Erro ao sair da conta:", error);
    logoutButton.disabled = false;
    logoutButton.innerHTML = '<span aria-hidden="true">↪</span> Tentar novamente';
  }
});

protectEditor();
