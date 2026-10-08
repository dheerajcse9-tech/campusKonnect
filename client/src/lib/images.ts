export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1600;

/**
 * Downscales a photo in the browser before upload. Phone cameras produce
 * 3–8 MB images, which would exceed the 5 MB limit and waste mobile data.
 * Falls back to the original file if the browser can't decode it.
 */
export async function prepareImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export function validateImage(file: File): string | null {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type))
    return `${file.name}: use a JPEG, PNG, WebP or GIF image`;
  if (file.size > MAX_UPLOAD_BYTES) return `${file.name}: images must be under 5 MB`;
  return null;
}
