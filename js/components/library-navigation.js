import { preserveDataSource } from "./navigation-context.js";

preserveDataSource(document.querySelectorAll('a[data-library-link]'));
