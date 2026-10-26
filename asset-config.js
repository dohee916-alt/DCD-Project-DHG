/* Swap approved visual exports here without changing interaction rules. */
window.DCD_ASSETS = Object.freeze({
  poster: "assets/figma/7095f.webp",
  opening: "assets/figma/7095f.webp",
  openingBreakVideo: "assets/motion/opening-break.mp4",
  openingLastFrame: null,
  workbenchBackground: "assets/figma/1bc7f.webp",
  workbenchTray: "assets/figma/7403a.webp",
  workbenchPack: "assets/figma/b9fc0.webp",
  fourPackFront: "assets/figma/18db5.webp",
  fourPackBack: "assets/figma/3e8a5.webp",
  machine: "assets/figma/3143c.webp",
  clipboard: "assets/figma/ae06f.webp",
  orangeBottle: "assets/figma/f0db5.webp",
  purpleBottle: "assets/figma/ac8b9.webp",
  syringeEmpty: "assets/figma/0d148.webp",
  syringeOrange: null,
  syringePurple: null,
  gestureHand: "assets/figma/96571.webp",
  figure: (kind, state) => `assets/figures/figure-${kind}-${String(state).padStart(2, "0")}.webp`
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
