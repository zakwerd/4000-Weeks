# 4000 Chrome Extension

This project is a Chrome Extension (Manifest V3) that overrides the New Tab page.
The same codebase can also be hosted as a regular web demo on GitHub Pages, where it uses `localStorage` instead of `chrome.storage`.

## Local Development

Prerequisite: Node.js

1. Install dependencies:
   `npm install`
2. Run local dev server:
   `npm run dev`

## Build for Chrome

1. Build production files:
   `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `dist` folder:
   `/Users/werd/Desktop/4000-weeks/dist`

## Update Extension After Changes

1. Rebuild:
   `npm run build`
2. In `chrome://extensions`, click **Reload** on the extension card

## Run as a Hosted Demo

The app already supports a non-extension mode. When `chrome.storage` is unavailable, it automatically falls back to `localStorage`, which makes it work as a normal hosted web app.

### Local preview

1. Start the dev server:
   `npm run dev`
2. Open the local URL shown by Vite.

### GitHub Pages

1. Push this repo to GitHub.
2. In the repository settings, enable **GitHub Pages** and choose **GitHub Actions** as the source.
3. Keep the repo name as `4000-weeks` or update `VITE_BASE_PATH` in:
   [vite.config.ts](/Users/werd/Desktop/4000-weeks/vite.config.ts)
   [.github/workflows/deploy-pages.yml](/Users/werd/Desktop/4000-weeks/.github/workflows/deploy-pages.yml)
   [package.json](/Users/werd/Desktop/4000-weeks/package.json)
4. Push to `main` or manually run the **Deploy Demo** workflow.

The hosted demo will publish the same UI as a standard web app, using browser `localStorage` for persistence.

## Key Extension Files

- Manifest source: `public/manifest.json`
- Packaged manifest: `dist/manifest.json`
- Icons source: `public/icons/*`
