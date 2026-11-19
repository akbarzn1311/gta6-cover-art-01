// Sunset Press — photos.
//
// Photos live only in memory and in the browser: a FileReader turns an
// uploaded file into a data URL, an <img> loads it, and nothing is ever sent
// anywhere. The two kit samples are the only built-in photos; everything
// else comes from the user's own machine.

let nextId = 1;

/** Load an image element from a URL or data URL. */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load image ${src.slice(0, 60)}`));
    img.src = src;
  });
}

/** Wrap a loaded image as a photo record. */
export function makePhoto(img, name) {
  return { id: nextId, name: name || `photo-${nextId}`, img };
}

/** Load a File object (from <input type=file>) as a photo. */
export function loadPhotoFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const img = await loadImage(reader.result);
        resolve(makePhoto(img, file.name));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('could not read file'));
    reader.readAsDataURL(file);
  });
}

/** Load the kit's two sample photos (free to use, made for make.fun). */
export async function loadSamples() {
  const [a, b] = await Promise.all([
    loadImage('samples/boulevard.jpg'),
    loadImage('samples/pier.jpg'),
  ]);
  return [makePhoto(a, 'boulevard.jpg'), makePhoto(b, 'pier.jpg')];
}

/** A photo's natural size, for cover-fit math. */
export function photoSize(photo) {
  const img = photo.img;
  return { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
}
