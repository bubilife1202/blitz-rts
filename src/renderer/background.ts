import { Container, Graphics } from 'pixi.js'
import { RENDER_W, RENDER_H } from './pixi-app'

interface Star {
  gfx: Graphics
  baseAlpha: number
  phase: number
  speed: number
}

export interface BackgroundState {
  container: Container
  stars: Star[]
}

export function createBackground(): BackgroundState {
  const container = new Container()
  const stars: Star[] = []

  // Layer 1: 80 deep space stars (tiny white dots)
  for (let i = 0; i < 80; i++) {
    const gfx = new Graphics()
    const r = 0.5 + Math.random() * 0.5
    gfx.circle(0, 0, r).fill(0xffffff)
    gfx.x = Math.random() * RENDER_W
    gfx.y = Math.random() * RENDER_H
    const baseAlpha = 0.2 + Math.random() * 0.3
    gfx.alpha = baseAlpha
    container.addChild(gfx)
    stars.push({
      gfx,
      baseAlpha,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
    })
  }

  // Layer 2: 40 cyan-tinted stars (slightly larger)
  for (let i = 0; i < 40; i++) {
    const gfx = new Graphics()
    const r = 0.8 + Math.random() * 0.7
    gfx.circle(0, 0, r).fill(0x4fc3f7)
    gfx.x = Math.random() * RENDER_W
    gfx.y = Math.random() * RENDER_H
    const baseAlpha = 0.3 + Math.random() * 0.3
    gfx.alpha = baseAlpha
    container.addChild(gfx)
    stars.push({
      gfx,
      baseAlpha,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.0,
    })
  }

  // Layer 3: Grid floor
  const grid = new Graphics()

  // 30 vertical lines (tile markers)
  const tileW = RENDER_W / 30
  for (let i = 0; i <= 30; i++) {
    const x = i * tileW
    grid.moveTo(x, 0).lineTo(x, RENDER_H).stroke({ color: 0x1a2a3a, width: 1, alpha: 0.3 })
  }

  // 6 horizontal lane lines
  const laneGap = RENDER_H / 7
  for (let i = 1; i <= 6; i++) {
    const y = i * laneGap
    grid.moveTo(0, y).lineTo(RENDER_W, y).stroke({ color: 0x1a2a3a, width: 1, alpha: 0.25 })
  }

  container.addChild(grid)

  // Layer 4: Bottom haze gradient (dark to transparent, bottom 60px)
  const haze = new Graphics()
  const hazeH = 60
  const hazeY = RENDER_H - hazeH
  const steps = 12
  for (let i = 0; i < steps; i++) {
    const t = i / steps
    const alpha = t * 0.4
    const y = hazeY + t * hazeH
    const h = hazeH / steps + 1
    haze.rect(0, y, RENDER_W, h).fill({ color: 0x0b0f15, alpha })
  }
  container.addChild(haze)

  return { container, stars }
}

export function updateBackground(state: BackgroundState, time: number): void {
  for (const star of state.stars) {
    star.gfx.alpha =
      star.baseAlpha + Math.sin(time * star.speed + star.phase) * 0.15
  }
}
