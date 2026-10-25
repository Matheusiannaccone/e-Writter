// Mesma gramática ASCII de input[type=email], incluindo domínio sem ponto.
// Não consulta contas, DNS ou entrega de mensagens.
export function isValidEmail(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(value.trim());
}
