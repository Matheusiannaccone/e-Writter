import { showFeedback, clearFeedback, setProcessing } from '../components/feedback.js';
import { resetPasswordForEmail } from "../services/authService.js";

const form=document.querySelector('#reset-form')
const button=document.querySelector('#reset-button')
const message=document.querySelector('#reset-message');

const showMessage = (text, type = 'error') => showFeedback(message, text, type);

form.addEventListener('submit',async e=>
{
    e.preventDefault();
    clearFeedback(message);
    const email=form.elements.email.value.trim();
    setProcessing(button, true, 'Enviando...');

    try{
        const result=await resetPasswordForEmail({email});

        if(result?.error)
        {
            showMessage(result.error.message||'Não foi possível enviar as instruções.');
            return;
        }
        showMessage('Se houver uma conta associada a esse e-mail, você receberá as instruções de recuperação. Verifique também a caixa de spam.','success');
    }
    catch(err){
        console.error(err);
        showMessage('Não foi possível conectar. Tente novamente.');
    }
    finally
    {
        setProcessing(button, false);
    }
});
for(const a of document.querySelectorAll('[data-page-link]'))
{
    const q=new URLSearchParams(location.search);

    if(q.has('datasource'))a.href+='?'+q.toString();
    }
