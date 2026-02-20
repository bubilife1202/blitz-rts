import type { Application } from 'pixi.js'
import type { BattleState } from '../combat/battle'
import type { BattleUnit } from '../combat/unit'
import type { RenderLayers } from './layers'
import { RENDER_W } from './pixi-app'
import { createCamera, triggerShake, updateCamera, type CameraState } from './camera'
import { createBackground, updateBackground, type BackgroundState } from './background'
import { createParticlePool, updateParticles, type ParticlePool } from './particles/particle-pool'
import { explosion, muzzleFlash, baseHit } from './particles/effects'
import { createDamageNumberPool, updateDamageNumbers, type DamageNumberPool } from './fx/damage-numbers'
import { createSkillEffectState, updateSkillEffects, type SkillEffectState } from './fx/skill-effects'
import {
  showShieldDome,
  showEmpWave,
  showOverchargeGlow,
  showRepairPulse,
  showScrambleNoise,
  showFocusReticle,
  showArtilleryImpact,
  showFortifyShield,
  showOverdriveLines,
  showWattSurge,
} from './fx/skill-effects'
import { createPostProcess, updatePostProcess, triggerFlash, triggerChromatic, type PostProcessState } from './post-processing'
import { createBaseSprite, updateBaseSprite, triggerBaseFlash, type BaseSpriteState } from './base-sprite'
import { createMechSprite, updateMechSprite, destroyMechSprite, type MechSpriteState } from './mech-sprite'
import type { SkillName } from '../core/types'

// Layout constants matching battle-ui.ts
const PAD_X = 56
const USABLE_W = RENDER_W - PAD_X * 2
const TILE_W = USABLE_W / 30

const ENEMY_BASE_Y = 220
const PLAYER_BASE_Y = 380
const ENEMY_LANE_Y = 120
const PLAYER_LANE_Y = 320
const LANE_SPACING = 50

interface PrevSnapshot {
  unitIds: Set<number>
  aliveIds: Set<number>
  playerBaseHp: number
  enemyBaseHp: number
  attackingIds: Set<number>
  activeSkills: Set<string>
}

export interface BattleRendererState {
  app: Application
  layers: RenderLayers
  camera: CameraState
  background: BackgroundState
  particles: ParticlePool
  damageNumbers: DamageNumberPool
  skillEffects: SkillEffectState
  postProcess: PostProcessState
  playerBase: BaseSpriteState
  enemyBase: BaseSpriteState
  mechSprites: Map<number, MechSpriteState>
  prev: PrevSnapshot
  time: number
}

export function createBattleRenderer(
  app: Application,
  layers: RenderLayers,
): BattleRendererState {
  // Background
  const background = createBackground()
  layers.background.addChild(background.container)

  // Particles
  const particles = createParticlePool()
  layers.particles.addChild(particles.container)

  // Damage numbers
  const damageNumbers = createDamageNumberPool()
  layers.overlay.addChild(damageNumbers.container)

  // Skill effects
  const skillEffects = createSkillEffectState()
  layers.effects.addChild(skillEffects.container)

  // Bases
  const playerBase = createBaseSprite('player')
  playerBase.container.position.set(PAD_X - 20, PLAYER_BASE_Y)
  layers.ground.addChild(playerBase.container)

  const enemyBase = createBaseSprite('enemy')
  enemyBase.container.position.set(RENDER_W - PAD_X + 20, ENEMY_BASE_Y)
  layers.ground.addChild(enemyBase.container)

  return {
    app,
    layers,
    camera: createCamera(),
    background,
    particles,
    damageNumbers,
    skillEffects,
    postProcess: createPostProcess(),
    playerBase,
    enemyBase,
    mechSprites: new Map(),
    prev: {
      unitIds: new Set(),
      aliveIds: new Set(),
      playerBaseHp: -1,
      enemyBaseHp: -1,
      attackingIds: new Set(),
      activeSkills: new Set(),
    },
    time: 0,
  }
}

function unitScreenX(position: number): number {
  return PAD_X + (position - 0.5) * TILE_W
}

function unitScreenY(unit: BattleUnit, buildIndexTracker: Map<string, number>): number {
  // Track per-side build index for lane assignment
  const key = `${unit.side}-${unit.buildIndex}`
  const laneIdx = buildIndexTracker.get(key) ?? 0
  buildIndexTracker.set(key, laneIdx + 1)

  const baseY = unit.side === 'enemy' ? ENEMY_LANE_Y : PLAYER_LANE_Y
  return baseY + unit.buildIndex * LANE_SPACING
}

function getActiveSkillNames(state: BattleState): Set<string> {
  const names = new Set<string>()
  for (const effect of state.skillSystem.activeEffects) {
    names.add(effect.kind)
  }
  return names
}

function getSkillCenterX(): number {
  return RENDER_W / 2
}

function getSkillCenterY(): number {
  return 270
}

const SKILL_EFFECT_MAP: Record<string, (state: SkillEffectState, x: number, y: number) => void> = {
  'Shield Burst': showShieldDome,
  'EMP Strike': showEmpWave,
  'Overcharge': showOverchargeGlow,
  'Repair Pulse': showRepairPulse,
  'Scramble': showScrambleNoise,
  'Focus Fire': showFocusReticle,
  'Artillery Barrage': showArtilleryImpact,
  'Fortify': showFortifyShield,
  'Overdrive Protocol': showOverdriveLines,
  'Watt Surge': showWattSurge,
}

// Map from ActiveEffect kind to SkillName for visual triggers
const EFFECT_KIND_TO_SKILL: Record<string, SkillName> = {
  'invincible-allies': 'Shield Burst',
  'freeze-enemies': 'EMP Strike',
  'watt-regen-multiplier': 'Overcharge',
  'scramble-targeting': 'Scramble',
  'focus-fire': 'Focus Fire',
  'defense-buff': 'Fortify',
  'fire-rate-buff': 'Overdrive Protocol',
}

export function updateBattleRenderer(
  renderer: BattleRendererState,
  state: BattleState,
  dt: number,
): void {
  renderer.time += dt
  const { prev } = renderer

  // Track current alive units
  const currentAliveIds = new Set<number>()
  const currentAttackingIds = new Set<number>()
  const buildIndexTracker = new Map<string, number>()

  for (const unit of state.units) {
    if (unit.state !== 'dead') {
      currentAliveIds.add(unit.id)
    }
    if (unit.state === 'attacking') {
      currentAttackingIds.add(unit.id)
    }
  }

  // Detect events
  // New unit deaths -> explosion + shake
  for (const id of prev.aliveIds) {
    if (!currentAliveIds.has(id)) {
      const deadUnit = state.units.find(u => u.id === id)
      if (deadUnit) {
        const sx = unitScreenX(deadUnit.position)
        const sy = deadUnit.side === 'enemy' ? ENEMY_LANE_Y + deadUnit.buildIndex * LANE_SPACING : PLAYER_LANE_Y + deadUnit.buildIndex * LANE_SPACING
        explosion(renderer.particles, sx, sy)
        triggerShake(renderer.camera, 3)
      }
    }
  }

  // New attackers -> muzzle flash
  for (const id of currentAttackingIds) {
    if (!prev.attackingIds.has(id)) {
      const unit = state.units.find(u => u.id === id)
      if (unit && unit.state !== 'dead') {
        const sx = unitScreenX(unit.position)
        const sy = unit.side === 'enemy' ? ENEMY_LANE_Y + unit.buildIndex * LANE_SPACING : PLAYER_LANE_Y + unit.buildIndex * LANE_SPACING
        muzzleFlash(renderer.particles, sx, sy)
      }
    }
  }

  // Base HP changes
  const playerBaseHp = state.battlefield.playerBase.hp
  const enemyBaseHp = state.battlefield.enemyBase.hp

  if (prev.playerBaseHp >= 0 && playerBaseHp < prev.playerBaseHp) {
    triggerBaseFlash(renderer.playerBase)
    baseHit(renderer.particles, PAD_X - 20, PLAYER_BASE_Y)
    triggerShake(renderer.camera, 5)
    triggerChromatic(renderer.postProcess)
  }

  if (prev.enemyBaseHp >= 0 && enemyBaseHp < prev.enemyBaseHp) {
    triggerBaseFlash(renderer.enemyBase)
    baseHit(renderer.particles, RENDER_W - PAD_X + 20, ENEMY_BASE_Y)
    triggerShake(renderer.camera, 5)
    triggerChromatic(renderer.postProcess)
  }

  // Skill activations
  const currentSkills = getActiveSkillNames(state)
  for (const kind of currentSkills) {
    if (!prev.activeSkills.has(kind)) {
      const skillName = EFFECT_KIND_TO_SKILL[kind]
      if (skillName) {
        const effectFn = SKILL_EFFECT_MAP[skillName]
        if (effectFn) {
          effectFn(renderer.skillEffects, getSkillCenterX(), getSkillCenterY())
          triggerShake(renderer.camera, 2)
          triggerFlash(renderer.postProcess)
        }
      }
    }
  }

  // Handle instant skills (heal, area-damage, watt-instant) by checking cooldown changes
  // These don't produce active effects, so we detect them differently
  // For now, we rely on the active effect detection above for duration-based skills

  // Update mech sprites
  const currentUnitIds = new Set<number>()

  for (const unit of state.units) {
    currentUnitIds.add(unit.id)

    let mechSprite = renderer.mechSprites.get(unit.id)

    // Create new sprite if not exists
    if (!mechSprite) {
      mechSprite = createMechSprite(
        unit.id,
        unit.side,
        unit.moveType,
        unit.mountType,
        unit.weaponSpecial,
      )
      renderer.mechSprites.set(unit.id, mechSprite)
      renderer.layers.units.addChild(mechSprite.container)
    }

    // Calculate screen position
    const sx = unitScreenX(unit.position)
    const sy = unitScreenY(unit, buildIndexTracker)
    const hpPct = unit.hp / unit.maxHp

    updateMechSprite(mechSprite, sx, sy, hpPct, unit.state, dt, renderer.time)
  }

  // Remove sprites for units no longer in the state
  for (const [id, sprite] of renderer.mechSprites) {
    if (!currentUnitIds.has(id)) {
      if (sprite.animState === 'dying' && sprite.deathTimer > 0) {
        // Still animating death
        updateMechSprite(sprite, sprite.container.x, sprite.container.y, 0, 'dead', dt, renderer.time)
      } else {
        renderer.layers.units.removeChild(sprite.container)
        destroyMechSprite(sprite)
        renderer.mechSprites.delete(id)
      }
    }
  }

  // Update bases
  const playerBaseMaxHp = state.battlefield.playerBase.maxHp
  const enemyBaseMaxHp = state.battlefield.enemyBase.maxHp
  updateBaseSprite(renderer.playerBase, playerBaseHp / playerBaseMaxHp, dt)
  updateBaseSprite(renderer.enemyBase, enemyBaseHp / enemyBaseMaxHp, dt)

  // Update subsystems
  updateParticles(renderer.particles, dt)
  updateDamageNumbers(renderer.damageNumbers, dt)
  updateSkillEffects(renderer.skillEffects, dt)
  updateBackground(renderer.background, renderer.time)
  updateCamera(renderer.camera, renderer.app.stage)
  updatePostProcess(renderer.postProcess, renderer.app.stage, dt)

  // Store snapshot for next frame comparison
  prev.aliveIds = currentAliveIds
  prev.attackingIds = currentAttackingIds
  prev.playerBaseHp = playerBaseHp
  prev.enemyBaseHp = enemyBaseHp
  prev.activeSkills = currentSkills
}

export function destroyBattleRenderer(renderer: BattleRendererState): void {
  // Clean up mech sprites
  for (const [, sprite] of renderer.mechSprites) {
    destroyMechSprite(sprite)
  }
  renderer.mechSprites.clear()

  // Clean up containers
  renderer.background.container.destroy({ children: true })
  renderer.particles.container.destroy({ children: true })
  renderer.damageNumbers.container.destroy({ children: true })
  renderer.skillEffects.container.destroy({ children: true })
  renderer.playerBase.container.destroy({ children: true })
  renderer.enemyBase.container.destroy({ children: true })
}
