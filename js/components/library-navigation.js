import { preserveDataSource } from "./navigation-context.js";
import { initAuthNavigation } from "./auth-navigation.js";

preserveDataSource(document.querySelectorAll('a[href]'));
const accountHeader = document.querySelector('.user-page-header');
if (accountHeader) initAuthNavigation(accountHeader);
