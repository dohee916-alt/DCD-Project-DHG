# DCD Implementation 1

Vanilla HTML/CSS/JS implementation of the confirmed Figma WEB 00–16 flow. Open `index.html` in a browser. `DCD_WEB_IMPLEMENTATION_V1.md` is the consolidated interaction specification.

## Structure

- `index.html`, `styles.css`, `app.js`: responsive screens and interactions.
- `morph.js`: continuous body interpolation using the five source images for each doll.
- `asset-config.js`: visual asset and motion replacement paths.
- `assets/figma/`: exports from the current Figma design.
- `assets/figures/`: four dolls, five body reference images each.
- `design-layout-v1.json`: measured Figma frame and layer positions.

## Current asset gaps

The Blender rupture animation for WEB 01 does not exist as a usable video yet. The flow advances with a short still-image fallback, and the URL in `asset-config.js` is ready for the approved replacement. The syringe uses the transparent Figma image with a color overlay until suitable transparent renders are provided. WEB 15/16 enter an AR placeholder because the AR flow and camera behavior were excluded from this implementation.

The local 3D source and `.blend` files are not copied into this repository. Figma images are replaceable visual exports; the interaction rules live in code and the specification.
