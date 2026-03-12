# 4000 Chrome Extension

This project is a Chrome Extension (Manifest V3) that overrides the New Tab page.

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

## Key Extension Files

- Manifest source: `public/manifest.json`
- Packaged manifest: `dist/manifest.json`
- Icons source: `public/icons/*`
