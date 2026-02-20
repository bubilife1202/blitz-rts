import { Container, Sprite, Graphics } from 'pixi.js'
import type { Build, LegsMoveType, MountType, WeaponSpecial } from '../core/types'
import { getMechTexture } from './sprite-cache'
import { buildFromUnitTraits } from '../ui/mech-renderer'

export interface MechSpriteState {
  container: Container
  sprite: Sprite | null
  hpBar: Graphics
  hpBarBg: Graphics
  unitId: number
  side: 'player' | 'enemy'
  phase: number
  animState: 'idle' | 'moving' | 'attacking' | 'dying' | 'spawning'
  spawnTimer: number
  deathTimer: number
  recoilTimer: number
  build: Build
}

const HP_BAR_W = 24
const HP_BAR_H = 3
const SPAWN_DURATION = 0.3
const DEATH_DURATION = 0.4
const RECOIL_DURATION = 0.1

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
  hpBarBg.rect(-HP_BAR_W / 2, -28, HP_BAR_W, HP_BAR_H).fill({ color: 0x333333, alpha: 0.7 })
  container.addChild(hpBarBg)

  // HP bar foreground
  const hpBar = new Graphics()
  container.addChild(hpBar)

  // Try to load texture immediately
  const texture = getMechTexture(build, side)
  let sprite: Sprite | null = null
  if (texture) {
    sprite = new Sprite(texture)
    sprite.anchor.set(0.5, 0.5)
    sprite.scale.set(0.15)
    if (side === 'enemy') {
      sprite.scale.x = -0.15
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
    unitId,
    side,
    phase: unitId * 0.7,
    animState: 'spawning',
    spawnTimer: SPAWN_DURATION,
    deathTimer: 0,
    recoilTimer: 0,
    build,
  }
}

export function updateMechSprite(
  state: MechSpriteState,
  x: number,
  y: number,
  hpPct: number,
  unitState: string,
  dt: number,
  time: number,
): void {
  const { container } = state

  // Try to load sprite if not yet available
  if (!state.sprite) {
    const texture = getMechTexture(state.build, state.side)
    if (texture) {
      state.sprite = new Sprite(texture)
      state.sprite.anchor.set(0.5, 0.5)
      state.sprite.scale.set(0.15)
      if (state.side === 'enemy') {
        state.sprite.scale.x = -0.15
      }
      container.addChildAt(state.sprite, 0)
    }
  }

  // Update HP bar
  state.hpBar.clear()
  const barW = HP_BAR_W * Math.max(0, hpPct)
  const barColor = hpPct > 0.5 ? 0x00ff88 : hpPct > 0.25 ? 0xffaa00 : 0xff4444
  state.hpBar.rect(-HP_BAR_W / 2, -28, barW, HP_BAR_H).fill(barColor)

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
    const t = Math.max(0, state.deathTimer / DEATH_DURATION)
    container.scale.set(t)
    container.alpha = t
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
    state.recoilTimer = RECOIL_DURATION
  } else if (unitState === 'moving') {
    state.animState = 'moving'
  } else if (unitState !== 'attacking') {
    state.animState = 'idle'
  }

  // Idle bounce
  const bounce = Math.sin(time * 3 + state.phase) * 2
  container.position.set(x, y + bounce)

  // Moving: slight tilt
  if (state.animState === 'moving') {
    container.rotation = 0.05
  } else {
    container.rotation = 0
  }

  // Attacking: recoil effect
  if (state.animState === 'attacking') {
    state.recoilTimer -= dt
    if (state.recoilTimer > 0) {
      container.scale.set(0.95, 1)
    } else {
      container.scale.set(1, 1)
      state.animState = 'idle'
    }
  } else {
    container.scale.set(1, 1)
  }
}

export function destroyMechSprite(state: MechSpriteState): void {
  state.container.destroy({ children: true })
}
