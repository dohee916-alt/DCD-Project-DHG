/* Swap approved visual exports here without changing interaction rules. */
window.DCD_ASSETS = Object.freeze({
  poster: "assets/figma-current/hd/posterA.png",
  opening: "assets/figma-current/hd/posterA.png",
  posterAlternate: "assets/figma-current/hd/posterB.png",
  posterResult: "assets/figma-current/hd/posterResult-updated.png",
  openingBreakVideo: null, // Set when the approved rupture motion file exists.
  openingLastFrame: null,
  workbenchBackground: "assets/figma-render/workbench-bg@2x.png",
  workbenchTray: "assets/figma-current/tray-figma.png",
  packClearBack: "assets/figma-current/blister-clear-back-web04.png",
  packClearFront: "assets/figma-current/blister-clear-front-figma.png",
  packFoil: "assets/figma-current/blister-foil-figma.png",
  conveyor: "assets/figma-current/conveyor-figma.png",
  machine: "assets/figma-current/machine-figma.png",
  clipboard: "assets/figma/ae06f.png",
  consentClipboardBase: "assets/figma/ae06f.png",
  orangeBottle: "assets/figma-current/hd/bottle-orange-3x.png",
  purpleBottle: "assets/figma-current/hd/bottle-purple-3x.png",
  syringeBarrel: "assets/figma-current/hd/barrel-figma3x.png",
  syringePlunger: "assets/figma-current/hd/plunger-figma3x.png",
  syringeLiquidOrange: "assets/figma-current/hd/liquidOrange-figma2x.png",
  syringeLiquidPurple: "assets/figma-current/hd/liquidPurple-figma2x.png",
  syringeGuideCore: "assets/figma-current/syringe-hand-core-web04.png",
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
