/* Continuous row-wise warp, adapted from the user's doll_body_morph_fixed.html.
   Alpha bounds supply separate width profiles for all four five-state figures. */
window.DCDMorph = (() => {
  const W = 346, H = 873, cache = new Map();
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const mix = (a, b, t) => a + (b - a) * t;
  async function source(kind, state) {
    const key = `${kind}-${state}`;
    if (cache.has(key)) return cache.get(key);
    const promise = new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext("2d", {willReadFrequently: true});
        const scale = Math.min(W / image.width, H / image.height);
        const width = image.width * scale, height = image.height * scale;
        ctx.drawImage(image, (W - width) / 2, (H - height) / 2, width, height);
        const packed = window.DCD_FIGURE_BOUNDS?.[key];
        if (!packed) { resolve(null); return; }
        const bytes = atob(packed);
        const edges = new Array(H);
        for (let y = 0; y < H; y++) {
          const i = y * 4;
          edges[y] = [bytes.charCodeAt(i) | bytes.charCodeAt(i + 1) << 8,
            bytes.charCodeAt(i + 2) | bytes.charCodeAt(i + 3) << 8];
        }
        resolve({canvas, edges});
      };
      image.onerror = () => resolve(null);
      image.src = DCD_ASSETS.figure(kind, state);
    });
    cache.set(key, promise);
    return promise;
  }
  async function draw(canvas, kind, value) {
    if (!canvas) return;
    const p = clamp(value, 0, 100) / 25;
    const lo = Math.floor(p), hi = Math.min(4, Math.ceil(p));
    const nearest = Math.round(p);
    const [a, b, from] = await Promise.all([source(kind, lo), source(kind, hi), source(kind, nearest)]);
    if (!a || !b || !from || !canvas.isConnected) return;
    if (canvas.width !== W || canvas.height !== H) {canvas.width = W; canvas.height = H;}
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const t = p - lo;
    for (let y = 0; y < H; y++) {
      const [fl, fr] = from.edges[y];
      if (fr <= fl) continue;
      const targetLeft = mix(a.edges[y][0], b.edges[y][0], t);
      const targetRight = mix(a.edges[y][1], b.edges[y][1], t);
      if (targetRight > targetLeft) ctx.drawImage(from.canvas, fl, y, fr - fl, 1, targetLeft, y, targetRight - targetLeft, 1);
    }
  }
  function drawVisible(root = document) {
    root.querySelectorAll("canvas[data-figure]").forEach(canvas =>
      draw(canvas, Number(canvas.dataset.figure), Number(canvas.dataset.value)));
  }
  return {draw, drawVisible};
})();
