import { showFeedback, clearFeedback, setFieldError, setProcessing } from '../components/feedback.js';
import { updatePassword } from '../services/authService.js';
  const form=document.querySelector('#new-password-form'),button=document.querySelector('#save-button'),message=document.querySelector('#new-password-message');

  const showMessage = (text, type = 'error') => showFeedback(message, text, type);

form.addEventListener('submit',async e=>{
    e.preventDefault();
    clearFeedback(message);
    setFieldError(form.elements.confirmPassword, '');
    const password=form.elements.password.value
    const confirm=form.elements.confirmPassword.value;

    if(password!==confirm)
    {
        setFieldError(form.elements.confirmPassword, 'As senhas não coincidem.');
        showMessage('As senhas não coincidem.');
        return;
    }
    setProcessing(button, true, 'Salvando...');

    try{const result = await updatePassword({ password });
    if (result?.error) {
        showMessage(result.error.message || 'Não foi possível alterar a senha. Abra novamente o link recebido por e-mail.');
        return;
    }
    showMessage('Senha alterada com sucesso! Você já pode entrar com a nova senha.','success');
    form.reset();
}catch(err){
    console.error(err);showMessage('Não foi possível conectar. Abra novamente o link de recuperação.');
}
finally{setProcessing(button, false);}
});

for(const a of document.querySelectorAll('[data-page-link]')){const q=new URLSearchParams(location.search);if(q.has('datasource'))a.href+='?'+q.toString();}
