import type { Container } from 'pixi.js'

export interface PostProcessState {
  flashTimer: number
  chromaticTimer: number
  desaturated: boolean
}

const FLASH_DURATION = 0.08
const CHROMATIC_DURATION = 0.12

export function createPostProcess(): PostProcessState {
  return {
    flashTimer: 0,
    chromaticTimer: 0,
    desaturated: false,
  }
}

export function triggerFlash(state: PostProcessState): void {
  state.flashTimer = FLASH_DURATION
}

export function triggerChromatic(state: PostProcessState): void {
  state.chromaticTimer = CHROMATIC_DURATION
}

export function setDesaturated(state: PostProcessState, value: boolean): void {
  state.desaturated = value
}

export function updatePostProcess(
  state: PostProcessState,
  stage: Container,
  dt: number,
): void {
  // Flash effect: briefly boost stage alpha
  if (state.flashTimer > 0) {
    state.flashTimer -= dt
    stage.alpha = 1.3
  } else if (state.desaturated) {
    stage.alpha = 0.5
  } else {
    stage.alpha = 1
  }

  // Chromatic aberration: shift first and last children slightly
  if (state.chromaticTimer > 0) {
    state.chromaticTimer -= dt
    const intensity = state.chromaticTimer / CHROMATIC_DURATION
    const shift = intensity * 2

    if (stage.children.length >= 2) {
      const first = stage.children[0]!
      const last = stage.children[stage.children.length - 1]!
      first.position.x = -shift
      last.position.x = shift
    }
  } else {
    // Reset positions
    if (stage.children.length >= 2) {
      const first = stage.children[0]!
      const last = stage.children[stage.children.length - 1]!
      if (first.position.x !== 0) first.position.x = 0
      if (last.position.x !== 0) last.position.x = 0
    }
  }
}
