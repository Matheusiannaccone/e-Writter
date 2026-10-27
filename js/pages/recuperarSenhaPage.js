import { showFeedback, setProcessing, prepareFormValidation } from '../components/feedback.js';
import { resetPasswordForEmail } from "../services/authService.js";
import { isValidEmail } from '../validation/email.js';

const form=document.querySelector('#reset-form')
const button=document.querySelector('#reset-button')
const message=document.querySelector('#reset-message');

const showMessage = (text, type = 'error') => showFeedback(message, text, type);

const validation = prepareFormValidation(form, message, {
    email: value => isValidEmail(value) ? '' : 'Informe um e-mail válido.'
});

form.addEventListener('submit',async e=>
{
    e.preventDefault();
    if (button.disabled || !validation.validate()) return;
    const email=form.elements.email.value.trim();
    setProcessing(button, true, 'Enviando...');
    showMessage('Enviando instruções...', 'loading');

    try{
        const result=await resetPasswordForEmail({email});

        if(result?.error)
        {
            showMessage(result.error.message||'Não foi possível enviar as instruções.');
            return;
        }
        showMessage(result.data?.message || 'Se houver uma conta associada a esse e-mail, você receberá as instruções de recuperação. Verifique também a caixa de spam.','success');
    }
    catch(err){
        console.error(err);
        const networkFailure = err?.name === 'AuthRetryableFetchError' || /network|fetch/i.test(err?.message || '');
        showMessage(networkFailure
            ? 'Não foi possível conectar ao servidor. Tente novamente.'
            : 'Não foi possível enviar as instruções. Tente novamente mais tarde.');
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
