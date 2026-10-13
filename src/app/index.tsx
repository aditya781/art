import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SourceSheet } from '@/components/editor/source-sheet';
import { ContinueCard } from '@/components/home/continue-card';
import { HomeHeader } from '@/components/home/home-header';
import { NewDrawingButton } from '@/components/home/new-drawing-button';
import { NewDrawingSheet } from '@/components/home/new-drawing-sheet';
import { ProjectCard } from '@/components/home/project-card';
import { PrivacyPage } from '@/components/home/privacy-page';
import { SideMenu } from '@/components/home/side-menu';
import { RenameSheet } from '@/components/home/rename-sheet';
import { Welcome } from '@/components/home/welcome';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/buttons';
import { OptionRow } from '@/components/ui/option-row';
import { Segmented } from '@/components/ui/segmented';
import { Sheet } from '@/components/ui/sheet';
import { makeStyles, MaxContentWidth, radius, space, useColors, WideBreakpoint } from '@/constants/theme';
import { useHydrated } from '@/hooks/use-hydrated';
import { deleteImage, pickImage, type ImageSource } from '@/lib/images';
import { afterSheetCloses } from '@/lib/wait';
import { projectImages, useProjects, type Project } from '@/store/projects';
import { toast, toastError } from '@/store/toast';

type Kind = Project['kind'];
type Filter = 'all' | Kind;
type Dialog = { type: 'new' | 'drawer' } | { type: 'privacy'; from: 'drawer' | 'home' } | { type: 'source'; kind: Kind } | { type: 'menu' | 'rename' | 'delete'; project: Project };

const GAP = space.md;

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'grid', label: 'Grid' },
  { value: 'doodle', label: 'Doodle' },
];

export default function HomeScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const hydrated = useHydrated();
  const projects = useProjects((s) => s.projects);
  const createGrid = useProjects((s) => s.createGrid);
  const createDoodle = useProjects((s) => s.createDoodle);
  const update = useProjects((s) => s.update);
  const remove = useProjects((s) => s.remove);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const wide = width >= WideBreakpoint;
  const pad = wide ? space.xxl : space.lg;
  const contentWidth = Math.min(width - insets.left - insets.right, MaxContentWidth) - pad * 2;
  const columns = Math.max(2, Math.min(6, Math.floor((contentWidth + GAP) / (164 + GAP))));
  const cardWidth = Math.floor((contentWidth - GAP * (columns - 1)) / columns);

  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
  const latest = sorted[0];
  const earlier = sorted.slice(1);
  const shown = earlier.filter((p) => filter === 'all' || p.kind === filter);
  const close = () => setDialog(null);

  const open = (project: Pick<Project, 'kind' | 'id'>) =>
    router.push({ pathname: project.kind === 'grid' ? '/grid/[id]' : '/doodle/[id]', params: { id: project.id } });

  const start = async (kind: Kind, source: ImageSource) => {
    close();
    try {
      await afterSheetCloses();
      const image = await pickImage(source);
      if (!image) return;
      open({ kind, id: kind === 'grid' ? createGrid(image) : createDoodle(image) });
    } catch (error) {
      toastError(error);
    }
  };

  const confirmDelete = (project: Project) => {
    projectImages(project).forEach(deleteImage);
    remove(project.id);
    close();
    toast('Drawing deleted');
  };

  if (!hydrated) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <HomeHeader
        subtitle={latest ? `${sorted.length} ${sorted.length === 1 ? 'drawing' : 'drawings'}` : 'Drawing aid for artists'}
        sidePadding={pad}
        onMenu={() => setDialog({ type: 'drawer' })}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: latest ? space.xl : space.lg,
          paddingBottom: insets.bottom + (latest ? 132 : space.xxl),
          paddingLeft: insets.left + pad,
          paddingRight: insets.right + pad,
          alignItems: 'center',
        }}>
        {latest ? (
          // Returning: the drawing in progress comes first.
          <View style={[styles.content, { maxWidth: MaxContentWidth - pad * 2 }]}>
            <Animated.View entering={FadeInDown.duration(300).delay(60)} style={styles.section}>
              <AppText variant="title">Pick up where you left off</AppText>
              <ContinueCard
                project={latest}
                height={wide ? 300 : 220}
                onOpen={() => open(latest)}
                onMore={() => setDialog({ type: 'menu', project: latest })}
              />
            </Animated.View>
            {earlier.length > 0 && (
              <Animated.View entering={FadeInDown.duration(300).delay(140)} style={styles.section}>
                <View style={wide ? styles.sectionHeader : styles.section}>
                  <AppText variant="title" style={wide && styles.flex}>
                    Earlier drawings
                  </AppText>
                  <Segmented options={filters} value={filter} onChange={setFilter} style={wide && styles.filter} />
                </View>
                {shown.length === 0 ? (
                  <AppText dim style={styles.noMatch}>
                    No earlier {filter === 'grid' ? 'classic grid' : 'doodle grid'} drawings.
                  </AppText>
                ) : (
                  <View style={styles.grid}>
                    {shown.map((project, index) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        index={index}
                        width={cardWidth}
                        onOpen={() => open(project)}
                        onMore={() => setDialog({ type: 'menu', project })}
                      />
                    ))}
                  </View>
                )}
              </Animated.View>
            )}
          </View>
        ) : (
          // First time: say what the app is for and offer one clear way in.
          <View style={[styles.content, { maxWidth: MaxContentWidth - pad * 2 }]}>
            <Welcome wide={wide} onStart={(kind) => setDialog({ type: 'source', kind })} onPrivacy={() => setDialog({ type: 'privacy', from: 'home' })} />
          </View>
        )}
      </ScrollView>

      {latest && <NewDrawingButton onPress={() => setDialog({ type: 'new' })} />}

      <NewDrawingSheet visible={dialog?.type === 'new'} onClose={close} onStart={start} />
      {/* The policy opens over the menu it was reached from, and going back returns there. */}
      <SideMenu
        visible={dialog?.type === 'drawer' || (dialog?.type === 'privacy' && dialog.from === 'drawer')}
        covered={dialog?.type === 'privacy'}
        onClose={close}
        onPrivacy={() => setDialog({ type: 'privacy', from: 'drawer' })}
      />
      <PrivacyPage visible={dialog?.type === 'privacy'} onClose={() => setDialog(dialog?.type === 'privacy' && dialog.from === 'drawer' ? { type: 'drawer' } : null)} />

      <SourceSheet
        visible={dialog?.type === 'source' && dialog.kind === 'grid'}
        onClose={close}
        onPick={(source) => start('grid', source)}
        title="Classic grid"
        description="Choose the photo you want to draw."
        tint={colors.grid}
      />
      <SourceSheet
        visible={dialog?.type === 'source' && dialog.kind === 'doodle'}
        onClose={close}
        onPick={(source) => start('doodle', source)}
        title="Your doodle photo"
        description="First, a photo of the doodles you scribbled on your wall, canvas or paper. The picture you want to draw comes next."
        tint={colors.doodle}
        libraryLabel="Choose doodle photo"
        libraryHint="A photo of your doodles you already took"
        cameraLabel="Photograph your doodles"
        cameraHint="Straight on, with every doodle in view"
      />

      {dialog?.type === 'menu' && (
        <Sheet visible onClose={close} title={dialog.project.name}>
          <OptionRow icon="pencil-outline" title="Rename" tint={colors.text} onPress={() => setDialog({ type: 'rename', project: dialog.project })} />
          <OptionRow icon="trash-outline" title="Delete" tint={colors.danger} onPress={() => setDialog({ type: 'delete', project: dialog.project })} />
        </Sheet>
      )}
      {dialog?.type === 'rename' && (
        <RenameSheet
          name={dialog.project.name}
          onClose={close}
          onSave={(name) => {
            update(dialog.project.id, { name });
            close();
          }}
        />
      )}
      {dialog?.type === 'delete' && (
        <Sheet
          visible
          onClose={close}
          title="Delete this drawing?"
          description={`${dialog.project.name} and its settings will be removed from this device. Photos in your library are not touched.`}>
          <Button variant="danger" icon="trash-outline" label="Delete" onPress={() => confirmDelete(dialog.project)} />
          <Button variant="ghost" label="Keep it" onPress={close} />
        </Sheet>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { width: '100%', gap: space.xl },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  logo: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  section: { gap: space.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  filter: { width: 210 },
  noMatch: { paddingVertical: space.xl, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  fabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 54,
    paddingLeft: space.lg,
    paddingRight: space.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  },
}));
