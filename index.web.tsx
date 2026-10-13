import '@expo/metro-runtime';

import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

// CanvasKit has to be ready before any screen that draws with Skia is rendered.
LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(() => {
  renderRootComponent(App);
});
