import type { LegsMoveType } from '../core/types'
import type { BattleUnit } from '../combat/unit'
import { isAlive } from '../combat/unit'

const SYNERGY_ATTACK_BONUS = 0.05

export interface TeamSynergyResult {
  readonly sharedMoveTypes: readonly LegsMoveType[]
  readonly attackMultiplier: number
}

export function calculateTeamSynergy(
  playerUnits: readonly BattleUnit[],
  partnerUnits: readonly BattleUnit[],
): TeamSynergyResult {
  const playerMoveTypes = new Set<LegsMoveType>()
  const partnerMoveTypes = new Set<LegsMoveType>()

  for (const u of playerUnits) {
    if (isAlive(u)) playerMoveTypes.add(u.moveType)
  }
  for (const u of partnerUnits) {
    if (isAlive(u)) partnerMoveTypes.add(u.moveType)
  }

  const shared: LegsMoveType[] = []
  for (const mt of playerMoveTypes) {
    if (partnerMoveTypes.has(mt)) shared.push(mt)
  }

  return {
    sharedMoveTypes: shared,
    attackMultiplier: shared.length > 0 ? 1 + SYNERGY_ATTACK_BONUS : 1,
  }
}

export function applySynergyBonus(
  unit: BattleUnit,
  synergy: TeamSynergyResult,
): number {
  if (synergy.sharedMoveTypes.includes(unit.moveType)) {
    return unit.attack * synergy.attackMultiplier
  }
  return unit.attack
}
