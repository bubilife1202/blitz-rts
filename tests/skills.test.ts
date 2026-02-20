import { describe, it, expect } from 'vitest'
import {
  createSkillSystem,
  canUseSkill,
  regenSp,
  spendSp,
  startCooldown,
  addActiveEffect,
  removeActiveEffect,
  hasActiveEffect,
  updateEffects,
  updateCooldowns,
  getSkillDefinition,
  getWattRegenMultiplier,
  getDefenseBuffBonus,
  getFireRateMultiplier,
  getFocusFireTarget,
} from '../src/combat/skills'
import type { SkillDeck } from '../src/core/types'

const TEST_DECK: SkillDeck = ['Shield Burst', 'EMP Strike', 'Overcharge']

describe('SkillSystem', () => {
  it('creates with initial SP and deck', () => {
    const sys = createSkillSystem(TEST_DECK)
    expect(sys.sp.current).toBe(30)
    expect(sys.deck).toEqual(TEST_DECK)
    expect(sys.cooldowns).toHaveLength(3)
    expect(sys.activeEffects).toHaveLength(0)
  })

  it('canUseSkill returns true when ready and has SP', () => {
    const sys = createSkillSystem(TEST_DECK)
    expect(canUseSkill(sys, 0)).toBe(true)
  })

  it('canUseSkill returns false when on cooldown', () => {
    const sys = createSkillSystem(TEST_DECK)
    startCooldown(sys, 0)
    expect(canUseSkill(sys, 0)).toBe(false)
  })

  it('canUseSkill returns false when not enough SP', () => {
    const sys = createSkillSystem(TEST_DECK)
    sys.sp.current = 0
    expect(canUseSkill(sys, 0)).toBe(false)
  })

  it('regenSp increases SP', () => {
    const sys = createSkillSystem(TEST_DECK)
    sys.sp.current = 10
    regenSp(sys.sp, 1)
    expect(sys.sp.current).toBeGreaterThan(10)
  })

  it('regenSp caps at max', () => {
    const sys = createSkillSystem(TEST_DECK)
    sys.sp.current = 99
    regenSp(sys.sp, 10)
    expect(sys.sp.current).toBe(100)
  })

  it('spendSp deducts', () => {
    const sys = createSkillSystem(TEST_DECK)
    spendSp(sys.sp, 20)
    expect(sys.sp.current).toBe(10)
  })

  it('cooldowns decrease over time', () => {
    const sys = createSkillSystem(TEST_DECK)
    startCooldown(sys, 0)
    const initial = sys.cooldowns[0]!.remainingCooldown
    updateCooldowns(sys, 5)
    expect(sys.cooldowns[0]!.remainingCooldown).toBe(initial - 5)
  })

  it('cooldowns floor at zero', () => {
    const sys = createSkillSystem(TEST_DECK)
    startCooldown(sys, 0)
    updateCooldowns(sys, 999)
    expect(sys.cooldowns[0]!.remainingCooldown).toBe(0)
  })
})

describe('ActiveEffects', () => {
  it('adds and checks effects', () => {
    const sys = createSkillSystem(TEST_DECK)
    expect(hasActiveEffect(sys, 'freeze-enemies')).toBe(false)
    addActiveEffect(sys, { kind: 'freeze-enemies', remainingDuration: 5 })
    expect(hasActiveEffect(sys, 'freeze-enemies')).toBe(true)
  })

  it('removes effects', () => {
    const sys = createSkillSystem(TEST_DECK)
    addActiveEffect(sys, { kind: 'freeze-enemies', remainingDuration: 5 })
    removeActiveEffect(sys, 'freeze-enemies')
    expect(hasActiveEffect(sys, 'freeze-enemies')).toBe(false)
  })

  it('effects expire with updateEffects', () => {
    const sys = createSkillSystem(TEST_DECK)
    addActiveEffect(sys, { kind: 'invincible-allies', remainingDuration: 2 })
    updateEffects(sys, 3)
    expect(sys.activeEffects).toHaveLength(0)
  })

  it('replaces duplicate effect kind', () => {
    const sys = createSkillSystem(TEST_DECK)
    addActiveEffect(sys, { kind: 'freeze-enemies', remainingDuration: 5 })
    addActiveEffect(sys, { kind: 'freeze-enemies', remainingDuration: 10 })
    expect(sys.activeEffects).toHaveLength(1)
    expect(sys.activeEffects[0]!.remainingDuration).toBe(10)
  })

  it('getWattRegenMultiplier returns default 1', () => {
    const sys = createSkillSystem(TEST_DECK)
    expect(getWattRegenMultiplier(sys)).toBe(1)
  })

  it('getWattRegenMultiplier returns boost when active', () => {
    const sys = createSkillSystem(TEST_DECK)
    addActiveEffect(sys, { kind: 'watt-regen-multiplier', remainingDuration: 5, multiplier: 2 })
    expect(getWattRegenMultiplier(sys)).toBe(2)
  })

  it('getDefenseBuffBonus returns 0 by default', () => {
    const sys = createSkillSystem(TEST_DECK)
    expect(getDefenseBuffBonus(sys)).toBe(0)
  })

  it('getDefenseBuffBonus returns bonus when active', () => {
    const sys = createSkillSystem(TEST_DECK)
    addActiveEffect(sys, { kind: 'defense-buff', remainingDuration: 5, defenseBonus: 10 })
    expect(getDefenseBuffBonus(sys)).toBe(10)
  })

  it('getFireRateMultiplier returns 1 by default', () => {
    const sys = createSkillSystem(TEST_DECK)
    expect(getFireRateMultiplier(sys)).toBe(1)
  })

  it('getFocusFireTarget returns null by default', () => {
    const sys = createSkillSystem(TEST_DECK)
    expect(getFocusFireTarget(sys)).toBeNull()
  })

  it('getFocusFireTarget returns id when active', () => {
    const sys = createSkillSystem(TEST_DECK)
    addActiveEffect(sys, { kind: 'focus-fire', remainingDuration: 5, focusTargetId: 42 })
    expect(getFocusFireTarget(sys)).toBe(42)
  })
})

describe('SkillDefinitions', () => {
  const ALL_SKILLS: readonly string[] = [
    'Shield Burst', 'EMP Strike', 'Overcharge', 'Repair Pulse', 'Scramble', 'Focus Fire',
    'Artillery Barrage', 'Fortify', 'Overdrive Protocol', 'Decoy Deployment', 'Emergency Recall', 'Watt Surge',
  ]

  it('all 12 skills are defined', () => {
    for (const name of ALL_SKILLS) {
      expect(() => getSkillDefinition(name as any)).not.toThrow()
    }
  })

  it('all skills have positive SP cost and cooldown', () => {
    for (const name of ALL_SKILLS) {
      const def = getSkillDefinition(name as any)
      expect(def.spCost).toBeGreaterThan(0)
      expect(def.cooldownSeconds).toBeGreaterThan(0)
    }
  })
})
