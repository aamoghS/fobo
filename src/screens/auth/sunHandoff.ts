/** Where the last screen left its sun: window centre and petal angle in degrees. The next screen's sun picks up from there. */
export type Handoff = { x: number; y: number; angle: number };

let handoff: Handoff | undefined;
let celebration = false;

export function handOffSun(h: Handoff) {
  handoff = h;
  celebration = false;
}

/** Switching auth forms keeps the finished sun and only replays its confetti. */
export function handOffCelebration() {
  celebration = true;
}

/** One-shot, so a later fresh visit still gets the full introduction. */
export function takeCelebration() {
  const pending = celebration;
  celebration = false;
  return pending;
}

/** Reads the handoff once; a sun that mounts later starts in place. */
export function takeSun() {
  const h = handoff;
  handoff = undefined;
  return h;
}
