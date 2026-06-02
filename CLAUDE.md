# CLAUDE.md

## Project: Forza Filters

Single-page image editor. Pure vanilla HTML/CSS/JS, no build tools, no dependencies except JSZip (CDN) and Vercel Analytics.

Deployed on Vercel. Entry point: `index.html`.

## Structure

```
index.html          — HTML shell + script/style tags
css/styles.css      — All styles
js/filters.js       — Filter engine (pure functions, no DOM)
js/ui.js            — Core UI: config, shared state/DOM refs, upload, preview, download, tabs
js/editor.js        — Crop, compare, rotate/flip, intensity, custom presets, watermark
js/gridsplit.js     — Grid Split tab (Instagram carousel splitter)
```

### Script load order (matters — classic scripts, no modules)
`filters.js` → `ui.js` → `editor.js` → JSZip CDN → `gridsplit.js`

Cross-file globals: functions/vars declared in earlier scripts are accessible in later ones at runtime (inside handlers/functions, not at top-level parse time).

## Key globals (declared in ui.js, used everywhere)

| Symbol | Type | Purpose |
|---|---|---|
| `srcImage` | `let` | Current loaded image (HTMLImageElement or Canvas) |
| `activeId` | `let` | Active filter ID string |
| `customPresets` | `let []` | User-saved custom filter presets |
| `filterIntensity` | `let` | 0–100, filter blend strength |
| `FILTERS` | `const []` | Built-in filter definitions |
| `THUMB` | `const` | Thumbnail size (82px) |
| `pCtx` | `const` | Preview canvas 2D context |
| `previewCanvas` | `const` | Preview canvas element |
| `dropzone` | `const` | Drop zone container |

## Key globals (declared in editor.js)

| Symbol | Purpose |
|---|---|
| `compareMode` / `cropMode` / `wmActive` | Mode flags checked in `renderPreview` (ui.js) |
| `wmPosition` / `wmCursive` | Watermark config |
| `SLIDER_DEFS` / `customSettings` | Custom filter slider definitions + current values |
| `drawWatermark(ctx, w, h)` | Draws watermark — called from ui.js and editor.js at runtime |
| `renderCompare()` / `renderCropMode()` | Called from `renderPreview` at runtime |
| `renderCustomThumb(preset)` | Called from `renderThumbs` (ui.js) at runtime |
| `exitCropMode(restore)` / `closeEditPanel(restore)` | Called from deleteBtn handler (ui.js) |

## Features

- **Filters tab**: 16 built-in filters + custom presets. Filter strip (drag-scroll). Intensity slider. Compare (before/after split drag). Crop (free + aspect ratios). Rotate/flip. Custom filter (brightness, contrast, saturation, warmth, fade, grain, vignette, sharpness). Watermark (text, opacity, 7 positions, normal/italic font).
- **Grid Split tab**: Split wide image into N tiles (2/3/4/6) at given aspect ratio (9:16, 1:1, 4:3). Pan to reposition. Download as ZIP. Tile preview strip.

## Filter architecture

`runFilter(imageData, id, w, h)` — mutates `ImageData` pixels (no DOM side effects)  
`runOverlay(ctx, id, w, h)` — draws canvas overlays (vignette, glow) after pixel pass  
Thumbnails: square-cropped, rendered in `renderThumbs()` for all 16 built-in + custom presets  
Download: renders at full source resolution, applies filter + watermark, triggers PNG download

## Conventions

- No TypeScript, no bundler, no npm
- All canvas ops use `willReadFrequently: true` on contexts that call `getImageData`
- `clamp(v)` clamps to 0–255; `lut(fn)` builds a 256-entry lookup table
- Custom presets: id = `custom-${Date.now()}`, stored in `customPresets[]`
- Grid tiles downloaded as JPEG 0.92 quality, zipped client-side via JSZip
