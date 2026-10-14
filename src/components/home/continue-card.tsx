import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/buttons';
import { PressableScale } from '@/components/ui/pressable-scale';
import { makeStyles, onPhoto, radius, space, themes } from '@/constants/theme';
import { imageUri } from '@/lib/images';
import type { Project } from '@/store/projects';

import { timeAgo } from './project-card';

type Props = { project: Project; height: number; onOpen: () => void; onMore: () => void };

/** The most recent drawing, large, so picking up where you left off is one tap. */
export function ContinueCard({ project, height, onOpen, onMore }: Props) {
  const styles = useStyles();
  const grid = project.kind === 'grid';
  // The card is always a dark gradient over the photo, so it uses the bright dark-theme tints.
  const tint = grid ? themes.dark.grid : themes.dark.doodle;
  const cover = grid ? project.image : project.doodle;

  return (
    <View>
      <PressableScale accessibilityRole="button" accessibilityLabel={`Continue ${project.name}`} haptic scaleTo={0.98} onPress={onOpen} onLongPress={onMore} style={[styles.card, { height }]}>
        <Image source={{ uri: imageUri(cover) }} contentFit="cover" transition={200} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(12,12,15,0)', 'rgba(12,12,15,0.55)', 'rgba(12,12,15,0.94)']} locations={[0.3, 0.65, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.footer}>
          <View style={styles.text}>
            <AppText variant="caption" color={tint}>
              {grid ? 'CLASSIC GRID' : 'DOODLE GRID'} · {timeAgo(project.updatedAt).toUpperCase()}
            </AppText>
            <AppText variant="title" color={onPhoto.text} numberOfLines={1}>
              {project.name}
            </AppText>
          </View>
          <View style={[styles.go, { backgroundColor: tint }]}>
            <AppText variant="label" color={themes.dark.onTint}>
              Continue
            </AppText>
            <Ionicons name="arrow-forward" size={18} color={themes.dark.onTint} />
          </View>
        </View>
      </PressableScale>
      <IconButton icon="ellipsis-horizontal" label={`Options for ${project.name}`} size={36} background={onPhoto.chip} color={onPhoto.text} onPress={onMore} style={styles.more} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceHigh,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    justifyContent: 'flex-end',
  },
  footer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, padding: space.lg },
  text: { flex: 1, gap: space.xs },
  go: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 44, paddingHorizontal: space.lg, borderRadius: radius.pill },
  more: { position: 'absolute', right: space.md, top: space.md },
}));
