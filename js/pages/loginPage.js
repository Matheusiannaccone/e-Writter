import { signIn } from "../services/authService.js";

    const form = document.querySelector("#login-form");
    const emailInput = document.querySelector("#email");
    const passwordInput = document.querySelector("#password");
    const submitButton = document.querySelector("#login-button");
    const message = document.querySelector("#login-message");

    function showMessage(text, type = "error") {
      message.textContent = text;
      message.hidden = false;
      message.dataset.type = type;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      message.hidden = true;
      message.textContent = "";

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        showMessage("Preencha o e-mail e a senha.");
        return;
      }

      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
      submitButton.textContent = "Entrando...";

      try {
        const result = await signIn({ email, password });

        if (result?.error) {
          showMessage(result.error.message || "Não foi possível entrar. Confira seus dados.");
          return;
        }

        showMessage("Login realizado com sucesso! Sua sessão está ativa.", "success");
        // Quando a página principal da biblioteca estiver pronta, redirecione aqui.
        // Exemplo: window.location.href = "pages/biblioteca.html";
      } catch (error) {
        console.error("Erro ao realizar login:", error);
        showMessage("Não foi possível conectar. Verifique sua conexão e tente novamente.");
      } finally {
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
        submitButton.innerHTML = 'Entrar na biblioteca <span aria-hidden="true">→</span>';
      }
    });
