"""Build real web GLBs from read-only Fusion OBJ and syringe STL geometry.

This path is used when the installed Blender GUI cannot export the approved
.blend work files. Geometry is original; web PBR materials are reconstructed.
"""

import json
import math
import struct
import base64
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image
from trimesh.visual import TextureVisuals
from trimesh.visual.material import PBRMaterial


SOURCE = Path('/Users/gweondohee/Downloads/3dasset')
ROOT = Path(__file__).parent
OUT = ROOT / 'assets/models'
OUT.mkdir(parents=True, exist_ok=True)


def material(name, color, metallic, roughness, *, normal=None):
    return PBRMaterial(
        name=name,
        baseColorFactor=color,
        metallicFactor=metallic,
        roughnessFactor=roughness,
        normalTexture=normal,
        doubleSided=True,
    )


def apply_material(mesh, pbr, uv=None):
    mesh.visual = TextureVisuals(uv=uv, material=pbr)
    return mesh


def to_web_syringe(mesh):
    mesh.apply_translation((-25.25, -15.2568, -94.435))
    mesh.apply_transform(trimesh.transformations.rotation_matrix(-math.pi / 2, (1, 0, 0)))
    return mesh


def export(scene, name, transmission_names=()):
    data = scene.export(file_type='glb')
    magic, version, _ = struct.unpack_from('<4sII', data, 0)
    assert magic == b'glTF' and version == 2
    json_size, json_type = struct.unpack_from('<I4s', data, 12)
    assert json_type == b'JSON'
    doc = json.loads(data[20:20 + json_size])
    for entry in doc.get('materials', []):
        if entry.get('name') in transmission_names:
            entry.setdefault('extensions', {})['KHR_materials_transmission'] = {
                'transmissionFactor': 0.88,
            }
            entry['extensions']['KHR_materials_ior'] = {'ior': 1.47}
            entry['pbrMetallicRoughness']['metallicFactor'] = 0.0
    if transmission_names:
        doc.setdefault('extensionsUsed', []).extend(
            ['KHR_materials_transmission', 'KHR_materials_ior']
        )
    encoded = json.dumps(doc, separators=(',', ':')).encode('utf8')
    encoded += b' ' * (-len(encoded) % 4)
    binary = data[20 + json_size:]
    output = (
        struct.pack('<4sII', b'glTF', 2, 20 + len(encoded) + len(binary))
        + struct.pack('<I4s', len(encoded), b'JSON')
        + encoded + binary
    )
    path = OUT / f'{name}.glb'
    path.write_bytes(output)
    assert path.read_bytes()[:4] == b'glTF'
    return {'file': path.name, 'bytes': path.stat().st_size,
            'vertices': sum(len(g.vertices) for g in scene.geometry.values())}


SYRINGE = SOURCE / 'adamempdz/seringue-medicale'
parts = {
    'barrel': ('SyringeAssembly - Syringe-1.STL',
               material('Syringe | clear barrel', [0.91, 0.97, 1.0, 1], 0, 0.10)),
    'plunger': ('SyringeAssembly - Plunger-1.STL',
                material('Syringe | white plunger', [0.83, 0.86, 0.88, 1], 0, 0.29)),
    'rubber': ('SyringeAssembly - PlungerRubber-1.STL',
               material('Syringe | rubber seal', [0.16, 0.18, 0.21, 1], 0, 0.55)),
    'needle': ('SyringeAssembly - Needle-1.STL',
               material('Syringe | steel needle', [0.77, 0.80, 0.83, 1], 0.76, 0.23)),
}
results = []
for state, color in [('empty', None), ('orange', [1.0, 0.27, 0.025, 1]),
                     ('purple', [0.43, 0.10, 0.83, 1])]:
    scene = trimesh.Scene()
    for label, (filename, pbr) in parts.items():
        mesh = to_web_syringe(trimesh.load(SYRINGE / filename, force='mesh'))
        scene.add_geometry(apply_material(mesh, pbr), geom_name=label, node_name=label)
    if color:
        fluid = trimesh.creation.cylinder(radius=10.7, height=83.0, sections=72)
        fluid.apply_translation((0, 0, 64.5))
        fluid.apply_transform(trimesh.transformations.rotation_matrix(-math.pi / 2, (1, 0, 0)))
        scene.add_geometry(
            apply_material(fluid, material('Syringe | drug', color, 0, 0.19)),
            geom_name='drug', node_name='drug',
        )
    results.append(export(scene, f'syringe-{state}', {'Syringe | clear barrel'}))


def to_web_pack(mesh):
    xyz = mesh.vertices.copy()
    mesh.vertices = np.column_stack((xyz[:, 1] + 23.75,
                                     xyz[:, 2] + 11.25,
                                     xyz[:, 0] - 3.5))
    return mesh


pack_root = SOURCE / 'blisterpack'
film = to_web_pack(trimesh.load(pack_root / 'Blisterpack.obj', force='mesh'))
foil = to_web_pack(trimesh.load(pack_root / 'multi_foil.obj', force='mesh'))

# The approved fine diamond height map was authored in the same Y/Z footprint.
# Its normal response can travel with the real foil geometry into glTF.
height = np.asarray(Image.open(
    ROOT.parent / 'dcd-blister-four/source-matched-fine-seal-height.png'
).convert('L'), dtype=np.float32) / 255.0
dy, dx = np.gradient(height)
strength = 3.0
normal = np.dstack((-dx * strength, -dy * strength, np.ones_like(height)))
normal /= np.linalg.norm(normal, axis=2, keepdims=True)
normal_map = Image.fromarray(np.uint8(np.clip((normal * 0.5 + 0.5) * 255, 0, 255)), 'RGB')

uv = np.column_stack(((foil.vertices[:, 0] + 13.75) / 27.5,
                      (foil.vertices[:, 1] + 23.75) / 47.5))
film = apply_material(film, material('Blister | clear formed film',
                                     [0.98, 0.99, 1.0, 1], 0, 0.10),
                      getattr(film.visual, 'uv', None))
foil = apply_material(foil, material('Blister | embossed aluminium',
                                     [0.82, 0.84, 0.86, 1], 0.84, 0.27,
                                     normal=normal_map), uv)

scene = trimesh.Scene()
scene.add_geometry(film, geom_name='film', node_name='film')
results.append(export(scene, 'blister-four-clear', {'Blister | clear formed film'}))
scene.add_geometry(foil, geom_name='foil', node_name='foil')
results.append(export(scene, 'blister-four-foil', {'Blister | clear formed film'}))

(OUT / 'models-manifest.json').write_text(
    json.dumps(results, indent=2, ensure_ascii=False), encoding='utf8'
)
payload = {item['file'].removesuffix('.glb'): base64.b64encode(
    (OUT / item['file']).read_bytes()).decode('ascii') for item in results}
(ROOT / 'models-data.js').write_text(
    'window.DCD_MODELS=Object.freeze(' + json.dumps(payload, separators=(',', ':')) + ');\n',
    encoding='utf8',
)
print(json.dumps(results, ensure_ascii=False))
