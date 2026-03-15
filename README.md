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

## Key Extension Files

- Manifest source: `public/manifest.json`
- Packaged manifest: `dist/manifest.json`
- Icons source: `public/icons/*`
