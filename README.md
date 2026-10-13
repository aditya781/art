# GridSketch

A drawing aid for artists, built with Expo (React Native). It runs on iOS, Android and the web.

- **Classic grid**: put a grid over a photo. Adjust columns, rows, square cells, diagonals, labels, line colour, thickness and opacity. Pick a paper size to get the cell size in cm or inches. Focus mode zooms into one cell at a time and tracks which cells are done.
- **Doodle grid**: photograph random doodles on your wall or paper, lay the reference picture over the photo, and line it up by dragging, pinching, rotating or pulling a corner to match perspective. Change opacity and blend mode to see the doodles through the picture.
- Both editors have brightness, contrast, saturation and tone-step adjustments, a canvas lock that keeps the screen awake, and full-resolution export.

## Run it

Use Node 20 or newer.

```bash
npm install
npx expo start
```

Then scan the QR code with Expo Go on a phone, or press `w` to open it in a browser.

## Checks

```bash
npm run typecheck
npm run lint
npx expo-doctor
```

## Layout

- `src/app` holds the screens: home, `grid/[id]` and `doodle/[id]`.
- `src/components/editor` is the frame shared by both editors.
- `src/components/grid` and `src/components/doodle` draw each scene with Skia and hold their control panels.
- `src/store/projects.ts` saves drawings and their settings on the device.
- `src/lib` has image import, export, grid maths and the perspective maths.

`.npmrc` points this project at the public npm registry.
