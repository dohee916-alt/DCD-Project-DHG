/* Swap approved visual exports here without changing interaction rules. */
window.DCD_ASSETS = Object.freeze({
  poster: "assets/figma-render/poster.webp",
  opening: "assets/figma-render/poster.webp",
  openingBreakVideo: "assets/motion/opening-break.mp4",
  openingLastFrame: null,
  workbenchBackground: "assets/figma-render/workbench-bg.webp",
  workbenchTray: "assets/figma-render/tray.webp",
  workbenchPack: "assets/figma-render/pack-workbench.webp",
  fourPackFront: "assets/figma-render/front-pack-12.webp",
  fourPackBack: "assets/figma-render/rear-pack-11.webp",
  rearPack09: "assets/figma-render/rear-pack-09.webp",
  rearPack10: "assets/figma-render/rear-pack-10.webp",
  rearPack11: "assets/figma-render/rear-pack-11.webp",
  machine: "assets/figma-render/machine.webp",
  clipboard: "assets/figma-render/clipboard-12.webp",
  consentPack15: "assets/figma-render/consent-pack-15.webp",
  consentPaper15: "assets/figma-render/consent-paper-15.webp",
  consentPackBase: "assets/figma-render/consent-pack-base.webp",
  consentClipboardBase: "assets/figma-render/consent-clipboard-base.webp",
  orangeBottle: "assets/figma-render/bottle-orange.webp",
  purpleBottle: "assets/figma-render/bottle-purple.webp",
  syringeEmpty: "assets/figma-render/syringe-empty.webp",
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
