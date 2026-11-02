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
  item.renderer.dispose();
  item.environment.dispose();
  item.pmrem.dispose();
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
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xc8e5ff, 2.2);
    rim.position.set(100, 40, -120);
    scene.add(rim);

    const model = gltf.scene.clone(true);
    if (name.startsWith('blister-') && host.dataset.look === 'consent') model.traverse(part => {
      if (!part.isMesh || part.name !== 'film') return;
      part.material = part.material.clone();
      part.material.transmission = 0;
      part.material.transparent = true;
      part.material.opacity = host.dataset.look === 'consent' ? 0.67 : 0.20;
      part.material.depthWrite = false;
      part.material.roughness = 0.16;
      part.material.side = THREE.DoubleSide;
      part.material.color.setRGB(0.76, 0.86, 0.96);
    });
    if (host.dataset.look === 'consent') paintConsentFoil(model);
    if (view === 'workbench' || view === 'rear') model.rotation.z = -Math.PI / 2;
    if (view === 'rear') model.rotation.y = Math.PI;
    if (view === 'consent') model.rotation.z = -8.5 * Math.PI / 180;
    if (view === 'workbench') model.rotation.y = 0.75;
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

    if (view === 'syringe' && options.fillStart) {
      for (const label of ['plunger', 'rubber']) {
        const part = model.getObjectByName(label);
        if (part) part.position.y = 80;
      }
      const drug = model.getObjectByName('drug');
      if (drug) { drug.scale.y = 0.01; drug.position.y = 106; }
    }

    const item = { host, renderer, pmrem, environment, scene, model, camera,
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
    if (part.isMesh && part.name === 'film') part.material.opacity = opacity;
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