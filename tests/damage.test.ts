import { describe, it, expect } from 'vitest'
import { calculateDps, getWeaponHitProfile } from '../src/combat/damage'
import type { WeaponSpecial } from '../src/core/types'

describe('calculateDps', () => {
  it('calculates DPS for basic weapon', () => {
    const dps = calculateDps({
      attack: 100,
      fireRate: 2,
      targetDefense: 10,
      targetMaxHp: 500,
      special: { kind: 'none' },
    })
    expect(dps).toBeGreaterThan(0)
  })

  it('higher defense reduces DPS', () => {
    const low = calculateDps({
      attack: 100, fireRate: 2, targetDefense: 10, targetMaxHp: 500,
      special: { kind: 'none' },
    })
    const high = calculateDps({
      attack: 100, fireRate: 2, targetDefense: 50, targetMaxHp: 500,
      special: { kind: 'none' },
    })
    expect(high).toBeLessThan(low)
  })

  it('vulcan pierces armor', () => {
    const normal = calculateDps({
      attack: 100, fireRate: 2, targetDefense: 50, targetMaxHp: 500,
      special: { kind: 'none' },
    })
    const vulcan = calculateDps({
      attack: 100, fireRate: 2, targetDefense: 50, targetMaxHp: 500,
      special: { kind: 'vulcan-armor-pierce', defenseMultiplier: 0.7 },
    })
    expect(vulcan).toBeGreaterThan(normal)
  })

  it('hammer does true damage based on max HP', () => {
    const dps = calculateDps({
      attack: 100, fireRate: 1, targetDefense: 50, targetMaxHp: 1000,
      special: { kind: 'hammer-true-damage', maxHpPercent: 0.02 },
    })
    // Per hit = 100 + 1000*0.02 = 120, DPS = 120
    expect(dps).toBeCloseTo(120)
  })

  it('calculates DPS for new weapon specials', () => {
    const specials: WeaponSpecial[] = [
      { kind: 'laser-pierce', pierceCount: 3 },
      { kind: 'shotgun-close', closeRangeMultiplier: 1.5, closeRange: 2 },
      { kind: 'railgun-charge', chargeSeconds: 3, chargeMultiplier: 3 },
    ]
    for (const special of specials) {
      const dps = calculateDps({
        attack: 100, fireRate: 1, targetDefense: 10, targetMaxHp: 500,
        special,
      })
      expect(dps).toBeGreaterThan(0)
    }
  })

  it('throws on negative attack', () => {
    expect(() => calculateDps({
      attack: -1, fireRate: 1, targetDefense: 0, targetMaxHp: 100,
      special: { kind: 'none' },
    })).toThrow()
  })
})

describe('getWeaponHitProfile', () => {
  it('returns single for most weapons', () => {
    expect(getWeaponHitProfile({ kind: 'none' }).kind).toBe('single')
    expect(getWeaponHitProfile({ kind: 'vulcan-armor-pierce', defenseMultiplier: 0.7 }).kind).toBe('single')
  })

  it('returns splash for missile', () => {
    const profile = getWeaponHitProfile({ kind: 'missile-splash', splashRange: 2 })
    expect(profile.kind).toBe('splash')
  })
})
