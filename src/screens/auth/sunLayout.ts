/** Shared resting geometry for the welcome → sign-up sun, from the exported Figma art. */
export const welcomeScene = {
  width: 315,
  height: 255,
  paddingY: 40,
  sunX: 296.27 - 10.7,
  sunY: 35.57 - 29.5,
};

export const celebratingScene = {
  width: 106,
  height: 142,
  sunX: 53.94,
  sunY: 73.47,
};

// Relative to the shared screen content: x from its centre, y from its top.
export const welcomeSunCenter = {
  x: welcomeScene.sunX - welcomeScene.width / 2,
  y: welcomeScene.paddingY + welcomeScene.sunY,
};
