# DCD web implementation status

Checked against the current Figma WEB frames on 2026-10-27. This file describes implemented behavior, not planned behavior.

| Screen | Current behavior | Still missing or simplified |
| --- | --- | --- |
| 00 | Headline appears line by line; poster link area opens 01. | The orange silhouette and tightening strings are a subtle image animation, not the intended 3D motion. |
| 01–02 | Guide appears after intro. On touch, one finger must pull the upper rope up-left while another simultaneously pulls the lower rope right; a mouse or pen drag on either rope counts as the equivalent gesture. A valid pull hides the guide, starts the rupture state, then shows 02. LET’S GO enters 03. | `assets/motion/opening-break.mp4` is absent, so the rupture state currently uses a short image fallback. The other rope does not visibly move because the current art is a flat image. |
| 03 | Rotation guide blinks, then the workbench opens after a timer. | Physical phone rotation is not yet required or detected. |
| 04–08 | Syringe can be dragged to either bottle, then to the doll. Injection is timed, body value changes continuously between 0–100 using image morphing, dolls can be packed and retrieved before the pack is full. | Bottle filling, needle contact, doll fitting, and packing are simplified CSS/image transitions; the Blender 3D motion assets are not connected. |
| 08A–11 | Pack and printer transitions run on timers. | No rendered pack turn/ejection video. |
| 12–14 | Expected effects and side effects support multiple checkbox selections; at least one selection is required to advance. A drawn signature enables the next button. | Page curl and signature trail effect are not implemented. |
| 15–16 | YES and TEST IT open the AR placeholder; NO opens the closing screen. | AR experience is not implemented. |

Progress after LET’S GO is saved in localStorage. Typography and major text colors use the current Source Sans 3, Doto, and Arial Figma values.
