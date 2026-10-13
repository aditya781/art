import { ImageFormat, type SkImage } from '@shopify/react-native-skia';

export type ExportAction = 'save' | 'share';

/** Browsers have no photo library, so both actions download the JPEG. */
export async function exportImage(image: SkImage, _action: ExportAction, name: string): Promise<string> {
  const link = document.createElement('a');
  link.href = `data:image/jpeg;base64,${image.encodeToBase64(ImageFormat.JPEG, 92)}`;
  link.download = `${name}-${Date.now().toString(36)}.jpg`;
  link.click();
  return 'Image downloaded';
}
