import { BadRequestError } from '../errors.js';

/**
 * Identifies an image by its magic bytes. The client-supplied MIME type is not
 * trusted, so this is the authoritative check.
 */
export function detectImageExtension(buffer: Buffer): 'jpg' | 'png' | 'webp' | 'gif' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return 'jpg';
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6)))
    return 'gif';
  return null;
}

export function requireImage(buffer: Buffer): 'jpg' | 'png' | 'webp' | 'gif' {
  const extension = detectImageExtension(buffer);
  if (!extension) throw new BadRequestError('Only JPEG, PNG, WebP or GIF images are allowed');
  return extension;
}
