"""After Blender exports approved work files, embed their GLBs for local-file preview.

Run with any Python 3 interpreter. This never edits the original .blend files.
"""
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'assets/models/blender-approved'
NAMES = ('syringe-empty', 'syringe-orange', 'syringe-purple',
         'blister-four-clear', 'blister-four-foil')
payload = {}
for name in NAMES:
    path = SOURCE / (name + '.glb')
    data = path.read_bytes()
    if data[:4] != b'glTF' or len(data) < 1000:
        raise ValueError(f'Invalid GLB: {path}')
    payload[name] = base64.b64encode(data).decode('ascii')

output = ROOT / 'models-data.js'
output.write_text('window.DCD_MODELS=Object.freeze(' +
                  json.dumps(payload, separators=(',', ':')) + ');\n',
                  encoding='utf-8')
print(f'Embedded {len(payload)} approved Blender exports into {output}')
