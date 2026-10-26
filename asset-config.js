/* Swap approved visual exports here without changing interaction rules. */
window.DCD_ASSETS = Object.freeze({
  poster: "assets/figma/7095f.png",
  opening: "assets/figma/7095f.png",
  openingBreakVideo: "assets/motion/opening-break.mp4",
  openingLastFrame: null,
  workbenchBackground: "assets/figma/1bc7f.png",
  workbenchTray: "assets/figma/7403a.png",
  workbenchPack: "assets/figma/b9fc0.png",
  fourPackFront: "assets/figma/18db5.png",
  fourPackBack: "assets/figma/3e8a5.png",
  machine: "assets/figma/3143c.png",
  clipboard: "assets/figma/ae06f.png",
  orangeBottle: "assets/figma/f0db5.png",
  purpleBottle: "assets/figma/ac8b9.png",
  syringeEmpty: "assets/figma/0d148.png",
  syringeOrange: null,
  syringePurple: null,
  gestureHand: "assets/figma/96571.png",
  figure: (kind, state) => `assets/figures/figure-${kind}-${String(state).padStart(2, "0")}.png`
});
window.DCD_MOTION = Object.freeze({
  introMs: 3150,
  rotateGuideMs: 3000,
  injectionMs: 1450,
  packingSlideMs: 860,
  ejectionMs: 1950,
  turnMs: 1050,
  pageCurlMs: 600,
  clipboardRiseMs: 650,
  consentMoveMs: 900
});
