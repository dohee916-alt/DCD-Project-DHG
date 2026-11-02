# DCD asset layer update

- WEB 04–08: use the Figma clear-back pack image. Dolls appear front-facing on the workbench tray and switch to the matching back image when placed in the pack. Each doll retains one body value for both views.
- WEB 08A: keep the clear-back pack and back-facing dolls together in one continuous rightward slide before WEB 09.
- WEB 09–11: use the separate foil image for the packaged back.
- WEB 12–16: use foil behind the front-facing dolls and the clear-front image over them.
- The website now loads neither the four-cavity 3D pack nor the 3D syringe. The WEB 04 syringe is assembled from the Figma barrel, plunger, and orange/purple liquid exports. The liquid is revealed/hidden inside a barrel mask as the plunger moves.
- Doll assets are named `doll-XX-level-YY-front.png` and `doll-XX-level-YY-back.png`, for dolls 01–04 and body levels 00–03. The `manifest.json` lists source mappings. The Downloads originals are untouched.
- The prescription pages are still the previous layout. The user will redraw their unified Figma template; that future update removes the clipboard and paper-turn interaction. The packaged-back to front-pack transition will use a user-supplied video.
- The web uses PNG exports of Figma nodes, preserving image crop, color adjustments and alpha. WEB 04's updated clear-back pack uses its landscape export at 483 × 229, without a CSS rotation. The two new bottle exports replace the older pair. The clear-front overlay is shown at 70% opacity where layered over the foil and dolls.
- WEB 03 blinks the rotate instruction three times. The workbench tutorial starts only after that cycle and a landscape screen or physical device-orientation event. The tutorial uses the adjusted WEB 04 hand export at its Figma bounding box and SCREEN blend mode. The export already contains the Figma 50% node opacity. The fingertip animates to the orange bottle mouth. The reference ghost hand and arrow are not rendered.
- Doll placement preloads the matching back image and rotates the moving doll edge-on before switching its view. The packed dolls use WEB 04's measured four slots (638,131), (843,131), (638,229), (843,229), with head on the left and feet on the right.
