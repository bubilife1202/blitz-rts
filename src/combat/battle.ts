import type {
  BuildDerived,
  Roster,
  RosterIndex,
  SkillDeck,
} from '../core/types'
import { UNIT_CAP_PER_SIDE, WATT_MAX } from '../core/types'
import { calculateBuildDerived } from '../assembly/parts'
import type { BattlefieldState, Side } from './battlefield'
import {
  createBattlefield,
  damageBase,
  getBase,
  getBasePosition,
  getEnemySide,
  isBaseDestroyed,
} from './battlefield'
import { calculateDps, getWeaponHitProfile } from './damage'
import type { BattleUnit } from './unit'
import {
  applyDamage,
  createUnit,
  isAlive,
  isBaseInRange,
  moveUnit,
  resetUnitIdCounter,
} from './unit'
import { findTarget, getUnitsInSplashRange } from './targeting'
import type { ActiveEffect, SkillSystemState } from './skills'
import {
  addActiveEffect,
  canUseSkill,
  createSkillSystem,
  getDefenseBuffBonus,
  getFireRateMultiplier,
  getFocusFireTarget,
  getSkillDefinition,
  getWattRegenMultiplier,
  hasActiveEffect,
  regenSp,
  removeActiveEffect,
  spendSp,
  startCooldown,
  updateCooldowns,
  updateEffects,
} from './skills'
import type { WattState } from './watt'
import { createWattState, regenWatt, spendWatt } from './watt'
import type { RngState } from '../utils/rng'
import { createRng, nextFloat } from '../utils/rng'

let nextDecoyId = -1

export type BattleOutcome = 'player_win' | 'enemy_win' | 'draw'

export interface BuildBattleStats {
  kills: number
  deaths: number
  damageDealt: number
  damageTaken: number
  unitsProduced: number
}

export interface BattleResult {
  readonly outcome: BattleOutcome
  readonly elapsedSeconds: number
  readonly playerBuildStats: readonly [
    BuildBattleStats,
    BuildBattleStats,
    BuildBattleStats,
  ]
  readonly enemyBuildStats: readonly [
    BuildBattleStats,
    BuildBattleStats,
    BuildBattleStats,
  ]
}

export interface BattleConfig {
  readonly playerRoster: Roster
  readonly playerRatios: readonly [number, number, number]
  readonly playerDeck: SkillDeck
  readonly enemyRoster: Roster
  readonly enemyRatios: readonly [number, number, number]
  readonly seed: number
  readonly ticksPerSecond: number
  readonly timeLimitSeconds: number
}

export interface BattleState {
  readonly elapsedSeconds: number
  readonly battlefield: BattlefieldState
  readonly units: readonly BattleUnit[]
  readonly playerWatt: WattState
  readonly enemyWatt: WattState
  readonly skillSystem: SkillSystemState
  readonly playerBuildStats: readonly [
    BuildBattleStats,
    BuildBattleStats,
    BuildBattleStats,
  ]
  readonly enemyBuildStats: readonly [
    BuildBattleStats,
    BuildBattleStats,
    BuildBattleStats,
  ]
  readonly result: BattleResult | null
}

export interface BattleEngine {
  tick(): void
  getState(): BattleState
  activateSkill(skillIndex: number): boolean
  isFinished(): boolean
}

interface ProductionState {
  readonly sequence: readonly RosterIndex[]
  index: number
}

interface InternalState {
  elapsed: number
  readonly dt: number
  readonly battlefield: BattlefieldState
  readonly units: BattleUnit[]
  playerWatt: WattState
  enemyWatt: WattState
  readonly skillSystem: SkillSystemState
  readonly playerProduction: ProductionState
  readonly enemyProduction: ProductionState
  readonly playerDerived: readonly [BuildDerived, BuildDerived, BuildDerived]
  readonly enemyDerived: readonly [BuildDerived, BuildDerived, BuildDerived]
  readonly playerBuildStats: [
    BuildBattleStats,
    BuildBattleStats,
    BuildBattleStats,
  ]
  readonly enemyBuildStats: [
    BuildBattleStats,
    BuildBattleStats,
    BuildBattleStats,
  ]
  result: BattleResult | null
  readonly rng: RngState
  readonly config: BattleConfig
}

function buildProductionSequence(
  ratios: readonly [number, number, number],
): readonly RosterIndex[] {
  const seq: RosterIndex[] = []
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < ratios[i]!; j++) {
      seq.push(i as RosterIndex)
    }
  }
  return seq
}

function createBuildStats(): BuildBattleStats {
  return { kills: 0, deaths: 0, damageDealt: 0, damageTaken: 0, unitsProduced: 0 }
}

function countAlive(units: readonly BattleUnit[], side: Side): number {
  let count = 0
  for (const u of units) {
    if (u.side === side && isAlive(u)) count++
  }
  return count
}

function getAliveUnits(
  units: readonly BattleUnit[],
  side: Side,
): BattleUnit[] {
  return units.filter(u => u.side === side && isAlive(u))
}

function getBuildStats(
  state: InternalState,
  side: Side,
  buildIndex: RosterIndex,
): BuildBattleStats {
  const stats =
    side === 'player' ? state.playerBuildStats : state.enemyBuildStats
  return stats[buildIndex]
}

function produceUnits(state: InternalState, side: Side): void {
  const production =
    side === 'player' ? state.playerProduction : state.enemyProduction
  const derived =
    side === 'player' ? state.playerDerived : state.enemyDerived
  const stats =
    side === 'player' ? state.playerBuildStats : state.enemyBuildStats

  if (production.sequence.length === 0) return

  let aliveCount = countAlive(state.units, side)

  while (aliveCount < UNIT_CAP_PER_SIDE) {
    const buildIndex = production.sequence[production.index]!
    const buildDerived = derived[buildIndex]
    const cost = buildDerived.cost.finalWattCost

    const watt = side === 'player' ? state.playerWatt : state.enemyWatt
    const result = spendWatt(watt, cost)
    if (!result.ok) break

    if (side === 'player') {
      state.playerWatt = result.state
    } else {
      state.enemyWatt = result.state
    }

    const unit = createUnit(side, buildIndex, buildDerived)
    state.units.push(unit)
    stats[buildIndex].unitsProduced++

    production.index = (production.index + 1) % production.sequence.length
    aliveCount++
  }
}

function calculatePerHitDamage(
  attacker: BattleUnit,
  targetDefense: number,
  targetMaxHp: number,
): number {
  const dps = calculateDps({
    attack: attacker.attack,
    fireRate: attacker.fireRate,
    targetDefense,
    targetMaxHp,
    special: attacker.weaponSpecial,
  })
  return dps / attacker.fireRate
}

function shouldEvade(
  attackerMoveType: string,
  targetMoveType: string,
  rng: RngState,
): boolean {
  if (targetMoveType === 'flying' && attackerMoveType !== 'flying') {
    return nextFloat(rng) < 0.3
  }
  return false
}

function applyAttackToUnit(
  state: InternalState,
  attacker: BattleUnit,
  target: BattleUnit,
): void {
  if (shouldEvade(attacker.moveType, target.moveType, state.rng)) return

  if (
    target.side === 'player' &&
    hasActiveEffect(state.skillSystem, 'invincible-allies')
  ) {
    return
  }
  const defenseBonus =
    target.side === 'player'
      ? getDefenseBuffBonus(state.skillSystem)
      : 0
  const damage = calculatePerHitDamage(attacker, target.defense + defenseBonus, target.maxHp)
  const attackerStats = getBuildStats(state, attacker.side, attacker.buildIndex)
  const targetStats = getBuildStats(state, target.side, target.buildIndex)

  attackerStats.damageDealt += damage
  targetStats.damageTaken += damage
  applyDamage(target, damage)

  if (!isAlive(target)) {
    attackerStats.kills++
    targetStats.deaths++
    checkFocusFireTargetDeath(state, target)
  }
}

function applyAttackToBase(
  state: InternalState,
  attacker: BattleUnit,
): void {
  const enemySide = getEnemySide(attacker.side)
  const base = getBase(state.battlefield, enemySide)
  const damage = calculatePerHitDamage(attacker, base.defense, base.maxHp)
  const attackerStats = getBuildStats(state, attacker.side, attacker.buildIndex)
  attackerStats.damageDealt += damage
  damageBase(base, damage)
}

function checkFocusFireTargetDeath(
  state: InternalState,
  deadUnit: BattleUnit,
): void {
  const focusId = getFocusFireTarget(state.skillSystem)
  if (focusId !== null && focusId === deadUnit.id) {
    removeActiveEffect(state.skillSystem, 'focus-fire')
  }
}

function processUnitCombat(state: InternalState, unit: BattleUnit): void {
  if (!isAlive(unit)) return

  if (
    unit.side === 'enemy' &&
    hasActiveEffect(state.skillSystem, 'freeze-enemies')
  ) {
    return
  }

  if (
    unit.side === 'player' &&
    hasActiveEffect(state.skillSystem, 'recall-stun')
  ) {
    return
  }

  unit.attackCooldown = Math.max(0, unit.attackCooldown - state.dt)

  const enemySide = getEnemySide(unit.side)
  const enemies = getAliveUnits(state.units, enemySide)

  const scrambled =
    unit.side === 'enemy' &&
    hasActiveEffect(state.skillSystem, 'scramble-targeting')
  const focusTargetId =
    unit.side === 'player'
      ? getFocusFireTarget(state.skillSystem)
      : null

  const target = findTarget(
    unit,
    enemies,
    scrambled,
    focusTargetId,
    state.rng,
  )

  if (target) {
    unit.state = 'attacking'
    unit.currentTargetId = target.id

    if (unit.attackCooldown <= 0) {
      const hitProfile = getWeaponHitProfile(unit.weaponSpecial)

      if (hitProfile.kind === 'splash') {
        const splashTargets = getUnitsInSplashRange(
          target.position,
          enemies,
          hitProfile.splashRange,
        )
        for (const st of splashTargets) {
          applyAttackToUnit(state, unit, st)
        }
      } else {
        applyAttackToUnit(state, unit, target)
      }

      const fireRate =
        unit.side === 'player'
          ? unit.fireRate * getFireRateMultiplier(state.skillSystem)
          : unit.fireRate
      unit.attackCooldown = 1 / fireRate
    }
    return
  }

  const enemyBasePos = getBasePosition(enemySide)
  if (isBaseInRange(unit, enemyBasePos)) {
    unit.state = 'attacking'
    unit.currentTargetId = null

    if (unit.attackCooldown <= 0) {
      applyAttackToBase(state, unit)
      const fireRate =
        unit.side === 'player'
          ? unit.fireRate * getFireRateMultiplier(state.skillSystem)
          : unit.fireRate
      unit.attackCooldown = 1 / fireRate
    }
    return
  }

  unit.state = 'moving'
  unit.currentTargetId = null
  moveUnit(unit, state.dt)
}

function checkWinCondition(state: InternalState): void {
  const playerBase = getBase(state.battlefield, 'player')
  const enemyBase = getBase(state.battlefield, 'enemy')
  const playerDestroyed = isBaseDestroyed(playerBase)
  const enemyDestroyed = isBaseDestroyed(enemyBase)

  if (playerDestroyed && enemyDestroyed) {
    const playerAlive = countAlive(state.units, 'player')
    const enemyAlive = countAlive(state.units, 'enemy')
    let outcome: BattleOutcome
    if (playerAlive > enemyAlive) outcome = 'player_win'
    else if (enemyAlive > playerAlive) outcome = 'enemy_win'
    else outcome = 'draw'
    state.result = {
      outcome,
      elapsedSeconds: state.elapsed,
      playerBuildStats: state.playerBuildStats,
      enemyBuildStats: state.enemyBuildStats,
    }
    return
  }

  if (enemyDestroyed) {
    state.result = {
      outcome: 'player_win',
      elapsedSeconds: state.elapsed,
      playerBuildStats: state.playerBuildStats,
      enemyBuildStats: state.enemyBuildStats,
    }
    return
  }

  if (playerDestroyed) {
    state.result = {
      outcome: 'enemy_win',
      elapsedSeconds: state.elapsed,
      playerBuildStats: state.playerBuildStats,
      enemyBuildStats: state.enemyBuildStats,
    }
    return
  }

  if (state.elapsed >= state.config.timeLimitSeconds) {
    const playerHpPct = playerBase.hp / playerBase.maxHp
    const enemyHpPct = enemyBase.hp / enemyBase.maxHp
    let outcome: BattleOutcome
    if (playerHpPct > enemyHpPct) outcome = 'player_win'
    else if (enemyHpPct > playerHpPct) outcome = 'enemy_win'
    else outcome = 'draw'
    state.result = {
      outcome,
      elapsedSeconds: state.elapsed,
      playerBuildStats: state.playerBuildStats,
      enemyBuildStats: state.enemyBuildStats,
    }
  }
}

function removeDecoyUnits(units: BattleUnit[]): void {
  for (let i = units.length - 1; i >= 0; i--) {
    if (units[i]!.id < 0) {
      units.splice(i, 1)
    }
  }
}

function doActivateSkill(
  state: InternalState,
  skillIndex: number,
): boolean {
  if (!canUseSkill(state.skillSystem, skillIndex)) return false

  const cd = state.skillSystem.cooldowns[skillIndex]
  if (!cd) return false
  const def = getSkillDefinition(cd.name)

  const effect = def.effect
  let activated = false

  switch (effect.kind) {
    case 'invincible-allies': {
      const ae: ActiveEffect = {
        kind: 'invincible-allies',
        remainingDuration: effect.durationSeconds,
      }
      addActiveEffect(state.skillSystem, ae)
      activated = true
      break
    }
    case 'freeze-enemies': {
      const ae: ActiveEffect = {
        kind: 'freeze-enemies',
        remainingDuration: effect.durationSeconds,
      }
      addActiveEffect(state.skillSystem, ae)
      activated = true
      break
    }
    case 'watt-regen-multiplier': {
      const ae: ActiveEffect = {
        kind: 'watt-regen-multiplier',
        remainingDuration: effect.durationSeconds,
        multiplier: effect.multiplier,
      }
      addActiveEffect(state.skillSystem, ae)
      activated = true
      break
    }
    case 'focus-fire-highest-watt-enemy': {
      const enemies = getAliveUnits(state.units, 'enemy')
      if (enemies.length === 0) break
      let highestWatt = enemies[0]!
      for (let i = 1; i < enemies.length; i++) {
        if (enemies[i]!.wattCost > highestWatt.wattCost) {
          highestWatt = enemies[i]!
        }
      }
      const ae: ActiveEffect = {
        kind: 'focus-fire',
        remainingDuration: effect.durationSeconds,
        focusTargetId: highestWatt.id,
      }
      addActiveEffect(state.skillSystem, ae)
      activated = true
      break
    }
    case 'heal-allies-percent-maxhp': {
      const allies = getAliveUnits(state.units, 'player')
      for (const ally of allies) {
        ally.hp = Math.min(
          ally.maxHp,
          ally.hp + Math.floor(ally.maxHp * effect.percent),
        )
      }
      activated = true
      break
    }
    case 'scramble-targeting': {
      const ae: ActiveEffect = {
        kind: 'scramble-targeting',
        remainingDuration: effect.durationSeconds,
      }
      addActiveEffect(state.skillSystem, ae)
      activated = true
      break
    }
    case 'area-damage': {
      const enemies = getAliveUnits(state.units, 'enemy')
      if (enemies.length === 0) break
      // Find the most clustered enemies: pick center as average position, sort by distance to center
      let sumPos = 0
      for (const e of enemies) sumPos += e.position
      const centerPos = sumPos / enemies.length
      const sorted = [...enemies].sort(
        (a, b) =>
          Math.abs(a.position - centerPos) - Math.abs(b.position - centerPos),
      )
      const targets = sorted.slice(0, 5)
      for (const t of targets) {
        const targetStats = getBuildStats(state, t.side, t.buildIndex)
        targetStats.damageTaken += effect.damage
        applyDamage(t, effect.damage)
        if (!isAlive(t)) {
          targetStats.deaths++
        }
      }
      activated = true
      break
    }
    case 'defense-buff': {
      const ae: ActiveEffect = {
        kind: 'defense-buff',
        remainingDuration: effect.durationSeconds,
        defenseBonus: effect.defenseBonus,
      }
      addActiveEffect(state.skillSystem, ae)
      activated = true
      break
    }
    case 'fire-rate-buff': {
      const ae: ActiveEffect = {
        kind: 'fire-rate-buff',
        remainingDuration: effect.durationSeconds,
        multiplier: effect.multiplier,
      }
      addActiveEffect(state.skillSystem, ae)
      activated = true
      break
    }
    case 'spawn-decoys': {
      removeDecoyUnits(state.units)

      const positions = [5, 8, 11]
      for (let i = 0; i < effect.count; i++) {
        const decoy: BattleUnit = {
          id: nextDecoyId--,
          side: 'player',
          buildIndex: 0 as RosterIndex,
          position: positions[i]!,
          hp: effect.hp,
          maxHp: effect.hp,
          speed: 0,
          tilesPerSecond: 0,
          defense: 0,
          attack: 0,
          range: 0,
          fireRate: 0,
          moveType: 'humanoid',
          mountType: 'arm',
          weaponSpecial: { kind: 'none' },
          wattCost: 0,
          state: 'moving',
          attackCooldown: 0,
          currentTargetId: null,
        }
        state.units.push(decoy)
      }
      const ae: ActiveEffect = {
        kind: 'spawn-decoys',
        remainingDuration: effect.durationSeconds,
      }
      addActiveEffect(state.skillSystem, ae)
      activated = true
      break
    }
    case 'recall-heal': {
      const allies = getAliveUnits(state.units, 'player')
      for (const ally of allies) {
        ally.position = 1
        ally.hp = ally.maxHp
      }
      const ae: ActiveEffect = {
        kind: 'recall-stun',
        remainingDuration: effect.stunSeconds,
      }
      addActiveEffect(state.skillSystem, ae)
      activated = true
      break
    }
    case 'watt-instant': {
      state.playerWatt = {
        current: Math.min(WATT_MAX, state.playerWatt.current + effect.amount),
      }
      activated = true
      break
    }
  }

  if (!activated) return false

  spendSp(state.skillSystem.sp, def.spCost)
  startCooldown(state.skillSystem, skillIndex)
  return true
}

function tickInternal(state: InternalState): void {
  if (state.result) return

  state.elapsed += state.dt

  const wattMultiplier = getWattRegenMultiplier(state.skillSystem)
  state.playerWatt = regenWatt(state.playerWatt, state.dt, {
    regenMultiplier: wattMultiplier,
  })
  state.enemyWatt = regenWatt(state.enemyWatt, state.dt)

  produceUnits(state, 'player')
  produceUnits(state, 'enemy')

  regenSp(state.skillSystem.sp, state.dt)

  const hadDecoys = hasActiveEffect(state.skillSystem, 'spawn-decoys')
  updateEffects(state.skillSystem, state.dt)
  const hasDecoys = hasActiveEffect(state.skillSystem, 'spawn-decoys')
  if (hadDecoys && !hasDecoys) {
    removeDecoyUnits(state.units)
  }
  updateCooldowns(state.skillSystem, state.dt)

  for (const unit of state.units) {
    processUnitCombat(state, unit)
  }

  checkWinCondition(state)
}

export function createBattle(config: BattleConfig): BattleEngine {
  resetUnitIdCounter()
  nextDecoyId = -1

  const state: InternalState = {
    elapsed: 0,
    dt: 1 / config.ticksPerSecond,
    battlefield: createBattlefield(),
    units: [],
    playerWatt: createWattState(),
    enemyWatt: createWattState(),
    skillSystem: createSkillSystem(config.playerDeck),
    playerProduction: {
      sequence: buildProductionSequence(config.playerRatios),
      index: 0,
    },
    enemyProduction: {
      sequence: buildProductionSequence(config.enemyRatios),
      index: 0,
    },
    playerDerived: [
      calculateBuildDerived(config.playerRoster[0]),
      calculateBuildDerived(config.playerRoster[1]),
      calculateBuildDerived(config.playerRoster[2]),
    ],
    enemyDerived: [
      calculateBuildDerived(config.enemyRoster[0]),
      calculateBuildDerived(config.enemyRoster[1]),
      calculateBuildDerived(config.enemyRoster[2]),
    ],
    playerBuildStats: [
      createBuildStats(),
      createBuildStats(),
      createBuildStats(),
    ],
    enemyBuildStats: [
      createBuildStats(),
      createBuildStats(),
      createBuildStats(),
    ],
    result: null,
    rng: createRng(config.seed),
    config,
  }

  return {
    tick(): void {
      tickInternal(state)
    },
    getState(): BattleState {
      return {
        elapsedSeconds: state.elapsed,
        battlefield: state.battlefield,
        units: state.units,
        playerWatt: state.playerWatt,
        enemyWatt: state.enemyWatt,
        skillSystem: state.skillSystem,
        playerBuildStats: state.playerBuildStats,
        enemyBuildStats: state.enemyBuildStats,
        result: state.result,
      }
    },
    activateSkill(skillIndex: number): boolean {
      return doActivateSkill(state, skillIndex)
    },
    isFinished(): boolean {
      return state.result !== null
    },
  }
}
