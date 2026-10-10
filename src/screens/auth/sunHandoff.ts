/** Where the last screen left its sun: window centre and petal angle in degrees. The next screen's sun picks up from there. */
export type Handoff = { x: number; y: number; angle: number };

let handoff: Handoff | undefined;

export function handOffSun(h: Handoff) {
  handoff = h;
}

/** Reads the handoff once; a sun that mounts later starts in place. */
export function takeSun() {
  const h = handoff;
  handoff = undefined;
  return h;
}
