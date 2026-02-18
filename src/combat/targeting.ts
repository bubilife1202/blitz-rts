import type { RngState } from '../utils/rng'
import { nextFloat } from '../utils/rng'
import type { BattleUnit } from './unit'
import { isAlive, isInRange } from './unit'

export function findTarget(
  attacker: BattleUnit,
  enemies: readonly BattleUnit[],
  scrambled: boolean,
  focusTargetId: number | null,
  rng: RngState,
): BattleUnit | null {
  const inRange = enemies.filter(e => isAlive(e) && isInRange(attacker, e))
  if (inRange.length === 0) return null

  if (scrambled) {
    const idx = Math.floor(nextFloat(rng) * inRange.length)
    return inRange[idx] ?? null
  }

  if (focusTargetId !== null) {
    const focused = inRange.find(e => e.id === focusTargetId)
    if (focused) return focused
  }

  return findByWeaponSpecial(attacker, inRange)
}

function findByWeaponSpecial(
  attacker: BattleUnit,
  inRange: readonly BattleUnit[],
): BattleUnit | null {
  if (inRange.length === 0) return null

  const special = attacker.weaponSpecial
  switch (special.kind) {
    case 'vulcan-armor-pierce':
    case 'none':
      return findClosest(attacker, inRange)
    case 'sniper-farthest':
      return findFarthest(attacker, inRange)
    case 'missile-splash':
      return findMostClustered(inRange, special.splashRange)
    case 'hammer-true-damage':
      return findHighestHp(inRange)
  }
}

function findClosest(
  attacker: BattleUnit,
  targets: readonly BattleUnit[],
): BattleUnit {
  let best = targets[0]!
  let bestDist = Math.abs(attacker.position - best.position)
  for (let i = 1; i < targets.length; i++) {
    const dist = Math.abs(attacker.position - targets[i]!.position)
    if (dist < bestDist) {
      bestDist = dist
      best = targets[i]!
    }
  }
  return best
}

function findFarthest(
  attacker: BattleUnit,
  targets: readonly BattleUnit[],
): BattleUnit {
  let best = targets[0]!
  let bestDist = Math.abs(attacker.position - best.position)
  for (let i = 1; i < targets.length; i++) {
    const dist = Math.abs(attacker.position - targets[i]!.position)
    if (dist > bestDist) {
      bestDist = dist
      best = targets[i]!
    }
  }
  return best
}

function findMostClustered(
  targets: readonly BattleUnit[],
  splashRange: number,
): BattleUnit {
  let best = targets[0]!
  let bestCount = 0
  for (const candidate of targets) {
    let count = 0
    for (const other of targets) {
      if (Math.abs(candidate.position - other.position) <= splashRange) {
        count++
      }
    }
    if (count > bestCount) {
      bestCount = count
      best = candidate
    }
  }
  return best
}

function findHighestHp(targets: readonly BattleUnit[]): BattleUnit {
  let best = targets[0]!
  for (let i = 1; i < targets.length; i++) {
    if (targets[i]!.hp > best.hp) {
      best = targets[i]!
    }
  }
  return best
}

export function getUnitsInSplashRange(
  centerPosition: number,
  units: readonly BattleUnit[],
  splashRange: number,
): readonly BattleUnit[] {
  return units.filter(
    u => isAlive(u) && Math.abs(u.position - centerPosition) <= splashRange,
  )
}
