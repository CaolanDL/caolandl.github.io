var id = 'gallery';
var galleryConfig = null;

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


window.onload = function() {
  var oReq = new XMLHttpRequest();
  oReq.addEventListener("load", reqListener);
  oReq.open("GET", "config.json");
  oReq.send();

  let igElem = document.getElementById('instagram');
  if (igElem.href === 'https://www.instagram.com/') {
    document.querySelector('div.footer').remove();
  }
};

window.addEventListener('resize', renderGallery);
window.addEventListener('orientationchange', renderGallery);
