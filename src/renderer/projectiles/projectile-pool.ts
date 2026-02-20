import { Container, Graphics } from 'pixi.js'

export type ProjectileKind =
  | 'vulcan'
  | 'cannon'
  | 'sniper'
  | 'missile'
  | 'laser'
  | 'shotgun'
  | 'railgun'

interface Projectile {
  gfx: Graphics
  x: number
  y: number
  startX: number
  startY: number
  targetX: number
  targetY: number
  elapsed: number
  duration: number
  kind: ProjectileKind
  active: boolean
  angle: number // spread angle for shotgun
}

export interface ProjectilePool {
  container: Container
  projectiles: Projectile[]
}

const POOL_SIZE = 60

const DURATIONS: Record<ProjectileKind, number> = {
  vulcan: 0.15,
  cannon: 0.25,
  sniper: 0.1,
  missile: 0.4,
  laser: 0.08,
  shotgun: 0.12,
  railgun: 0.15,
}

export function createProjectilePool(): ProjectilePool {
  const container = new Container()
  const projectiles: Projectile[] = []

  for (let i = 0; i < POOL_SIZE; i++) {
    const gfx = new Graphics()
    gfx.visible = false
    container.addChild(gfx)

    projectiles.push({
      gfx,
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      targetX: 0,
      targetY: 0,
      elapsed: 0,
      duration: 0.2,
      kind: 'vulcan',
      active: false,
      angle: 0,
    })
  }

  return { container, projectiles }
}

function findInactive(pool: ProjectilePool): Projectile | null {
  for (const p of pool.projectiles) {
    if (!p.active) return p
  }
  return null
}

function spawnOne(
  pool: ProjectilePool,
  kind: ProjectileKind,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  delay: number,
  angle: number,
): void {
  const p = findInactive(pool)
  if (!p) return

  p.kind = kind
  p.startX = sx
  p.startY = sy
  p.targetX = tx
  p.targetY = ty
  p.elapsed = -delay
  p.duration = DURATIONS[kind]
  p.active = true
  p.angle = angle
  p.gfx.visible = false
}

export function spawnProjectile(
  pool: ProjectilePool,
  kind: ProjectileKind,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): void {
  switch (kind) {
    case 'vulcan':
      // 3 bursts with 0.03s intervals
      for (let i = 0; i < 3; i++) {
        spawnOne(pool, 'vulcan', sx, sy, tx, ty, i * 0.03, 0)
      }
      break
    case 'shotgun': {
      // 5 pellets in a cone (-15° to +15°)
      const angles = [-15, -7.5, 0, 7.5, 15]
      for (const a of angles) {
        spawnOne(pool, 'shotgun', sx, sy, tx, ty, 0, (a * Math.PI) / 180)
      }
      break
    }
    default:
      spawnOne(pool, kind, sx, sy, tx, ty, 0, 0)
      break
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function drawProjectile(p: Projectile, t: number): void {
  const gfx = p.gfx
  gfx.clear()

  const dx = p.targetX - p.startX
  const dy = p.targetY - p.startY

  switch (p.kind) {
    case 'vulcan': {
      p.x = lerp(p.startX, p.targetX, t)
      p.y = lerp(p.startY, p.targetY, t)
      gfx.circle(0, 0, 2).fill(0xffcc00)
      break
    }
    case 'cannon': {
      p.x = lerp(p.startX, p.targetX, t)
      p.y = lerp(p.startY, p.targetY, t)
      gfx.circle(0, 0, 4).fill(0xffd700)
      // Short trail
      const angle = Math.atan2(dy, dx)
      const trailLen = 8
      gfx
        .moveTo(-Math.cos(angle) * trailLen, -Math.sin(angle) * trailLen)
        .lineTo(0, 0)
        .stroke({ color: 0xffd700, width: 2, alpha: 0.5 })
      break
    }
    case 'sniper': {
      // Instant line from source to target
      p.x = p.startX
      p.y = p.startY
      const alpha = 1 - t
      gfx
        .moveTo(0, 0)
        .lineTo(dx, dy)
        .stroke({ color: 0xffffff, width: 2, alpha })
      break
    }
    case 'missile': {
      // Quadratic bezier with +30px offset perpendicular
      const midX = (p.startX + p.targetX) / 2
      const midY = (p.startY + p.targetY) / 2
      const perpX = -dy / Math.sqrt(dx * dx + dy * dy + 0.01) * 30
      const perpY = dx / Math.sqrt(dx * dx + dy * dy + 0.01) * 30
      const cpX = midX + perpX
      const cpY = midY + perpY
      // Quadratic bezier position
      const u = 1 - t
      p.x = u * u * p.startX + 2 * u * t * cpX + t * t * p.targetX
      p.y = u * u * p.startY + 2 * u * t * cpY + t * t * p.targetY
      gfx.rect(-1.5, -3, 3, 6).fill(0xff4444)
      // Smoke trail particle
      gfx.circle(-1 + Math.random() * 2, 4 + Math.random() * 2, 1.5).fill({ color: 0x888888, alpha: 0.4 })
      break
    }
    case 'laser': {
      // Instant beam
      p.x = p.startX
      p.y = p.startY
      const alpha2 = 1 - t
      gfx
        .moveTo(0, 0)
        .lineTo(dx, dy)
        .stroke({ color: 0x00ffff, width: 2, alpha: alpha2 })
      break
    }
    case 'shotgun': {
      // Pellet with angle offset
      const dist = Math.sqrt(dx * dx + dy * dy)
      const baseAngle = Math.atan2(dy, dx)
      const finalAngle = baseAngle + p.angle
      const pos = t * dist
      p.x = p.startX + Math.cos(finalAngle) * pos
      p.y = p.startY + Math.sin(finalAngle) * pos
      gfx.circle(0, 0, 1.5).fill(0xffcc00)
      break
    }
    case 'railgun': {
      // Thick white line + ring at source
      p.x = p.startX
      p.y = p.startY
      const alpha3 = 1 - t
      gfx
        .moveTo(0, 0)
        .lineTo(dx, dy)
        .stroke({ color: 0xffffff, width: 3, alpha: alpha3 })
      // Ring at source
      const ringR = 6 + t * 10
      gfx.circle(0, 0, ringR).stroke({ color: 0xffffff, width: 1.5, alpha: alpha3 * 0.6 })
      break
    }
  }

  gfx.position.set(p.x, p.y)
  gfx.visible = true
}

export function updateProjectiles(pool: ProjectilePool, dt: number): void {
  for (const p of pool.projectiles) {
    if (!p.active) continue

    p.elapsed += dt

    if (p.elapsed < 0) {
      // Waiting for delay
      p.gfx.visible = false
      continue
    }

    const t = Math.min(1, p.elapsed / p.duration)

    if (t >= 1) {
      p.active = false
      p.gfx.visible = false
      p.gfx.clear()
      continue
    }

    drawProjectile(p, t)
  }
}

export function weaponSpecialToProjectileKind(specialKind: string): ProjectileKind | null {
  switch (specialKind) {
    case 'vulcan-armor-pierce':
      return 'vulcan'
    case 'none':
      return 'cannon'
    case 'sniper-farthest':
      return 'sniper'
    case 'missile-splash':
      return 'missile'
    case 'hammer-true-damage':
      return null // Hammer uses melee rush, no projectile
    case 'laser-pierce':
      return 'laser'
    case 'shotgun-close':
      return 'shotgun'
    case 'railgun-charge':
      return 'railgun'
    default:
      return 'cannon'
  }
}
