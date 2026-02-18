export interface RngState {
  seed: number
}

export function createRng(seed: number): RngState {
  return { seed }
}

export function nextFloat(rng: RngState): number {
  rng.seed |= 0
  rng.seed = (rng.seed + 0x6d2b79f5) | 0
  let t = Math.imul(rng.seed ^ (rng.seed >>> 15), 1 | rng.seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
