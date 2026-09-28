import { resetPasswordForEmail } from "../services/authService.js";

const form=document.querySelector('#reset-form')
const button=document.querySelector('#reset-button')
const message=document.querySelector('#reset-message');

const showMessage = (text,type='error') => 
{
    message.textContent=text;
    message.hidden=false;
    message.dataset.type=type;
}

form.addEventListener('submit',async e=>
{
    e.preventDefault();
    message.hidden=true;
    const email=form.elements.email.value.trim();
    button.disabled=true;
    button.textContent='Enviando...';
    
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
        button.disabled=false;button.innerHTML='Enviar instruções <span aria-hidden="true">→</span>';
    }
});
for(const a of document.querySelectorAll('[data-page-link]'))
{
    const q=new URLSearchParams(location.search);
    
    if(q.has('datasource'))a.href+='?'+q.toString();
    }
