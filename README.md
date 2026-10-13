<p align="center">
  <img src="assets/images/logo.png" width="96" alt="GridSketch logo" />
</p>

<h1 align="center">GridSketch</h1>

<p align="center">
  A drawing aid for artists. Put a grid over any photo and draw it one square at a time.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Android%20%7C%20iOS%20%7C%20Web-6253EC" alt="Platforms: Android, iOS, Web" />
  <img src="https://img.shields.io/badge/Expo%20SDK-57-000020?logo=expo&logoColor=white" alt="Expo SDK 57" />
  <img src="https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black" alt="React Native 0.86" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">
  <a href="#overview">Overview</a> ·
  <a href="#features">Features</a> ·
  <a href="#privacy">Privacy</a> ·
  <a href="#tech-stack">Tech stack</a> ·
  <a href="#getting-started">Getting started</a> ·
  <a href="#scripts">Scripts</a> ·
  <a href="#project-structure">Project structure</a>
</p>

---

## Overview

GridSketch helps artists transfer a picture onto paper, canvas or a wall with accurate proportions. It offers two methods: the classic grid, where the reference photo is divided into measured squares, and the doodle grid, where the artist's own scribbles act as landmarks and no measuring is needed. The app works entirely on the device and needs neither an account nor a network connection.

## Features

<table>
  <tr>
    <th width="50%" align="left">Classic grid</th>
    <th width="50%" align="left">Doodle grid</th>
  </tr>
  <tr>
    <td valign="top">
      Even squares over the reference photo, sized to the paper.
      <ul>
        <li>Adjustable columns and rows, with an option to lock cells to squares</li>
        <li>Diagonals and cell labels</li>
        <li>Line colour, thickness and opacity</li>
        <li>Paper sizes that give the cell size in centimetres or inches</li>
        <li>Focus mode: one cell at a time, with completed cells tracked</li>
      </ul>
    </td>
    <td valign="top">
      A measurement-free method for large surfaces.
      <ol>
        <li>Scribble random doodles over the wall, canvas or paper.</li>
        <li>Photograph the whole surface straight on.</li>
        <li>Lay the reference over the photo and draw what lands on each doodle.</li>
      </ol>
      Move, resize, rotate and correct the perspective of the reference by touch. Opacity and blend modes show the doodles through the picture.
    </td>
  </tr>
</table>

| Feature | Description |
| --- | --- |
| Image adjustments | Brightness, contrast, saturation and tone steps for the reference, available in both editors |
| Crop, rotate and flip | Reframe the picture without leaving the editor |
| Canvas lock | Freezes the view and keeps the screen awake, so the phone can sit beside the drawing |
| Export | Saves a full-resolution image to the photo library or sends it to any other app |
| Saved drawings | Every drawing and its settings are stored automatically and can be resumed from the home screen |
| Reminders | Optional notifications to continue an unfinished drawing, scheduled on the phone itself |
| Themes | Light and dark |

## Privacy

GridSketch collects no data. There is no account, no server, no advertising and no analytics. Photos and drawings are stored only on the device and leave the app only when the user exports or shares them. The full privacy policy is available inside the app, under the menu.

## Tech stack

| Area | Technology | Used for |
| --- | --- | --- |
| Framework | [Expo](https://expo.dev) SDK 57, React Native 0.86, React 19 | One codebase for Android, iOS and the web |
| Navigation | Expo Router | File-based screens with typed routes |
| Rendering | [React Native Skia](https://shopify.github.io/react-native-skia/) | Drawing the grid, the picture layers and the exported image |
| Motion and gestures | Reanimated 4, React Native Gesture Handler | Pan, pinch, rotate and perspective handles on the canvas |
| State and storage | Zustand | Drawings and settings, persisted on the device |
| Language | TypeScript (strict) | Type safety across the app |
| Build | EAS Build | Signed Android builds in the cloud |

## Getting started

Requires Node.js 20 or newer, and either the [Expo Go](https://expo.dev/go) app on a phone or a web browser.

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `w` to open the app in a browser. Add dependencies with `npx expo install <package>` so that versions stay compatible with the Expo SDK.

To produce an installable Android APK, use the `preview` profile in `eas.json`:

```bash
npx eas-cli@latest build --profile preview --platform android
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start the development server |
| `npm run android` / `npm run ios` / `npm run web` | Start the server and open the app on that platform |
| `npm run typecheck` | Check types with TypeScript; run before committing |
| `npm run lint` | Lint the project; run before committing |
| `npx expo-doctor` | Check dependencies and configuration for problems |

## Project structure

| Path | Contents |
| --- | --- |
| `src/app` | Screens: home, `grid/[id]` and `doodle/[id]` |
| `src/components/home` | Drawing cards, the new drawing sheet, the side menu and the privacy page |
| `src/components/editor` | The frame shared by both editors, the crop view and the picture source sheet |
| `src/components/grid` | The classic grid scene and its control panels |
| `src/components/doodle` | The doodle grid scene and its control panels |
| `src/components/ui` | Buttons, sheets, sliders, toggles and the splash screen |
| `src/constants` | Colours, spacing and fonts for both themes |
| `src/hooks` | View transform, reminders and store hydration |
| `src/lib` | Image import and export, grid and paper maths, perspective maths, reminders |
| `src/store` | Drawings, settings and in-app messages |

`.npmrc` points the project at the public npm registry.

---

<p align="center">
  Built by <a href="https://github.com/aditya781">Aditya Sonawane</a>
</p>
