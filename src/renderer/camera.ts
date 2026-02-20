import type { Container } from 'pixi.js'

export interface CameraState {
  shakeIntensity: number
  shakeDecay: number
  offsetX: number
  offsetY: number
}

export function createCamera(): CameraState {
  return { shakeIntensity: 0, shakeDecay: 0.9, offsetX: 0, offsetY: 0 }
}

// Shake intensities from plan:
// unit death = 3, base hit = 5, skill activation = 2, base destroy = 8
export function triggerShake(camera: CameraState, intensity: number): void {
  camera.shakeIntensity = Math.max(camera.shakeIntensity, intensity)
}

export function updateCamera(camera: CameraState, container: Container): void {
  if (camera.shakeIntensity > 0.1) {
    camera.offsetX = (Math.random() - 0.5) * camera.shakeIntensity * 2
    camera.offsetY = (Math.random() - 0.5) * camera.shakeIntensity * 2
    camera.shakeIntensity *= camera.shakeDecay
  } else {
    camera.shakeIntensity = 0
    camera.offsetX = 0
    camera.offsetY = 0
  }
  container.position.set(camera.offsetX, camera.offsetY)
}
