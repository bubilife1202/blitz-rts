import { describe, it, expect } from 'vitest'
import { createPartnerAI, updatePartnerAI } from '../src/coop/partner-ai'
import type { PartnerBattleView } from '../src/coop/partner-ai'
import { KAI_7, MIRA_3, LUNA_5, ALL_PARTNERS, getPartnerById } from '../src/coop/partner-data'

describe('PartnerData', () => {
  it('has 4 partners', () => {
    expect(ALL_PARTNERS).toHaveLength(4)
  })

  it('all partners have valid rosters', () => {
    for (const partner of ALL_PARTNERS) {
      expect(partner.roster).toHaveLength(3)
      expect(partner.ratios).toHaveLength(3)
      expect(partner.preferredSkills).toHaveLength(3)
    }
  })

  it('getPartnerById finds all partners', () => {
    expect(getPartnerById('vanguard').name).toBe('KAI-7')
    expect(getPartnerById('bastion').name).toBe('MIRA-3')
    expect(getPartnerById('artillery').name).toBe('ZERO-9')
    expect(getPartnerById('support').name).toBe('LUNA-5')
  })

  it('throws for unknown partner', () => {
    expect(() => getPartnerById('nonexistent' as any)).toThrow()
  })
})

describe('PartnerAI', () => {
  function makeView(overrides?: Partial<PartnerBattleView>): PartnerBattleView {
    return {
      partnerUnits: [],
      enemyUnits: [],
      alliedBase: { hp: 3000, maxHp: 3000, defense: 10 },
      partnerDerived: [
        { core: { hp: 300, defense: 5, attack: 50, range: 3, fireRate: 1, speed: 6, tilesPerSecond: 1, loadCapacity: 200, sight: 5, moveType: 'humanoid', mountType: 'arm', weaponSpecial: { kind: 'none' } }, cost: { weight: 100, baseWattCost: 100, finalWattCost: 100, wattTier: 'T2' } },
        { core: { hp: 300, defense: 5, attack: 50, range: 3, fireRate: 1, speed: 6, tilesPerSecond: 1, loadCapacity: 200, sight: 5, moveType: 'humanoid', mountType: 'arm', weaponSpecial: { kind: 'none' } }, cost: { weight: 100, baseWattCost: 100, finalWattCost: 100, wattTier: 'T2' } },
        { core: { hp: 300, defense: 5, attack: 50, range: 3, fireRate: 1, speed: 6, tilesPerSecond: 1, loadCapacity: 200, sight: 5, moveType: 'humanoid', mountType: 'arm', weaponSpecial: { kind: 'none' } }, cost: { weight: 100, baseWattCost: 100, finalWattCost: 100, wattTier: 'T2' } },
      ],
      unitCap: 10,
      elapsedSeconds: 30,
      playerUsedSkillRecently: false,
      ...overrides,
    }
  }

  it('creates partner AI with correct personality', () => {
    const ai = createPartnerAI(LUNA_5)
    expect(ai.personality).toBe(LUNA_5)
    expect(ai.sp.current).toBe(30)
    expect(ai.cooldowns).toHaveLength(3)
  })

  it('produces units when watt is available', () => {
    const ai = createPartnerAI(LUNA_5)
    const watt = { current: 500 }
    const view = makeView()
    const result = updatePartnerAI(ai, watt, view, 0.05)
    const produceActions = result.actions.filter(a => a.kind === 'produce')
    expect(produceActions.length).toBeGreaterThan(0)
    expect(result.watt.current).toBeLessThan(500)
  })

  it('does not produce when at unit cap', () => {
    const ai = createPartnerAI(LUNA_5)
    const watt = { current: 500 }
    // Create 10 alive units
    const aliveUnits = Array.from({ length: 10 }, (_, i) => ({
      id: i, side: 'player' as const, buildIndex: 0 as const, position: 5,
      hp: 100, maxHp: 100, speed: 5, tilesPerSecond: 1, defense: 5,
      attack: 50, range: 3, fireRate: 1, moveType: 'humanoid' as const,
      mountType: 'arm' as const, weaponSpecial: { kind: 'none' as const },
      wattCost: 100, state: 'moving' as const, attackCooldown: 0, currentTargetId: null,
    }))
    const view = makeView({ partnerUnits: aliveUnits })
    const result = updatePartnerAI(ai, watt, view, 0.05)
    const produceActions = result.actions.filter(a => a.kind === 'produce')
    expect(produceActions.length).toBe(0)
  })

  it('regenerates SP over time', () => {
    const ai = createPartnerAI(KAI_7)
    ai.sp.current = 50
    const watt = { current: 0 }
    updatePartnerAI(ai, watt, makeView(), 1)
    expect(ai.sp.current).toBeGreaterThan(50)
  })

  it('different personalities have different aggressiveness', () => {
    expect(KAI_7.aggressiveness).toBeGreaterThan(MIRA_3.aggressiveness)
  })
})
