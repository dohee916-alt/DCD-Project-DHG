# Eclipse blister: Blender material to web asset

Source files: read-only `/Users/gweondohee/Downloads/new blisterpack/*.obj` and `*.mtl`.

## Confirmed export method

Blender's glTF exporter transfers supported Principled BSDF values and image textures. It does not run the Blender procedural shader graph in the browser. For the fine seal texture, use an image-based Base Color, metallic/roughness map, and tangent-space Normal Map connected to Principled BSDF. Pack those images into a GLB. `GLTFLoader` in Three.js reads the three maps and the glTF transmission/IOR extensions.

The approved four-cavity diamond pitch (0.35 source units), metallic factor (0.84), and roughness variation (0.17–0.36) are represented in the generated maps and GLBs. New masks follow the new ellipse centres and radii. The Fusion film's original groups are preserved as a separate flat seal and four formed wells, with distinct web materials. The flat seal carries a masked normal map, while the wells stay smooth and have stronger edge reflections. The previous whole-film opacity override obscured the difference between these shapes; only consent mode now overrides their imported materials. The new Fusion film and foil OBJ meshes are embedded as actual GLB geometry, not screenshots.

Generated assets: `outputs/dcd-web/assets/models/blister-four-{clear,foil}.glb` and `blister-single-{clear,foil}.glb`. Matching PNG maps are in `outputs/dcd-blister-eclipse/maps/`. The four-cavity pair replaces the old names used by the live web app. The single-cavity pair is prepared, but the opening poster still uses its existing image and motion flow.

## Visual limits

This is an image-map reconstruction of the approved material values. It is not a verified bake from the Blender `.blend` shader, so its lighting and cavity-area wrinkles are not proven pixel-identical to the Blender render. To carry the final Blender-only folds into the web asset, create/approve the new ellipse foil geometry in Blender and export it with the same image maps. Exporting procedural Bump nodes directly will omit their effect; bake their result to a tangent-space normal image first. The HTML doll canvases remain outside the WebGL scene, so this version does not refract their images through the wells.

The browser viewer uses its own environment and lighting, so even a correctly baked GLB can look different from a Cycles render. For the workbench view, the browser looks perpendicularly at the open, foil-free side and reverses the film depth so the wells recede. The four-cavity assets have not passed browser visual review because the available in-app browser blocks local `file://` URLs.

## Rebuild

`python3 outputs/dcd-web/build_eclipse_web_assets.py`

The script leaves the Downloads source untouched. The original four-cavity web GLBs and `models-data.js` are retained in `outputs/dcd-blister-eclipse/previous-web-assets/`.
