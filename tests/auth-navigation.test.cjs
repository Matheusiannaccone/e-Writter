const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const flush = () => new Promise(setImmediate);
const ok = data => ({ data, error: null });
class Node {
  constructor() { this.children=[];this.handlers={};this.dataset={};this.attributes={};this.textContent=''; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children=nodes; }
  setAttribute(k,v) { this.attributes[k]=v; }
  getAttribute(k) { return this.attributes[k]; }
  addEventListener(e,fn) { this.handlers[e]=fn; }
  querySelectorAll(selector) { return this.children.flatMap(n => [n,...n.querySelectorAll(selector)]).filter(n => selector === '[data-session-link]' ? n.private : n.href); }
}
function navHarness(overrides={}) {
 const header=new Node(),nav=new Node();header.append(nav); header.querySelector=()=>nav;
 const privateLink=new Node();privateLink.private=true;nav.append(privateLink);
 const listeners={},events={};let calls=0;
 const context=vm.createContext({URL,URLSearchParams,setTimeout,document:{createElement:()=>new Node()},window:{location:new URL('http://localhost/perfil.html?datasource=mock'),addEventListener:(e,fn)=>{events[e]=fn}},getCurrentUser:async()=>ok({id:'a'}),signOut:async()=>{calls++;return ok(null)},onAuthStateChange:fn=>{listeners.auth=fn},...overrides});
 for(const p of ['session-status','navigation-context','auth-navigation']) vm.runInContext(fs.readFileSync(`js/components/${p}.js`,'utf8').replace(/^import .*;\s*/gm,'').replace(/^export /gm,''),context);
 context.header=header;vm.runInContext('initAuthNavigation(header)',context);
 const host=nav.children.at(-1),actions=host.children[1];
 return {host,actions,privateLink,events,auth:(...args)=>listeners.auth(...args),calls:()=>calls};
}
test('menu de conta verifica sessão, alterna visitante/autenticado e preserva datasource',async()=>{
 const h=navHarness();assert.equal(h.host.dataset.sessionState,'checking');await flush();
 assert.deepEqual(h.actions.children.map(n=>n.textContent),['Perfil','Meus Livros','Sair']);
 assert.equal(h.privateLink.hidden,false);
 assert.ok(h.actions.children.filter(n=>n.href).every(n=>new URL(n.href).searchParams.get('datasource')==='mock'));
 h.auth('SIGNED_OUT',null);assert.deepEqual(h.actions.children.map(n=>n.textContent),['Entrar','Criar conta']);assert.equal(h.privateLink.hidden,true);
 h.auth('SIGNED_IN',{user:{id:'b'}});assert.equal(h.host.dataset.sessionState,'authenticated');
});
test('logout bloqueia duplicação e não anuncia conclusão em erro',async()=>{
 let finish,calls=0;const h=navHarness({signOut:()=>{calls++;return new Promise(r=>{finish=r})}});await flush();
 const click=h.actions.children.at(-1).handlers.click;const pending=click();await click();assert.equal(calls,1);assert.equal(h.actions.children.at(-1).disabled,true);
 finish({error:{code:'NETWORK_ERROR'}});await pending;assert.equal(h.host.dataset.sessionState,'error');assert.equal(h.actions.children[0].textContent,'Tentar sair novamente');
});
test('histórico revalida e resposta anterior não restaura navegação autenticada',async()=>{
 let finish;const h=navHarness({getCurrentUser:()=>new Promise(r=>{finish=r})});
 h.auth('SIGNED_OUT',null);finish(ok({id:'a'}));await flush();assert.equal(h.host.dataset.sessionState,'guest');
 h.events.pagehide();assert.equal(h.host.dataset.sessionState,'checking');h.events.pageshow({persisted:true});finish(ok(null));await flush();assert.equal(h.host.dataset.sessionState,'guest');
});
test('rede na consulta distingue falha de visitante e permite retry',async()=>{
 let fail=true;const h=navHarness({getCurrentUser:async()=>fail?{data:null,error:{code:'NETWORK_ERROR'}}:ok(null)});await flush();assert.equal(h.host.dataset.sessionState,'error');fail=false;await h.actions.children[0].handlers.click();assert.equal(h.host.dataset.sessionState,'guest');
});

test('todas as páginas HTML do MVP usam apenas o header global, sem listas próprias', () => {
  for (const file of fs.readdirSync('.').filter(file => file.endsWith('.html'))) {
    const html = fs.readFileSync(file, 'utf8');
    assert.equal((html.match(/data-site-header/g) || []).length, 1, file);
    assert.match(html, /<header class="site-header" data-site-header><\/header>/, file);
    assert.equal((html.match(/src="\.\/js\/components\/site-layout.js"/g) || []).length, 1, file);
    assert.doesNotMatch(html, /class="user-page-nav"/, file);
  }
  const layout = fs.readFileSync('js/components/site-layout.js', 'utf8');
  assert.match(layout, />Início<\/a>/);
  assert.match(layout, />Ateliê<\/a>/);
  assert.doesNotMatch(layout, />Leitura<\/a>|>Escrever<\/a>/);
});

test('links da conta preservam bookId, datasource e destaque em qualquer header', async () => {
  const h = navHarness({window: {location: new URL('http://localhost/perfil.html?datasource=mock&bookId=obra-123'), addEventListener() {}}});
  await flush();
  for (const link of h.actions.children.filter(node => node.href)) {
    const url = new URL(link.href);
    assert.equal(url.searchParams.get('bookId'), 'obra-123');
    assert.equal(url.searchParams.get('datasource'), 'mock');
    assert.ok(url.pathname.endsWith('.html'));
    assert.equal(link.attributes['aria-current'], link.textContent === 'Perfil' ? 'page' : undefined);
  }
  h.auth('SIGNED_OUT', null);
  for (const link of h.actions.children) assert.equal(new URL(link.href).searchParams.get('bookId'), 'obra-123');
});
