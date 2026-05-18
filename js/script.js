var id = 'gallery';
var galleryConfig = null;
var gallerySettings = {
  disabledCategories: [],
  categoryOrder: []
};
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

function normalizeGallerySettings(settings) {
  var disabledCategories = [];
  var categoryOrder = [];

  if (settings) {
    disabledCategories = settings.disabled_categories || settings.disabledCategories || [];
    categoryOrder = settings.category_order || settings.categoryOrder || [];
  }

  if (!Array.isArray(disabledCategories)) {
    disabledCategories = [];
  }

  if (!Array.isArray(categoryOrder)) {
    categoryOrder = [];
  }

  gallerySettings.disabledCategories = disabledCategories.map(function(category) {
    return String(category).trim();
  }).filter(function(category) {
    return category.length > 0;
  });

  gallerySettings.categoryOrder = categoryOrder.map(function(category) {
    return String(category).trim();
  }).filter(function(category) {
    return category.length > 0;
  });
}

function isGalleryCategoryDisabled(category) {
  var categoryName = String(category).trim();
  var categoryLabel = galleryCategoryLabel(categoryName);

  for (var i = 0; i < gallerySettings.disabledCategories.length; i++) {
    if (
      gallerySettings.disabledCategories[i] === categoryName ||
      gallerySettings.disabledCategories[i] === categoryLabel
    ) {
      return true;
    }
  }

  return false;
}

function filterGalleryData(data) {
  if (Array.isArray(data)) {
    return data;
  }

  var filteredData = {};
  for (var category in data) {
    if (!isGalleryCategoryDisabled(category)) {
      filteredData[category] = data[category];
    }
  }
  return filteredData;
}

function getConfiguredCategoryIndex(category) {
  var categoryName = String(category).trim();
  var categoryLabel = galleryCategoryLabel(categoryName);

  for (var i = 0; i < gallerySettings.categoryOrder.length; i++) {
    if (
      gallerySettings.categoryOrder[i] === categoryName ||
      gallerySettings.categoryOrder[i] === categoryLabel
    ) {
      return i;
    }
  }

  return -1;
}

function sortGalleryData(data) {
  if (Array.isArray(data) || !gallerySettings.categoryOrder.length) {
    configuration.sectionOrder = null;
    return data;
  }

  var categories = Object.keys(data);
  categories.sort(function(a, b) {
    var aIndex = getConfiguredCategoryIndex(a);
    var bIndex = getConfiguredCategoryIndex(b);

    if (aIndex === -1 && bIndex === -1) {
      return a.localeCompare(b);
    }

    if (aIndex === -1) {
      return 1;
    }

    if (bIndex === -1) {
      return -1;
    }

    return aIndex - bIndex;
  });

  var sortedData = {};
  configuration.sectionOrder = categories.slice();
  for (var i = 0; i < categories.length; i++) {
    sortedData[categories[i]] = data[categories[i]];
  }
  return sortedData;
}

function reqListener() {
  var galleryData = sortGalleryData(filterGalleryData(JSON.parse(this.responseText)));
  if (currentGalleryCategory && isGalleryCategoryDisabled(currentGalleryCategory)) {
    currentGalleryCategory = null;
  }

  galleryConfig = new Config(galleryData, configuration);
  currentGalleryCategory = getGalleryCategoryFromHash() || currentGalleryCategory;
  buildGalleryFilter();
  renderGallery();
}

function loadGallerySettings(callback) {
  var settingsReq = new XMLHttpRequest();

  settingsReq.addEventListener('load', function() {
    if (settingsReq.status >= 200 && settingsReq.status < 300) {
      try {
        normalizeGallerySettings(JSON.parse(settingsReq.responseText));
      } catch (error) {
        normalizeGallerySettings({});
      }
    }

    callback();
  });

  settingsReq.addEventListener('error', function() {
    normalizeGallerySettings({});
    callback();
  });

  settingsReq.open("GET", "gallery-settings.json");
  settingsReq.send();
}

function loadGalleryConfig() {
  var oReq = new XMLHttpRequest();
  oReq.addEventListener("load", reqListener);
  oReq.open("GET", "config.json");
  oReq.send();
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

function galleryCategorySlug(category) {
  return galleryCategoryLabel(category)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getGalleryCategoryUrl(category) {
  return '#' + galleryCategorySlug(category);
}

function getGalleryCategoryFromHash() {
  if (!galleryConfig) {
    return null;
  }

  var hash = window.location.hash.replace('#', '').toLowerCase();
  if (!hash || hash === 'about' || hash === 'contact' || hash === 'video') {
    return null;
  }

  var sections = galleryConfig.sections();
  for (var i = 0; i < sections.length; i++) {
    if (galleryCategorySlug(sections[i].title) === hash) {
      return sections[i].title;
    }
  }

  return null;
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
  if (mode === 'video') {
    return '#video';
  }

  return currentGalleryCategory
    ? getGalleryCategoryUrl(currentGalleryCategory)
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
    galleryRoot.classList.add('is-mode-flipping-in');

    galleryTransitionCleanupTimer = window.setTimeout(function() {
      if (galleryPanel) {
        galleryPanel.style.minHeight = '';
      }
      galleryRoot.classList.remove('is-mode-flipping-in');
      galleryRoot.classList.remove('is-flipping-to-video');
      galleryRoot.classList.remove('is-flipping-to-photo');
      galleryRoot.style.minHeight = '';
      document.body.classList.remove('is-gallery-mode-switching');
    }, 155);
  }, 155);
}

function switchGalleryCategory(category, options) {
  var opts = options || {};

  if (currentGalleryMode === 'video') {
    currentGalleryCategory = category;
    setActiveGalleryFilter();
    switchGalleryMode('photo', {
      updateHistory: false
    });
    if (opts.updateHistory !== false) {
      history.pushState({
        panel: 'gallery',
        galleryMode: 'photo',
        galleryCategory: category
      }, '', getGalleryCategoryUrl(category));
    }
    return;
  }

  if (category === currentGalleryCategory) {
    if (
      opts.updateHistory !== false &&
      window.location.hash.replace('#', '').toLowerCase() !== galleryCategorySlug(category)
    ) {
      history.pushState({
        panel: 'gallery',
        galleryMode: 'photo',
        galleryCategory: category
      }, '', getGalleryCategoryUrl(category));
    }
    return;
  }

  var galleryRoot = document.getElementById(id);
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  currentGalleryCategory = category;
  setActiveGalleryFilter();
  if (opts.updateHistory !== false) {
    history.pushState({
      panel: 'gallery',
      galleryMode: 'photo',
      galleryCategory: category
    }, '', getGalleryCategoryUrl(category));
  }

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
  document.body.classList.toggle('is-about-view', panelName === 'about');
  document.body.classList.toggle('is-contact-view', panelName === 'contact');
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
    var nextGalleryCategory = getGalleryCategoryFromHash();

    if (nextPanel === 'gallery' && nextGalleryMode !== currentGalleryMode) {
      if (nextGalleryMode === 'photo' && nextGalleryCategory) {
        currentGalleryCategory = nextGalleryCategory;
      }
      switchGalleryMode(nextGalleryMode, {
        updateHistory: false
      });
    } else if (
      nextPanel === 'gallery' &&
      nextGalleryMode === 'photo' &&
      nextGalleryCategory &&
      nextGalleryCategory !== currentGalleryCategory
    ) {
      switchGalleryCategory(nextGalleryCategory, {
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
  loadGallerySettings(loadGalleryConfig);

  var igElem = document.getElementById('instagram');
  if (igElem && igElem.href === 'https://www.instagram.com/') {
    igElem.remove();
  }

});

initThemeToggle();
initNavigation();

window.addEventListener('resize', renderGallery);
window.addEventListener('orientationchange', renderGallery);
