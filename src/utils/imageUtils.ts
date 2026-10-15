/**
 * Image helpers for the Menu Customizer.
 *
 * Any image file the user picks or drag-drops (JPG, PNG, WebP, GIF, BMP, SVG...)
 * is converted into a data URL, downscaled and compressed so it stays small
 * enough to persist in browser localStorage (quota is ~5MB).
 */

export const MAX_IMAGE_DIMENSION = 800;
export const IMAGE_QUALITY = 0.85;

// Raster formats we safely round-trip through a canvas.
const RASTER_PATTERN = /^image\/(jpeg|jpg|png|webp|bmp|gif)$/i;

/**
 * Reads a File and returns a compressed data URL ready to store in a MenuItem.image field.
 * Rejects with a user-friendly message when the file is not a usable image.
 */
export function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error(`"${file.name}" is not an image file. Please choose a JPG, PNG, WebP, or similar picture.`));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read "${file.name}". Please try again.`));
    reader.onload = () => {
      const src = String(reader.result || '');
      if (!src) {
        reject(new Error(`"${file.name}" could not be loaded.`));
        return;
      }

      // Vector/unknown raster types (SVG, AVIF, ...) — store as-is, no canvas pass.
      if (!RASTER_PATTERN.test(file.type)) {
        resolve(src);
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error(`"${file.name}" is not a valid image file.`));
      img.onload = () => {
        try {
          let width = img.naturalWidth;
          let height = img.naturalHeight;
          if (width === 0 || height === 0) {
            resolve(src);
            return;
          }

          if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
            const scale = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(src);
            return;
          }

          // Flatten transparency onto white so JPEG output never shows a black background.
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
        } catch {
          // Canvas tainted or export failed — fall back to the original payload.
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/** Rough byte size of a stored string (UTF-16 chars in localStorage count double). */
export function approxStorageBytes(value: string): number {
  return value.length * 2;
}
