import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/buttons';
import { PressableScale } from '@/components/ui/pressable-scale';
import { makeStyles, onPhoto, radius, space, themes, useColors } from '@/constants/theme';
import { imageUri } from '@/lib/images';
import { exit } from '@/lib/motion';
import type { Project } from '@/store/projects';

type Props = { project: Project; index: number; width: number; onOpen: () => void; onMore: () => void };

export function timeAgo(timestamp: number) {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} h ago`;
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / 1440)} d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function ProjectCard({ project, index, width, onOpen, onMore }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const grid = project.kind === 'grid';
  // The badge sits on a dark chip over the photo in both themes.
  const tint = grid ? themes.dark.grid : themes.dark.doodle;
  const cover = grid ? project.image : project.doodle;

  return (
    <Animated.View entering={FadeInDown.duration(280).delay(Math.min(index, 8) * 45)} exiting={exit(FadeOut.duration(150))} layout={LinearTransition.duration(220)} style={{ width }}>
      <PressableScale accessibilityRole="button" accessibilityLabel={`Open ${project.name}`} onPress={onOpen} onLongPress={onMore} style={styles.card}>
        <View style={styles.thumb}>
          <Image source={{ uri: imageUri(cover) }} contentFit="cover" transition={200} style={StyleSheet.absoluteFill} />
          <View style={styles.badge}>
            <Ionicons name={grid ? 'grid-outline' : 'brush-outline'} size={12} color={tint} />
            <AppText variant="caption" color={tint}>
              {grid ? 'Grid' : 'Doodle'}
            </AppText>
          </View>
        </View>
        <View style={styles.meta}>
          <AppText variant="label" numberOfLines={1}>
            {project.name}
          </AppText>
          <AppText variant="caption" color={colors.textFaint}>
            {timeAgo(project.updatedAt)}
          </AppText>
        </View>
      </PressableScale>
      {/* A sibling of the card, not a child: a button inside a button is invalid on web. */}
      <IconButton icon="ellipsis-horizontal" label={`Options for ${project.name}`} size={32} background={onPhoto.chip} color={onPhoto.text} onPress={onMore} style={styles.more} />
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: { gap: space.sm },
  thumb: { aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceHigh },
  badge: {
    position: 'absolute',
    left: space.sm,
    top: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: onPhoto.chip,
  },
  more: { position: 'absolute', right: space.sm, top: space.sm },
  meta: { gap: 2, paddingHorizontal: 2 },
}));
