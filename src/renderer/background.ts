import { Container, Graphics } from 'pixi.js'
import { RENDER_W, RENDER_H } from './pixi-app'

type ThemeId = 'space-station' | 'asteroid-field' | 'ruined-city'

interface AnimElement {
  gfx: Graphics
  baseAlpha: number
  phase: number
  speed: number
  driftX?: number
  driftY?: number
}

export interface BackgroundState {
  container: Container
  elements: AnimElement[]
  theme: ThemeId
}

const THEMES: ThemeId[] = ['space-station', 'asteroid-field', 'ruined-city']

function pickTheme(): ThemeId {
  return THEMES[Math.floor(Math.random() * THEMES.length)]!
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

// ─── Space Station (original theme) ───

function createSpaceStation(container: Container, elements: AnimElement[]): void {
  // Stars layer 1: 80 white dots
  for (let i = 0; i < 80; i++) {
    const gfx = new Graphics()
    const r = 0.5 + Math.random() * 0.5
    gfx.circle(0, 0, r).fill(0xffffff)
    gfx.x = Math.random() * RENDER_W
    gfx.y = Math.random() * RENDER_H
    const baseAlpha = 0.2 + Math.random() * 0.3
    gfx.alpha = baseAlpha
    container.addChild(gfx)
    elements.push({ gfx, baseAlpha, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.7 })
  }

  // Stars layer 2: 40 cyan-tinted
  for (let i = 0; i < 40; i++) {
    const gfx = new Graphics()
    const r = 0.8 + Math.random() * 0.7
    gfx.circle(0, 0, r).fill(0x4fc3f7)
    gfx.x = Math.random() * RENDER_W
    gfx.y = Math.random() * RENDER_H
    const baseAlpha = 0.3 + Math.random() * 0.3
    gfx.alpha = baseAlpha
    container.addChild(gfx)
    elements.push({ gfx, baseAlpha, phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 1.0 })
  }

  // Grid
  const grid = new Graphics()
  const tileW = RENDER_W / 30
  for (let i = 0; i <= 30; i++) {
    const x = i * tileW
    grid.moveTo(x, 0).lineTo(x, RENDER_H).stroke({ color: 0x1a2a3a, width: 1, alpha: 0.5 })
  }
  const laneGap = RENDER_H / 7
  for (let i = 1; i <= 6; i++) {
    const y = i * laneGap
    grid.moveTo(0, y).lineTo(RENDER_W, y).stroke({ color: 0x1a2a3a, width: 1, alpha: 0.4 })
  }
  container.addChild(grid)

  // Bottom haze
  addBottomHaze(container, 0x0b0f15)
}

// ─── Asteroid Field ───

function createAsteroidField(container: Container, elements: AnimElement[]): void {
  // Background nebula glow (orange, very subtle)
  const nebula = new Graphics()
  nebula.circle(RENDER_W * 0.7, RENDER_H * 0.3, 120).fill({ color: 0xff6633, alpha: 0.03 })
  nebula.circle(RENDER_W * 0.2, RENDER_H * 0.7, 90).fill({ color: 0xff8844, alpha: 0.02 })
  container.addChild(nebula)

  // Stars (fewer, dimmer)
  for (let i = 0; i < 50; i++) {
    const gfx = new Graphics()
    const r = 0.4 + Math.random() * 0.4
    gfx.circle(0, 0, r).fill(0xffeedd)
    gfx.x = Math.random() * RENDER_W
    gfx.y = Math.random() * RENDER_H
    const baseAlpha = 0.15 + Math.random() * 0.2
    gfx.alpha = baseAlpha
    container.addChild(gfx)
    elements.push({ gfx, baseAlpha, phase: Math.random() * Math.PI * 2, speed: 0.2 + Math.random() * 0.5 })
  }

  // Floating asteroid silhouettes
  for (let i = 0; i < 8; i++) {
    const gfx = new Graphics()
    const size = rand(12, 40)
    const cx = Math.random() * RENDER_W
    const cy = Math.random() * RENDER_H

    // Draw irregular rock shape
    const points: number[] = []
    const verts = 6 + Math.floor(Math.random() * 4)
    for (let v = 0; v < verts; v++) {
      const angle = (v / verts) * Math.PI * 2
      const r2 = size * (0.6 + Math.random() * 0.4)
      points.push(Math.cos(angle) * r2, Math.sin(angle) * r2)
    }
    gfx.poly(points).fill({ color: 0x2a1a0a, alpha: 0.3 })
    gfx.position.set(cx, cy)
    container.addChild(gfx)

    const baseAlpha = 0.15 + Math.random() * 0.15
    gfx.alpha = baseAlpha
    elements.push({
      gfx,
      baseAlpha,
      phase: Math.random() * Math.PI * 2,
      speed: 0.1 + Math.random() * 0.3,
      driftX: rand(-0.3, 0.3),
      driftY: rand(-0.15, 0.15),
    })
  }

  // Subtle grid (warmer tint)
  const grid = new Graphics()
  const tileW = RENDER_W / 30
  for (let i = 0; i <= 30; i++) {
    const x = i * tileW
    grid.moveTo(x, 0).lineTo(x, RENDER_H).stroke({ color: 0x2a1a0a, width: 1, alpha: 0.35 })
  }
  const laneGap = RENDER_H / 7
  for (let i = 1; i <= 6; i++) {
    const y = i * laneGap
    grid.moveTo(0, y).lineTo(RENDER_W, y).stroke({ color: 0x2a1a0a, width: 1, alpha: 0.3 })
  }
  container.addChild(grid)

  addBottomHaze(container, 0x1a0a00)
}

// ─── Ruined City ───

function createRuinedCity(container: Container, elements: AnimElement[]): void {
  // Warm ambient glow
  const ambient = new Graphics()
  ambient.rect(0, 0, RENDER_W, RENDER_H).fill({ color: 0x332211, alpha: 0.08 })
  container.addChild(ambient)

  // Fog layers
  for (let i = 0; i < 3; i++) {
    const fog = new Graphics()
    const y = RENDER_H * (0.3 + i * 0.25)
    fog.rect(0, y - 30, RENDER_W, 60).fill({ color: 0x554433, alpha: 0.06 })
    container.addChild(fog)
    elements.push({
      gfx: fog,
      baseAlpha: 0.04 + Math.random() * 0.04,
      phase: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.2,
      driftX: rand(-0.2, 0.2),
    })
  }

  // Building silhouettes in background
  const buildings = new Graphics()
  const buildingCount = 12
  for (let i = 0; i < buildingCount; i++) {
    const x = (i / buildingCount) * RENDER_W + rand(-10, 10)
    const w = rand(20, 50)
    const h = rand(60, 180)
    const y = RENDER_H - h - rand(0, 40)
    buildings.rect(x, y, w, h).fill({ color: 0x1a1a22, alpha: rand(0.12, 0.25) })

    // Window dots
    if (Math.random() > 0.4) {
      const cols = Math.floor(w / 8)
      const rows = Math.floor(h / 12)
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (Math.random() > 0.7) {
            const wx = x + 4 + c * 8
            const wy = y + 6 + r * 12
            buildings.rect(wx, wy, 3, 4).fill({ color: 0xffaa44, alpha: rand(0.1, 0.3) })
          }
        }
      }
    }
  }
  container.addChild(buildings)

  // Sparse stars (barely visible)
  for (let i = 0; i < 30; i++) {
    const gfx = new Graphics()
    const r = 0.3 + Math.random() * 0.3
    gfx.circle(0, 0, r).fill(0xffddaa)
    gfx.x = Math.random() * RENDER_W
    gfx.y = Math.random() * RENDER_H * 0.4
    const baseAlpha = 0.1 + Math.random() * 0.15
    gfx.alpha = baseAlpha
    container.addChild(gfx)
    elements.push({ gfx, baseAlpha, phase: Math.random() * Math.PI * 2, speed: 0.2 + Math.random() * 0.4 })
  }

  // Grid (warm tone)
  const grid = new Graphics()
  const tileW = RENDER_W / 30
  for (let i = 0; i <= 30; i++) {
    const x = i * tileW
    grid.moveTo(x, 0).lineTo(x, RENDER_H).stroke({ color: 0x332211, width: 1, alpha: 0.32 })
  }
  const laneGap = RENDER_H / 7
  for (let i = 1; i <= 6; i++) {
    const y = i * laneGap
    grid.moveTo(0, y).lineTo(RENDER_W, y).stroke({ color: 0x332211, width: 1, alpha: 0.28 })
  }
  container.addChild(grid)

  addBottomHaze(container, 0x1a1008)
}

// ─── Shared ───

function addBottomHaze(container: Container, color: number): void {
  const haze = new Graphics()
  const hazeH = 60
  const hazeY = RENDER_H - hazeH
  const steps = 12
  for (let i = 0; i < steps; i++) {
    const t = i / steps
    const alpha = t * 0.4
    const y = hazeY + t * hazeH
    const h = hazeH / steps + 1
    haze.rect(0, y, RENDER_W, h).fill({ color, alpha })
  }
  container.addChild(haze)
}

// ─── Public API ───

export function createBackground(): BackgroundState {
  const container = new Container()
  const elements: AnimElement[] = []
  const theme = pickTheme()

  switch (theme) {
    case 'space-station':
      createSpaceStation(container, elements)
      break
    case 'asteroid-field':
      createAsteroidField(container, elements)
      break
    case 'ruined-city':
      createRuinedCity(container, elements)
      break
  }

  return { container, elements, theme }
}

export function updateBackground(state: BackgroundState, time: number): void {
  for (const el of state.elements) {
    // Twinkle/pulse
    el.gfx.alpha = el.baseAlpha + Math.sin(time * el.speed + el.phase) * 0.15

    // Drift (for asteroids, fog)
    if (el.driftX) {
      el.gfx.x += el.driftX * 0.016 // ~60fps
      // Wrap around
      if (el.gfx.x > RENDER_W + 50) el.gfx.x = -50
      if (el.gfx.x < -50) el.gfx.x = RENDER_W + 50
    }
    if (el.driftY) {
      el.gfx.y += el.driftY * 0.016
    }
  }
}
