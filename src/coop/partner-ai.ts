import type { BuildDerived, RosterIndex, SkillName } from '../core/types'
import type { WattState } from '../combat/watt'
import { spendWatt } from '../combat/watt'
import type { SpState, SkillCooldownState } from '../combat/skills'
import { getSkillDefinition } from '../combat/skills'
import type { Base } from '../combat/battlefield'
import type { BattleUnit } from '../combat/unit'
import { isAlive } from '../combat/unit'
import type { PartnerPersonality } from './types'

export interface PartnerAIState {
  readonly personality: PartnerPersonality
  readonly productionSequence: readonly RosterIndex[]
  productionIndex: number
  readonly sp: SpState
  readonly cooldowns: SkillCooldownState[]
  lastSkillTime: number
  lastBaseHpRatio: number
}

export interface PartnerBattleView {
  readonly partnerUnits: readonly BattleUnit[]
  readonly enemyUnits: readonly BattleUnit[]
  readonly alliedBase: Base
  readonly partnerDerived: readonly [BuildDerived, BuildDerived, BuildDerived]
  readonly unitCap: number
  readonly elapsedSeconds: number
  readonly playerUsedSkillRecently: boolean
}

export type PartnerAction =
  | {
      readonly kind: 'produce'
      readonly buildIndex: RosterIndex
      readonly cost: number
    }
  | {
      readonly kind: 'skill'
      readonly skillIndex: number
      readonly skillName: SkillName
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

export function createPartnerAI(personality: PartnerPersonality): PartnerAIState {
  return {
    personality,
    productionSequence: buildProductionSequence(personality.ratios),
    productionIndex: 0,
    sp: { current: 30 },
    cooldowns: [
      { name: personality.preferredSkills[0], remainingCooldown: 0 },
      { name: personality.preferredSkills[1], remainingCooldown: 0 },
      { name: personality.preferredSkills[2], remainingCooldown: 0 },
    ],
    lastSkillTime: -999,
    lastBaseHpRatio: 1,
  }
}

function countAlivePartnerUnits(units: readonly BattleUnit[]): number {
  let count = 0
  for (const u of units) {
    if (isAlive(u)) count++
  }
  return count
}

function canAffordSkill(sp: SpState, skillIndex: number, cooldowns: SkillCooldownState[]): boolean {
  const cd = cooldowns[skillIndex]
  if (!cd) return false
  if (cd.remainingCooldown > 0) return false
  const def = getSkillDefinition(cd.name)
  return sp.current >= def.spCost
}

function shouldUseSkill(
  ai: PartnerAIState,
  view: PartnerBattleView,
  skillIndex: number,
): boolean {
  if (!canAffordSkill(ai.sp, skillIndex, ai.cooldowns)) return false

  const baseHpRatio = view.alliedBase.hp / view.alliedBase.maxHp
  const hasEnemies = view.enemyUnits.some(u => isAlive(u))
  const timeSinceLastSkill = view.elapsedSeconds - ai.lastSkillTime

  // Minimum 5 seconds between partner skill uses
  if (timeSinceLastSkill < 5) return false

  switch (ai.personality.skillTiming) {
    case 'proactive':
      // Use skills when SP is high enough and enemies are present
      return ai.sp.current >= 60 && hasEnemies

    case 'reactive':
      // Use skills when base HP drops or player just used a skill
      if (baseHpRatio < 0.5) return true
      if (baseHpRatio < ai.lastBaseHpRatio - 0.1) return true
      if (view.playerUsedSkillRecently) return true
      return false

    case 'balanced':
      // Mix: use if SP is full, or reactively if base is threatened
      if (ai.sp.current >= 80 && hasEnemies) return true
      if (baseHpRatio < 0.4) return true
      if (view.playerUsedSkillRecently && ai.sp.current >= 50) return true
      return false
  }
}

function pickSkillIndex(ai: PartnerAIState, view: PartnerBattleView): number | null {
  // Try skills in order of preference
  for (let i = 0; i < 3; i++) {
    if (shouldUseSkill(ai, view, i)) return i
  }
  return null
}

function shouldProduce(ai: PartnerAIState, watt: WattState): boolean {
  // More aggressive partners spend watt sooner (lower threshold)
  const threshold = (1 - ai.personality.aggressiveness) * 100
  return watt.current >= threshold
}

export function updatePartnerAI(
  ai: PartnerAIState,
  watt: WattState,
  view: PartnerBattleView,
  dt: number,
): { watt: WattState; actions: readonly PartnerAction[] } {
  const actions: PartnerAction[] = []
  let currentWatt = watt

  // Update cooldowns
  for (const cd of ai.cooldowns) {
    if (cd.remainingCooldown > 0) {
      cd.remainingCooldown = Math.max(0, cd.remainingCooldown - dt)
    }
  }

  // Regen SP (partner uses COOP_SP_REGEN = 4/s)
  ai.sp.current = Math.min(100, ai.sp.current + 4 * dt)

  // Check if partner should use a skill
  const skillIndex = pickSkillIndex(ai, view)
  if (skillIndex !== null) {
    const cd = ai.cooldowns[skillIndex]!
    const def = getSkillDefinition(cd.name)
    ai.sp.current -= def.spCost
    cd.remainingCooldown = def.cooldownSeconds
    ai.lastSkillTime = view.elapsedSeconds
    actions.push({ kind: 'skill', skillIndex, skillName: cd.name })
  }

  // Track base HP changes
  ai.lastBaseHpRatio = view.alliedBase.hp / view.alliedBase.maxHp

  // Production: try to produce units up to cap
  const aliveCount = countAlivePartnerUnits(view.partnerUnits)
  let produced = aliveCount

  if (shouldProduce(ai, currentWatt) && ai.productionSequence.length > 0) {
    while (produced < view.unitCap) {
      const buildIndex = ai.productionSequence[ai.productionIndex]!
      const cost = view.partnerDerived[buildIndex].cost.finalWattCost
      const result = spendWatt(currentWatt, cost)
      if (!result.ok) break

      currentWatt = result.state
      actions.push({ kind: 'produce', buildIndex, cost })
      ai.productionIndex = (ai.productionIndex + 1) % ai.productionSequence.length
      produced++
    }
  }

  return { watt: currentWatt, actions }
}
