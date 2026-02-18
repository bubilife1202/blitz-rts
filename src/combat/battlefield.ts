import {
  BASE_DEFENSE,
  BASE_HP,
  BATTLEFIELD_TILES,
  UNIT_CAP_PER_SIDE,
} from '../core/types'

export type Side = 'player' | 'enemy'

export interface Base {
  hp: number
  readonly maxHp: number
  readonly defense: number
}

export interface BattlefieldState {
  readonly tiles: number
  readonly playerBase: Base
  readonly enemyBase: Base
  readonly unitCapPerSide: number
}

export function createBattlefield(): BattlefieldState {
  return {
    tiles: BATTLEFIELD_TILES,
    playerBase: { hp: BASE_HP, maxHp: BASE_HP, defense: BASE_DEFENSE },
    enemyBase: { hp: BASE_HP, maxHp: BASE_HP, defense: BASE_DEFENSE },
    unitCapPerSide: UNIT_CAP_PER_SIDE,
  }
}

export function getBasePosition(side: Side): number {
  return side === 'player' ? 0 : BATTLEFIELD_TILES + 1
}

export function getSpawnPosition(side: Side): number {
  return side === 'player' ? 1 : BATTLEFIELD_TILES
}

export function getEnemySide(side: Side): Side {
  return side === 'player' ? 'enemy' : 'player'
}

export function getBase(battlefield: BattlefieldState, side: Side): Base {
  return side === 'player' ? battlefield.playerBase : battlefield.enemyBase
}

export function damageBase(base: Base, damage: number): void {
  base.hp = Math.max(0, base.hp - damage)
}

export function isBaseDestroyed(base: Base): boolean {
  return base.hp <= 0
}
