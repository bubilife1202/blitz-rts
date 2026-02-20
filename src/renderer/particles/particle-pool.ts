import { Container, Graphics } from 'pixi.js'

export interface Particle {
  gfx: Graphics
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: number
  alpha: number
  scaleDecay: number
  active: boolean
}

export interface ParticlePool {
  container: Container
  particles: Particle[]
  activeCount: number
}

const MAX_PARTICLES = 500

export function createParticlePool(maxParticles: number = MAX_PARTICLES): ParticlePool {
  const container = new Container()
  const particles: Particle[] = []

  for (let i = 0; i < maxParticles; i++) {
    const gfx = new Graphics()
    gfx.circle(0, 0, 1).fill(0xffffff)
    gfx.visible = false
    container.addChild(gfx)

    particles.push({
      gfx,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 1,
      color: 0xffffff,
      alpha: 1,
      scaleDecay: 1,
      active: false,
    })
  }

  return { container, particles, activeCount: 0 }
}

export function spawnParticle(
  pool: ParticlePool,
  x: number,
  y: number,
  vx: number,
  vy: number,
  life: number,
  size: number,
  color: number,
  alpha: number = 1,
  scaleDecay: number = 1,
): void {
  // Find an inactive particle
  for (const p of pool.particles) {
    if (!p.active) {
      p.x = x
      p.y = y
      p.vx = vx
      p.vy = vy
      p.life = life
      p.maxLife = life
      p.size = size
      p.color = color
      p.alpha = alpha
      p.scaleDecay = scaleDecay
      p.active = true

      p.gfx.clear()
      p.gfx.circle(0, 0, size).fill(color)
      p.gfx.position.set(x, y)
      p.gfx.alpha = alpha
      p.gfx.scale.set(1)
      p.gfx.visible = true

      pool.activeCount++
      return
    }
  }
}

export function updateParticles(pool: ParticlePool, dt: number): void {
  for (const p of pool.particles) {
    if (!p.active) continue

    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 30 * dt // gravity for smoke-like drift
    p.life -= dt

    if (p.life <= 0) {
      p.active = false
      p.gfx.visible = false
      pool.activeCount--
      continue
    }

    const lifeRatio = p.life / p.maxLife
    const scale = lifeRatio * p.scaleDecay
    p.gfx.position.set(p.x, p.y)
    p.gfx.alpha = p.alpha * lifeRatio
    p.gfx.scale.set(Math.max(0.01, scale))
  }
}
