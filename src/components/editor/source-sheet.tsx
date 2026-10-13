import type { ReactNode } from 'react';

import { OptionRow } from '@/components/ui/option-row';
import { Sheet } from '@/components/ui/sheet';
import type { ImageSource } from '@/lib/images';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (source: ImageSource) => void;
  title: string;
  description?: string;
  tint: string;
  libraryLabel?: string;
  libraryHint?: string;
  cameraLabel?: string;
  cameraHint?: string;
  children?: ReactNode;
};

export function SourceSheet(props: Props) {
  const { visible, onClose, onPick, title, description, tint, children } = props;
  const { libraryLabel = 'Photo library', libraryHint = 'Choose a picture you already have', cameraLabel = 'Take a photo', cameraHint = 'Use the camera now' } = props;
  return (
    <Sheet visible={visible} onClose={onClose} title={title} description={description}>
      {children}
      <OptionRow icon="images-outline" title={libraryLabel} hint={libraryHint} tint={tint} onPress={() => onPick('library')} />
      <OptionRow icon="camera-outline" title={cameraLabel} hint={cameraHint} tint={tint} onPress={() => onPick('camera')} />
    </Sheet>
  );
}
