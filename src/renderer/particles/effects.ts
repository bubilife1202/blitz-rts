import type { ParticlePool } from './particle-pool'
import { spawnParticle } from './particle-pool'

// Color constants
const FIRE = [0xff4400, 0xff8800, 0xffcc00] as const
const SMOKE = [0x666666, 0x888888, 0x444444] as const
const GOLD = [0xffd700, 0xffaa00] as const
const GREEN = [0x00ff88, 0x44ff44] as const
const PURPLE = [0xaa00ff, 0x8844ff] as const

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** 3-5 yellow/white flash particles, fast decay (0.15s life) */
export function muzzleFlash(pool: ParticlePool, x: number, y: number): void {
  const count = 3 + Math.floor(Math.random() * 3)
  for (let i = 0; i < count; i++) {
    const color = Math.random() > 0.5 ? 0xffffff : 0xffcc00
    spawnParticle(
      pool,
      x + rand(-4, 4),
      y + rand(-4, 4),
      rand(-40, 40),
      rand(-40, 40),
      0.15,
      rand(2, 4),
      color,
      1,
      0.8,
    )
  }
}

/** 6 gold line particles from attacker to target */
export function bulletTrail(
  pool: ParticlePool,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const dx = x2 - x1
  const dy = y2 - y1
  for (let i = 0; i < 6; i++) {
    const t = i / 5
    const px = x1 + dx * t + rand(-3, 3)
    const py = y1 + dy * t + rand(-3, 3)
    spawnParticle(
      pool,
      px,
      py,
      rand(-10, 10),
      rand(-10, 10),
      0.2,
      rand(1, 2),
      pick(GOLD),
      0.8,
      0.6,
    )
  }
}

/** 14 fire (red/orange) + 7 smoke (gray) particles, 0.5s life */
export function explosion(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = rand(40, 120)
    spawnParticle(
      pool,
      x + rand(-6, 6),
      y + rand(-6, 6),
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      rand(0.3, 0.5),
      rand(3, 6),
      pick(FIRE),
      1,
      0.9,
    )
  }
  for (let i = 0; i < 7; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = rand(20, 60)
    spawnParticle(
      pool,
      x + rand(-4, 4),
      y + rand(-4, 4),
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 20,
      rand(0.4, 0.6),
      rand(4, 8),
      pick(SMOKE),
      0.6,
      0.95,
    )
  }
}

/** 1 gray smoke particle per call (call each frame for trail) */
export function missileTrail(pool: ParticlePool, x: number, y: number): void {
  spawnParticle(
    pool,
    x + rand(-2, 2),
    y + rand(-2, 2),
    rand(-8, 8),
    rand(-15, 5),
    rand(0.3, 0.5),
    rand(2, 4),
    pick(SMOKE),
    0.5,
    0.9,
  )
}

/** 10 red/orange shockwave + debris particles */
export function baseHit(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = rand(50, 140)
    spawnParticle(
      pool,
      x + rand(-8, 8),
      y + rand(-8, 8),
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      rand(0.3, 0.6),
      rand(3, 7),
      pick(FIRE),
      1,
      0.85,
    )
  }
}

/** 8 gold spark particles per unit (for shield burst) */
export function shieldSparks(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const speed = rand(60, 100)
    spawnParticle(
      pool,
      x,
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      rand(0.3, 0.5),
      rand(2, 3),
      pick(GOLD),
      1,
      0.7,
    )
  }
}

/** 6 green rising cross particles (for repair) */
export function repairParticles(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 6; i++) {
    spawnParticle(
      pool,
      x + rand(-12, 12),
      y + rand(-4, 4),
      rand(-10, 10),
      rand(-60, -30),
      rand(0.5, 0.8),
      rand(2, 4),
      pick(GREEN),
      0.9,
      0.85,
    )
  }
}

/** Purple static particles (for scramble) */
export function scrambleStatic(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 6; i++) {
    spawnParticle(
      pool,
      x + rand(-16, 16),
      y + rand(-16, 16),
      rand(-30, 30),
      rand(-30, 30),
      rand(0.15, 0.3),
      rand(1, 3),
      pick(PURPLE),
      0.8,
      0.6,
    )
  }
}

/** Gold sparkle particles (for overcharge) */
export function overchargeSparkle(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 5; i++) {
    spawnParticle(
      pool,
      x + rand(-10, 10),
      y + rand(-10, 10),
      rand(-20, 20),
      rand(-40, -10),
      rand(0.3, 0.5),
      rand(1, 3),
      pick(GOLD),
      1,
      0.75,
    )
  }
}
