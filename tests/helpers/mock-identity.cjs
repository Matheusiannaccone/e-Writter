const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const root = path.resolve(__dirname, '../..');

function memoryStorage() {
  const values = new Map();
  return {
    values, failRead: false, failWrite: false,
    getItem(key) { if (this.failRead) throw Error('storage blocked'); return values.get(key) ?? null; },
    setItem(key, value) { if (this.failWrite) throw Error('quota exceeded'); values.set(key, value); },
    removeItem(key) { values.delete(key); }
  };
}

function identityPage(local = memoryStorage(), session = memoryStorage()) {
  const context = vm.createContext({ localStorage: local, sessionStorage: session, crypto: webcrypto, TextEncoder, Uint8Array, URL, URLSearchParams });
  for (const file of ['js/services/adapters/mock/mockData.js', 'js/validation/email.js', 'js/services/adapters/mock/identityStorage.js', 'js/services/adapters/mock/authAdapter.js', 'js/services/adapters/mock/profileAdapter.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8').replace(/^import .*;\s*/gm, '').replace(/^export /gm, ''), context);
  }
  vm.runInContext('function getAuthAdapter(){return mockAuthAdapter;} function getProfileAdapter(){return mockProfileAdapter;}', context);
  for (const file of ['js/services/authService.js', 'js/services/profileService.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8').replace(/^import .*;\s*/gm, '').replace(/^export /gm, ''), context);
  return {
    auth: vm.runInContext('mockAuthAdapter', context), profile: vm.runInContext('mockProfileAdapter', context),
    run: source => vm.runInContext(source, context), local, session
  };
}
module.exports = { identityPage, memoryStorage };
