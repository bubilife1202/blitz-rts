import { Graphics, type Application } from 'pixi.js'
import type { BattleState } from '../combat/battle'
import type { BattleUnit } from '../combat/unit'
import type { RenderLayers } from './layers'
import { RENDER_W } from './pixi-app'
import { createCamera, triggerShake, updateCamera, type CameraState } from './camera'
import { createBackground, updateBackground, type BackgroundState } from './background'
import { createParticlePool, updateParticles, type ParticlePool } from './particles/particle-pool'
import { explosion, muzzleFlash, baseHit, impactForWeapon } from './particles/effects'
import {
  createDamageNumberPool,
  showDamageNumber,
  updateDamageNumbers,
  type DamageNumberPool,
} from './fx/damage-numbers'
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
import {
  createMechSprite,
  updateMechSprite,
  destroyMechSprite,
  triggerHitReaction,
  setDeathWeapon,
  weaponKindStringToAnimKind,
  type MechSpriteState,
  type UnitStatusFlags,
  EMPTY_STATUS,
} from './mech-sprite'
import {
  createProjectilePool,
  updateProjectiles,
  spawnProjectile,
  weaponSpecialToProjectileKind,
  type ProjectilePool,
} from './projectiles/projectile-pool'
import {
  createMilestoneState,
  updateMilestones,
  type MilestoneState,
} from './fx/milestone-effects'
import type { SkillName } from '../core/types'

// Layout constants
const PAD_X = 56
const USABLE_W = RENDER_W - PAD_X * 2
const TILE_W = USABLE_W / 30

const ENEMY_BASE_Y = 220
const PLAYER_BASE_Y = 380
const ENEMY_LANE_Y = 100
const PLAYER_LANE_Y = 350
const LANE_SPACING = 65

interface PendingImpact {
  timer: number
  x: number
  y: number
  weaponKind: string
}

interface PrevSnapshot {
  unitIds: Set<number>
  aliveIds: Set<number>
  playerBaseHp: number
  enemyBaseHp: number
  attackingIds: Set<number>
  activeSkills: Set<string>
  unitHp: Map<number, number>
}

export interface BattleRendererState {
  app: Application
  layers: RenderLayers
  camera: CameraState
  background: BackgroundState
  particles: ParticlePool
  projectiles: ProjectilePool
  damageNumbers: DamageNumberPool
  skillEffects: SkillEffectState
  milestones: MilestoneState
  postProcess: PostProcessState
  playerBase: BaseSpriteState
  enemyBase: BaseSpriteState
  mechSprites: Map<number, MechSpriteState>
  lastAttackerWeapon: Map<number, string>
  pendingImpacts: PendingImpact[]
  previewSkill: SkillName | null
  previewGfx: import('pixi.js').Graphics
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

  // Projectiles
  const projectiles = createProjectilePool()
  layers.projectiles.addChild(projectiles.container)

  // Damage numbers
  const damageNumbers = createDamageNumberPool()
  layers.overlay.addChild(damageNumbers.container)

  // Skill effects
  const skillEffects = createSkillEffectState()
  layers.effects.addChild(skillEffects.container)

  // Milestones
  const milestones = createMilestoneState()
  layers.overlay.addChild(milestones.container)

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
    projectiles,
    damageNumbers,
    skillEffects,
    milestones,
    postProcess: createPostProcess(),
    playerBase,
    enemyBase,
    mechSprites: new Map(),
    lastAttackerWeapon: new Map(),
    pendingImpacts: [],
    previewSkill: null,
    previewGfx: (() => { const g = new Graphics(); layers.overlay.addChild(g); return g })(),
    prev: {
      unitIds: new Set(),
      aliveIds: new Set(),
      playerBaseHp: -1,
      enemyBaseHp: -1,
      attackingIds: new Set(),
      activeSkills: new Set(),
      unitHp: new Map(),
    },
    time: 0,
  }
}

function unitScreenX(position: number): number {
  return PAD_X + (position - 0.5) * TILE_W
}

function unitScreenY(unit: BattleUnit, buildIndexTracker: Map<string, number>): number {
  const key = `${unit.side}-${unit.buildIndex}`
  const laneIdx = buildIndexTracker.get(key) ?? 0
  buildIndexTracker.set(key, laneIdx + 1)

  const baseY = unit.side === 'enemy' ? ENEMY_LANE_Y : PLAYER_LANE_Y
  return baseY + unit.buildIndex * LANE_SPACING
}

function unitLaneY(unit: BattleUnit): number {
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

const EFFECT_KIND_TO_SKILL: Record<string, SkillName> = {
  'invincible-allies': 'Shield Burst',
  'freeze-enemies': 'EMP Strike',
  'watt-regen-multiplier': 'Overcharge',
  'scramble-targeting': 'Scramble',
  'focus-fire': 'Focus Fire',
  'defense-buff': 'Fortify',
  'fire-rate-buff': 'Overdrive Protocol',
}

// ─── Status flags from active effects ───

function findHighestWattEnemy(units: readonly BattleUnit[]): number | null {
  let bestId: number | null = null
  let bestWatt = -1
  for (const u of units) {
    if (u.side !== 'enemy' || u.state === 'dead') continue
    if (u.wattCost > bestWatt) {
      bestWatt = u.wattCost
      bestId = u.id
    }
  }
  return bestId
}

function computeUnitStatus(state: BattleState, unit: BattleUnit, focusTargetId: number | null): UnitStatusFlags {
  const flags: UnitStatusFlags = { ...EMPTY_STATUS }

  for (const effect of state.skillSystem.activeEffects) {
    switch (effect.kind) {
      case 'invincible-allies':
        if (unit.side === 'player') flags.invincible = true
        break
      case 'freeze-enemies':
        if (unit.side === 'enemy') flags.frozen = true
        break
      case 'defense-buff':
        if (unit.side === 'player') flags.defenseBuff = true
        break
      case 'fire-rate-buff':
        if (unit.side === 'player') flags.fireRateBuff = true
        break
      case 'scramble-targeting':
        if (unit.side === 'enemy') flags.scrambled = true
        break
      case 'focus-fire':
        if (unit.id === focusTargetId) flags.focusTarget = true
        break
    }
  }

  return flags
}

// ─── Find closest enemy for attack targeting ───

function findTarget(
  attacker: BattleUnit,
  units: readonly BattleUnit[],
): BattleUnit | null {
  let closest: BattleUnit | null = null
  let closestDist = Infinity

  for (const u of units) {
    if (u.side === attacker.side || u.state === 'dead') continue
    const dist = Math.abs(u.position - attacker.position)
    if (dist < closestDist) {
      closestDist = dist
      closest = u
    }
  }

  return closest
}

function getImpactDelay(weaponKind: string): number {
  switch (weaponKind) {
    case 'vulcan-armor-pierce': return 0.15
    case 'none': return 0.25
    case 'missile-splash': return 0.4
    case 'shotgun-close': return 0.12
    // Instant weapons
    case 'sniper-farthest':
    case 'laser-pierce':
    case 'railgun-charge':
    case 'hammer-true-damage':
      return 0
    default: return 0.2
  }
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
  const currentHp = new Map<number, number>()
  const unitsById = new Map<number, BattleUnit>()
  const buildIndexTracker = new Map<string, number>()

  for (const unit of state.units) {
    unitsById.set(unit.id, unit)

    if (unit.state !== 'dead') {
      currentAliveIds.add(unit.id)
      currentHp.set(unit.id, unit.hp)
    }
    if (unit.state === 'attacking') {
      currentAttackingIds.add(unit.id)
    }
  }

  // Detect events
  // New unit deaths -> explosion + shake + death weapon
  for (const id of prev.aliveIds) {
    if (!currentAliveIds.has(id)) {
      const deadUnit = state.units.find(u => u.id === id)
      if (deadUnit) {
        const sx = unitScreenX(deadUnit.position)
        const sy = unitLaneY(deadUnit)
        explosion(renderer.particles, sx, sy)
        triggerShake(renderer.camera, 3)

        // Set death weapon on the mech sprite
        const mechSprite = renderer.mechSprites.get(id)
        const lastWeapon = renderer.lastAttackerWeapon.get(id)
        if (mechSprite && lastWeapon) {
          setDeathWeapon(mechSprite, weaponKindStringToAnimKind(lastWeapon))
        }
      }
    }
  }

  // New attackers -> muzzle flash + projectile + impact effects
  for (const id of currentAttackingIds) {
    if (!prev.attackingIds.has(id)) {
      const unit = state.units.find(u => u.id === id)
      if (unit && unit.state !== 'dead') {
        const sx = unitScreenX(unit.position)
        const sy = unit.side === 'enemy' ? ENEMY_LANE_Y + unit.buildIndex * LANE_SPACING : PLAYER_LANE_Y + unit.buildIndex * LANE_SPACING
        muzzleFlash(renderer.particles, sx, sy)

        // Find target and spawn projectile + impact
        const target = findTarget(unit, state.units)
        if (target) {
          const tx = unitScreenX(target.position)
          const ty = target.side === 'enemy' ? ENEMY_LANE_Y + target.buildIndex * LANE_SPACING : PLAYER_LANE_Y + target.buildIndex * LANE_SPACING

          const projKind = weaponSpecialToProjectileKind(unit.weaponSpecial.kind)
          if (projKind) {
            spawnProjectile(renderer.projectiles, projKind, sx, sy, tx, ty)
          }

          // Delay impact effects to match projectile travel time
          const impactDelay = getImpactDelay(unit.weaponSpecial.kind)
          if (impactDelay <= 0) {
            // Instant weapons (sniper, laser, railgun, hammer)
            impactForWeapon(renderer.particles, tx, ty, unit.weaponSpecial.kind)
            const targetSprite = renderer.mechSprites.get(target.id)
            if (targetSprite) triggerHitReaction(targetSprite, sx > tx)
          } else {
            renderer.pendingImpacts.push({
              timer: impactDelay,
              x: tx,
              y: ty,
              weaponKind: unit.weaponSpecial.kind,
            })
          }

          // Track last attacker weapon on target
          renderer.lastAttackerWeapon.set(target.id, unit.weaponSpecial.kind)
        }
      }
    }
  }

  // Base HP changes
  const playerBaseHp = state.battlefield.playerBase.hp
  const enemyBaseHp = state.battlefield.enemyBase.hp

  if (prev.playerBaseHp >= 0 && playerBaseHp < prev.playerBaseHp) {
    showDamageNumber(
      renderer.damageNumbers,
      PAD_X - 20,
      PLAYER_BASE_Y - 44,
      prev.playerBaseHp - playerBaseHp,
      0xff9a7a,
    )
    triggerBaseFlash(renderer.playerBase)
    baseHit(renderer.particles, PAD_X - 20, PLAYER_BASE_Y)
    triggerShake(renderer.camera, 5)
    triggerChromatic(renderer.postProcess)
  }

  if (prev.enemyBaseHp >= 0 && enemyBaseHp < prev.enemyBaseHp) {
    showDamageNumber(
      renderer.damageNumbers,
      RENDER_W - PAD_X + 20,
      ENEMY_BASE_Y - 44,
      prev.enemyBaseHp - enemyBaseHp,
      0xffd27a,
    )
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

  // Process pending impact effects
  for (let i = renderer.pendingImpacts.length - 1; i >= 0; i--) {
    const pi = renderer.pendingImpacts[i]!
    pi.timer -= dt
    if (pi.timer <= 0) {
      impactForWeapon(renderer.particles, pi.x, pi.y, pi.weaponKind)
      renderer.pendingImpacts.splice(i, 1)
    }
  }

  // HP deltas -> floating damage numbers
  for (const [id, hpNow] of currentHp) {
    const hpBefore = prev.unitHp.get(id)
    if (hpBefore === undefined || hpNow >= hpBefore) continue

    const damage = hpBefore - hpNow
    if (damage < 0.5) continue

    const unit = unitsById.get(id)
    if (!unit) continue

    const x = unitScreenX(unit.position) + ((id % 5) - 2) * 2
    const y = unitLaneY(unit) - 22
    const color = unit.side === 'enemy' ? 0x8ef0ff : 0xff7a7a
    showDamageNumber(renderer.damageNumbers, x, y, damage, color)
  }

  // Update mech sprites
  const currentUnitIds = new Set<number>()
  const focusTargetId = findHighestWattEnemy(state.units)

  for (const unit of state.units) {
    currentUnitIds.add(unit.id)

    let mechSprite = renderer.mechSprites.get(unit.id)

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

    const sx = unitScreenX(unit.position)
    const sy = unitScreenY(unit, buildIndexTracker)
    const hpPct = unit.hp / unit.maxHp

    // Compute status flags
    const status = computeUnitStatus(state, unit, focusTargetId)

    updateMechSprite(mechSprite, sx, sy, hpPct, unit.state, dt, renderer.time, status)
  }

  // Remove sprites for units no longer in state
  for (const [id, sprite] of renderer.mechSprites) {
    if (!currentUnitIds.has(id)) {
      if (sprite.animState === 'dying' && sprite.deathTimer > 0) {
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

  // Update milestones
  updateMilestones(
    renderer.milestones,
    state,
    renderer.camera,
    renderer.postProcess,
    dt,
    renderer.time,
  )

  // Update subsystems
  updateProjectiles(renderer.projectiles, dt)
  updateParticles(renderer.particles, dt)
  updateDamageNumbers(renderer.damageNumbers, dt)
  updateSkillEffects(renderer.skillEffects, dt)
  updateBackground(renderer.background, renderer.time)
  updateCamera(renderer.camera, renderer.app.stage)
  updatePostProcess(renderer.postProcess, renderer.app.stage, dt)

  // Skill preview
  drawSkillPreview(renderer, state)

  // Store snapshot for next frame
  prev.aliveIds = currentAliveIds
  prev.attackingIds = currentAttackingIds
  prev.playerBaseHp = playerBaseHp
  prev.enemyBaseHp = enemyBaseHp
  prev.activeSkills = currentSkills
  prev.unitHp = currentHp
}

// ─── Skill preview ───

export function setPreviewSkill(renderer: BattleRendererState, skill: SkillName | null): void {
  renderer.previewSkill = skill
}

function drawSkillPreview(renderer: BattleRendererState, state: BattleState): void {
  const gfx = renderer.previewGfx
  gfx.clear()

  if (!renderer.previewSkill) return

  const time = renderer.time
  const pulse = 0.3 + Math.sin(time * 6) * 0.15

  switch (renderer.previewSkill) {
    case 'Shield Burst': {
      // Gold blink on all player units
      for (const unit of state.units) {
        if (unit.side !== 'player' || unit.state === 'dead') continue
        const sx = unitScreenX(unit.position)
        const sy = PLAYER_LANE_Y + unit.buildIndex * LANE_SPACING
        gfx.circle(sx, sy, 18).stroke({ color: 0xffd700, width: 1.5, alpha: pulse })
      }
      break
    }
    case 'EMP Strike': {
      // Cyan ring on enemy cluster center
      let cx = 0
      let cy = 0
      let count = 0
      for (const unit of state.units) {
        if (unit.side !== 'enemy' || unit.state === 'dead') continue
        cx += unitScreenX(unit.position)
        cy += ENEMY_LANE_Y + unit.buildIndex * LANE_SPACING
        count++
      }
      if (count > 0) {
        cx /= count
        cy /= count
        const r = 40 + Math.sin(time * 4) * 5
        gfx.circle(cx, cy, r).stroke({ color: 0x00ffff, width: 2, alpha: pulse })
        gfx.circle(cx, cy, r * 0.6).stroke({ color: 0x00ffff, width: 1, alpha: pulse * 0.5 })
      }
      break
    }
    case 'Focus Fire': {
      // Reticle on highest watt enemy
      let target: BattleUnit | null = null
      let maxWatt = -1
      for (const unit of state.units) {
        if (unit.side !== 'enemy' || unit.state === 'dead') continue
        if (unit.wattCost > maxWatt) {
          maxWatt = unit.wattCost
          target = unit
        }
      }
      if (target) {
        const sx = unitScreenX(target.position)
        const sy = ENEMY_LANE_Y + target.buildIndex * LANE_SPACING
        const r = 20 + Math.sin(time * 5) * 3
        gfx.circle(sx, sy, r).stroke({ color: 0xff4444, width: 2, alpha: pulse + 0.2 })
        gfx.moveTo(sx - r, sy).lineTo(sx - r + 6, sy).stroke({ color: 0xff4444, width: 1.5, alpha: pulse })
        gfx.moveTo(sx + r, sy).lineTo(sx + r - 6, sy).stroke({ color: 0xff4444, width: 1.5, alpha: pulse })
        gfx.moveTo(sx, sy - r).lineTo(sx, sy - r + 6).stroke({ color: 0xff4444, width: 1.5, alpha: pulse })
        gfx.moveTo(sx, sy + r).lineTo(sx, sy + r - 6).stroke({ color: 0xff4444, width: 1.5, alpha: pulse })
      }
      break
    }
    default:
      break
  }
}

export function destroyBattleRenderer(renderer: BattleRendererState): void {
  for (const [, sprite] of renderer.mechSprites) {
    destroyMechSprite(sprite)
  }
  renderer.mechSprites.clear()

  renderer.background.container.destroy({ children: true })
  renderer.particles.container.destroy({ children: true })
  renderer.projectiles.container.destroy({ children: true })
  renderer.damageNumbers.container.destroy({ children: true })
  renderer.skillEffects.container.destroy({ children: true })
  renderer.milestones.container.destroy({ children: true })
  renderer.playerBase.container.destroy({ children: true })
  renderer.enemyBase.container.destroy({ children: true })
}
