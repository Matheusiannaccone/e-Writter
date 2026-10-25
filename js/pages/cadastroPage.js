import { showFeedback, setProcessing, prepareFormValidation } from '../components/feedback.js';
import { signUp } from "../services/authService.js";

const form=document.querySelector('#signup-form')

const button=document.querySelector('#signup-button'), message=document.querySelector('#signup-message');

const showMessage = (text, type = 'error') => showFeedback(message, text, type);

const validation = prepareFormValidation(form, message, {
  displayName: value => value.trim().length < 1 ? 'Informe seu nome de exibição.' : '',
  username: value => /^[a-z0-9._]{3,30}$/.test(value) ? '' : 'Use 3 a 30 caracteres: letras minúsculas, números, ponto ou sublinhado.',
  passwordConfirm: value => value === form.elements.password.value ? '' : 'As senhas não coincidem.'
});

form.addEventListener('submit',async e=>{
  e.preventDefault();
  if (button.disabled || !validation.validate()) return;

 const displayName = form.elements.displayName.value.trim()
 const username=form.elements.username.value.trim()
 const email=form.elements.email.value.trim()
 const password=form.elements.password.value
 setProcessing(button, true, 'Criando conta...');
 showMessage('Criando sua conta...', 'loading');

   try{
    const result=await signUp({email,password,username,displayName});

    if(result?.error){
      showMessage(result.error.message||'Não foi possível criar a conta.');
      return;
    }

 showMessage(result.data?.session ? 'Conta criada! Sua sessão está ativa. Você já pode acessar a biblioteca.' : 'Cadastro recebido. Verifique seu e-mail para confirmar a conta antes de entrar.', 'success');

 }
 catch(err)
 {
  console.error(err);
  showMessage('Não foi possível conectar. Tente novamente.');
}

finally{setProcessing(button, false);}

});

for(const a of document.querySelectorAll('[data-page-link]')){const q=new URLSearchParams(location.search);if(q.has('datasource'))a.href+='?'+q.toString();}
