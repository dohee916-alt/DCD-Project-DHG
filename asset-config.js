/* Swap approved visual exports here without changing interaction rules. */
window.DCD_ASSETS = Object.freeze({
  poster: "assets/figma-render/poster.webp",
  opening: "assets/figma-render/poster.webp",
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
  orangeBottle: "assets/figma-current/bottle-new-orange.png",
  purpleBottle: "assets/figma-current/bottle-new-purple.png",
  syringeBarrel: "assets/figma-current/syringe-plunger-web04.png",
  syringePlunger: "assets/figma-current/syringe-body-web04.png",
  syringeLiquidOrange: "assets/figma-current/syringe-liquid-web04.png",
  syringeLiquidPurple: "assets/figma-current/syringe-layer13-web04.png",
  syringeGuideHand: "assets/figma-current/syringe-hand-active-web04.png",
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
