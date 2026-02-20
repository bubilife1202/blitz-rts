import { describe, it, expect } from 'vitest'
import {
  createBattlefield,
  createCoopBattlefield,
  damageBase,
  isBaseDestroyed,
  getBase,
  getBasePosition,
  getSpawnPosition,
  getEnemySide,
} from '../src/combat/battlefield'

describe('Battlefield', () => {
  it('creates standard battlefield', () => {
    const bf = createBattlefield()
    expect(bf.tiles).toBe(30)
    expect(bf.playerBase.hp).toBe(2000)
    expect(bf.enemyBase.hp).toBe(2000)
    expect(bf.unitCapPerSide).toBe(15)
  })

  it('creates coop battlefield with custom HP', () => {
    const bf = createCoopBattlefield(3000, 5000)
    expect(bf.playerBase.hp).toBe(3000)
    expect(bf.playerBase.maxHp).toBe(3000)
    expect(bf.enemyBase.hp).toBe(5000)
    expect(bf.enemyBase.maxHp).toBe(5000)
    expect(bf.unitCapPerSide).toBe(20)
  })

  it('creates coop battlefield with defaults', () => {
    const bf = createCoopBattlefield()
    expect(bf.playerBase.hp).toBe(3000)
    expect(bf.enemyBase.hp).toBe(3000)
  })

  it('damages base', () => {
    const bf = createBattlefield()
    damageBase(bf.playerBase, 500)
    expect(bf.playerBase.hp).toBe(1500)
  })

  it('base HP does not go below 0', () => {
    const bf = createBattlefield()
    damageBase(bf.playerBase, 9999)
    expect(bf.playerBase.hp).toBe(0)
  })

  it('isBaseDestroyed detects zero HP', () => {
    const bf = createBattlefield()
    expect(isBaseDestroyed(bf.playerBase)).toBe(false)
    damageBase(bf.playerBase, 9999)
    expect(isBaseDestroyed(bf.playerBase)).toBe(true)
  })

  it('getBase returns correct base', () => {
    const bf = createBattlefield()
    expect(getBase(bf, 'player')).toBe(bf.playerBase)
    expect(getBase(bf, 'enemy')).toBe(bf.enemyBase)
  })

  it('getBasePosition returns correct positions', () => {
    expect(getBasePosition('player')).toBe(0)
    expect(getBasePosition('enemy')).toBe(31)
  })

  it('getSpawnPosition returns correct positions', () => {
    expect(getSpawnPosition('player')).toBe(1)
    expect(getSpawnPosition('enemy')).toBe(30)
  })

  it('getEnemySide returns opposite', () => {
    expect(getEnemySide('player')).toBe('enemy')
    expect(getEnemySide('enemy')).toBe('player')
  })
})
