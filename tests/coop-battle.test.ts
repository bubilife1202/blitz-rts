import { describe, it, expect } from 'vitest'
import { createCoopBattle } from '../src/coop/coop-battle'
import type { CoopBattleConfig } from '../src/coop/coop-battle'
import { LUNA_5 } from '../src/coop/partner-data'

function makeCoopConfig(overrides?: Partial<CoopBattleConfig>): CoopBattleConfig {
  return {
    playerRoster: [
      { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: null },
      { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: null },
      { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: null },
    ],
    playerRatios: [1, 1, 1],
    playerDeck: ['Shield Burst', 'EMP Strike', 'Overcharge'],
    partner: LUNA_5,
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

describe('CoopBattleEngine', () => {
  it('creates coop battle', () => {
    const engine = createCoopBattle(makeCoopConfig())
    expect(engine).toBeDefined()
    expect(engine.isFinished()).toBe(false)
  })

  it('initial state has coop-specific fields', () => {
    const engine = createCoopBattle(makeCoopConfig())
    const state = engine.getState()
    expect(state.playerWatt).toBeDefined()
    expect(state.partnerWatt).toBeDefined()
    expect(state.enemyWatt).toBeDefined()
    expect(state.playerSkillSystem).toBeDefined()
    expect(state.partnerAI).toBeDefined()
    expect(state.calloutQueue).toBeDefined()
    expect(state.comboActive).toBe(false)
    expect(state.result).toBeNull()
  })

  it('has shared base with coop HP', () => {
    const engine = createCoopBattle(makeCoopConfig({ baseHp: 4000 }))
    const state = engine.getState()
    expect(state.battlefield.playerBase.hp).toBe(4000)
    expect(state.battlefield.playerBase.maxHp).toBe(4000)
  })

  it('tick advances time', () => {
    const engine = createCoopBattle(makeCoopConfig())
    engine.tick()
    expect(engine.getState().elapsedSeconds).toBeCloseTo(0.05, 5)
  })

  it('partner AI produces units', () => {
    const engine = createCoopBattle(makeCoopConfig())
    for (let i = 0; i < 200; i++) engine.tick()
    const state = engine.getState()
    const partnerStats = state.partnerBuildStats
    const totalProduced = partnerStats[0].unitsProduced + partnerStats[1].unitsProduced + partnerStats[2].unitsProduced
    expect(totalProduced).toBeGreaterThan(0)
  })

  it('player can activate skills', () => {
    const engine = createCoopBattle(makeCoopConfig())
    const success = engine.activateSkill(0)
    expect(success).toBe(true)
    expect(engine.getState().playerSkillSystem.cooldowns[0]!.remainingCooldown).toBeGreaterThan(0)
  })

  it('battle finishes within time limit', () => {
    const engine = createCoopBattle(makeCoopConfig({ timeLimitSeconds: 10 }))
    for (let i = 0; i < 10 * 20 + 10; i++) {
      if (engine.isFinished()) break
      engine.tick()
    }
    expect(engine.isFinished()).toBe(true)
    const result = engine.getState().result!
    expect(['player_win', 'enemy_win', 'draw']).toContain(result.outcome)
  })

  it('callout queue gets messages', () => {
    const engine = createCoopBattle(makeCoopConfig())
    // Battle start callout should be enqueued
    const state = engine.getState()
    expect(state.calloutQueue.pending.length + (state.calloutQueue.active ? 1 : 0)).toBeGreaterThan(0)
  })
})
