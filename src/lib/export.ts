import { ImageFormat, type SkImage } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { UserError } from '@/store/toast';

export type ExportAction = 'save' | 'share';

class PhotosDeniedError extends UserError {}

const denied = () => new PhotosDeniedError('Photos access is off', 'Allow photos in Settings to save your image.', 'settings');

/**
 * Saves a file to the photo library. The media library is loaded on demand because Expo Go does
 * not ship every version of its native module; importing it at the top would crash the app there.
 * Returns false when no media library is available at all.
 */
async function saveToPhotos(uri: string): Promise<boolean> {
  try {
    const MediaLibrary = await import('expo-media-library');
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) throw denied();
    await MediaLibrary.Asset.create(uri);
    return true;
  } catch (error) {
    if (error instanceof PhotosDeniedError) throw error;
  }
  try {
    const Legacy = await import('expo-media-library/legacy');
    const permission = await Legacy.requestPermissionsAsync(true);
    if (!permission.granted) throw denied();
    await Legacy.saveToLibraryAsync(uri);
    return true;
  } catch (error) {
    if (error instanceof PhotosDeniedError) throw error;
  }
  return false;
}

/** Writes the image as a JPEG and saves it to Photos or opens the share sheet. Returns a message for the user. */
export async function exportImage(image: SkImage, action: ExportAction, name: string): Promise<string> {
  const file = new File(Paths.cache, `${name}-${Date.now().toString(36)}.jpg`);
  file.create({ overwrite: true });
  file.write(image.encodeToBytes(ImageFormat.JPEG, 92));

  if (action === 'save' && (await saveToPhotos(file.uri))) return 'Saved to Photos';

  // Also the fallback when saving directly is not possible: the share sheet can save the image.
  await Sharing.shareAsync(file.uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg' });
  return 'Ready to share';
}
