/**
 * Controla validação e envio das credenciais por authService.
 * Após sucesso, navega para a biblioteca preservando a fonte da página.
 */
import { showFeedback, setProcessing, prepareFormValidation } from '../components/feedback.js';
import { signIn } from "../services/authService.js";
import { withDataSource, preserveDataSource } from "../components/navigation-context.js";

preserveDataSource(document.querySelectorAll('a[href]'));

    const form = document.querySelector("#login-form");
    const emailInput = document.querySelector("#email");
    const passwordInput = document.querySelector("#password");
    const submitButton = document.querySelector("#login-button");
    const message = document.querySelector("#login-message");

    const validation = prepareFormValidation(form, message);

    function showMessage(text, type = "error") { showFeedback(message, text, type); }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submitButton.disabled || !validation.validate()) return;

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      setProcessing(submitButton, true, "Entrando...");
      showMessage("Entrando na biblioteca...", "loading");

      try {
        const result = await signIn({ email, password });

        if (result?.error) {
          showMessage(result.error.message || "Não foi possível entrar. Confira seus dados.");
          return;
        }

        // A navegação conclui o login; não anunciar sucesso fugaz antes de sair.
        window.location.assign(withDataSource("./biblioteca.html").href);
      } catch (error) {
        console.error("Erro ao realizar login:", error);
        showMessage("Não foi possível conectar. Verifique sua conexão e tente novamente.");
      } finally {
        setProcessing(submitButton, false);
      }
    });
