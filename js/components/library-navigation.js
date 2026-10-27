/**
 * Inicialização de links das páginas da conta ao importar este módulo.
 * Preserva datasource e inicializa o menu de conta se encontrar um cabeçalho próprio.
 */
import { preserveDataSource } from "./navigation-context.js";
import { initAuthNavigation } from "./auth-navigation.js";

preserveDataSource(document.querySelectorAll('a[href]'));
const accountHeader = document.querySelector('.user-page-header');
if (accountHeader) initAuthNavigation(accountHeader);
