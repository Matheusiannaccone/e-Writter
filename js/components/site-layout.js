const BREAKPOINT = 768;

function initNavigation(header) {
  const toggle = header.querySelector('.site-nav-toggle');
  const nav = header.querySelector('.site-nav');
  if (!toggle || !nav) return;

  const desktop = window.matchMedia(`(min-width: ${BREAKPOINT}px)`);
  const sync = () => {
    if (desktop.matches) {
      nav.hidden = false;
      toggle.setAttribute('aria-expanded', 'false');
    } else {
      nav.hidden = toggle.getAttribute('aria-expanded') !== 'true';
    }
  };

  toggle.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', String(toggle.getAttribute('aria-expanded') !== 'true'));
    sync();
  });
  desktop.addEventListener('change', sync);
  sync();
}

function markCurrentPage(header) {
  const current = new URL(window.location.href);
  header.querySelectorAll('.site-nav__link').forEach((link) => {
    const target = new URL(link.href);
    if (target.pathname === current.pathname) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

const header = document.querySelector('[data-site-header]');
if (header) {
  header.innerHTML = `
    <div class="site-header__inner page-container">
      <a class="site-brand" href="./index.html" aria-label="e-Writter, início"><span class="site-brand__mark" aria-hidden="true">E</span><span>e-Writter</span></a>
      <button class="site-nav-toggle" type="button" aria-controls="site-nav" aria-expanded="false">Menu</button>
      <nav class="site-nav" id="site-nav" aria-label="Navegação principal"><ul class="site-nav__list"><li><a class="site-nav__link" href="./index.html">Início</a></li><li><a class="site-nav__link" href="./chapter.html">Leitura</a></li></ul></nav>
    </div>`;
  initNavigation(header);
  markCurrentPage(header);
}

const footer = document.querySelector('[data-site-footer]');
if (footer) footer.innerHTML = '<div class="site-footer__inner page-container"><p>© 2026 e-Writter</p><p>Feito para quem ama histórias.</p></div>';
