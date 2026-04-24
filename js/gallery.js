/**
 * Config file. Contains all of the options for laying out the photos, as well
 * as the photo metadata.
 */
class Config {
  constructor(config, opts) {
    this.data = config;
    this.maxHeight = opts.maxHeight || 400;
    this.spacing = opts.spacing || 10;
    this.shuffle = opts.shuffle || false;
    this.columns = opts.columns || 3;
    this.mobileBreakpoint = opts.mobileBreakpoint || 900;
  };

  sections() {
    if (Array.isArray(this.data)) {
      return [{ title: 'gallery', photos: this.data.slice() }];
    }

    var sections = [];
    for (var album in this.data) {
      sections.push({
        title: album,
        photos: this.data[album].slice()
      });
    }
    return sections;
  }

  allPhotos() {
    var photos = [];
    var sections = this.sections();
    for (var i = 0; i < sections.length; i++) {
      photos = photos.concat(sections[i].photos);
    }
    return photos;
  }

  isMobile() {
    return window.innerWidth <= this.mobileBreakpoint;
  }

  effectiveColumns() {
    return this.isMobile() ? 1 : this.columns;
  }
}

/**
 * Abstract class for rendering a layout.
 */
class Renderer {
  constructor(domId) {
    this._rootElem = document.getElementById(domId);
    var bounds = this._rootElem.getBoundingClientRect();
    this._currentWidth = bounds.right - bounds.left;
  }

  render(config) {}

  getPhotos(config, photos) {
    var photos = photos.map((p) => { return new Photo(p); });
    if (config.shuffle) {
      shuffle(photos);
    }
    return photos
  }

  rootElem() {
    return this._rootElem;
  }

  createHeader(title) {
    var sectionElem = document.createElement('section');
    sectionElem.id = title;
    sectionElem.className = 'gallery-section';
    return sectionElem;
  }

  createImageElement(photo, width, height, spacing) {
    var image = new Image();

    image.style.width = width;
    image.style.height = height;
    image.style.marginBottom = spacing;
    image.onload = onImageLoad;
    image.setAttribute("data-action", "zoom");

    if (photo.isCompressed()) {
      // Lazy loading + a compressed image
      image.setAttribute("data-original", photo.originalSrc());
      image.setAttribute("data-src", photo.compresedSrc());
      image.src = photo.placeholderSrc();
      image.classList.add('lazyload');
    } else {
      // Original
      image.src = photo.src();
    }

    return image;
  }
}

/**
 * Renders photos in columns
 */
class VerticalRenderer extends Renderer {
  render(config) {
    var sections = config.sections();
    for (var i = 0; i < sections.length; i++) {
      var section = this.createSection(
        config,
        sections[i].title,
        this.getPhotos(config, sections[i].photos)
      );
      this.rootElem().appendChild(section);
    }
  }

  /**
   * Creates one gallery section
   */
  createSection(config, section, photos) {
    var sectionElem = this.createHeader(section);
    var columns = config.effectiveColumns();
    var width = (this._currentWidth - config.spacing * (columns-1)) * 1.0 / columns;

    var stacks = [];
    for (var i = 0; i < columns; i++) {
      stacks.push([]);
    }
    var heights = new Array(columns).fill(0);


    for (var i = 0; i < photos.length; i++) {
      var nextPhoto = photos[i];
      var index = this.getSmallestStack(heights);
      stacks[index].push(nextPhoto);
      heights[index] = heights[index] + nextPhoto.height(width);
    }

    var columnElements = document.createElement('div');
    columnElements.style.columnCount = columns;
    columnElements.style.columnGap = px(config.spacing);

    for (var i = 0; i < stacks.length; i++) {
      var column = document.createElement('div');
      for (var j = 0; j < stacks[i].length; j++) {
        let photoElement = this.createPhotoElement(stacks[i][j], width, config);
        photoElement.setAttribute("data-action", "zoom");
        column.appendChild(photoElement);
      }
      column.style.width = px(width);
      columnElements.appendChild(column);
    }

    sectionElem.appendChild(columnElements);

    return sectionElem;
  }

  /**
   * Creates one photo
   */
  createPhotoElement(photo, width, config) {
    return this.createImageElement(photo,
                                   px(width),
                                   px(photo.height(width)),
                                   px(config.spacing));
  }

  /**
   * Find the shortest column to add a photo to
   */
  getSmallestStack(stack) {
    var smallestIndex = 0;
    var minHeight = Number.MAX_VALUE;
    for (var i = 0; i < stack.length; i++) {
      if (stack[i] === 0) {
        return i;
      }

      if (stack[i] < minHeight) {
        smallestIndex = i;
        minHeight = stack[i];
      }
    }
    return smallestIndex;
  }
}

/**
 * Renderer for square photo layout
 */
class SquareRenderer extends Renderer {
  render(config) {
    var sections = config.sections();
    for (var i = 0; i < sections.length; i++) {
      var section = this.createSection(
        config,
        sections[i].title,
        this.getPhotos(config, sections[i].photos)
      );
      this.rootElem().appendChild(section);
    }
  }

  /**
   * Creates a gallery section
   */
  createSection(config, section, photos) {
    var sectionElem = this.createHeader(section);

    // In column format, we want to precompute the height of each cell, so that
    // the last row can have a matching width and align itself to rows above.
    var length = config.effectiveColumns() ||
      Math.ceil((this._currentWidth + config.spacing) / (config.maxHeight + config.spacing));
    var height = this.calculateHeight(config, length);

    while (photos.length > 0) {
      var rowPhotos = [];

      for (var i = 0; i < length; i++) {
        if (photos.length === 0) {
          break;
        }

        rowPhotos.push(photos.pop());
      }
      sectionElem.appendChild(this.createRow(config, section, rowPhotos, height));
    }

    return sectionElem;
  }

  /**
   * Creates a row of square photos
   */
  createRow(config, section, photos, height) {
    var rowElem = document.createElement('div');
    rowElem.className = 'sectionrow';
    rowElem.style.marginBottom = px(config.spacing);

    for (var i = 0; i < photos.length; i++) {
      var photo = photos[i];
      var image = document.createElement('div');

      image.style.backgroundImage = "url('" + photo.src() + "')";
      image.style.backgroundRepeat = 'no-repeat';
      image.style.backgroundPosition = 'center';
      image.style.backgroundSize = 'cover'

      image.style.width = px(height); // Square photo
      image.style.height = px(height);
      image.style.display = 'inline-block';
      image.setAttribute("data-action", "zoom");
      if (photo.isCompressed()) {
        image.setAttribute("data-original", photo.originalSrc());
      }

      // Only apply margins to second to last.
      if (i !== 0) {
        image.style.marginLeft = px(config.spacing);
      }

      rowElem.appendChild(image);
    }
    return rowElem;
  }

  /**
   * Calculates the height of the square photos
   */
  calculateHeight(config, length) {
    var columns = config.effectiveColumns();
    if (columns) {
      return (this._currentWidth - (columns-1) * config.spacing) / columns;
    }
    return (this._currentWidth - (length-1) * config.spacing) / length;
  }
}

/**
 * Renders the photos in rows
 */
class HorizontalRenderer extends Renderer {
  render(config) {
    var sections = config.sections();
    for (var i = 0; i < sections.length; i++) {
      var section = this.createSection(
        config,
        sections[i].title,
        this.getPhotos(config, sections[i].photos)
      );
      this.rootElem().appendChild(section);
    }
  }

  /**
   * Creates a gallery section
   */
  createSection(config, section, photos) {
    if (config.shuffle) {
      shuffle(photos);
    }
    var sectionElem = this.createHeader(section);

    while (photos.length > 0) {
      var maxWidth = config.spacing * -1;
      var rowPhotos = [];

      while (true) {
        var photo = photos.pop();
        maxWidth += photo.width(config.maxHeight) + config.spacing;
        rowPhotos.push(photo);
        if (maxWidth - config.spacing > this._currentWidth) {
          sectionElem.appendChild(this.createRow(config, section, rowPhotos));
          break;
        }

        if (photos.length === 0) {
          sectionElem.appendChild(this.createRow(config, section, rowPhotos, true));
          break;
        }
      }
    }

    return sectionElem;
  }

  /**
   * Creates a row of photos with fixed height
   */
  createRow(config, section, photos, isIncomplete=false) {
    var rowElem = document.createElement('div');
    rowElem.className = 'sectionrow';
    rowElem.style.marginBottom = px(config.spacing);

    // Calculate height of element
    var targetWidth = this._currentWidth - (photos.length - 1) * config.spacing;
    var sumWidth = 0;
    for (var i in photos) {
      sumWidth += photos[i].width(config.maxHeight);
    }
    var aspectRatio = sumWidth / parseFloat(targetWidth);
    var finalHeight = config.maxHeight / aspectRatio;
    if (isIncomplete) {
      finalHeight = config.maxHeight;
      // If it barely reaches the max height, it looks like an error. So let's
      // just add a ton of padding by reducing the height of the row.
      if (sumWidth > targetWidth * 9 / 10) {
        finalHeight = config.maxHeight * 0.9;
      }
    }

    for (var i = 0; i < photos.length; i++) {
      var photo = photos[i];
      var image = this.createImageElement(photo,
                                          px(photo.width(finalHeight)),
                                          px(finalHeight),
                                          px(0));

      if (i !== 0) {
        image.style.marginLeft = px(config.spacing);
      }

      rowElem.appendChild(image);
    }
    return rowElem;
  }
}


/**
 * Wrapper for a photo
 */
class Photo {
  constructor(p) {
    this.path = p.path;
    this._width = p.width;
    this._height = p.height;
    this._is_compressed = p.compressed;
    this.placeholder_path = p.placeholder_path;
    this.compressed_path = p.compressed_path;

    this.aspectRatio = this._width / parseFloat(this._height);
  };

  src() {
    return this.path;
  }

  isCompressed() {
    return this._is_compressed;
  }

  originalSrc() {
    return this.path;
  }

  compresedSrc() {
    return this.compressed_path;
  }

  placeholderSrc() {
    return this.placeholder_path;
  }

  width(height) {
    return height * this.aspectRatio;
  }

  height(width) {
    return width / this.aspectRatio;
  }
}

//
// Helpers
//

/**
 * http://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
 * Shuffles array in place. ES6 version
 * @param {Array} a items The array containing the items.
 */
function shuffle(a) {
  for (let i = a.length; i; i--) {
    let j = Math.floor(Math.random() * i);
    [a[i - 1], a[j]] = [a[j], a[i - 1]];
  }
}

/**
 * Event listener. Enables photos to transition to full opacity.
 */
function onImageLoad() {
  this.classList.add('img-loaded');
}

/**
 * Utility class to avoid type coercion
 */
function px(size) {
  return size + 'px';
}
