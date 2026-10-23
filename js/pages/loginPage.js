import { showFeedback, clearFeedback, setFieldError, setProcessing } from '../components/feedback.js';
import { signIn } from "../services/authService.js";

    const form = document.querySelector("#login-form");
    const emailInput = document.querySelector("#email");
    const passwordInput = document.querySelector("#password");
    const submitButton = document.querySelector("#login-button");
    const message = document.querySelector("#login-message");

    function showMessage(text, type = "error") { showFeedback(message, text, type); }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearFeedback(message);

      setFieldError(emailInput, "");
      setFieldError(passwordInput, "");
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        setFieldError(emailInput, email ? "" : "Informe seu e-mail.");
        setFieldError(passwordInput, password ? "" : "Informe sua senha.");
        showMessage("Preencha o e-mail e a senha.");
        return;
      }

      setProcessing(submitButton, true, "Entrando...");

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
        setProcessing(submitButton, false);
      }
    });
