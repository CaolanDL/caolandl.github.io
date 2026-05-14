var id = 'gallery';
var galleryConfig = null;
var currentPanel = 'gallery';
var panelTransitionTimer = null;

function createRenderer() {
  switch (layoutStyle) {
    case COLUMNS:
      return new VerticalRenderer(id);
    case ROWS:
      return new HorizontalRenderer(id);
    case SQUARES:
      return new SquareRenderer(id);
  }
}

function renderGallery() {
  if (!galleryConfig) {
    return;
  }

  var galleryPanel = document.querySelector('[data-panel="gallery"]');
  if (galleryPanel && galleryPanel.hidden) {
    return;
  }

  var galleryRoot = document.getElementById(id);
  galleryRoot.innerHTML = '';

  var renderer = createRenderer();
  renderer.render(galleryConfig);
  lazyload();
}

function reqListener() {
  galleryConfig = new Config(JSON.parse(this.responseText), configuration);
  renderGallery();
}

function getPanelFromHash() {
  var hash = window.location.hash.replace('#', '').toLowerCase();
  if (hash === 'about' || hash === 'contact') {
    return hash;
  }
  return 'gallery';
}

function setActiveNav(panelName) {
  var buttons = document.querySelectorAll('[data-nav-target]');
  for (var i = 0; i < buttons.length; i++) {
    var isActive = buttons[i].getAttribute('data-nav-target') === panelName;
    buttons[i].classList.toggle('is-active', isActive);
    buttons[i].setAttribute('aria-pressed', isActive ? 'true' : 'false');
  }
}

function closeMobileMenu() {
  var toggle = document.querySelector('.menu-toggle');
  document.body.classList.remove('menu-open');
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
  }
}

function activatePanel(panelName, options) {
  var opts = options || {};
  var nextPanel = document.querySelector('[data-panel="' + panelName + '"]');
  var activePanel = document.querySelector('[data-panel="' + currentPanel + '"]');
  var contentShell = document.getElementById('content');

  if (!nextPanel || !contentShell) {
    return;
  }

  if (panelName === currentPanel) {
    closeMobileMenu();
    return;
  }

  window.clearTimeout(panelTransitionTimer);
  setActiveNav(panelName);

  if (opts.updateHistory) {
    var nextUrl = panelName === 'gallery'
      ? window.location.pathname + window.location.search
      : '#' + panelName;
    history.pushState({ panel: panelName }, '', nextUrl);
  }

  var finishTransition = function() {
    if (activePanel) {
      activePanel.classList.remove('is-active');
      activePanel.hidden = true;
    }

    nextPanel.hidden = false;
    nextPanel.classList.add('is-active');
    currentPanel = panelName;

    if (panelName === 'gallery') {
      renderGallery();
    }

    window.requestAnimationFrame(function() {
      contentShell.classList.remove('is-fading');
      nextPanel.focus({ preventScroll: true });
    });
  };

  closeMobileMenu();

  if (opts.immediate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finishTransition();
    return;
  }

  contentShell.classList.add('is-fading');
  panelTransitionTimer = window.setTimeout(finishTransition, 240);
}

function initNavigation() {
  var navButtons = document.querySelectorAll('[data-nav-target]');
  var menuToggle = document.querySelector('.menu-toggle');
  var siteMenu = document.querySelector('.site-menu');
  var initialPanel = getPanelFromHash();

  for (var i = 0; i < navButtons.length; i++) {
    navButtons[i].addEventListener('click', function(event) {
      activatePanel(event.currentTarget.getAttribute('data-nav-target'), {
        updateHistory: true
      });
    });
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      var isOpen = document.body.classList.toggle('menu-open');
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
    });
  }

  document.addEventListener('click', function(event) {
    if (siteMenu && !siteMenu.contains(event.target)) {
      closeMobileMenu();
    }
  });

  window.addEventListener('popstate', function() {
    activatePanel(getPanelFromHash(), { immediate: true });
  });

  if (initialPanel !== 'gallery') {
    activatePanel(initialPanel, { immediate: true });
  } else {
    setActiveNav('gallery');
  }
}

window.addEventListener('load', function() {
  var oReq = new XMLHttpRequest();
  oReq.addEventListener("load", reqListener);
  oReq.open("GET", "config.json");
  oReq.send();

  var igElem = document.getElementById('instagram');
  if (igElem && igElem.href === 'https://www.instagram.com/') {
    igElem.remove();
  }
});

initNavigation();

window.addEventListener('resize', renderGallery);
window.addEventListener('orientationchange', renderGallery);
