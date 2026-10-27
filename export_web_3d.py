"""Export existing DCD Blender work copies to web GLB files in one GUI run.

The source .blend files are opened read-only and never saved by this script.
"""

import json
import traceback
from pathlib import Path

import bpy


ROOT = Path('/Users/gweondohee/Documents/Codex/2026-10-25/new-chat/outputs')
DEST = ROOT / 'dcd-web/assets/models'
DEST.mkdir(parents=True, exist_ok=True)
STATUS = DEST / 'export-status.json'

JOBS = [
    ('syringe-empty', ROOT / 'dcd-syringe/DCD-syringe-empty-clear.blend'),
    ('syringe-orange', ROOT / 'dcd-syringe/DCD-syringe-orange.blend'),
    ('syringe-purple', ROOT / 'dcd-syringe/DCD-syringe-purple.blend'),
    ('blister-four-clear', ROOT / 'dcd-blister-four/DCD-four-cavity-PETG-EXACT-CLEAN.blend'),
    ('blister-four-foil', ROOT / 'dcd-blister-four/DCD-four-cavity-ORIGINAL-BACK-visible-diamond.blend'),
]

results = []
for label, source in JOBS:
    entry = {'name': label, 'source': str(source)}
    try:
        if not source.is_file():
            raise FileNotFoundError(source)
        bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
        if bpy.context.object and bpy.context.object.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')
        bpy.ops.object.select_all(action='DESELECT')
        selected = []
        for obj in bpy.context.scene.objects:
            if obj.type != 'MESH' or obj.hide_render or obj.hide_get():
                continue
            if any(collection.hide_render for collection in obj.users_collection):
                continue
            obj.select_set(True)
            selected.append(obj.name)
        if not selected:
            raise RuntimeError('No visible mesh objects to export')
        destination = DEST / f'{label}.glb'
        bpy.ops.export_scene.gltf(
            filepath=str(destination),
            export_format='GLB',
            use_selection=True,
            export_apply=False,
            export_animations=True,
            export_cameras=False,
            export_lights=False,
            export_yup=True,
        )
        if not destination.is_file() or destination.stat().st_size < 1000:
            raise RuntimeError('GLB was not saved')
        with destination.open('rb') as file:
            if file.read(4) != b'glTF':
                raise RuntimeError('Export is not a GLB file')
        entry.update(ok=True, bytes=destination.stat().st_size, objects=selected)
    except Exception as error:
        entry.update(ok=False, error=str(error), traceback=traceback.format_exc())
    results.append(entry)
    STATUS.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')

(DEST / 'export-complete.marker').write_text('done', encoding='utf-8')
bpy.ops.wm.quit_blender()
