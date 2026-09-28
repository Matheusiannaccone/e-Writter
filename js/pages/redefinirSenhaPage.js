import { updatePassword } from '../services/authService.js';
  const form=document.querySelector('#new-password-form'),button=document.querySelector('#save-button'),message=document.querySelector('#new-password-message');

  const showMessage = (text,type='error') => 
  {message.textContent=text;
    message.hidden=false;
    message.dataset.type=type;
}
form.addEventListener('submit',async e=>{
    e.preventDefault();
    message.hidden=true;
    const password=form.elements.password.value
    const confirm=form.elements.confirmPassword.value;
    
    if(password!==confirm)
    {
        showMessage('As senhas não coincidem.');
        return;
    }
    button.disabled=true;
    button.textContent='Salvando...';
    
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
finally{button.disabled=false;
    button.innerHTML='Salvar nova senha <span aria-hidden="true">→</span>';}
});

for(const a of document.querySelectorAll('[data-page-link]')){const q=new URLSearchParams(location.search);if(q.has('datasource'))a.href+='?'+q.toString();}
