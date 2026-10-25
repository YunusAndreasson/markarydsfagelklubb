/**
 * Native image utilities for M10 — the single place that touches `expo-image-picker`,
 * `expo-image-manipulator` and `expo-file-system`. The `ImageUpload` component
 * composes these: pick (camera/library) → process (downscale + JPEG) → read bytes,
 * then hands the bytes to the storage data module for the signed-URL upload.
 *
 * Uses the shared 8 MiB limit with a phone-sized 1600px long side and quality
 * 0.82, normalizing *everything* to JPEG — which converts HEIC, strips
 * EXIF, and makes the resulting MIME/extension deterministic, so the upload path
 * scheme (`…/avatar.jpg`, `…/observations/<uuid>.jpg`) is always valid.
 *
 * Library picking is permissionless on modern OSes (iOS PHPicker / Android Photo
 * Picker), so only the camera needs an explicit permission gate.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';

import { MAX_UPLOAD_BYTES, type AllowedMime } from '@/lib/validation/storage';

export type ImageShape = 'rectangle' | 'square';

/** A raw asset straight from the picker, before processing. */
export type RawAsset = { uri: string; width: number; height: number };

/** An upload-ready JPEG: processed file + the metadata `createUploadUrl` needs. */
export type PickedImage = {
  uri: string;
  mimeType: AllowedMime;
  sizeBytes: number;
  width: number;
  height: number;
};

export type PermissionState = { granted: boolean; canAskAgain: boolean };

/** Thrown by {@link processImage} when the encoded JPEG still exceeds 8 MiB. */
export class ImageTooLargeError extends Error {
  constructor() {
    super('Image exceeds the upload size limit');
    this.name = 'ImageTooLargeError';
  }
}

/** Long-side cap per shape (avatars need far less resolution than fynd photos). */
const MAX_DIMENSION: Record<ImageShape, number> = { square: 1024, rectangle: 1600 };
const JPEG_QUALITY = 0.82;

/** Ask for camera access; the library path doesn't need a permission. */
export async function ensureCameraPermission(): Promise<PermissionState> {
  const res = await ImagePicker.requestCameraPermissionsAsync();
  return { granted: res.granted, canAskAgain: res.canAskAgain };
}

function firstAsset(result: ImagePicker.ImagePickerResult): RawAsset | null {
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

/**
 * Launch the system camera. Square shapes get the built-in square crop; rectangle
 * shapes are taken as-is (iOS `allowsEditing` only ever crops square, so we skip
 * it for fynd photos and downscale instead). Returns `null` if the user cancels.
 */
export async function takePhoto(shape: ImageShape): Promise<RawAsset | null> {
  const editing = shape === 'square';
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: editing,
    aspect: editing ? [1, 1] : undefined,
    quality: 1,
  });
  return firstAsset(result);
}

/** Launch the system photo library (permissionless). Returns `null` on cancel. */
export async function pickFromLibrary(shape: ImageShape): Promise<RawAsset | null> {
  const editing = shape === 'square';
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: editing,
    aspect: editing ? [1, 1] : undefined,
    quality: 1,
  });
  return firstAsset(result);
}

/**
 * Downscale the long side to the shape's cap (only if larger — never upscale),
 * compress, and re-encode as JPEG. Reads the encoded size off the filesystem and
 * rejects anything still above the 8 MiB ceiling.
 */
export async function processImage(asset: RawAsset, shape: ImageShape): Promise<PickedImage> {
  const cap = MAX_DIMENSION[shape];
  // The cap is applied while DECODING: the native decoder downsamples as it
  // reads, so a 48 MP camera photo never sits in memory at full size. Decoding it
  // whole and then resizing peaked at ~190 MB of pixels for a single photo — an
  // out-of-memory crash on a low-end Android phone. Bounding both sides caps the
  // longer one, keeps the aspect ratio, never upscales, and applies to the photo
  // as displayed (EXIF orientation is baked in first).
  const context = ImageManipulator.manipulate(asset.uri, { maxWidth: cap, maxHeight: cap });
  const ref = await context.renderAsync();
  const result = await ref.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });

  const sizeBytes = new File(result.uri).size ?? 0;
  if (sizeBytes <= 0) throw new Error('Kunde inte läsa bildstorlek');
  if (sizeBytes > MAX_UPLOAD_BYTES) throw new ImageTooLargeError();

  return { uri: result.uri, mimeType: 'image/jpeg', sizeBytes, width: result.width, height: result.height };
}

/** Read a local file's raw bytes for the signed-URL upload. */
export async function readBytes(uri: string): Promise<ArrayBuffer> {
  return new File(uri).arrayBuffer();
}
