# Figma visual asset geometry audit

Source: `DCD-Project`, WEB page (`209:4`). The positions below use each screen's 926×428 landscape or 428×926 portrait coordinates. Original Figma frames were read only.

The first implementation put full source PNGs inside Figma layer boxes. Those PNGs have transparent margins and some have a different orientation, so the visible artwork was too small or stretched. The website now uses exports of the **individual Figma nodes as displayed**, with the Figma crop, rotation, image fill transform, and filters already applied. White export canvas around isolated nodes was removed from the edges; the original source images remain unchanged in `assets/figma/`.

| Displayed asset | Figma node | Website slot x, y, w, h | Export dimensions | Result |
| --- | --- | --- | --- | --- |
| Opening composite | `334:1902` | 0, 0, 428, 926 | 428×926 | Exact portrait crop |
| Workbench background | `334:1054` | 52, 0, 874, 428 | 874×428 | Exact background crop |
| Four-cavity clear pack | `334:1055` | 574, 0, 352, 428 | 352×428 | Correct horizontal, frame-clipped view |
| Metal doll tray | `334:1056` | 303, 29, 249, 373 | 250×373 | Under 1 px rounded difference |
| Orange bottle | `334:1057` | 102, 149, 93, 88 | 93×88 | Figma crop/rotation retained |
| Purple bottle | `334:1059` | 105, 60, 87, 90 | 87×90 | Figma crop/rotation retained |
| Empty syringe | `334:1061` | 242, 195, 54, 196 | 54×196 | Figma crop/rotation retained |
| Rear foil pack, 09 | `334:1111` | 52, 0, 319, 428 | 319×428 | Printer-entry crop retained |
| Rear foil pack, 10 | `334:1128` | 97, 0, 437, 428 | 437×428 | Intermediate crop retained |
| Rear foil pack, 11 | `334:1172` | 271, 0, 437, 428 | 437×428 | Centered crop retained |
| Printer cover | `334:1113` | 52, 29, 101, 376 | 101×376 | Correct foreground cover |
| Front clear pack, 12–14 | `334:1292` | 61, 0, 448, 428 | 448×428 | Exact front view |
| Prescription clipboard, 12–14 | `334:1112` | 416, 0, 441, 428 | 441×428 | Exact front view |
| Consent pack, 15–16 | `420:506` | 184, 25, 510, 403 | 510×403 | Cropped tilted pack without fixed doll images; live dolls overlaid |
| Consent clipboard, 15–16 | `420:574` | 65, 0, 441, 428 | 441×428 | Correct clipboard base |

Doll canvases remain live and use the four source figures' five body references each. Front pack placement follows the Figma order: top left #1, top right #4, bottom left #3, bottom right #2. The same identities are mirrored in the rear workbench slots. WEB 15–16 places live dolls at the measured child positions of the Figma pack group.

`assets/figma-render/composite-web04.png`, `composite-web09.png`, and `composite-web12.png` are static geometry checks. They omit live text and gesture guides. WEB 04 and WEB 09 were visually compared to the corresponding Figma frame screenshots. Browser rendering still requires a visual QA pass because this environment rejected automated access to a local `file://` page.
