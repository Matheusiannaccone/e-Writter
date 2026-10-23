import { showFeedback, clearFeedback, setFieldError, setProcessing } from '../components/feedback.js';
import { signUp } from "../services/authService.js";

const form=document.querySelector('#signup-form')

const button=document.querySelector('#signup-button'), message=document.querySelector('#signup-message');

const showMessage = (text, type = 'error') => showFeedback(message, text, type);

form.addEventListener('submit',async e=>{
  e.preventDefault();
  clearFeedback(message);

 setFieldError(form.elements.passwordConfirm, '');
 setFieldError(form.elements.username, '');
 const displayName = form.elements.displayName.value.trim()
 const username=form.elements.username.value.trim()
 const email=form.elements.email.value.trim()
 const password=form.elements.password.value
 const confirm=form.elements.passwordConfirm.value;

 if(password!==confirm){
  setFieldError(form.elements.passwordConfirm, 'As senhas não coincidem.');
  showMessage('As senhas não coincidem.');
  return;
}

 if(username!==username.toLowerCase()||!/^[a-z0-9._]{3,30}$/.test(username))
 {
  setFieldError(form.elements.username, 'Use 3 a 30 caracteres: letras minúsculas, números, ponto ou sublinhado.');
  showMessage('Confira o nome de usuário.');
  return;
}

 setProcessing(button, true, 'Criando conta...');

   try{
    const result=await signUp({email,password,username,displayName});

    if(result?.error){
      showMessage(result.error.message||'Não foi possível criar a conta.');
      return;
    }

 showMessage('Conta criada com sucesso!', 'success');

 }
 catch(err)
 {
  console.error(err);
  showMessage('Não foi possível conectar. Tente novamente.');
}

finally{setProcessing(button, false);}

});

for(const a of document.querySelectorAll('[data-page-link]')){const q=new URLSearchParams(location.search);if(q.has('datasource'))a.href+='?'+q.toString();}
