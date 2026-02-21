import { Container, Graphics } from 'pixi.js'
import { RENDER_W, RENDER_H } from '../pixi-app'

// ─── Types ───

type AtmoKind = 'dust' | 'spark' | 'shimmer'

interface AtmoParticle {
  gfx: Graphics
  kind: AtmoKind
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  baseAlpha: number
  phase: number
  active: boolean
}

export interface AtmosphereState {
  container: Container
  particles: AtmoParticle[]
  activeCount: number
  /** Base x-positions for heat shimmer: [playerBaseX, enemyBaseX] */
  basePositions: [number, number]
  /** Base y-positions for heat shimmer: [playerBaseY, enemyBaseY] */
  baseYPositions: [number, number]
}

// ─── Constants ───

const MAX_ATMO_PARTICLES = 50
const DUST_COUNT = 18
const SHIMMER_PER_BASE = 6

// ─── Helpers ───

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

// ─── Pool management ───

function getInactive(state: AtmosphereState): AtmoParticle | null {
  if (state.activeCount >= MAX_ATMO_PARTICLES) return null
  for (const p of state.particles) {
    if (!p.active) return p
  }
  return null
}

function activate(
  state: AtmosphereState,
  p: AtmoParticle,
  kind: AtmoKind,
  x: number,
  y: number,
  vx: number,
  vy: number,
  life: number,
  size: number,
  color: number,
  alpha: number,
): void {
  p.kind = kind
  p.x = x
  p.y = y
  p.vx = vx
  p.vy = vy
  p.life = life
  p.maxLife = life
  p.size = size
  p.baseAlpha = alpha
  p.phase = Math.random() * Math.PI * 2
  p.active = true

  p.gfx.clear()
  p.gfx.circle(0, 0, size).fill({ color, alpha })
  p.gfx.position.set(x, y)
  p.gfx.alpha = alpha
  p.gfx.scale.set(1)
  p.gfx.visible = true

  state.activeCount++
}

function deactivate(state: AtmosphereState, p: AtmoParticle): void {
  p.active = false
  p.gfx.visible = false
  state.activeCount--
}

// ─── Spawners ───

function spawnDust(state: AtmosphereState): void {
  const p = getInactive(state)
  if (!p) return

  const x = rand(-20, RENDER_W + 20)
  const y = rand(0, RENDER_H)
  const vx = rand(8, 25) // drift right
  const vy = 0
  const life = rand(8, 14) // long-lived, wraps around
  const size = rand(0.8, 1.5)
  const color = Math.random() > 0.5 ? 0xffffff : 0xaabbcc
  const alpha = rand(0.15, 0.3)

  activate(state, p, 'dust', x, y, vx, vy, life, size, color, alpha)
}

function spawnShimmer(state: AtmosphereState, baseX: number, baseY: number): void {
  const p = getInactive(state)
  if (!p) return

  const x = baseX + rand(-30, 30)
  const y = baseY + rand(-10, 10)
  const vx = rand(-2, 2)
  const vy = rand(-18, -8) // rise upward
  const life = rand(1.5, 3.0)
  const size = rand(2, 4)
  const color = 0xffffff
  const alpha = rand(0.04, 0.1)

  activate(state, p, 'shimmer', x, y, vx, vy, life, size, color, alpha)
}

function spawnSpark(state: AtmosphereState, x: number, y: number): void {
  const p = getInactive(state)
  if (!p) return

  const angle = Math.random() * Math.PI * 2
  const speed = rand(60, 160)
  const vx = Math.cos(angle) * speed
  const vy = Math.sin(angle) * speed
  const life = rand(0.3, 0.8)
  const size = rand(0.8, 1.2)
  const color = Math.random() > 0.4 ? 0x00ffff : 0xffffff
  const alpha = rand(0.7, 1.0)

  activate(state, p, 'spark', x, y, vx, vy, life, size, color, alpha)
}

// ─── Public API ───

export function createAtmosphere(
  playerBaseX: number,
  playerBaseY: number,
  enemyBaseX: number,
  enemyBaseY: number,
): AtmosphereState {
  const container = new Container()
  const particles: AtmoParticle[] = []

  for (let i = 0; i < MAX_ATMO_PARTICLES; i++) {
    const gfx = new Graphics()
    gfx.circle(0, 0, 1).fill({ color: 0xffffff, alpha: 0.1 })
    gfx.visible = false
    container.addChild(gfx)

    particles.push({
      gfx,
      kind: 'dust',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 1,
      baseAlpha: 0.2,
      phase: 0,
      active: false,
    })
  }

  const state: AtmosphereState = {
    container,
    particles,
    activeCount: 0,
    basePositions: [playerBaseX, enemyBaseX],
    baseYPositions: [playerBaseY, enemyBaseY],
  }

  // Pre-spawn initial dust particles spread across the screen
  for (let i = 0; i < DUST_COUNT; i++) {
    spawnDust(state)
  }

  // Pre-spawn initial shimmer particles near each base
  for (let i = 0; i < SHIMMER_PER_BASE; i++) {
    spawnShimmer(state, playerBaseX, playerBaseY)
    spawnShimmer(state, enemyBaseX, enemyBaseY)
  }

  return state
}

/** Spawn 3-5 energy sparks at the given world position (call on damage events) */
export function triggerEnergySparks(state: AtmosphereState, x: number, y: number): void {
  const count = 3 + Math.floor(Math.random() * 3)
  for (let i = 0; i < count; i++) {
    spawnSpark(state, x + rand(-6, 6), y + rand(-6, 6))
  }
}

export function updateAtmosphere(state: AtmosphereState, dt: number, time: number): void {
  // Count active by kind so we know what to respawn
  let dustCount = 0
  let shimmerCount = 0

  for (const p of state.particles) {
    if (!p.active) continue

    switch (p.kind) {
      case 'dust': {
        dustCount++
        // Drift with slight vertical oscillation
        p.x += p.vx * dt
        p.y += Math.sin(time * 1.5 + p.phase) * 8 * dt

        // Wrap around horizontally
        if (p.x > RENDER_W + 30) {
          p.x = -20
          p.y = rand(0, RENDER_H)
        }

        p.gfx.position.set(p.x, p.y)
        // Gentle alpha pulse
        p.gfx.alpha = p.baseAlpha + Math.sin(time * 0.8 + p.phase) * 0.05

        // Dust lives long but eventually respawns
        p.life -= dt
        if (p.life <= 0) {
          deactivate(state, p)
          dustCount--
        }
        break
      }

      case 'spark': {
        // Fast movement, friction decay
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx *= 1 - 3.0 * dt // friction
        p.vy *= 1 - 3.0 * dt

        p.life -= dt
        if (p.life <= 0) {
          deactivate(state, p)
          continue
        }

        const lifeRatio = p.life / p.maxLife
        p.gfx.position.set(p.x, p.y)
        p.gfx.alpha = p.baseAlpha * lifeRatio
        p.gfx.scale.set(Math.max(0.01, lifeRatio))
        break
      }

      case 'shimmer': {
        shimmerCount++
        // Rise upward with slight wobble
        p.x += p.vx * dt + Math.sin(time * 2 + p.phase) * 3 * dt
        p.y += p.vy * dt

        p.life -= dt
        if (p.life <= 0) {
          deactivate(state, p)
          shimmerCount--
          continue
        }

        const lifeRatio = p.life / p.maxLife
        p.gfx.position.set(p.x, p.y)
        // Pulse alpha for shimmer distortion effect
        const pulse = Math.sin(time * 4 + p.phase) * 0.5 + 0.5
        p.gfx.alpha = p.baseAlpha * lifeRatio * (0.5 + pulse * 0.5)
        break
      }
    }
  }

  // Respawn dust to maintain count
  while (dustCount < DUST_COUNT) {
    spawnDust(state)
    dustCount++
  }

  // Respawn shimmer near bases
  const targetShimmer = SHIMMER_PER_BASE * 2
  while (shimmerCount < targetShimmer) {
    const baseIdx = shimmerCount % 2
    spawnShimmer(
      state,
      state.basePositions[baseIdx]!,
      state.baseYPositions[baseIdx]!,
    )
    shimmerCount++
  }
}

export function destroyAtmosphere(state: AtmosphereState): void {
  state.container.destroy({ children: true })
}
