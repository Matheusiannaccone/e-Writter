/**
 * Validação de sintaxe e ligação dos imports de todos os módulos da pasta js.
 * Um subprocesso usa SourceTextModule; o import do SDK remoto recebe um módulo sintético
 * e os módulos são ligados sem avaliar a aplicação ou realizar chamadas de rede.
 */
const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
test('todos os módulos JavaScript têm sintaxe válida e imports locais resolvíveis sem rede', () => {
  execFileSync(process.execPath, ['--experimental-vm-modules', '--no-warnings', '-e', `
    const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
    const context=vm.createContext({}),cache=new Map();
    function moduleFor(file){
      if(cache.has(file)) return cache.get(file);
      const module=file.startsWith('https:') ? new vm.SyntheticModule(['createClient'],function(){this.setExport('createClient',()=>({}));},{context,identifier:file})
        : new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});
      cache.set(file,module);return module;
    }
    function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):entry.name.endsWith('.js')?[path.resolve(dir,entry.name)]:[]);}
    (async()=>{for(const file of files('js')){const module=moduleFor(file);if(module.status==='unlinked') await module.link((name,from)=>moduleFor(name.startsWith('https:')?name:path.resolve(path.dirname(from.identifier),name)));}})().catch(error=>{console.error(error);process.exitCode=1;});
  `], { cwd: path.resolve(__dirname, '..'), stdio: 'pipe' });
});
