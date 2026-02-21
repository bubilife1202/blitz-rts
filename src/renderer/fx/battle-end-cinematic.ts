import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { RenderLayers } from '../layers'
import { RENDER_W, RENDER_H } from '../pixi-app'

// ─── Public interface ────────────────────────────────────

export interface BattleEndCinematic {
  /** Advance the cinematic by dt seconds. Returns false when finished. */
  update(dt: number): boolean
  destroy(): void
}

// ─── Shared helpers ──────────────────────────────────────

interface CinematicParticle {
  gfx: Graphics
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  radius: number
  color: number
}

function spawnParticles(
  container: Container,
  count: number,
  cx: number,
  cy: number,
  color: number,
  spread: number,
  speed: number,
  lifeRange: [number, number],
): CinematicParticle[] {
  const particles: CinematicParticle[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const spd = speed * (0.4 + Math.random() * 0.6)
    const life = lifeRange[0] + Math.random() * (lifeRange[1] - lifeRange[0])
    const radius = 1.5 + Math.random() * 2.5
    const gfx = new Graphics()
    gfx.circle(0, 0, radius).fill({ color, alpha: 1 })
    const px = cx + (Math.random() - 0.5) * spread
    const py = cy + (Math.random() - 0.5) * spread
    gfx.position.set(px, py)
    container.addChild(gfx)
    particles.push({
      gfx,
      x: px,
      y: py,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life,
      maxLife: life,
      radius,
      color,
    })
  }
  return particles
}

function updateParticleList(particles: CinematicParticle[], dt: number): void {
  for (const p of particles) {
    p.life -= dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 20 * dt // light gravity
    p.gfx.position.set(p.x, p.y)
    const t = Math.max(0, p.life / p.maxLife)
    p.gfx.alpha = t
    p.gfx.scale.set(0.5 + t * 0.5)
  }
}

function destroyParticleList(particles: CinematicParticle[]): void {
  for (const p of particles) {
    p.gfx.destroy()
  }
  particles.length = 0
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t))
}

// ─── Victory Cinematic ───────────────────────────────────

const VICTORY_DURATION = 2.5

const VICTORY_TEXT_STYLE = new TextStyle({
  fontFamily: 'Orbitron, monospace',
  fontSize: 52,
  fontWeight: '900',
  fill: '#ffd54f',
  stroke: { color: '#000000', width: 5 },
  letterSpacing: 8,
  dropShadow: {
    alpha: 0.6,
    blur: 12,
    distance: 0,
    color: '#ffd54f',
  },
})

export function createVictoryCinematic(layers: RenderLayers): BattleEndCinematic {
  const container = new Container()
  layers.overlay.addChild(container)

  // Full-screen flash overlay
  const flash = new Graphics()
  flash.rect(0, 0, RENDER_W, RENDER_H).fill({ color: 0xffffff, alpha: 1 })
  flash.alpha = 0
  container.addChild(flash)

  // Fade-to-black overlay
  const fadeOverlay = new Graphics()
  fadeOverlay.rect(0, 0, RENDER_W, RENDER_H).fill({ color: 0x000000, alpha: 1 })
  fadeOverlay.alpha = 0
  container.addChild(fadeOverlay)

  // Gold glow overlay behind text
  const glowOverlay = new Graphics()
  glowOverlay.rect(0, 0, RENDER_W, RENDER_H).fill({ color: 0xffd54f, alpha: 1 })
  glowOverlay.alpha = 0
  container.addChild(glowOverlay)

  // Victory text
  const text = new Text({ text: '\uc2b9\ub9ac!', style: VICTORY_TEXT_STYLE })
  text.anchor.set(0.5, 0.5)
  text.position.set(-200, RENDER_H / 2 - 20)
  text.alpha = 0
  container.addChild(text)

  let elapsed = 0
  let particles: CinematicParticle[] = []
  let burstSpawned = false
  let secondBurstSpawned = false

  return {
    update(dt: number): boolean {
      elapsed += dt
      if (elapsed >= VICTORY_DURATION) return false

      // Phase 1: 0.0-0.3s - Screen flash white
      if (elapsed < 0.3) {
        const t = elapsed / 0.3
        if (t < 0.4) {
          flash.alpha = easeOutCubic(t / 0.4) * 0.35
        } else {
          flash.alpha = 0.35 * (1 - easeOutCubic((t - 0.4) / 0.6))
        }
      } else {
        flash.alpha = 0
      }

      // Phase 2: 0.3-1.0s - Spawn gold particle burst, camera zoom hint via scale
      if (elapsed >= 0.3 && !burstSpawned) {
        burstSpawned = true
        particles = spawnParticles(
          container, 30,
          RENDER_W / 2, RENDER_H / 2,
          0xffd54f, 60, 120,
          [0.8, 1.4],
        )
      }

      if (elapsed >= 0.3 && elapsed < 1.0) {
        const t = clamp01((elapsed - 0.3) / 0.7)
        const scale = 1.0 + easeOutCubic(t) * 0.05
        layers.overlay.parent?.scale.set(scale)
      }

      // Phase 3: 1.0-1.5s - Text flies in from left
      if (elapsed >= 1.0) {
        text.alpha = 1
        if (elapsed < 1.5) {
          const t = clamp01((elapsed - 1.0) / 0.5)
          const eased = easeOutCubic(t)
          text.position.x = -200 + (RENDER_W / 2 + 200) * eased
        } else {
          text.position.x = RENDER_W / 2
        }
      }

      // Phase 4: 1.5-2.0s - Text pulses with gold glow, more particles
      if (elapsed >= 1.5 && elapsed < 2.0) {
        const t = clamp01((elapsed - 1.5) / 0.5)
        const pulse = 1.0 + Math.sin(t * Math.PI * 3) * 0.08
        text.scale.set(pulse)
        glowOverlay.alpha = 0.04 + Math.sin(t * Math.PI * 2) * 0.03

        if (!secondBurstSpawned) {
          secondBurstSpawned = true
          const burst2 = spawnParticles(
            container, 20,
            RENDER_W / 2, RENDER_H / 2 - 20,
            0xffe082, 80, 80,
            [0.5, 1.0],
          )
          particles.push(...burst2)
        }
      } else {
        glowOverlay.alpha = 0
      }

      // Phase 5: 2.0-2.5s - Fade to black
      if (elapsed >= 2.0) {
        const t = clamp01((elapsed - 2.0) / 0.5)
        fadeOverlay.alpha = easeInOutQuad(t) * 0.8
        // Fade text slightly
        text.alpha = 1 - t * 0.3
      }

      // Update particles
      updateParticleList(particles, dt)

      return true
    },

    destroy(): void {
      // Reset parent scale if we changed it
      if (layers.overlay.parent) {
        layers.overlay.parent.scale.set(1)
      }
      destroyParticleList(particles)
      container.destroy({ children: true })
    },
  }
}

// ─── Defeat Cinematic ────────────────────────────────────

const DEFEAT_DURATION = 2.0

const DEFEAT_TEXT_STYLE = new TextStyle({
  fontFamily: 'Orbitron, monospace',
  fontSize: 48,
  fontWeight: '900',
  fill: '#ef5350',
  stroke: { color: '#000000', width: 5 },
  letterSpacing: 6,
  dropShadow: {
    alpha: 0.5,
    blur: 10,
    distance: 0,
    color: '#ff1744',
  },
})

export function createDefeatCinematic(layers: RenderLayers): BattleEndCinematic {
  const container = new Container()
  layers.overlay.addChild(container)

  // Red flash overlay
  const flash = new Graphics()
  flash.rect(0, 0, RENDER_W, RENDER_H).fill({ color: 0xff1744, alpha: 1 })
  flash.alpha = 0
  container.addChild(flash)

  // Desaturation tint overlay (dark blue-gray)
  const desatOverlay = new Graphics()
  desatOverlay.rect(0, 0, RENDER_W, RENDER_H).fill({ color: 0x1a1a2e, alpha: 1 })
  desatOverlay.alpha = 0
  container.addChild(desatOverlay)

  // Fade-to-dark overlay
  const fadeOverlay = new Graphics()
  fadeOverlay.rect(0, 0, RENDER_W, RENDER_H).fill({ color: 0x0a0a0a, alpha: 1 })
  fadeOverlay.alpha = 0
  container.addChild(fadeOverlay)

  // Defeat text
  const text = new Text({ text: '\ud328\ubc30...', style: DEFEAT_TEXT_STYLE })
  text.anchor.set(0.5, 0.5)
  text.position.set(RENDER_W / 2, RENDER_H / 2 - 20)
  text.alpha = 0
  container.addChild(text)

  let elapsed = 0
  let shakeTimer = 0

  return {
    update(dt: number): boolean {
      elapsed += dt
      if (elapsed >= DEFEAT_DURATION) return false

      // Phase 1: 0.0-0.3s - Screen shake + red flash
      if (elapsed < 0.3) {
        const t = elapsed / 0.3
        // Red flash: quick peak then decay
        if (t < 0.3) {
          flash.alpha = easeOutCubic(t / 0.3) * 0.4
        } else {
          flash.alpha = 0.4 * (1 - easeOutCubic((t - 0.3) / 0.7))
        }

        // Camera shake via container offset
        shakeTimer += dt
        const intensity = 6 * (1 - t)
        if (container.parent) {
          container.parent.position.set(
            (Math.random() - 0.5) * intensity * 2,
            (Math.random() - 0.5) * intensity * 2,
          )
        }
      } else {
        flash.alpha = 0
        // Reset shake position
        if (shakeTimer > 0) {
          if (container.parent) {
            container.parent.position.set(0, 0)
          }
          shakeTimer = 0
        }
      }

      // Phase 2: 0.3-1.0s - Slow desaturation, camera slight zoom out
      if (elapsed >= 0.3 && elapsed < 1.0) {
        const t = clamp01((elapsed - 0.3) / 0.7)
        desatOverlay.alpha = easeInOutQuad(t) * 0.35
        // Slight zoom out
        const scale = 1.0 - easeOutCubic(t) * 0.02
        if (layers.overlay.parent) {
          layers.overlay.parent.scale.set(scale)
        }
      }

      // Phase 3: 1.0-1.5s - Text fades in
      if (elapsed >= 1.0 && elapsed < 1.5) {
        const t = clamp01((elapsed - 1.0) / 0.5)
        text.alpha = easeOutCubic(t)
        text.scale.set(1.05 - easeOutCubic(t) * 0.05)
      } else if (elapsed >= 1.5) {
        text.alpha = 1
        text.scale.set(1)
      }

      // Phase 4: 1.5-2.0s - Fade to dark
      if (elapsed >= 1.5) {
        const t = clamp01((elapsed - 1.5) / 0.5)
        fadeOverlay.alpha = easeInOutQuad(t) * 0.9
        // Slowly fade text too
        text.alpha = 1 - t * 0.2
      }

      return true
    },

    destroy(): void {
      // Reset parent scale/position if we changed it
      if (layers.overlay.parent) {
        layers.overlay.parent.scale.set(1)
        layers.overlay.parent.position.set(0, 0)
      }
      container.destroy({ children: true })
    },
  }
}

// ─── Draw Cinematic ──────────────────────────────────────

const DRAW_DURATION = 1.5

const DRAW_TEXT_STYLE = new TextStyle({
  fontFamily: 'Orbitron, monospace',
  fontSize: 44,
  fontWeight: '700',
  fill: '#b0bec5',
  stroke: { color: '#000000', width: 4 },
  letterSpacing: 6,
  dropShadow: {
    alpha: 0.4,
    blur: 8,
    distance: 0,
    color: '#607d8b',
  },
})

export function createDrawCinematic(layers: RenderLayers): BattleEndCinematic {
  const container = new Container()
  layers.overlay.addChild(container)

  // Gray tint overlay
  const tintOverlay = new Graphics()
  tintOverlay.rect(0, 0, RENDER_W, RENDER_H).fill({ color: 0x37474f, alpha: 1 })
  tintOverlay.alpha = 0
  container.addChild(tintOverlay)

  // Fade-to-dark overlay
  const fadeOverlay = new Graphics()
  fadeOverlay.rect(0, 0, RENDER_W, RENDER_H).fill({ color: 0x0a0a0a, alpha: 1 })
  fadeOverlay.alpha = 0
  container.addChild(fadeOverlay)

  // Draw text
  const text = new Text({ text: '\ubb34\uc2b9\ubd80', style: DRAW_TEXT_STYLE })
  text.anchor.set(0.5, 0.5)
  text.position.set(RENDER_W / 2, RENDER_H / 2 - 20)
  text.alpha = 0
  container.addChild(text)

  let elapsed = 0

  return {
    update(dt: number): boolean {
      elapsed += dt
      if (elapsed >= DRAW_DURATION) return false

      // 0.0-0.5s - Gray tint fades in
      if (elapsed < 0.5) {
        const t = clamp01(elapsed / 0.5)
        tintOverlay.alpha = easeOutCubic(t) * 0.3
      }

      // 0.3-0.8s - Text fades in
      if (elapsed >= 0.3 && elapsed < 0.8) {
        const t = clamp01((elapsed - 0.3) / 0.5)
        text.alpha = easeOutCubic(t)
      } else if (elapsed >= 0.8) {
        text.alpha = 1
      }

      // 1.0-1.5s - Fade to dark
      if (elapsed >= 1.0) {
        const t = clamp01((elapsed - 1.0) / 0.5)
        fadeOverlay.alpha = easeInOutQuad(t) * 0.85
        text.alpha = 1 - t * 0.3
      }

      return true
    },

    destroy(): void {
      container.destroy({ children: true })
    },
  }
}
