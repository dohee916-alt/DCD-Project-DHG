"""Build browser GLBs and reusable texture maps from read-only Fusion eclipse OBJs.

No Blender process is started. The approved diamond pitch, metallic/roughness
range and clear-film transmission are converted to glTF-compatible PBR maps.
"""
import base64
import json
import math
import shutil
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = Path('/Users/gweondohee/Downloads/new blisterpack')
OUT = ROOT / 'assets/models'
BACKUP = ROOT.parent / 'dcd-blister-eclipse' / 'previous-web-assets'
MAPS = ROOT.parent / 'dcd-blister-eclipse' / 'maps'
for directory in (OUT, BACKUP, MAPS):
    directory.mkdir(parents=True, exist_ok=True)

SPECS = {
    'four': {
        'film': 'Blisterpack_eclipse.obj',
        'foil': 'Blisterpack_multieclipse_foil.obj',
        'y': (-37.5, -10.0), 'z': (-35.0, 12.5),
        'centres': [(-30.0, -22.5), (-17.5, -22.5), (-30.0, 0.0), (-17.5, 0.0)],
        'radii': (5.0, 10.0), 'origin': (-23.75, -11.25),
        'names': ('blister-four-clear', 'blister-four-foil'),
    },
    'single': {
        'film': 'Blisterpack_singleeclipse.obj',
        'foil': 'Blisterpack_singleeclipse_foil.obj',
        'y': (2.5, 17.5), 'z': (-17.5, 17.5),
        'centres': [(10.0, 0.0)], 'radii': (5.0, 10.0),
        'origin': (10.0, 0.0),
        'names': ('blister-single-clear', 'blister-single-foil'),
    },
}


def png_rgb(path, width, height, rows):
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    raw = b''.join(b'\x00' + row for row in rows)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b''))


def make_maps(label, spec):
    width, height = (704, 1216) if label == 'four' else (512, 1152)
    normal_rows, color_rows, orm_rows, plastic_rows = [], [], [], []
    ymin, ymax = spec['y']; zmin, zmax = spec['z']
    ry, rz = spec['radii']
    pitch = 0.35  # approved fine diamond spacing
    for j in range(height):
        z = zmax - (j + 0.5) * (zmax - zmin) / height
        nrow, crow, rrow, prow = bytearray(), bytearray(), bytearray(), bytearray()
        for i in range(width):
            y = ymin + (i + 0.5) * (ymax - ymin) / width
            radius = min(math.sqrt(((y-cy)/ry)**2 + ((z-cz)/rz)**2) for cy,cz in spec['centres'])
            seal = max(0.0, min(1.0, (radius - 0.98) / 0.055))
            u = ((y+z)/(math.sqrt(2)*pitch)) % 1
            v = ((y-z)/(math.sqrt(2)*pitch)) % 1
            diamond = 1 - 2*max(abs(u-0.5),abs(v-0.5))
            # A shallow normal response follows the original seal height map.
            eps = 0.002
            def dvalue(yy, zz):
                a = ((yy+zz)/(math.sqrt(2)*pitch)) % 1
                b = ((yy-zz)/(math.sqrt(2)*pitch)) % 1
                return 1 - 2*max(abs(a-0.5),abs(b-0.5))
            gx = (dvalue(y+eps,z)-dvalue(y-eps,z))/(2*eps)*seal*0.004
            gy = (dvalue(y,z+eps)-dvalue(y,z-eps))/(2*eps)*seal*0.004
            norm = math.sqrt(gx*gx+gy*gy+1)
            nrow.extend((int(255*(0.5-gx/(2*norm))),int(255*(0.5+gy/(2*norm))),int(255*(0.5+1/(2*norm)))))
            tone = (diamond-0.5)*seal
            crow.extend((max(0,min(255,int(196+30*tone))),max(0,min(255,int(201+30*tone))),max(0,min(255,int(206+30*tone)))))
            prow.extend((max(0,min(255,int(221+56*tone))),max(0,min(255,int(230+48*tone))),max(0,min(255,int(240+30*tone)))))
            rough = max(0.17,min(0.36,0.265+0.18*tone))
            rrow.extend((255,int(255*rough),255))
        normal_rows.append(bytes(nrow));color_rows.append(bytes(crow));orm_rows.append(bytes(rrow));plastic_rows.append(bytes(prow))
    files = {}
    for suffix, rows in [('normal',normal_rows),('color',color_rows),('metalrough',orm_rows),('plastic',plastic_rows)]:
        path=MAPS/(label+'-eclipse-seal-'+suffix+'.png')
        png_rgb(path,width,height,rows)
        files[suffix]=path.read_bytes()
    return files


def read_obj(path, spec):
    vertices=[None]; normals=[None]; tex=[None]; found={}; positions=[]; out_norm=[]; out_uv=[]; indices=[]
    ymin,ymax=spec['y'];zmin,zmax=spec['z'];oy,oz=spec['origin']
    for line in path.open():
        a=line.split()
        if not a:continue
        if a[0]=='v':vertices.append(tuple(map(float,a[1:4])))
        elif a[0]=='vn':normals.append(tuple(map(float,a[1:4])))
        elif a[0]=='vt':tex.append(tuple(map(float,a[1:3])))
        elif a[0]=='f':
            corners=[]
            for token in a[1:]:
                parts=token.split('/'); key=(int(parts[0]),int(parts[2]) if len(parts)>2 and parts[2] else 0)
                if key not in found:
                    x,y,z=vertices[key[0]]
                    nx,ny,nz=normals[key[1]] if key[1] else (1,0,0)
                    found[key]=len(positions)//3
                    positions.extend((y-oy,z-oz,x-3.5))
                    out_norm.extend((ny,nz,nx))
                    out_uv.extend(((y-ymin)/(ymax-ymin),(z-zmin)/(zmax-zmin)))
                corners.append(found[key])
            for k in range(1,len(corners)-1):indices.extend((corners[0],corners[k],corners[k+1]))
    return positions,out_norm,out_uv,indices


def make_glb(label, spec, maps, with_foil):
    blob=bytearray();views=[];accessors=[];meshes=[];nodes=[]
    def add_data(data,target=None):
        while len(blob)%4:blob.append(0)
        start=len(blob);blob.extend(data)
        view={'buffer':0,'byteOffset':start,'byteLength':len(data)}
        if target:view['target']=target
        views.append(view);return len(views)-1
    def accessor(data,fmt,component,kind,target):
        view=add_data(struct.pack('<'+str(len(data))+fmt,*data),target)
        item={'bufferView':view,'componentType':component,'count':len(data)//{'VEC3':3,'VEC2':2,'SCALAR':1}[kind],'type':kind}
        if kind=='VEC3' and fmt=='f':
            rows=[data[i::3] for i in range(3)]
            item['min']=[min(q) for q in rows];item['max']=[max(q) for q in rows]
        accessors.append(item);return len(accessors)-1
    files=[spec['film']]+([spec['foil']] if with_foil else [])
    for index,file in enumerate(files):
        pos,norm,uv,idx=read_obj(SOURCE/file,spec)
        attrs={'POSITION':accessor(pos,'f',5126,'VEC3',34962),'NORMAL':accessor(norm,'f',5126,'VEC3',34962),'TEXCOORD_0':accessor(uv,'f',5126,'VEC2',34962)}
        ii=accessor(idx,'I',5125,'SCALAR',34963)
        name='film' if index==0 else 'foil'
        meshes.append({'name':name,'primitives':[{'attributes':attrs,'indices':ii,'material':index}]})
        nodes.append({'name':name,'mesh':index})
    doc={'asset':{'version':'2.0','generator':'DCD eclipse OBJ-to-PBR-GLB'},'scene':0,'scenes':[{'nodes':list(range(len(nodes)))}],
         'nodes':nodes,'meshes':meshes,'accessors':accessors,'bufferViews':views,'buffers':[{'byteLength':0}],
         'materials':[{'name':'Blister | clear formed film','doubleSided':True,
           'pbrMetallicRoughness':{'baseColorFactor':[0.98,0.99,1,1],'metallicFactor':0,'roughnessFactor':0.08},
           'normalTexture':{'index':0,'scale':0.52},
           'extensions':{'KHR_materials_transmission':{'transmissionFactor':0.88},'KHR_materials_ior':{'ior':1.47}}}],
         'extensionsUsed':['KHR_materials_transmission','KHR_materials_ior']}
    images=[];textures=[]
    for key in (('normal','color','metalrough') if with_foil else ('normal',)):
        view=add_data(maps[key]);images.append({'bufferView':view,'mimeType':'image/png','name':label+' eclipse seal '+key})
        textures.append({'source':len(images)-1})
    doc['images']=images;doc['textures']=textures
    if with_foil:
        doc['materials'].append({'name':'Blister | source-matched fine aluminium seal','doubleSided':True,
          'pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'baseColorTexture':{'index':1},
            'metallicFactor':0.84,'roughnessFactor':1,'metallicRoughnessTexture':{'index':2}},
          'normalTexture':{'index':0,'scale':0.34}})
    while len(blob)%4:blob.append(0)
    doc['buffers'][0]['byteLength']=len(blob)
    encoded=json.dumps(doc,separators=(',',':')).encode()
    encoded+=b' '*((-len(encoded))%4)
    result=struct.pack('<4sII',b'glTF',2,28+len(encoded)+len(blob))+struct.pack('<I4s',len(encoded),b'JSON')+encoded+struct.pack('<I4s',len(blob),b'BIN\x00')+blob
    name=spec['names'][1 if with_foil else 0]
    (OUT/(name+'.glb')).write_bytes(result)
    return {'file':name+'.glb','bytes':len(result),'vertices':sum(a['count'] for a in accessors if a['type']=='VEC3' and a['componentType']==5126)//2}


for name in SPECS['four']['names']:
    path=OUT/(name+'.glb')
    if path.exists() and not (BACKUP/path.name).exists():shutil.copy2(str(path),str(BACKUP/path.name))
if not (BACKUP/'models-data.js').exists():shutil.copy2(str(ROOT/'models-data.js'),str(BACKUP/'models-data.js'))
results=[]
for label,spec in SPECS.items():
    maps=make_maps(label,spec)
    results.extend((make_glb(label,spec,maps,False),make_glb(label,spec,maps,True)))
manifest_path=OUT/'models-manifest.json'
old=json.loads(manifest_path.read_text())
manifest_path.write_text(json.dumps([x for x in old if not x['file'].startswith('blister-')]+results,indent=2)+'\n')
models={p.stem:base64.b64encode(p.read_bytes()).decode('ascii') for p in sorted(OUT.glob('*.glb'))}
(ROOT/'models-data.js').write_text('window.DCD_MODELS=Object.freeze('+json.dumps(models,separators=(',',':'))+');\n')
print(json.dumps(results,indent=2))
