import multer from 'multer';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_LISTING_IMAGES = 5;

/** Keeps uploads in memory; they are validated and forwarded to the StorageService. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_LISTING_IMAGES },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});
