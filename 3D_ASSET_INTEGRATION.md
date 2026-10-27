# Web 3D asset integration

The opening motion poster remains outside this integration. The interactive workbench and later four-cavity pack screens now load real GLB geometry through Three.js. `models-data.js` embeds the GLB bytes so the local `file://` preview does not depend on network requests.

| Screen | Web model | Source geometry |
| --- | --- | --- |
| 04–08 syringe | `syringe-empty`, `syringe-orange`, `syringe-purple` | Four read-only STL parts in `Downloads/3dasset/adamempdz/seringue-medicale`; a separate drug mesh is added for filled states |
| 04–08, 08A–08B clear pack | `blister-four-clear` | Read-only Fusion `Blisterpack.obj` |
| 09–11 foil back | `blister-four-foil` | Read-only Fusion `Blisterpack.obj` and `multi_foil.obj` |
| 12–16 front pack | `blister-four-foil` | Same two Fusion OBJ files, viewed from the front |

The dolls continue to use the approved image-based continuous body morph. The two bottles remain fixed visual assets, as specified earlier. The opening single-cavity blister is excluded by the current request.

The installed Blender 4.3.2 did not execute the batch export in this environment: LaunchServices returned `-10827` for the app call, and direct execution ended with exit 134 before the export script ran. The executable exists, so this does **not** establish that Blender cannot be opened normally on the user's Mac. The `.blend` files and all source meshes are untouched. `export_web_3d.py` is a single-run script for replacing the source-derived GLBs with exports from the existing working `.blend` files when Blender execution is available.

The shipped GLBs preserve source geometry but reconstruct PBR materials for the browser. The four-cavity foil normal map is derived from the project's approved `source-matched-fine-seal-height.png`; the final Blender-only foil indentations and procedural shading are not fully transferable through this fallback. The model loader and glTF material extensions have been parsed in Three.js for the syringe and clear pack. Browser appearance still needs a visual check in the local preview.
