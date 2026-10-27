const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function installSessionBoundary(context) {
  context.setTimeout ??= setTimeout;
  context.getCurrentUser ??= async () => ({ data: { id: 'session-user' }, error: null });
  const handlers = new Set(), events = {};
  const original = context.onAuthStateChange;
  context.onAuthStateChange = callback => {
    handlers.add(callback); original?.(callback);
    return { data: { subscription: { unsubscribe: () => handlers.delete(callback) } } };
  };
  context.__auth = (event, session) => { for (const handler of [...handlers]) handler(event, session); };
  context.__events = events;
  context.window.addEventListener = (event, handler) => { (events[event] ??= new Set()).add(handler); };
  context.window.removeEventListener = (event, handler) => { events[event]?.delete(handler); };
  context.__fireWindow = (event, value) => { for (const handler of events[event] || []) handler(value); };
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../../js/components/session-status.js'), 'utf8').replace(/^export /gm, ''), context);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../../js/components/session-boundary.js'), 'utf8').replace(/^import .*;\s*/gm, '').replace(/^export /gm, ''), context);
}
module.exports = { installSessionBoundary };
