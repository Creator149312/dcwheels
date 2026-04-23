// Lazy wrapper around `browser-image-compression`.
//
// The library is ~60KB min+gz and is only needed the first time a user
// actually picks an image. Importing it statically adds that weight to every
// editor page load (4 call sites across SegmentListEditor, SettingsAdv,
// ImageUpload and ContentEditableDivImageTest). Going through this helper
// keeps the import out of the main bundle until the first upload click.

let modulePromise = null;

/**
 * Compress an image File/Blob client-side. Same options object as the
 * upstream lib — see https://github.com/Donaldcwl/browser-image-compression
 */
export async function compressImage(file, options) {
  if (!modulePromise) {
    modulePromise = import("browser-image-compression").then(
      (mod) => mod.default || mod
    );
  }
  const imageCompression = await modulePromise;
  return imageCompression(file, options);
}
