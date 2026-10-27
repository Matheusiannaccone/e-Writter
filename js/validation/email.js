/**
 * Valida somente a sintaxe após trim, aceitando domínio sem ponto como o campo HTML.
 * @param {unknown} value - Valor a verificar.
 * @returns {boolean} Indica compatibilidade com a expressão de e-mail usada pelo Mock.
 */
export function isValidEmail(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(value.trim());
}
