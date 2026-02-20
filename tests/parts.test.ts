import { describe, it, expect } from 'vitest'
import { ALL_PARTS, LEGS_PARTS, BODY_PARTS, WEAPON_PARTS, ACCESSORY_PARTS } from '../src/data/parts-data'
import { calculateBuildDerived, resolveBuildParts } from '../src/assembly/parts'
import type { Build } from '../src/core/types'

describe('PartsData', () => {
  it('has 30 total parts', () => {
    expect(ALL_PARTS).toHaveLength(30)
  })

  it('has 8 legs', () => {
    expect(LEGS_PARTS).toHaveLength(8)
  })

  it('has 7 bodies', () => {
    expect(BODY_PARTS).toHaveLength(7)
  })

  it('has 8 weapons', () => {
    expect(WEAPON_PARTS).toHaveLength(8)
  })

  it('has 7 accessories', () => {
    expect(ACCESSORY_PARTS).toHaveLength(7)
  })

  it('all parts have unique IDs', () => {
    const ids = ALL_PARTS.map(p => p.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('legs have positive load capacity', () => {
    for (const legs of LEGS_PARTS) {
      expect(legs.loadCapacity).toBeGreaterThan(0)
    }
  })

  it('weapons have positive attack', () => {
    for (const w of WEAPON_PARTS) {
      expect(w.attack).toBeGreaterThan(0)
    }
  })
})

describe('BuildDerived', () => {
  it('calculates derived stats for a basic build', () => {
    const build: Build = { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: null }
    const derived = calculateBuildDerived(build)
    expect(derived.core.hp).toBeGreaterThan(0)
    expect(derived.core.attack).toBeGreaterThan(0)
    expect(derived.core.defense).toBeGreaterThanOrEqual(0)
    expect(derived.core.speed).toBeGreaterThan(0)
    expect(derived.core.range).toBeGreaterThan(0)
    expect(derived.core.fireRate).toBeGreaterThan(0)
    expect(derived.cost.finalWattCost).toBeGreaterThan(0)
  })

  it('accessory modifies stats', () => {
    const base: Build = { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: null }
    const withAcc: Build = { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: 'ACP01' }
    const baseStats = calculateBuildDerived(base)
    const accStats = calculateBuildDerived(withAcc)
    // ACP01 is PowerChip (+10 attack)
    expect(accStats.core.attack).toBe(baseStats.core.attack + 10)
  })

  it('resolves parts correctly', () => {
    const build: Build = { legsId: 'MP01', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP01' }
    const parts = resolveBuildParts(build)
    expect(parts.legs.id).toBe('MP01')
    expect(parts.body.id).toBe('BP01')
    expect(parts.weapon.id).toBe('AP01')
    expect(parts.accessory?.id).toBe('ACP01')
  })

  it('new parts (MP06-MP08) build correctly', () => {
    const builds: Build[] = [
      { legsId: 'MP06', bodyId: 'BP01', weaponId: 'AP01', accessoryId: null },
      { legsId: 'MP07', bodyId: 'BP02', weaponId: 'AP01', accessoryId: null },
      { legsId: 'MP08', bodyId: 'BP01', weaponId: 'AP01', accessoryId: null },
    ]
    for (const build of builds) {
      const derived = calculateBuildDerived(build)
      expect(derived.core.hp).toBeGreaterThan(0)
    }
  })

  it('new weapons (AP06-AP08) have correct specials', () => {
    const laserBuild: Build = { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP06', accessoryId: null }
    const shotgunBuild: Build = { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP07', accessoryId: null }
    const railgunBuild: Build = { legsId: 'MP02', bodyId: 'BP04', weaponId: 'AP08', accessoryId: null }

    expect(calculateBuildDerived(laserBuild).core.weaponSpecial.kind).toBe('laser-pierce')
    expect(calculateBuildDerived(shotgunBuild).core.weaponSpecial.kind).toBe('shotgun-close')
    expect(calculateBuildDerived(railgunBuild).core.weaponSpecial.kind).toBe('railgun-charge')
  })
})
