import type {
  BuildDerived,
  LegsMoveType,
  MountType,
  RosterIndex,
  WeaponSpecial,
} from '../core/types'
import { BATTLEFIELD_TILES } from '../core/types'
import type { Side } from './battlefield'
import { getSpawnPosition } from './battlefield'

export type UnitState = 'moving' | 'attacking' | 'dead'

export interface BattleUnit {
  readonly id: number
  readonly side: Side
  readonly buildIndex: RosterIndex
  position: number
  hp: number
  readonly maxHp: number
  readonly speed: number
  readonly tilesPerSecond: number
  readonly defense: number
  readonly attack: number
  readonly range: number
  readonly fireRate: number
  readonly moveType: LegsMoveType
  readonly mountType: MountType
  readonly weaponSpecial: WeaponSpecial
  readonly wattCost: number
  state: UnitState
  attackCooldown: number
  currentTargetId: number | null
}

let nextUnitId = 1

export function resetUnitIdCounter(): void {
  nextUnitId = 1
}

export function createUnit(
  side: Side,
  buildIndex: RosterIndex,
  derived: BuildDerived,
): BattleUnit {
  const { core, cost } = derived
  return {
    id: nextUnitId++,
    side,
    buildIndex,
    position: getSpawnPosition(side),
    hp: core.hp,
    maxHp: core.hp,
    speed: core.speed,
    tilesPerSecond: core.tilesPerSecond,
    defense: core.defense,
    attack: core.attack,
    range: core.range,
    fireRate: core.fireRate,
    moveType: core.moveType,
    mountType: core.mountType,
    weaponSpecial: core.weaponSpecial,
    wattCost: cost.finalWattCost,
    state: 'moving',
    attackCooldown: 0,
    currentTargetId: null,
  }
}

export function isAlive(unit: BattleUnit): boolean {
  return unit.state !== 'dead'
}

export function moveUnit(unit: BattleUnit, dt: number): void {
  if (unit.state !== 'moving') return
  const direction = unit.side === 'player' ? 1 : -1
  unit.position += unit.tilesPerSecond * dt * direction
  unit.position = Math.max(1, Math.min(BATTLEFIELD_TILES, unit.position))
}

export function applyDamage(unit: BattleUnit, damage: number): void {
  if (unit.state === 'dead') return
  unit.hp = Math.max(0, unit.hp - damage)
  if (unit.hp <= 0) {
    unit.state = 'dead'
  }
}

export function isInRange(attacker: BattleUnit, target: BattleUnit): boolean {
  return Math.abs(attacker.position - target.position) <= attacker.range
}

export function isBaseInRange(unit: BattleUnit, basePosition: number): boolean {
  return Math.abs(unit.position - basePosition) <= unit.range
}

export function getDistanceTo(a: BattleUnit, b: BattleUnit): number {
  return Math.abs(a.position - b.position)
}
