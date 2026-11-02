# DCD asset layer update

- WEB 04–08: use the Figma clear-back pack image. Dolls appear front-facing on the workbench tray and switch to the matching back image when placed in the pack. Each doll retains one body value for both views.
- WEB 08A–08B: keep the clear-back pack and back-facing dolls together while the pack slides away.
- WEB 09–11: use the separate foil image for the packaged back.
- WEB 12–16: use foil behind the front-facing dolls and the clear-front image over them.
- The four-cavity 3D pack is no longer loaded in the website. The syringe remains a 3D asset.
- Doll assets are named `doll-XX-level-YY-front.png` and `doll-XX-level-YY-back.png`, for dolls 01–04 and body levels 00–03. The `manifest.json` lists source mappings. The Downloads originals are untouched.
- The prescription pages are still the previous layout. The user will redraw their unified Figma template; that future update removes the clipboard and paper-turn interaction. The packaged-back to front-pack transition will use a user-supplied video.
- The web now uses PNG exports of the Figma nodes rather than their raw image fills for the three pack layers, tray, two bottles, conveyor and machine. These exports preserve Figma's image crop, colour adjustments and alpha. The workbench clear-back pack is rotated 180° in CSS; the front pack layers are portrait-oriented.
- WEB 03 blinks the rotate instruction three times. The workbench tutorial starts only after that cycle and a landscape screen or physical device-orientation event. The tutorial uses one moving hand; its fingertip lands at the orange bottle mouth. The reference ghost hand and arrow are not rendered.
- Doll placement preloads the matching back image and rotates the moving doll edge-on before switching its view. The packed doll and pack use shared slot coordinates.
