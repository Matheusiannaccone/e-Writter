const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const id = '11111111-1111-4111-8111-111111111111';
const owner = '22222222-2222-4222-8222-222222222222';
const ok = data => ({ data, error: null });

function harness(kind, options = {}) {
  const calls = [];
  const row = { id, author_id: owner, book_id: owner, status: 'draft', position: 2, title: 'Atualizado' };
  const supabase = {
    auth: { getUser: async () => {
      calls.push('auth');
      return options.auth || ok({ user: { id: owner } });
    } },
    rpc: async (name, args) => {
      calls.push(['rpc', name, JSON.parse(JSON.stringify(args))]);
      return { data: null, error: options.rpcError || null };
    },
    from: table => {
      calls.push(['read', table]);
      const query = {
        select: () => query,
        eq: (column, value) => { assert.equal(column, 'id'); assert.equal(value, id); return query; },
        maybeSingle: async () => options.read || ok(row)
      };
      // Any direct UPDATE fails: the only allowed mutation is the RPC.
      return query;
    }
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'js/services/adapters/supabase', `${kind}Adapter.js`), 'utf8');
  const context = vm.createContext({ supabase });
  vm.runInContext(source.replace(/^import .*;\s*/gm, '').replace(/^export /gm, ''), context);
  const name = kind === 'book' ? 'supabaseBookAdapter' : 'supabaseChapterAdapter';
  const adapter = vm.runInContext(name, context);
  return { calls, run: value => adapter[kind === 'book' ? 'unpublishBook' : 'unpublishChapter'](value) };
}

for (const kind of ['book', 'chapter']) {
  test(`${kind}: RPC void é seguida da leitura atualizada, sem UPDATE direto`, async () => {
    const h = harness(kind);
    const result = await h.run(id);
    assert.equal(result.error, null);
    assert.equal(result.data.id, id);
    assert.equal(result.data.status, 'draft');
    assert.equal(result.data.title, 'Atualizado');
    assert.equal(result.data[kind === 'book' ? 'authorId' : 'bookId'], owner);
    assert.deepEqual(h.calls, ['auth', ['rpc', `unpublish_${kind}`, { [`p_${kind}_id`]: id }], ['read', `${kind}s`]]);
  });

  test(`${kind}: UUID inválido não consulta sessão nem executa RPC`, async () => {
    const h = harness(kind);
    assert.equal((await h.run('invalid')).error.code, 'VALIDATION_ERROR');
    assert.deepEqual(h.calls, []);
  });

  test(`${kind}: ausência de sessão e erro de autenticação impedem RPC`, async () => {
    for (const [auth, code] of [
      [ok({ user: null }), 'UNAUTHENTICATED'],
      [{ data: null, error: { message: 'Failed to fetch' } }, 'NETWORK_ERROR']
    ]) {
      const h = harness(kind, { auth });
      const result = await h.run(id);
      assert.equal(result.data, null);
      assert.equal(result.error.code, code);
      assert.deepEqual(h.calls, ['auth']);
    }
  });

  test(`${kind}: erros da RPC são normalizados e impedem leitura posterior`, async () => {
    for (const [message, code] of [
      ['authentication required', 'UNAUTHENTICATED'],
      [`${kind} not found`, 'NOT_FOUND'],
      [`${kind} is already draft`, 'VALIDATION_ERROR'],
      ['Failed to fetch', 'NETWORK_ERROR'],
      ['unexpected error', 'UNKNOWN']
    ]) {
      const h = harness(kind, { rpcError: { message } });
      const result = await h.run(id);
      assert.equal(result.data, null);
      assert.equal(result.error.code, code);
      assert.equal(h.calls.length, 2);
    }
  });

  test(`${kind}: falhas na leitura após RPC preservam contrato de erro`, async () => {
    for (const [read, code] of [
      [ok(null), 'NOT_FOUND'],
      [{ data: null, error: { message: 'Failed to fetch' } }, 'NETWORK_ERROR']
    ]) {
      const h = harness(kind, { read });
      const result = await h.run(id);
      assert.equal(result.data, null);
      assert.equal(result.error.code, code);
      assert.equal(h.calls.length, 3);
    }
  });
}
