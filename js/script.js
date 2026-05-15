var id = 'gallery';
var galleryConfig = null;
var currentPanel = 'gallery';
var currentGalleryMode = 'photo';
var currentGalleryCategory = null;
var panelTransitionTimer = null;
var galleryTransitionTimer = null;
var galleryTransitionCleanupTimer = null;
var themeStorageKey = 'cxstudio-theme';
var themeTransitionTimer = null;
var themeTransitionEndTimer = null;

function getSavedTheme() {
  try {
    return window.localStorage.getItem(themeStorageKey);
  } catch (error) {
    return null;
  }
}

function saveTheme(theme) {
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch (error) {
    return;
  }
}

function setTheme(theme) {
  var isLightTheme = theme === 'light';
  var themeToggle = document.querySelector('.theme-toggle');
  var themeIcon = themeToggle ? themeToggle.querySelector('.theme-toggle__icon') : null;

  document.body.classList.toggle('is-light-theme', isLightTheme);

  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', isLightTheme ? 'true' : 'false');
    themeToggle.setAttribute(
      'aria-label',
      isLightTheme ? 'Switch to dark theme' : 'Switch to light theme'
    );
  }

  if (themeIcon) {
    themeIcon.classList.toggle('fa-flip-horizontal', isLightTheme);
  }
}

function transitionTheme(theme) {
  var targetColor = theme === 'light' ? '#f7f7f4' : '#050505';
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    setTheme(theme);
    return;
  }

  if (document.startViewTransition) {
    document.documentElement.style.setProperty('--theme-wipe-color', targetColor);
    document.body.classList.add('is-theme-transitioning');
    var transition = document.startViewTransition(function() {
      setTheme(theme);
    });
    transition.finished.finally(function() {
      document.body.classList.remove('is-theme-transitioning');
    });
    return;
  }

  window.clearTimeout(themeTransitionTimer);
  window.clearTimeout(themeTransitionEndTimer);
  document.body.style.setProperty('--theme-wipe-color', targetColor);
  document.body.classList.remove('is-theme-wiping');
  document.body.offsetWidth;
  document.body.classList.add('is-theme-transitioning');
  document.body.classList.add('is-theme-wiping');

  themeTransitionTimer = window.setTimeout(function() {
    setTheme(theme);
  }, 520);

  themeTransitionEndTimer = window.setTimeout(function() {
    document.body.classList.remove('is-theme-wiping');
    document.body.classList.remove('is-theme-transitioning');
  }, 1200);
}

function initThemeToggle() {
  var themeToggle = document.querySelector('.theme-toggle');
  var savedTheme = getSavedTheme();

  setTheme(savedTheme === 'light' ? 'light' : 'dark');

  if (!themeToggle) {
    return;
  }

  themeToggle.addEventListener('click', function() {
    var nextTheme = document.body.classList.contains('is-light-theme') ? 'dark' : 'light';
    transitionTheme(nextTheme);
    saveTheme(nextTheme);
  });
}

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

  if (currentGalleryMode === 'video') {
    renderVideoGallery(galleryRoot);
    return;
  }

  var activeConfig = getActiveGalleryConfig();
  var renderer = createRenderer();
  renderer.render(activeConfig);
  lazyload();
}

function renderVideoGallery(galleryRoot) {
  var comingSoon = document.createElement('div');
  var title = document.createElement('p');
  var instruction = document.createElement('p');

  comingSoon.className = 'video-gallery-placeholder';
  title.textContent = 'cxstudio.video coming soon...';
  instruction.textContent = 'click the site logo to return';

  comingSoon.appendChild(title);
  comingSoon.appendChild(instruction);
  galleryRoot.appendChild(comingSoon);
}

function reqListener() {
  galleryConfig = new Config(JSON.parse(this.responseText), configuration);
  buildGalleryFilter();
  renderGallery();
}

function getActiveGalleryConfig() {
  var sections = galleryConfig.sections();
  if (!sections.length) {
    return galleryConfig;
  }

  for (var i = 0; i < sections.length; i++) {
    if (sections[i].title === currentGalleryCategory) {
      var filteredData = {};
      filteredData[sections[i].title] = sections[i].photos.slice();
      return new Config(filteredData, configuration);
    }
  }

  currentGalleryCategory = sections[0].title;
  setActiveGalleryFilter();
  var fallbackData = {};
  fallbackData[sections[0].title] = sections[0].photos.slice();
  return new Config(fallbackData, configuration);
}

function galleryCategoryLabel(category) {
  return category.replace(/^\d+\s*/, '').replace(/^\s*-\s*/, '').trim();
}

function setActiveGalleryFilter() {
  var buttons = document.querySelectorAll('[data-gallery-category], [data-gallery-mode]');
  for (var i = 0; i < buttons.length; i++) {
    var category = buttons[i].getAttribute('data-gallery-category');
    var mode = buttons[i].getAttribute('data-gallery-mode');
    var isActive = mode
      ? mode === currentGalleryMode
      : currentGalleryMode === 'photo' && category === currentGalleryCategory;
    buttons[i].classList.toggle('is-active', isActive);
    buttons[i].setAttribute('aria-pressed', isActive ? 'true' : 'false');
  }
}

function setGalleryModeState() {
  var brandHome = document.querySelector('.brand-home');
  var isVideoGallery = currentGalleryMode === 'video';

  document.body.classList.toggle('is-video-gallery', isVideoGallery);

  if (brandHome) {
    brandHome.setAttribute('aria-pressed', isVideoGallery ? 'true' : 'false');
    brandHome.setAttribute(
      'aria-label',
      isVideoGallery ? 'Switch to photo gallery' : 'Switch to video gallery'
    );
  }
}

function setGalleryFilterVisibilityForMode() {
  var filterRoot = document.getElementById('gallery-filter');
  if (filterRoot) {
    filterRoot.hidden = false;
    setActiveGalleryFilter();
  }
}

function getGalleryModeUrl(mode) {
  return mode === 'video'
    ? '#video'
    : window.location.pathname + window.location.search;
}

function switchGalleryMode(mode, options) {
  var opts = options || {};

  if (mode === currentGalleryMode) {
    activatePanel('gallery', {
      updateHistory: false
    });
    if (opts.updateHistory) {
      history.pushState({ panel: 'gallery', galleryMode: mode }, '', getGalleryModeUrl(mode));
    }
    return;
  }

  var galleryRoot = document.getElementById(id);
  var galleryPanel = document.querySelector('[data-panel="gallery"]');
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var galleryIsHidden = currentPanel !== 'gallery' || (galleryPanel && galleryPanel.hidden);

  if (opts.updateHistory) {
    history.pushState({ panel: 'gallery', galleryMode: mode }, '', getGalleryModeUrl(mode));
  }

  activatePanel('gallery', {
    updateHistory: false
  });

  if (!galleryRoot || prefersReducedMotion || galleryIsHidden) {
    currentGalleryMode = mode;
    setGalleryModeState();
    setGalleryFilterVisibilityForMode();
    if (!galleryIsHidden) {
      renderGallery();
    }
    return;
  }

  window.clearTimeout(galleryTransitionTimer);
  window.clearTimeout(galleryTransitionCleanupTimer);
  document.body.classList.add('is-gallery-mode-switching');
  galleryRoot.classList.toggle('is-flipping-to-video', mode === 'video');
  galleryRoot.classList.toggle('is-flipping-to-photo', mode === 'photo');
  if (galleryPanel) {
    galleryPanel.style.minHeight = galleryPanel.offsetHeight + 'px';
  }
  galleryRoot.style.minHeight = galleryRoot.offsetHeight + 'px';
  galleryRoot.classList.remove('is-mode-flipping-in');
  galleryRoot.classList.add('is-mode-flipping-out');
  currentGalleryMode = mode;
  setGalleryModeState();
  setActiveGalleryFilter();

  galleryTransitionTimer = window.setTimeout(function() {
    setGalleryFilterVisibilityForMode();
    galleryRoot.classList.remove('is-mode-flipping-out');
    renderGallery();
    if (galleryPanel) {
      galleryPanel.style.minHeight = '';
    }
    galleryRoot.style.minHeight = '';
    galleryRoot.classList.add('is-mode-flipping-in');

    galleryTransitionCleanupTimer = window.setTimeout(function() {
      galleryRoot.classList.remove('is-mode-flipping-in');
      galleryRoot.classList.remove('is-flipping-to-video');
      galleryRoot.classList.remove('is-flipping-to-photo');
      document.body.classList.remove('is-gallery-mode-switching');
    }, 155);
  }, 155);
}

function switchGalleryCategory(category) {
  if (currentGalleryMode === 'video') {
    currentGalleryCategory = category;
    setActiveGalleryFilter();
    switchGalleryMode('photo', {
      updateHistory: true
    });
    return;
  }

  if (category === currentGalleryCategory) {
    return;
  }

  var galleryRoot = document.getElementById(id);
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  currentGalleryCategory = category;
  setActiveGalleryFilter();

  if (!galleryRoot || prefersReducedMotion) {
    renderGallery();
    return;
  }

  window.clearTimeout(galleryTransitionTimer);
  window.clearTimeout(galleryTransitionCleanupTimer);
  galleryRoot.style.minHeight = galleryRoot.offsetHeight + 'px';
  galleryRoot.classList.remove('is-filtering-in');
  galleryRoot.classList.add('is-filtering-out');

  galleryTransitionTimer = window.setTimeout(function() {
    renderGallery();
    galleryRoot.classList.remove('is-filtering-out');
    galleryRoot.classList.add('is-filtering-in');

    galleryTransitionCleanupTimer = window.setTimeout(function() {
      galleryRoot.classList.remove('is-filtering-in');
      galleryRoot.style.minHeight = '';
    }, 560);
  }, 220);
}

function createGalleryFilterButton(category, label) {
  var button = document.createElement('button');
  button.className = 'gallery-filter__button';
  button.type = 'button';
  button.textContent = label;
  button.setAttribute('data-gallery-category', category);
  button.setAttribute('aria-pressed', category === currentGalleryCategory ? 'true' : 'false');
  button.addEventListener('click', function() {
    switchGalleryCategory(category);
  });
  return button;
}

function createGalleryModeFilterButton(mode, label) {
  var button = document.createElement('button');
  button.className = 'gallery-filter__button';
  button.type = 'button';
  button.textContent = label;
  button.setAttribute('data-gallery-mode', mode);
  button.setAttribute('aria-pressed', mode === currentGalleryMode ? 'true' : 'false');
  button.addEventListener('click', function() {
    switchGalleryMode(mode, {
      updateHistory: true
    });
  });
  return button;
}

function buildGalleryFilter() {
  var filterRoot = document.getElementById('gallery-filter');
  if (!filterRoot || !galleryConfig) {
    return;
  }

  var sections = galleryConfig.sections();
  filterRoot.innerHTML = '';
  filterRoot.classList.remove('is-ready');

  if (!sections.length) {
    return;
  }

  if (!currentGalleryCategory) {
    currentGalleryCategory = sections[0].title;
  }

  for (var i = 0; i < sections.length; i++) {
    filterRoot.appendChild(
      createGalleryFilterButton(sections[i].title, galleryCategoryLabel(sections[i].title))
    );
  }
  filterRoot.appendChild(createGalleryModeFilterButton('video', 'Video'));

  setActiveGalleryFilter();
  filterRoot.classList.add('is-ready');
}

function getPanelFromHash() {
  var hash = window.location.hash.replace('#', '').toLowerCase();
  if (hash === 'about' || hash === 'contact') {
    return hash;
  }
  return 'gallery';
}

function getGalleryModeFromHash() {
  return window.location.hash.replace('#', '').toLowerCase() === 'video' ? 'video' : 'photo';
}

function setActiveNav(panelName) {
  var buttons = document.querySelectorAll('[data-nav-target]');
  for (var i = 0; i < buttons.length; i++) {
    var isActive = buttons[i].getAttribute('data-nav-target') === panelName;
    buttons[i].classList.toggle('is-active', isActive);
    buttons[i].setAttribute('aria-pressed', isActive ? 'true' : 'false');
  }
}

function setActivePanelState(panelName) {
  document.body.classList.toggle('is-gallery-view', panelName === 'gallery');
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
    setActivePanelState(panelName);
    closeMobileMenu();
    return;
  }

  window.clearTimeout(panelTransitionTimer);
  setActiveNav(panelName);

  if (opts.updateHistory) {
    var nextUrl = panelName === 'gallery'
      ? getGalleryModeUrl(currentGalleryMode)
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
    setActivePanelState(panelName);

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
  panelTransitionTimer = window.setTimeout(finishTransition, 260);
}

function initNavigation() {
  var navButtons = document.querySelectorAll('[data-nav-target]');
  var brandHome = document.querySelector('.brand-home');
  var menuToggle = document.querySelector('.menu-toggle');
  var siteMenu = document.querySelector('.site-menu');
  var initialPanel = getPanelFromHash();
  var initialGalleryMode = getGalleryModeFromHash();

  currentGalleryMode = initialGalleryMode;

  for (var i = 0; i < navButtons.length; i++) {
    navButtons[i].addEventListener('click', function(event) {
      var targetPanel = event.currentTarget.getAttribute('data-nav-target');
      activatePanel(targetPanel, {
        updateHistory: true
      });
    });
  }

  if (brandHome) {
    brandHome.addEventListener('click', function() {
      if (currentPanel !== 'gallery') {
        activatePanel('gallery', {
          updateHistory: true
        });
        return;
      }

      switchGalleryMode(currentGalleryMode === 'video' ? 'photo' : 'video', {
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
    var clickedToggle = menuToggle && menuToggle.contains(event.target);
    if (siteMenu && !siteMenu.contains(event.target) && !clickedToggle) {
      closeMobileMenu();
    }
  });

  window.addEventListener('popstate', function() {
    var nextPanel = getPanelFromHash();
    var nextGalleryMode = getGalleryModeFromHash();

    if (nextPanel === 'gallery' && nextGalleryMode !== currentGalleryMode) {
      switchGalleryMode(nextGalleryMode, {
        updateHistory: false
      });
    }

    activatePanel(nextPanel, { immediate: true });
  });

  if (initialPanel !== 'gallery') {
    activatePanel(initialPanel, { immediate: true });
  } else {
    setActiveNav('gallery');
    setActivePanelState('gallery');
  }

  setGalleryModeState();
  setGalleryFilterVisibilityForMode();
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

initThemeToggle();
initNavigation();

window.addEventListener('resize', renderGallery);
window.addEventListener('orientationchange', renderGallery);
