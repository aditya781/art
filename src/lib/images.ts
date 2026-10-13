import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat, type ImageManipulatorContext } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import type { ImageAsset } from '@/store/projects';
import { UserError } from '@/store/toast';

/** Longest side kept for an imported photo; large enough to zoom into a cell, small enough for the GPU. */
const MAX_SIDE = 2400;
const FOLDER = 'images';

export type ImageSource = 'library' | 'camera';

/**
 * On native the asset stores a path relative to the documents folder, because the absolute path of
 * that folder changes when iOS updates the app.
 */
export function imageUri(asset: ImageAsset) {
  if (Platform.OS === 'web' || !asset.uri.startsWith(`${FOLDER}/`)) return asset.uri;
  return new File(Paths.document, asset.uri).uri;
}

function keep(result: { uri: string; width: number; height: number }): ImageAsset {
  const { width, height } = result;
  if (Platform.OS === 'web') return { uri: result.uri, width, height };
  const dir = new Directory(Paths.document, FOLDER);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const name = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.jpg`;
  new File(result.uri).moveSync(new File(dir, name));
  return { uri: `${FOLDER}/${name}`, width, height };
}

async function render(uri: string, apply?: (context: ImageManipulatorContext) => void) {
  const context = ImageManipulator.manipulate(uri);
  apply?.(context);
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
  return keep(saved);
}

/** Opens the photo library or camera and returns a resized copy owned by the app, or null if cancelled. */
export async function pickImage(source: ImageSource): Promise<ImageAsset | null> {
  if (source === 'camera' && Platform.OS !== 'web') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new UserError('Camera access is off', 'Allow the camera in Settings to take a photo.', 'settings');
    }
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const picked = result.canceled ? null : result.assets[0];
  if (!picked) return null;

  const longest = Math.max(picked.width, picked.height);
  return render(picked.uri, (context) => {
    if (longest > MAX_SIDE) {
      context.resize(picked.width >= picked.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
    }
  });
}

export async function rotateImage(asset: ImageAsset) {
  const next = await render(imageUri(asset), (context) => context.rotate(90));
  deleteImage(asset);
  return next;
}

export async function flipImage(asset: ImageAsset) {
  const next = await render(imageUri(asset), (context) => context.flip('horizontal'));
  deleteImage(asset);
  return next;
}

/** Keeps only the given rectangle, in the image's own pixels. */
export async function cropImage(asset: ImageAsset, area: { x: number; y: number; width: number; height: number }) {
  const next = await render(imageUri(asset), (context) =>
    context.crop({ originX: area.x, originY: area.y, width: area.width, height: area.height }),
  );
  deleteImage(asset);
  return next;
}

export function deleteImage(asset: ImageAsset) {
  if (Platform.OS === 'web' || !asset.uri.startsWith(`${FOLDER}/`)) return;
  try {
    const file = new File(Paths.document, asset.uri);
    if (file.exists) file.delete();
  } catch {
    // A file that is already gone needs no cleanup.
  }
}
