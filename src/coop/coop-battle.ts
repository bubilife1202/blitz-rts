import type {
  BuildDerived,
  RosterIndex,
  SkillDeck,
} from '../core/types'
import type { Roster } from '../core/types'
import {
  COOP_UNIT_CAP,
  WATT_INITIAL,
} from '../core/types'
import { calculateBuildDerived } from '../assembly/parts'
import type { BattlefieldState, Side } from '../combat/battlefield'
import {
  createCoopBattlefield,
  damageBase,
  getBase,
  getBasePosition,
  getEnemySide,
  isBaseDestroyed,
} from '../combat/battlefield'
import type { BattleUnit } from '../combat/unit'
import {
  createUnit,
  isAlive,
  isBaseInRange,
  moveUnit,
  resetUnitIdCounter,
} from '../combat/unit'
import { calculateDps, getWeaponHitProfile } from '../combat/damage'
import { findTarget, getUnitsInSplashRange } from '../combat/targeting'
import type { ActiveEffect, SkillSystemState } from '../combat/skills'
import {
  addActiveEffect,
  canUseSkill,
  createSkillSystem,
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
} from '../combat/skills'
import type { WattState } from '../combat/watt'
import { createWattState, regenWatt, spendWatt } from '../combat/watt'
import type { RngState } from '../utils/rng'
import { createRng, nextFloat } from '../utils/rng'
import type { PartnerPersonality } from './types'
import type { PartnerAIState, PartnerBattleView } from './partner-ai'
import { createPartnerAI, updatePartnerAI } from './partner-ai'
import { calculateTeamSynergy } from './team-synergy'
import type { CalloutQueue } from './callout-queue'
import {
  createCalloutQueue,
  enqueue,
  updateCalloutQueue,
} from './callout-queue'
import type { CalloutTriggerState } from './callout-triggers'
import {
  checkBaseDanger,
  checkHeavyEnemy,
  checkSkillAnnounce,
  checkComboReaction,
  checkKillStreak,
  createCalloutTriggerState,
  getBattleStartCallout,
  getBattleEndCallout,
  recordPlayerSkill,
} from './callout-triggers'
import type { BuildBattleStats, BattleOutcome, BattleResult } from '../combat/battle'

const COMBO_WINDOW = 3
const COMBO_DURATION_BONUS = 0.2

export interface CoopBattleConfig {
  readonly playerRoster: Roster
  readonly playerRatios: readonly [number, number, number]
  readonly playerDeck: SkillDeck
  readonly partner: PartnerPersonality
  readonly enemyRoster: Roster
  readonly enemyRatios: readonly [number, number, number]
  readonly baseHp?: number
  readonly enemyBaseHp?: number
  readonly seed: number
  readonly ticksPerSecond: number
  readonly timeLimitSeconds: number
}

export interface CoopBattleState {
  readonly elapsedSeconds: number
  readonly battlefield: BattlefieldState
  readonly units: readonly BattleUnit[]
  readonly playerWatt: WattState
  readonly partnerWatt: WattState
  readonly enemyWatt: WattState
  readonly playerSkillSystem: SkillSystemState
  readonly partnerAI: PartnerAIState
  readonly calloutQueue: CalloutQueue
  readonly playerBuildStats: readonly [BuildBattleStats, BuildBattleStats, BuildBattleStats]
  readonly partnerBuildStats: readonly [BuildBattleStats, BuildBattleStats, BuildBattleStats]
  readonly enemyBuildStats: readonly [BuildBattleStats, BuildBattleStats, BuildBattleStats]
  readonly result: BattleResult | null
  readonly comboActive: boolean
}

export interface CoopBattleEngine {
  tick(): void
  getState(): CoopBattleState
  activateSkill(skillIndex: number): boolean
  isFinished(): boolean
}

interface ProductionState {
  readonly sequence: readonly RosterIndex[]
  index: number
}

// Units are tagged with 'owner' to distinguish player vs partner units on the same side
interface TaggedUnit extends BattleUnit {
  owner: 'player' | 'partner' | 'enemy'
}

interface InternalCoopState {
  elapsed: number
  readonly dt: number
  readonly battlefield: BattlefieldState
  readonly units: TaggedUnit[]
  playerWatt: WattState
  partnerWatt: WattState
  enemyWatt: WattState
  readonly playerSkillSystem: SkillSystemState
  readonly partnerAI: PartnerAIState
  readonly calloutQueue: CalloutQueue
  readonly calloutTriggers: CalloutTriggerState
  readonly playerProduction: ProductionState
  readonly enemyProduction: ProductionState
  readonly playerDerived: readonly [BuildDerived, BuildDerived, BuildDerived]
  readonly partnerDerived: readonly [BuildDerived, BuildDerived, BuildDerived]
  readonly enemyDerived: readonly [BuildDerived, BuildDerived, BuildDerived]
  readonly playerBuildStats: [BuildBattleStats, BuildBattleStats, BuildBattleStats]
  readonly partnerBuildStats: [BuildBattleStats, BuildBattleStats, BuildBattleStats]
  readonly enemyBuildStats: [BuildBattleStats, BuildBattleStats, BuildBattleStats]
  result: BattleResult | null
  lastPlayerSkillTime: number
  lastPartnerSkillTime: number
  readonly rng: RngState
  readonly config: CoopBattleConfig
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

function countAlive(units: readonly TaggedUnit[], owner: TaggedUnit['owner']): number {
  let count = 0
  for (const u of units) {
    if (u.owner === owner && isAlive(u)) count++
  }
  return count
}

function countAliveSide(units: readonly TaggedUnit[], side: Side): number {
  let count = 0
  for (const u of units) {
    if (u.side === side && isAlive(u)) count++
  }
  return count
}

function getAliveUnits(units: readonly TaggedUnit[], side: Side): TaggedUnit[] {
  return units.filter(u => u.side === side && isAlive(u))
}

function getAliveByOwner(units: readonly TaggedUnit[], owner: TaggedUnit['owner']): TaggedUnit[] {
  return units.filter(u => u.owner === owner && isAlive(u))
}

function producePlayerUnits(state: InternalCoopState): void {
  const { playerProduction, playerDerived, playerBuildStats } = state
  if (playerProduction.sequence.length === 0) return

  let aliveCount = countAlive(state.units, 'player')

  while (aliveCount < COOP_UNIT_CAP) {
    const buildIndex = playerProduction.sequence[playerProduction.index]!
    const cost = playerDerived[buildIndex].cost.finalWattCost
    const result = spendWatt(state.playerWatt, cost)
    if (!result.ok) break

    state.playerWatt = result.state
    const unit = createUnit('player', buildIndex, playerDerived[buildIndex]) as TaggedUnit
    unit.owner = 'player'
    state.units.push(unit)
    playerBuildStats[buildIndex].unitsProduced++
    playerProduction.index = (playerProduction.index + 1) % playerProduction.sequence.length
    aliveCount++
  }
}

function produceEnemyUnits(state: InternalCoopState): void {
  const { enemyProduction, enemyDerived, enemyBuildStats } = state
  if (enemyProduction.sequence.length === 0) return

  let aliveCount = countAliveSide(state.units, 'enemy')

  while (aliveCount < 20) {
    const buildIndex = enemyProduction.sequence[enemyProduction.index]!
    const cost = enemyDerived[buildIndex].cost.finalWattCost
    const result = spendWatt(state.enemyWatt, cost)
    if (!result.ok) break

    state.enemyWatt = result.state
    const unit = createUnit('enemy', buildIndex, enemyDerived[buildIndex]) as TaggedUnit
    unit.owner = 'enemy'
    state.units.push(unit)
    enemyBuildStats[buildIndex].unitsProduced++
    enemyProduction.index = (enemyProduction.index + 1) % enemyProduction.sequence.length
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

function getOwnerStats(
  state: InternalCoopState,
  unit: TaggedUnit,
): BuildBattleStats {
  if (unit.owner === 'player') return state.playerBuildStats[unit.buildIndex]
  if (unit.owner === 'partner') return state.partnerBuildStats[unit.buildIndex]
  return state.enemyBuildStats[unit.buildIndex]
}

function applyAttackToUnit(
  state: InternalCoopState,
  attacker: TaggedUnit,
  target: TaggedUnit,
): void {
  if (shouldEvade(attacker.moveType, target.moveType, state.rng)) return

  // Player-side invincibility check
  if (
    target.side === 'player' &&
    hasActiveEffect(state.playerSkillSystem, 'invincible-allies')
  ) {
    return
  }

  // Apply team synergy bonus for allied attacker
  let effectiveAttack = attacker.attack
  if (attacker.side === 'player') {
    const synergy = calculateTeamSynergy(
      getAliveByOwner(state.units, 'player'),
      getAliveByOwner(state.units, 'partner'),
    )
    if (synergy.sharedMoveTypes.includes(attacker.moveType)) {
      effectiveAttack = Math.floor(attacker.attack * synergy.attackMultiplier)
    }
  }

  const damage = calculateDps({
    attack: effectiveAttack,
    fireRate: attacker.fireRate,
    targetDefense: target.defense,
    targetMaxHp: target.maxHp,
    special: attacker.weaponSpecial,
  }) / attacker.fireRate

  const attackerStats = getOwnerStats(state, attacker)
  const targetStats = getOwnerStats(state, target)

  attackerStats.damageDealt += damage
  targetStats.damageTaken += damage

  target.hp = Math.max(0, target.hp - damage)
  if (target.hp <= 0 && target.state !== 'dead') {
    target.state = 'dead'
    attackerStats.kills++
    targetStats.deaths++

    // Check if focus fire target died
    const focusId = getFocusFireTarget(state.playerSkillSystem)
    if (focusId !== null && focusId === target.id) {
      removeActiveEffect(state.playerSkillSystem, 'focus-fire')
    }

    // Kill streak callout
    const killMsg = checkKillStreak(
      state.config.partner.id,
      state.calloutTriggers,
      state.elapsed,
      attacker.owner !== 'enemy',
    )
    if (killMsg) enqueue(state.calloutQueue, killMsg)
  }
}

function applyAttackToBase(
  state: InternalCoopState,
  attacker: TaggedUnit,
): void {
  const enemySide = getEnemySide(attacker.side)
  const base = getBase(state.battlefield, enemySide)
  const damage = calculatePerHitDamage(attacker, base.defense, base.maxHp)
  const attackerStats = getOwnerStats(state, attacker)
  attackerStats.damageDealt += damage
  damageBase(base, damage)
}

function processUnitCombat(state: InternalCoopState, unit: TaggedUnit): void {
  if (!isAlive(unit)) return

  if (
    unit.side === 'enemy' &&
    hasActiveEffect(state.playerSkillSystem, 'freeze-enemies')
  ) {
    return
  }

  unit.attackCooldown = Math.max(0, unit.attackCooldown - state.dt)

  const enemySide = getEnemySide(unit.side)
  const enemies = getAliveUnits(state.units, enemySide)

  const scrambled =
    unit.side === 'enemy' &&
    hasActiveEffect(state.playerSkillSystem, 'scramble-targeting')
  const focusTargetId =
    unit.side === 'player'
      ? getFocusFireTarget(state.playerSkillSystem)
      : null

  const target = findTarget(unit, enemies, scrambled, focusTargetId, state.rng)

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
          applyAttackToUnit(state, unit, st as TaggedUnit)
        }
      } else {
        applyAttackToUnit(state, unit, target as TaggedUnit)
      }
      unit.attackCooldown = 1 / unit.fireRate
    }
    return
  }

  const enemyBasePos = getBasePosition(enemySide)
  if (isBaseInRange(unit, enemyBasePos)) {
    unit.state = 'attacking'
    unit.currentTargetId = null
    if (unit.attackCooldown <= 0) {
      applyAttackToBase(state, unit)
      unit.attackCooldown = 1 / unit.fireRate
    }
    return
  }

  unit.state = 'moving'
  unit.currentTargetId = null
  moveUnit(unit, state.dt)
}

function checkWinCondition(state: InternalCoopState): void {
  const playerBase = getBase(state.battlefield, 'player')
  const enemyBase = getBase(state.battlefield, 'enemy')
  const playerDestroyed = isBaseDestroyed(playerBase)
  const enemyDestroyed = isBaseDestroyed(enemyBase)

  let outcome: BattleOutcome | null = null

  if (playerDestroyed && enemyDestroyed) {
    const alliedAlive = countAliveSide(state.units, 'player')
    const enemyAlive = countAliveSide(state.units, 'enemy')
    if (alliedAlive > enemyAlive) outcome = 'player_win'
    else if (enemyAlive > alliedAlive) outcome = 'enemy_win'
    else outcome = 'draw'
  } else if (enemyDestroyed) {
    outcome = 'player_win'
  } else if (playerDestroyed) {
    outcome = 'enemy_win'
  } else if (state.elapsed >= state.config.timeLimitSeconds) {
    const playerHpPct = playerBase.hp / playerBase.maxHp
    const enemyHpPct = enemyBase.hp / enemyBase.maxHp
    if (playerHpPct > enemyHpPct) outcome = 'player_win'
    else if (enemyHpPct > playerHpPct) outcome = 'enemy_win'
    else outcome = 'draw'
  }

  if (outcome) {
    state.result = {
      outcome,
      elapsedSeconds: state.elapsed,
      playerBuildStats: state.playerBuildStats,
      enemyBuildStats: state.enemyBuildStats,
    }
    enqueue(
      state.calloutQueue,
      getBattleEndCallout(state.config.partner.id, outcome === 'player_win'),
    )
  }
}

function applySkillEffect(
  state: InternalCoopState,
  skillSystem: SkillSystemState,
  skillIndex: number,
  isPartner: boolean,
): boolean {
  const cd = skillSystem.cooldowns[skillIndex]
  if (!cd) return false
  const def = getSkillDefinition(cd.name)

  // Combo bonus: if both player and partner used skill within COMBO_WINDOW
  const now = state.elapsed
  const otherTime = isPartner ? state.lastPlayerSkillTime : state.lastPartnerSkillTime
  const isCombo = now - otherTime < COMBO_WINDOW && otherTime > 0

  const durationMultiplier = isCombo ? 1 + COMBO_DURATION_BONUS : 1

  const effect = def.effect
  switch (effect.kind) {
    case 'invincible-allies': {
      const ae: ActiveEffect = {
        kind: 'invincible-allies',
        remainingDuration: effect.durationSeconds * durationMultiplier,
      }
      addActiveEffect(skillSystem, ae)
      break
    }
    case 'freeze-enemies': {
      const ae: ActiveEffect = {
        kind: 'freeze-enemies',
        remainingDuration: effect.durationSeconds * durationMultiplier,
      }
      addActiveEffect(skillSystem, ae)
      break
    }
    case 'watt-regen-multiplier': {
      const ae: ActiveEffect = {
        kind: 'watt-regen-multiplier',
        remainingDuration: effect.durationSeconds * durationMultiplier,
        multiplier: effect.multiplier,
      }
      addActiveEffect(skillSystem, ae)
      break
    }
    case 'focus-fire-highest-watt-enemy': {
      const enemies = getAliveUnits(state.units, 'enemy')
      if (enemies.length === 0) return false
      let highestWatt = enemies[0]!
      for (let i = 1; i < enemies.length; i++) {
        if (enemies[i]!.wattCost > highestWatt.wattCost) {
          highestWatt = enemies[i]!
        }
      }
      const ae: ActiveEffect = {
        kind: 'focus-fire',
        remainingDuration: effect.durationSeconds * durationMultiplier,
        focusTargetId: highestWatt.id,
      }
      addActiveEffect(skillSystem, ae)
      break
    }
    case 'heal-allies-percent-maxhp': {
      const allies = getAliveUnits(state.units, 'player')
      for (const ally of allies) {
        ally.hp = Math.min(ally.maxHp, ally.hp + Math.floor(ally.maxHp * effect.percent))
      }
      break
    }
    case 'scramble-targeting': {
      const ae: ActiveEffect = {
        kind: 'scramble-targeting',
        remainingDuration: effect.durationSeconds * durationMultiplier,
      }
      addActiveEffect(skillSystem, ae)
      break
    }
  }

  return true
}

function doActivatePlayerSkill(
  state: InternalCoopState,
  skillIndex: number,
): boolean {
  if (!canUseSkill(state.playerSkillSystem, skillIndex)) return false

  const cd = state.playerSkillSystem.cooldowns[skillIndex]
  if (!cd) return false

  const success = applySkillEffect(state, state.playerSkillSystem, skillIndex, false)
  if (!success) return false

  const def = getSkillDefinition(cd.name)
  spendSp(state.playerSkillSystem.sp, def.spCost)
  startCooldown(state.playerSkillSystem, skillIndex)

  state.lastPlayerSkillTime = state.elapsed
  recordPlayerSkill(state.calloutTriggers, cd.name, state.elapsed)

  // Check for combo reaction callout
  const comboMsg = checkComboReaction(
    state.config.partner.id,
    state.calloutTriggers,
    state.elapsed,
  )
  if (comboMsg) enqueue(state.calloutQueue, comboMsg)

  return true
}

function processPartnerAI(state: InternalCoopState): void {
  const partnerUnits = getAliveByOwner(state.units, 'partner')
  const enemyUnits = getAliveUnits(state.units, 'enemy')
  const alliedBase = getBase(state.battlefield, 'player')
  const playerUsedSkillRecently =
    state.elapsed - state.lastPlayerSkillTime < 5

  const view: PartnerBattleView = {
    partnerUnits,
    enemyUnits,
    alliedBase,
    partnerDerived: state.partnerDerived,
    unitCap: COOP_UNIT_CAP,
    elapsedSeconds: state.elapsed,
    playerUsedSkillRecently,
  }

  const { watt, actions } = updatePartnerAI(
    state.partnerAI,
    state.partnerWatt,
    view,
    state.dt,
  )
  state.partnerWatt = watt

  for (const action of actions) {
    if (action.kind === 'produce') {
      const unit = createUnit(
        'player',
        action.buildIndex,
        state.partnerDerived[action.buildIndex],
      ) as TaggedUnit
      unit.owner = 'partner'
      state.units.push(unit)
      state.partnerBuildStats[action.buildIndex].unitsProduced++
    } else if (action.kind === 'skill') {
      // Partner skill effects go through the shared skill system
      applySkillEffect(
        state,
        state.playerSkillSystem,
        action.skillIndex,
        true,
      )
      state.lastPartnerSkillTime = state.elapsed

      // Skill announce callout
      const announceMsg = checkSkillAnnounce(
        state.config.partner.id,
        action.skillName,
      )
      if (announceMsg) enqueue(state.calloutQueue, announceMsg)
    }
  }
}

function tickCoopInternal(state: InternalCoopState): void {
  if (state.result) return

  state.elapsed += state.dt

  // Watt regen (co-op uses 15/s for player and partner, standard 20/s for enemy)
  const wattMultiplier = getWattRegenMultiplier(state.playerSkillSystem)
  state.playerWatt = regenWatt(state.playerWatt, state.dt, {
    regenMultiplier: wattMultiplier,
  })
  state.partnerWatt = regenWatt(state.partnerWatt, state.dt, {
    regenMultiplier: wattMultiplier,
  })
  state.enemyWatt = regenWatt(state.enemyWatt, state.dt)

  // Production
  producePlayerUnits(state)
  produceEnemyUnits(state)

  // Partner AI
  processPartnerAI(state)

  // SP regen (player only - partner manages its own SP)
  regenSp(state.playerSkillSystem.sp, state.dt)

  // Effects and cooldowns
  updateEffects(state.playerSkillSystem, state.dt)
  updateCooldowns(state.playerSkillSystem, state.dt)

  // Combat
  for (const unit of state.units) {
    processUnitCombat(state, unit)
  }

  // Callout triggers
  const alliedBase = getBase(state.battlefield, 'player')
  const dangerMsg = checkBaseDanger(state.config.partner.id, alliedBase)
  if (dangerMsg) enqueue(state.calloutQueue, dangerMsg)

  const enemyUnits = getAliveUnits(state.units, 'enemy')
  const heavyMsg = checkHeavyEnemy(state.config.partner.id, enemyUnits)
  if (heavyMsg) enqueue(state.calloutQueue, heavyMsg)

  // Update callout queue
  updateCalloutQueue(state.calloutQueue, state.dt)

  checkWinCondition(state)
}

function createCoopWattState(): WattState {
  return { current: WATT_INITIAL }
}

export function createCoopBattle(config: CoopBattleConfig): CoopBattleEngine {
  resetUnitIdCounter()

  const partnerDerived: [BuildDerived, BuildDerived, BuildDerived] = [
    calculateBuildDerived(config.partner.roster[0]),
    calculateBuildDerived(config.partner.roster[1]),
    calculateBuildDerived(config.partner.roster[2]),
  ]

  const calloutQueue = createCalloutQueue()
  enqueue(calloutQueue, getBattleStartCallout(config.partner.id))

  const state: InternalCoopState = {
    elapsed: 0,
    dt: 1 / config.ticksPerSecond,
    battlefield: createCoopBattlefield(config.baseHp, config.enemyBaseHp),
    units: [],
    playerWatt: createCoopWattState(),
    partnerWatt: createCoopWattState(),
    enemyWatt: createWattState(),
    playerSkillSystem: createSkillSystem(config.playerDeck),
    partnerAI: createPartnerAI(config.partner),
    calloutQueue,
    calloutTriggers: createCalloutTriggerState(),
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
    partnerDerived,
    enemyDerived: [
      calculateBuildDerived(config.enemyRoster[0]),
      calculateBuildDerived(config.enemyRoster[1]),
      calculateBuildDerived(config.enemyRoster[2]),
    ],
    playerBuildStats: [createBuildStats(), createBuildStats(), createBuildStats()],
    partnerBuildStats: [createBuildStats(), createBuildStats(), createBuildStats()],
    enemyBuildStats: [createBuildStats(), createBuildStats(), createBuildStats()],
    result: null,
    lastPlayerSkillTime: -999,
    lastPartnerSkillTime: -999,
    rng: createRng(config.seed),
    config,
  }

  return {
    tick(): void {
      tickCoopInternal(state)
    },
    getState(): CoopBattleState {
      const comboActive =
        state.lastPlayerSkillTime > 0 &&
        state.lastPartnerSkillTime > 0 &&
        Math.abs(state.lastPlayerSkillTime - state.lastPartnerSkillTime) < COMBO_WINDOW

      return {
        elapsedSeconds: state.elapsed,
        battlefield: state.battlefield,
        units: state.units,
        playerWatt: state.playerWatt,
        partnerWatt: state.partnerWatt,
        enemyWatt: state.enemyWatt,
        playerSkillSystem: state.playerSkillSystem,
        partnerAI: state.partnerAI,
        calloutQueue: state.calloutQueue,
        playerBuildStats: state.playerBuildStats,
        partnerBuildStats: state.partnerBuildStats,
        enemyBuildStats: state.enemyBuildStats,
        result: state.result,
        comboActive,
      }
    },
    activateSkill(skillIndex: number): boolean {
      return doActivatePlayerSkill(state, skillIndex)
    },
    isFinished(): boolean {
      return state.result !== null
    },
  }
}
