import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const loader = new GLTFLoader();
const parsed = new Map();
let active = [];

function decode(name) {
  if (!parsed.has(name)) {
    const base64 = window.DCD_MODELS?.[name];
    if (!base64) return Promise.reject(new Error(`Missing 3D model: ${name}`));
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    parsed.set(name, loader.parseAsync(bytes.buffer, ''));
  }
  return parsed.get(name);
}

function disposeAll() {
  for (const item of active) {
    disposeItem(item);
  }
  active = [];
}

function disposeItem(item) {
  item.live = false;
  if (item.motion) item.motion.resolve(false);
  item.backgroundTexture?.dispose();
  item.renderer.dispose();
  item.environment.dispose();
  item.pmrem.dispose();
}

function offsetIn(element, ancestor) {
  let x = 0, y = 0;
  while (element && element !== ancestor) {
    x += element.offsetLeft;
    y += element.offsetTop;
    element = element.offsetParent;
  }
  return { x, y };
}

async function addWorkbenchBackdrop(host, scene, model, size, worldHeight) {
  const root = host.closest('.scene-content,.rotate-preview');
  const background = root?.querySelector('img.bg');
  if (background?.decode) await background.decode().catch(() => {});
  if (!host.isConnected) return null;
  const surface = document.createElement('canvas');
  surface.width = Math.max(1, Math.round(host.clientWidth * 2));
  surface.height = Math.max(1, Math.round(host.clientHeight * 2));
  const context = surface.getContext('2d');
  context.fillStyle = '#d8e6f1';
  context.fillRect(0, 0, surface.width, surface.height);
  if (background?.naturalWidth) {
    const hostOffset = offsetIn(host, root);
    const bgOffset = offsetIn(background, root);
    const sx = surface.width / host.clientWidth;
    const sy = surface.height / host.clientHeight;
    context.drawImage(background, (bgOffset.x - hostOffset.x) * sx,
      (bgOffset.y - hostOffset.y) * sy,
      background.clientWidth * sx, background.clientHeight * sy);
  }
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  const worldWidth = worldHeight * host.clientWidth / host.clientHeight;
  const geometry = new THREE.PlaneGeometry(worldWidth, worldHeight);
  const z = model.position.z - size.z / 2 - 0.8;
  const backing = new THREE.Mesh(geometry,
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  backing.position.z = z;
  scene.add(backing);
  const shadow = new THREE.Mesh(geometry,
    new THREE.ShadowMaterial({ color: 0x30445e, opacity: 0.24 }));
  shadow.position.z = z + 0.02;
  shadow.receiveShadow = true;
  scene.add(shadow);
  return texture;
}

async function mount(host, options = {}) {
  const name = host.dataset.model;
  const view = host.dataset.view || 'front';
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true,
      powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.replaceChildren(renderer.domElement);
    const gltf = await decode(name);
    if (!host.isConnected) { renderer.dispose(); return; }

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = environment.texture;
    scene.add(new THREE.HemisphereLight(0xf7fbff, 0x79889b, 2.0));
    const key = new THREE.DirectionalLight(0xffffff, 3.0);
    key.position.set(-80, 100, 180);
    if (view === 'workbench') {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      key.castShadow = true;
      key.shadow.intensity = 0.24;
      key.shadow.mapSize.set(1024, 1024);
      Object.assign(key.shadow.camera, { left: -45, right: 45,
        top: 45, bottom: -45, near: 1, far: 400 });
      key.shadow.camera.updateProjectionMatrix();
    }
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xc8e5ff, 2.2);
    rim.position.set(100, 40, -120);
    scene.add(rim);

    const model = gltf.scene.clone(true);
    if (name.startsWith('blister-') && host.dataset.look === 'consent') model.traverse(part => {
      if (!part.isMesh || !part.name.startsWith('film-')) return;
      part.material = part.material.clone();
      part.material.transmission = 0;
      part.material.transparent = true;
      part.material.opacity = 0.67;
      part.material.depthWrite = false;
      part.material.roughness = 0.08;
      part.material.clearcoat = 0.45;
      part.material.clearcoatRoughness = 0.06;
      part.material.side = THREE.DoubleSide;
      part.material.color.setRGB(0.98, 0.99, 1);
    });
    if (host.dataset.look === 'consent') paintConsentFoil(model);
    if (view === 'workbench' || view === 'rear') model.rotation.z = -Math.PI / 2;
    if (view === 'rear') model.rotation.y = Math.PI;
    if (view === 'consent') model.rotation.z = -8.5 * Math.PI / 180;
    if (view === 'workbench') model.scale.z = -1; // wells recede below the open film face
    if (view === 'workbench') model.traverse(part => {
      if (!part.isMesh || !part.name.startsWith('film-')) return;
      part.material = part.material.clone();
      part.material.color.setRGB(1, 1, 1);
      part.material.metalness = 0;
      part.material.roughness = 0.06;
      part.material.transmission = 0.96;
      part.material.opacity = 1;
      part.material.transparent = false;
      part.material.depthWrite = true;
      part.material.ior = 1.5;
      part.material.thickness = 0;
      part.material.needsUpdate = true;
      part.castShadow = part.name.startsWith('film-well-');
    });
    scene.add(model);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    const aspect = host.clientWidth / host.clientHeight;
    const padding = view === 'workbench' ? 1.095 : view === 'syringe' ? 1.04 :
      view === 'front' ? 1.13 : view === 'consent' ? 1.02 : 1.09;
    const worldHeight = Math.max(size.y, size.x / aspect) * padding;
    const camera = new THREE.OrthographicCamera(
      -worldHeight * aspect / 2, worldHeight * aspect / 2,
      worldHeight / 2, -worldHeight / 2, 0.1, 2000,
    );
    camera.position.set(0, 0, Math.max(size.z * 3, 350));
    camera.lookAt(0, 0, 0);
    if (view === 'workbench') model.position.x += size.x * 0.06;
    if (view === 'consent') model.position.y -= 6.1;
    const backgroundTexture = view === 'workbench'
      ? await addWorkbenchBackdrop(host, scene, model, size, worldHeight) : null;
    if (!host.isConnected) { backgroundTexture?.dispose(); renderer.dispose();
      environment.dispose(); pmrem.dispose(); return; }

    if (view === 'syringe' && options.fillStart) {
      for (const label of ['plunger', 'rubber']) {
        const part = model.getObjectByName(label);
        if (part) part.position.y = 80;
      }
      const drug = model.getObjectByName('drug');
      if (drug) { drug.scale.y = 0.01; drug.position.y = 106; }
    }

    const item = { host, renderer, pmrem, environment, scene, model, camera,
      backgroundTexture,
      live: true, motion: null };
    active.push(item);
    function frame(now) {
      if (!item.live || !host.isConnected) return;
      if (view === 'syringe' && item.motion) {
        if (item.motion.start === null) item.motion.start = now;
        const t = Math.min((now - item.motion.start) / item.motion.duration, 1);
        const progress = item.motion.direction === 'fill' ? 1 - t : t;
        for (const label of ['plunger', 'rubber']) {
          const part = model.getObjectByName(label);
          if (part) part.position.y = 80 * progress;
        }
        const drug = model.getObjectByName('drug');
        if (drug) {
          drug.scale.y = Math.max(0.01, 1 - progress);
          drug.position.y = 106 * progress;
        }
        if (t >= 1) {
          item.motion.resolve(true);
          item.motion = null;
        }
      }
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    host.dataset.modelReady = 'true';
    return item;
  } catch (error) {
    if (renderer) renderer.dispose();
    host.dataset.modelError = 'true';
    console.error('DCD 3D model could not load', name, error);
  }
}

function mountAll(root) {
  disposeAll();
  root.querySelectorAll('.model-host[data-model]').forEach(host => {
    host._dcd3dReady = mount(host);
  });
}

async function swap(host, name, options = {}) {
  const previous = await host?._dcd3dReady;
  if (!host?.isConnected) return false;
  if (previous) {
    disposeItem(previous);
    active = active.filter(item => item !== previous);
  }
  host.dataset.model = name;
  delete host.dataset.modelReady;
  delete host.dataset.modelError;
  host._dcd3dReady = mount(host, options);
  return Boolean(await host._dcd3dReady);
}

async function play(host, direction, duration) {
  const item = await host?._dcd3dReady;
  if (!item || !item.live) return false;
  return new Promise(resolve => {
    item.motion = { direction, duration, start: null, resolve };
    if (direction === 'fill') {
      for (const label of ['plunger', 'rubber']) {
        const part = item.model.getObjectByName(label);
        if (part) part.position.y = 80;
      }
      const drug = item.model.getObjectByName('drug');
      if (drug) { drug.scale.y = 0.01; drug.position.y = 106; }
    }
  });
}

async function setFilmOpacity(host, opacity) {
  const item = await host?._dcd3dReady;
  if (!item || !item.live) return false;
  item.model.traverse(part => {
    if (part.isMesh && part.name.startsWith('film-')) part.material.opacity = opacity;
  });
  return true;
}

function paintConsentFoil(model) {
  model.traverse(part => {
    if (!part.isMesh || part.name !== 'foil') return;
    part.material = part.material.clone();
    part.material.color.set('#f05a24');
    part.material.metalness = 0.62;
    part.material.roughness = 0.34;
  });
}

async function addConsentFoil(host) {
  const [item, foilAsset] = await Promise.all([host?._dcd3dReady, decode('blister-four-foil')]);
  if (!item?.live || !host?.isConnected || item.model.getObjectByName('foil')) return false;
  const foil = foilAsset.scene.getObjectByName('foil');
  if (!foil) return false;
  item.model.add(foil.clone());
  paintConsentFoil(item.model);
  return true;
}

window.DCD3D = Object.freeze({ mountAll, disposeAll, swap, play, setFilmOpacity, addConsentFoil, preload: decode });
