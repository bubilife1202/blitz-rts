import { Container, Sprite, Graphics } from 'pixi.js'
import type { Build, LegsMoveType, MountType, WeaponSpecial } from '../core/types'
import { getMechTexture } from './sprite-cache'
import { buildFromUnitTraits } from '../ui/mech-renderer'

// ─── Status flags passed from battle-renderer ───

export interface UnitStatusFlags {
  frozen: boolean
  invincible: boolean
  defenseBuff: boolean
  fireRateBuff: boolean
  scrambled: boolean
  focusTarget: boolean
}

export const EMPTY_STATUS: UnitStatusFlags = {
  frozen: false,
  invincible: false,
  defenseBuff: false,
  fireRateBuff: false,
  scrambled: false,
  focusTarget: false,
}

// ─── Attack animation types ───

type AttackPhase = 'none' | 'windup' | 'fire' | 'followthrough'

type WeaponAnimKind =
  | 'vulcan'
  | 'cannon'
  | 'sniper'
  | 'missile'
  | 'hammer'
  | 'laser'
  | 'shotgun'
  | 'railgun'

// ─── State ───

export interface MechSpriteState {
  container: Container
  sprite: Sprite | null
  hpBar: Graphics
  hpBarBg: Graphics
  statusGfx: Graphics
  unitId: number
  side: 'player' | 'enemy'
  phase: number
  moveType: LegsMoveType
  animState: 'idle' | 'moving' | 'attacking' | 'dying' | 'spawning'
  spawnTimer: number
  deathTimer: number
  // Attack animation
  attackPhase: AttackPhase
  attackTimer: number
  weaponAnim: WeaponAnimKind
  attackOffsetX: number
  // Hit reaction
  hitTimer: number
  hitFromRight: boolean
  // Death
  deathWeapon: WeaponAnimKind | null
  // Status
  status: UnitStatusFlags
  build: Build
}

const HP_BAR_W = 40
const HP_BAR_H = 4
const SPAWN_DURATION = 0.3
const DEATH_DURATION = 0.5

// Attack phase durations
const WINDUP_DUR = 0.08
const FIRE_DUR = 0.05
const FOLLOW_DUR = 0.15
// Hit reaction
const HIT_DURATION = 0.15

function weaponSpecialToAnim(special: WeaponSpecial): WeaponAnimKind {
  switch (special.kind) {
    case 'vulcan-armor-pierce':
      return 'vulcan'
    case 'none':
      return 'cannon'
    case 'sniper-farthest':
      return 'sniper'
    case 'missile-splash':
      return 'missile'
    case 'hammer-true-damage':
      return 'hammer'
    case 'laser-pierce':
      return 'laser'
    case 'shotgun-close':
      return 'shotgun'
    case 'railgun-charge':
      return 'railgun'
  }
}

export function createMechSprite(
  unitId: number,
  side: 'player' | 'enemy',
  moveType: LegsMoveType,
  mountType: MountType,
  weaponSpecial: WeaponSpecial,
): MechSpriteState {
  const container = new Container()
  const build = buildFromUnitTraits(moveType, mountType, weaponSpecial)

  // HP bar background
  const hpBarBg = new Graphics()
  hpBarBg.rect(-HP_BAR_W / 2, -58, HP_BAR_W, HP_BAR_H).fill({ color: 0x333333, alpha: 0.7 })
  container.addChild(hpBarBg)

  // HP bar foreground
  const hpBar = new Graphics()
  container.addChild(hpBar)

  // Status overlay graphics
  const statusGfx = new Graphics()
  container.addChild(statusGfx)

  // Try to load texture immediately
  const texture = getMechTexture(build, side)
  let sprite: Sprite | null = null
  if (texture) {
    sprite = new Sprite(texture)
    sprite.anchor.set(0.5, 0.5)
    sprite.scale.set(0.35)
    if (side === 'enemy') {
      sprite.scale.x = -0.35
    }
    container.addChildAt(sprite, 0)
  }

  // Start in spawning state
  container.scale.set(0)
  container.alpha = 0

  return {
    container,
    sprite,
    hpBar,
    hpBarBg,
    statusGfx,
    unitId,
    side,
    phase: unitId * 0.7,
    moveType,
    animState: 'spawning',
    spawnTimer: SPAWN_DURATION,
    deathTimer: 0,
    attackPhase: 'none',
    attackTimer: 0,
    weaponAnim: weaponSpecialToAnim(weaponSpecial),
    attackOffsetX: 0,
    hitTimer: 0,
    hitFromRight: false,
    deathWeapon: null,
    status: { ...EMPTY_STATUS },
    build,
  }
}

// ─── Attack animation per weapon ───

function applyAttackAnim(
  state: MechSpriteState,
  container: Container,
  sprite: Sprite | null,
): void {
  if (state.attackPhase === 'none') {
    state.attackOffsetX = 0
    return
  }

  const dir = state.side === 'player' ? 1 : -1
  const weapon = state.weaponAnim

  if (state.attackPhase === 'windup') {
    const t = 1 - state.attackTimer / WINDUP_DUR
    switch (weapon) {
      case 'vulcan':
        container.rotation = 0.03 * t * dir
        break
      case 'cannon':
        state.attackOffsetX = -3 * t * dir
        container.scale.set(1 - 0.03 * t, 1)
        break
      case 'sniper':
        // Hold still, scope glow
        if (sprite) sprite.tint = lerpColor(0xffffff, 0xaaddff, t)
        break
      case 'missile':
        container.rotation = -0.02 * t * dir
        break
      case 'hammer':
        state.attackOffsetX = 8 * t * dir
        break
      case 'laser':
        if (sprite) sprite.tint = lerpColor(0xffffff, 0x88ffff, t)
        break
      case 'shotgun':
        container.scale.set(1, 1 - 0.02 * t)
        break
      case 'railgun':
        if (sprite) sprite.tint = lerpColor(0xffffff, 0xccddff, t)
        container.rotation = Math.sin(t * 20) * 0.01
        break
    }
  } else if (state.attackPhase === 'fire') {
    const t = 1 - state.attackTimer / FIRE_DUR
    switch (weapon) {
      case 'vulcan':
        if (sprite) sprite.tint = t < 0.5 ? 0xffffaa : 0xffffff
        container.scale.set(1.05, 1.05)
        break
      case 'cannon':
        state.attackOffsetX = 5 * dir
        container.scale.set(1, 1)
        break
      case 'sniper':
        if (sprite) sprite.tint = 0xffffff
        container.scale.set(0.9, 1)
        break
      case 'missile':
        state.attackOffsetX = 2 * dir
        break
      case 'hammer':
        container.scale.set(1.1, 1.1)
        break
      case 'laser':
        if (sprite) sprite.tint = 0x88ffff
        break
      case 'shotgun':
        if (sprite) sprite.tint = t < 0.5 ? 0xffffaa : 0xffffff
        state.attackOffsetX = -4 * dir
        break
      case 'railgun':
        if (sprite) sprite.tint = 0xffffff
        container.scale.set(0.85, 1)
        break
    }
  } else if (state.attackPhase === 'followthrough') {
    const t = 1 - state.attackTimer / FOLLOW_DUR
    switch (weapon) {
      case 'vulcan':
        container.rotation = Math.sin(t * 18) * 0.015
        container.scale.set(1, 1)
        break
      case 'cannon':
        state.attackOffsetX = 5 * (1 - t) * dir
        container.scale.set(1, 1)
        break
      case 'sniper':
        container.scale.set(lerp(0.9, 1, t), 1)
        break
      case 'missile':
        state.attackOffsetX = 2 * (1 - t) * dir
        container.rotation = 0
        break
      case 'hammer':
        state.attackOffsetX = 8 * (1 - t) * dir
        container.scale.set(lerp(1.1, 1, t), lerp(1.1, 1, t))
        break
      case 'laser':
        if (sprite) sprite.tint = lerpColor(0x88ffff, 0xffffff, t)
        break
      case 'shotgun':
        state.attackOffsetX = -4 * (1 - t) * dir
        container.scale.set(1, 1)
        break
      case 'railgun':
        container.scale.set(lerp(0.85, 1, t), 1)
        if (sprite) sprite.tint = lerpColor(0xccddff, 0xffffff, t)
        container.rotation = 0
        break
    }
  }
}

// ─── Idle animation per leg type ───

function applyIdleAnim(
  state: MechSpriteState,
  container: Container,
  x: number,
  y: number,
  time: number,
): void {
  const p = state.phase

  switch (state.moveType) {
    case 'reverse-joint':
    case 'humanoid': {
      const bounce = Math.sin(time * 3 + p) * 2
      container.position.set(x + state.attackOffsetX, y + bounce)
      container.rotation = Math.sin(time * 2.5 + p) * 0.02
      break
    }
    case 'flying': {
      const hover = Math.sin(time * 2 + p) * 3
      const drift = Math.sin(time * 1.2 + p * 0.5) * 1.5
      container.position.set(x + drift + state.attackOffsetX, y + hover)
      break
    }
    case 'tank': {
      const vib = Math.sin(time * 17 + p * 3.7) * 0.25
      const bounce = Math.sin(time * 3 + p) * 0.5
      container.position.set(x + vib + state.attackOffsetX, y + bounce)
      break
    }
    case 'quadruped':
    case 'hexapod': {
      const bounce = Math.sin(time * 3 + p) * 1.5
      container.position.set(x + state.attackOffsetX, y + bounce)
      container.rotation = Math.sin(time * 1.8 + p) * 0.03
      break
    }
    case 'wheeled': {
      const rock = Math.sin(time * 2.5 + p) * 1
      container.position.set(x + rock + state.attackOffsetX, y)
      break
    }
  }
}

// ─── Death animation per weapon ───

function applyDeathAnim(
  state: MechSpriteState,
  container: Container,
): void {
  const t = Math.max(0, state.deathTimer / DEATH_DURATION)
  const weapon = state.deathWeapon ?? 'cannon'

  switch (weapon) {
    case 'cannon':
      container.scale.set(t)
      container.alpha = t
      break
    case 'vulcan': {
      // Rapid blinking 6 times
      const blink = Math.floor((1 - t) * 12) % 2
      container.alpha = blink ? 0.2 : 0.8
      container.scale.set(t * 0.5 + 0.5)
      if (t <= 0.05) {
        container.alpha = 0
      }
      break
    }
    case 'sniper':
      // White flash then sink down
      if (t > 0.8) {
        container.alpha = 1
        if (state.sprite) state.sprite.tint = 0xffffff
      } else {
        container.alpha = t / 0.8
        container.position.y += (1 - t) * 0.5
      }
      container.scale.set(1)
      break
    case 'missile':
      // Large explosion (scale up then down)
      if (t > 0.6) {
        const et = (t - 0.6) / 0.4
        container.scale.set(1 + (1 - et) * 0.5)
      } else {
        container.scale.set(t / 0.6)
      }
      container.alpha = t
      break
    case 'hammer':
      // Squash into ground
      container.scale.set(1, Math.max(0.3, t))
      container.alpha = t
      break
    case 'laser': {
      // Disintegrate - deterministic scatter
      const scatter = (1 - t) * 12
      const scatterX = Math.sin(t * 47 + state.phase * 3) * scatter
      const scatterY = Math.cos(t * 53 + state.phase * 5) * scatter
      container.position.x += scatterX * 0.3
      container.position.y += scatterY * 0.3
      container.alpha = t
      container.scale.set(t)
      break
    }
    case 'shotgun':
      // Knockback + spin
      container.position.x += (1 - t) * 0.3 * (state.side === 'player' ? -1 : 1)
      container.rotation = (1 - t) * 2
      container.alpha = t
      container.scale.set(t * 0.5 + 0.5)
      break
    case 'railgun':
      // Flash then instant remove
      if (t > 0.7) {
        container.alpha = 1
        if (state.sprite) state.sprite.tint = 0xffffff
        container.scale.set(1)
      } else {
        container.alpha = 0
      }
      break
  }
}

// ─── Status overlay rendering ───

function drawStatusOverlay(
  gfx: Graphics,
  status: UnitStatusFlags,
  time: number,
): void {
  gfx.clear()

  if (status.invincible) {
    // Gold hexagon outline pulse
    const pulse = 0.6 + Math.sin(time * 6) * 0.3
    const r = 28 + Math.sin(time * 4) * 2
    drawHexagon(gfx, 0, 0, r, 0xffd700, pulse)
  }

  if (status.defenseBuff) {
    // Small blue shield icon below HP bar
    gfx.circle(0, -48, 4).stroke({ color: 0x4fc3f7, width: 1.5, alpha: 0.7 })
  }

  if (status.fireRateBuff) {
    // Orange speed lines behind unit
    const alpha = 0.3 + Math.sin(time * 8) * 0.15
    for (let i = 0; i < 3; i++) {
      const y = -10 + i * 10
      gfx.moveTo(-20, y).lineTo(-12, y).stroke({ color: 0xff8800, width: 1, alpha })
    }
  }

  if (status.scrambled) {
    // Purple noise flicker (deterministic, 2 positions based on time)
    const f1 = Math.sin(time * 13) * 15
    const f2 = Math.cos(time * 17) * 15
    const f3 = Math.sin(time * 23) * 15
    const f4 = Math.cos(time * 29) * 15
    const vis = Math.sin(time * 11) > 0
    if (vis) {
      gfx.rect(f1 - 2, f2 - 2, 4, 4).fill({ color: 0xaa00ff, alpha: 0.4 })
      gfx.rect(f3 - 2, f4 - 2, 4, 4).fill({ color: 0x8844ff, alpha: 0.3 })
    }
  }

  if (status.focusTarget) {
    // Red reticle below unit
    const r2 = 14 + Math.sin(time * 5) * 2
    gfx.circle(0, 10, r2).stroke({ color: 0xff4444, width: 1, alpha: 0.7 })
    // Crosshair lines
    gfx.moveTo(-r2, 10).lineTo(-r2 + 4, 10).stroke({ color: 0xff4444, width: 1, alpha: 0.6 })
    gfx.moveTo(r2, 10).lineTo(r2 - 4, 10).stroke({ color: 0xff4444, width: 1, alpha: 0.6 })
    gfx.moveTo(0, 10 - r2).lineTo(0, 10 - r2 + 4).stroke({ color: 0xff4444, width: 1, alpha: 0.6 })
    gfx.moveTo(0, 10 + r2).lineTo(0, 10 + r2 - 4).stroke({ color: 0xff4444, width: 1, alpha: 0.6 })
  }
}

function drawHexagon(
  gfx: Graphics,
  cx: number,
  cy: number,
  r: number,
  color: number,
  alpha: number,
): void {
  const points: number[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    points.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
  }
  gfx.poly(points).stroke({ color, width: 1.5, alpha })
}

// ─── Main update ───

export function updateMechSprite(
  state: MechSpriteState,
  x: number,
  y: number,
  hpPct: number,
  unitState: string,
  dt: number,
  time: number,
  status?: UnitStatusFlags,
): void {
  const { container } = state

  if (status) {
    state.status = status
  }

  // Try to load sprite if not yet available
  if (!state.sprite) {
    const texture = getMechTexture(state.build, state.side)
    if (texture) {
      state.sprite = new Sprite(texture)
      state.sprite.anchor.set(0.5, 0.5)
      state.sprite.scale.set(0.35)
      if (state.side === 'enemy') {
        state.sprite.scale.x = -0.35
      }
      container.addChildAt(state.sprite, 0)
    }
  }

  // Update HP bar
  state.hpBar.clear()
  const barW = HP_BAR_W * Math.max(0, hpPct)
  const barColor = hpPct > 0.5 ? 0x00ff88 : hpPct > 0.25 ? 0xffaa00 : 0xff4444
  state.hpBar.rect(-HP_BAR_W / 2, -58, barW, HP_BAR_H).fill(barColor)

  // Handle spawning animation
  if (state.animState === 'spawning') {
    state.spawnTimer -= dt
    const t = 1 - Math.max(0, state.spawnTimer / SPAWN_DURATION)
    container.scale.set(t)
    container.alpha = t
    container.position.set(x, y)

    if (state.spawnTimer <= 0) {
      state.animState = 'idle'
      container.scale.set(1)
      container.alpha = 1
    }
    return
  }

  // Handle death animation
  if (state.animState === 'dying') {
    state.deathTimer -= dt
    applyDeathAnim(state, container)
    return
  }

  // Detect state transitions
  if (unitState === 'dead') {
    state.animState = 'dying'
    state.deathTimer = DEATH_DURATION
    return
  }

  if (unitState === 'attacking' && state.animState !== 'attacking') {
    state.animState = 'attacking'
    state.attackPhase = 'windup'
    state.attackTimer = WINDUP_DUR
  } else if (unitState === 'moving') {
    state.animState = 'moving'
    state.attackPhase = 'none'
  } else if (unitState !== 'attacking' && state.attackPhase === 'none') {
    state.animState = 'idle'
  }

  // Reset transforms before applying animations
  container.scale.set(1, 1)
  container.rotation = 0
  state.attackOffsetX = 0
  if (state.sprite) state.sprite.tint = 0xffffff

  // Update attack phase timer
  if (state.attackPhase !== 'none') {
    state.attackTimer -= dt
    if (state.attackTimer <= 0) {
      switch (state.attackPhase) {
        case 'windup':
          state.attackPhase = 'fire'
          state.attackTimer = FIRE_DUR
          break
        case 'fire':
          state.attackPhase = 'followthrough'
          state.attackTimer = FOLLOW_DUR
          break
        case 'followthrough':
          state.attackPhase = 'none'
          state.attackTimer = 0
          state.animState = 'idle'
          break
      }
    }
  }

  // Apply idle / moving animation for position
  if (state.animState === 'moving') {
    container.rotation = 0.05
    const bounce = Math.sin(time * 5 + state.phase) * 1.5
    container.position.set(x + state.attackOffsetX, y + bounce)
  } else {
    applyIdleAnim(state, container, x, y, time)
  }

  // Apply attack animation (overrides scale/rotation)
  applyAttackAnim(state, container, state.sprite)

  // Hit reaction overlay
  if (state.hitTimer > 0) {
    state.hitTimer -= dt
    const ht = state.hitTimer / HIT_DURATION

    if (ht > 0.67) {
      // White tint flash
      if (state.sprite) state.sprite.tint = 0xffffff
      container.alpha = 0.85
    } else if (ht > 0.33) {
      // Knockback
      const knockDir = state.hitFromRight ? -1 : 1
      container.position.x += knockDir * 2 * (ht - 0.33) / 0.34
    }
    // Last phase: recovery (automatic via lerp back)

    if (state.hitTimer <= 0) {
      container.alpha = 1
    }
  }

  // Frozen tint override
  if (state.status.frozen) {
    if (state.sprite) state.sprite.tint = 0x6688cc
  }

  // Draw status overlays
  drawStatusOverlay(state.statusGfx, state.status, time)
}

// ─── Public API ───

export function triggerHitReaction(state: MechSpriteState, fromRight: boolean): void {
  state.hitTimer = HIT_DURATION
  state.hitFromRight = fromRight
}

export function setDeathWeapon(state: MechSpriteState, weapon: WeaponAnimKind): void {
  state.deathWeapon = weapon
}

export function weaponKindStringToAnimKind(kind: string): WeaponAnimKind {
  switch (kind) {
    case 'vulcan-armor-pierce': return 'vulcan'
    case 'none': return 'cannon'
    case 'sniper-farthest': return 'sniper'
    case 'missile-splash': return 'missile'
    case 'hammer-true-damage': return 'hammer'
    case 'laser-pierce': return 'laser'
    case 'shotgun-close': return 'shotgun'
    case 'railgun-charge': return 'railgun'
    default: return 'cannon'
  }
}

export function destroyMechSprite(state: MechSpriteState): void {
  state.container.destroy({ children: true })
}

// ─── Helpers ───

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const br = (b >> 16) & 0xff
  const bg = (b >> 8) & 0xff
  const bb = b & 0xff
  const r = Math.round(lerp(ar, br, t))
  const g = Math.round(lerp(ag, bg, t))
  const blue = Math.round(lerp(ab, bb, t))
  return (r << 16) | (g << 8) | blue
}
