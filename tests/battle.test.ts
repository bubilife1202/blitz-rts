import { describe, it, expect } from 'vitest'
import { createBattle } from '../src/combat/battle'
import type { BattleConfig } from '../src/combat/battle'

function makeConfig(overrides?: Partial<BattleConfig>): BattleConfig {
  return {
    playerRoster: [
      { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: null },
      { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: null },
      { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: null },
    ],
    playerRatios: [1, 1, 1],
    playerDeck: ['Shield Burst', 'EMP Strike', 'Overcharge'],
    enemyRoster: [
      { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: null },
      { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: null },
      { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: null },
    ],
    enemyRatios: [1, 1, 1],
    seed: 12345,
    ticksPerSecond: 20,
    timeLimitSeconds: 300,
    ...overrides,
  }
}

describe('BattleEngine', () => {
  it('creates battle engine', () => {
    const engine = createBattle(makeConfig())
    expect(engine).toBeDefined()
    expect(engine.isFinished()).toBe(false)
  })

  it('initial state has correct structure', () => {
    const engine = createBattle(makeConfig())
    const state = engine.getState()
    expect(state.elapsedSeconds).toBe(0)
    expect(state.battlefield).toBeDefined()
    expect(state.units).toBeDefined()
    expect(state.playerWatt).toBeDefined()
    expect(state.enemyWatt).toBeDefined()
    expect(state.skillSystem).toBeDefined()
    expect(state.result).toBeNull()
  })

  it('tick advances time', () => {
    const engine = createBattle(makeConfig())
    engine.tick()
    const state = engine.getState()
    expect(state.elapsedSeconds).toBeCloseTo(0.05, 5) // 1/20
  })

  it('units get produced over time', () => {
    const engine = createBattle(makeConfig())
    for (let i = 0; i < 100; i++) engine.tick()
    const state = engine.getState()
    expect(state.units.length).toBeGreaterThan(0)
  })

  it('battle finishes within time limit', () => {
    const engine = createBattle(makeConfig({ timeLimitSeconds: 10 }))
    for (let i = 0; i < 10 * 20 + 10; i++) {
      if (engine.isFinished()) break
      engine.tick()
    }
    expect(engine.isFinished()).toBe(true)
    expect(engine.getState().result).not.toBeNull()
  })

  it('activateSkill uses SP and starts cooldown', () => {
    const engine = createBattle(makeConfig())
    const before = engine.getState().skillSystem.sp.current
    const success = engine.activateSkill(0)
    expect(success).toBe(true)
    const after = engine.getState().skillSystem.sp.current
    expect(after).toBeLessThan(before)
    expect(engine.getState().skillSystem.cooldowns[0]!.remainingCooldown).toBeGreaterThan(0)
  })

  it('activateSkill fails when on cooldown', () => {
    const engine = createBattle(makeConfig())
    engine.activateSkill(0) // first use
    const success = engine.activateSkill(0) // should fail
    expect(success).toBe(false)
  })

  it('battle result has valid outcome', () => {
    const engine = createBattle(makeConfig({ timeLimitSeconds: 5 }))
    while (!engine.isFinished()) engine.tick()
    const result = engine.getState().result!
    expect(['player_win', 'enemy_win', 'draw']).toContain(result.outcome)
    expect(result.elapsedSeconds).toBeGreaterThan(0)
  })
})
