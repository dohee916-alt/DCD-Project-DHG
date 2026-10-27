# DCD Implementation 1

Vanilla HTML/CSS/JS implementation of the confirmed Figma WEB 00–16 flow. Open `index.html` in a browser. `DCD_WEB_IMPLEMENTATION_V1.md` is the consolidated interaction specification.

## Structure

- `index.html`, `styles.css`, `app.js`: responsive screens and interactions.
- `morph.js`: continuous body interpolation using the five source images for each doll.
- `asset-config.js`: visual asset and motion replacement paths.
- `assets/figma/`: exports from the current Figma design.
- `assets/figma-render/`: per-node exports with the exact Figma crop and orientation for each web slot.
- `assets/figures/`: four dolls, five body reference images each.
- `design-layout-v1.json`: measured Figma frame and layer positions.
- `ASSET_GEOMETRY_AUDIT.md`: checked ratios and Figma node mapping for the visual assets.
- `IMPLEMENTATION_STATUS.md`: screen-by-screen list of working interactions and missing motion assets.

## Current asset gaps

The Blender rupture animation for WEB 01 does not exist as a usable video yet. The flow advances with a short still-image fallback, and the URL in `asset-config.js` is ready for the approved replacement. The syringe uses the transparent Figma image with a color overlay until suitable transparent renders are provided. WEB 15/16 enter an AR placeholder because the AR flow and camera behavior were excluded from this implementation.

The local 3D source and `.blend` files are not copied into this repository. Figma images are replaceable visual exports; the interaction rules live in code and the specification.
# Typography

The Figma `FOUNDATIONS / 02 TYPOGRAPHY / WEB — FINAL` frame and current WEB frames use three families: Source Sans 3 Bold for campaign headlines, Doto Black (`ROND` 0) for guides, and Arial for buttons and prescription information. The web stylesheet loads Source Sans 3 and Doto from Google Fonts; Arial uses the browser's installed font or Helvetica fallback. The campaign headline is 64 px with 70 px line height, and the current frame-specific type positions are reflected in `app.js`.

