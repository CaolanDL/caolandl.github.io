#!/usr/bin/env python

try:
    from StringIO import StringIO as sbIO
except ImportError:
    from io import BytesIO as sbIO
import struct
import os
import sys
import json
import re

PATH = os.path.dirname(__file__) + '/../'
RELATIVE_PATH = 'photos'
PHOTO_PATH = PATH + RELATIVE_PATH


def is_original(path):
    return '.min.' not in path and '.placeholder.' not in path and is_image_path(path)


def is_not_min_path(path):
    return not is_min_path(path) and is_image_path(path)


def is_min_path(path):
    return '.min.' in path and is_image_path(path)


def is_image_path(path):
    return re.search(r'\.(jpe?g|png)$', path)


def get_placeholder_path(path):
    return get_path(path, 'placeholder')


def get_min_path(path):
    return get_path(path, 'min')


def get_path(path, ext):
    return re.sub(r'\.(png|jpe?g)$', '.' + ext + '.\g<1>', path)


def get_images():
    result = []
    for root, _, items in os.walk(PHOTO_PATH):
        filtered_items = list(filter(is_original, items))
        for img in filtered_items:
            file_path = os.path.join(root, img)
            width, height = 0, 0
            has_compressed = False
            relative_path = './' + os.path.relpath(file_path, PATH).replace('\\', '/')
            with open(file_path, 'rb') as f:
                _, width, height = getImageInfo(f.read())
            if os.path.isfile(get_min_path(relative_path)):
                has_compressed = True
            result.append({
                'width': width,
                'height': height,
                'path': relative_path,
                'compressed_path': get_min_path(relative_path),
                'compressed': has_compressed,
                'placeholder_path': get_placeholder_path(relative_path)
            })
    return result


def write_config(config):
    with open(PATH + 'config.json', 'w') as f:
        f.write(json.dumps(config, indent=2, separators=(',', ': ')))


def run():
    print('Starting to collect all photos within the /photos directory...')
    config = get_images()
    print('Found {length} photos'.format(length=len(config)))
    print('Writing files to {path} now...'.format(path=PATH + 'config.json'))
    write_config(config)
    print('''Done writing! You may now safely close this window :)

Thank you for using gallery! Share your gallery on Github!
https://github.com/andyzg/gallery/issues/1''')
    return 0


############################################################
# Thanks StackOverflow: http://stackoverflow.com/a/3175473 #
############################################################
def getImageInfo(data):
    size = len(data)
    height = -1
    width = -1
    content_type = ''

    # See PNG 2. Edition spec (http://www.w3.org/TR/PNG/)
    # Bytes 0-7 are below, 4-byte chunk length, then 'IHDR'
    # and finally the 4-byte width, height
    if ((size >= 24) and data.startswith(b'\211PNG\r\n\032\n') and
       (data[12:16] == b'IHDR')):
        content_type = 'image/png'
        w, h = struct.unpack(">LL", data[16:24])
        width = int(w)
        height = int(h)

    # Maybe this is for an older PNG version.
    elif (size >= 16) and data.startswith(b'\211PNG\r\n\032\n'):
        # Check to see if we have the right content type
        content_type = 'image/png'
        w, h = struct.unpack(">LL", data[8:16])
        width = int(w)
        height = int(h)

    # handle JPEGs
    elif (size >= 2) and data.startswith(b'\xff\xd8'):
        content_type = 'image/jpeg'

        try:
            jpeg = sbIO(data)  # Python 3
        except:
            jpeg = sbIO(str(data))  # Python 2

        jpeg.read(2)
        b = jpeg.read(1)
        try:
            while (b and ord(b) != 0xDA):
                while (ord(b) != 0xFF):
                    b = jpeg.read(1)
                while (ord(b) == 0xFF):
                    b = jpeg.read(1)
                if (ord(b) >= 0xC0 and ord(b) <= 0xC3):
                    jpeg.read(3)
                    h, w = struct.unpack(">HH", jpeg.read(4))
                    break
                else:
                    jpeg.read(int(struct.unpack(">H", jpeg.read(2))[0])-2)
                b = jpeg.read(1)
            width = int(w)
            height = int(h)
        except struct.error:
            pass
        except ValueError:
            pass

    return content_type, width, height

if __name__ == '__main__':
    sys.exit(run())
