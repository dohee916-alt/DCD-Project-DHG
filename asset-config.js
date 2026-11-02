/* Swap approved visual exports here without changing interaction rules. */
window.DCD_ASSETS = Object.freeze({
  poster: "assets/figma-render/poster.webp",
  opening: "assets/figma-render/poster.webp",
  openingBreakVideo: null, // Set when the approved rupture motion file exists.
  openingLastFrame: null,
  workbenchBackground: "assets/figma-render/workbench-bg@2x.png",
  workbenchTray: "assets/figma-current/tray-figma.png",
  packClearBack: "assets/figma-current/blister-clear-back-figma.png",
  packClearFront: "assets/figma-current/blister-clear-front-figma.png",
  packFoil: "assets/figma-current/blister-foil-figma.png",
  conveyor: "assets/figma-current/conveyor-figma.png",
  machine: "assets/figma-current/machine-figma.png",
  clipboard: "assets/figma/ae06f.png",
  consentClipboardBase: "assets/figma/ae06f.png",
  orangeBottle: "assets/figma-current/bottle-orange-figma.png",
  purpleBottle: "assets/figma-current/bottle-purple-figma.png",
  syringeEmpty: "assets/figma-render/syringe-empty@2x-transparent.png",
  syringeOrange: null,
  syringePurple: null,
  gestureHand: "assets/figma/96571.webp",
  figure: (kind, state, view = "front") => `assets/figures-v2/doll-${String(kind).padStart(2, "0")}-level-${String(state).padStart(2, "0")}-${view}.png`
});
window.DCD_MOTION = Object.freeze({
  introMs: 1550,
  rotateGuideMs: 3000,
  injectionMs: 1450,
  packingSlideMs: 860,
  ejectionMs: 1950,
  turnMs: 1050,
  pageCurlMs: 600,
  clipboardRiseMs: 650,
  consentMoveMs: 900
});
