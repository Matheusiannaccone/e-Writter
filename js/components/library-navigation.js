import { preserveDataSource } from "./navigation-context.js";

preserveDataSource(document.querySelectorAll('a[data-library-link], .user-page-nav a, .user-page-shortcuts a, .user-page-back'));
