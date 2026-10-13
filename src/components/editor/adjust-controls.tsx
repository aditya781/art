import { View } from 'react-native';

import { Button } from '@/components/ui/buttons';
import { Section } from '@/components/ui/section';
import { Segmented } from '@/components/ui/segmented';
import { Slider } from '@/components/ui/slider';
import { space } from '@/constants/theme';
import { defaultAdjust, type Adjust } from '@/store/projects';

type Props = { value: Adjust; onChange: (patch: Partial<Adjust>) => void; tint: string };

const percent = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}`;

const toneOptions = [
  { value: 0, label: 'Off' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 6, label: '6' },
];

export function AdjustControls({ value, onChange, tint }: Props) {
  const changed = (Object.keys(defaultAdjust) as (keyof Adjust)[]).some((key) => value[key] !== defaultAdjust[key]);
  const bipolar = { min: -1, max: 1, step: 0.01, defaultValue: 0, bipolar: true, format: percent, tint };

  return (
    <>
      <Section title="Light and colour">
        <Slider label="Brightness" value={value.brightness} onChange={(brightness) => onChange({ brightness })} {...bipolar} />
        <Slider label="Contrast" value={value.contrast} onChange={(contrast) => onChange({ contrast })} {...bipolar} />
        <Slider label="Saturation" value={value.saturation} onChange={(saturation) => onChange({ saturation })} {...bipolar} />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button
            compact
            icon="contrast-outline"
            label={value.saturation === -1 ? 'Colour' : 'Black & white'}
            onPress={() => onChange({ saturation: value.saturation === -1 ? 0 : -1 })}
            style={{ flex: 1 }}
          />
          <Button compact icon="refresh" label="Reset all" disabled={!changed} onPress={() => onChange(defaultAdjust)} style={{ flex: 1 }} />
        </View>
      </Section>
      <Section title="Tone steps" hint="Reduces the picture to a few flat tones, which makes light and shadow shapes easier to see.">
        <Segmented options={toneOptions} value={value.tones} onChange={(tones) => onChange({ tones })} />
      </Section>
    </>
  );
}
