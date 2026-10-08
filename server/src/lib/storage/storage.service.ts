import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { env, isTest } from '../../config/env.js';
import { logger } from '../logger.js';

export interface UploadInput {
  buffer: Buffer;
  /** File extension without the dot, e.g. "jpg". */
  extension: string;
}

export interface StoredFile {
  url: string;
  /** Provider-specific identifier used to delete the file later. */
  key: string;
}

/** Abstraction over image storage (see ADR-0004). */
export interface StorageService {
  upload(file: UploadInput, folder: string): Promise<StoredFile>;
  remove(key: string): Promise<void>;
}

/** Directory used by the local adapter; also served statically at /uploads. */
export const LOCAL_UPLOAD_DIR = isTest
  ? path.join(os.tmpdir(), 'campuskonnect-test-uploads')
  : path.resolve(process.cwd(), 'uploads');

export class LocalDiskStorage implements StorageService {
  constructor(
    private readonly root: string,
    private readonly publicBaseUrl: string,
  ) {}

  async upload(file: UploadInput, folder: string): Promise<StoredFile> {
    const key = `${folder}/${randomUUID()}.${file.extension}`;
    const target = path.join(this.root, key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.buffer);
    return { key, url: `${this.publicBaseUrl}/uploads/${key}` };
  }

  async remove(key: string): Promise<void> {
    const target = path.resolve(this.root, key);
    // Never delete outside the upload root.
    if (!target.startsWith(path.resolve(this.root) + path.sep)) return;
    await unlink(target).catch(() => undefined);
  }
}

export class CloudinaryStorage implements StorageService {
  constructor(cloudName: string, apiKey: string, apiSecret: string) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  upload(file: UploadInput, folder: string): Promise<StoredFile> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `campuskonnect/${folder}`,
          resource_type: 'image',
          // Resize large photos and let Cloudinary pick the best format/quality for each device.
          transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
          format: 'webp',
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve({ url: result.secure_url, key: result.public_id });
        },
      );
      stream.end(file.buffer);
    });
  }

  async remove(key: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(key);
    } catch (err) {
      logger.warn({ err, key }, 'Failed to delete image from Cloudinary');
    }
  }
}

export const storageService: StorageService =
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
    ? new CloudinaryStorage(
        env.CLOUDINARY_CLOUD_NAME,
        env.CLOUDINARY_API_KEY,
        env.CLOUDINARY_API_SECRET,
      )
    : new LocalDiskStorage(LOCAL_UPLOAD_DIR, env.API_URL);
