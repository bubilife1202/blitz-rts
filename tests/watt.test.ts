import { describe, it, expect } from 'vitest'
import { createWattState, regenWatt, canAfford, spendWatt } from '../src/combat/watt'

describe('WattState', () => {
  it('creates initial state with default watt', () => {
    const state = createWattState()
    expect(state.current).toBe(100)
  })

  it('regenerates watt over time', () => {
    const state = createWattState()
    const next = regenWatt(state, 1) // 1 second
    expect(next.current).toBeGreaterThan(state.current)
  })

  it('caps watt at max', () => {
    const state = { current: 490 }
    const next = regenWatt(state, 10) // should cap
    expect(next.current).toBe(500) // WATT_MAX
  })

  it('applies regen multiplier', () => {
    const state = { current: 0 }
    const normal = regenWatt(state, 1)
    const boosted = regenWatt(state, 1, { regenMultiplier: 2 })
    expect(boosted.current).toBeCloseTo(normal.current * 2)
  })

  it('rejects negative dtSeconds', () => {
    expect(() => regenWatt({ current: 100 }, -1)).toThrow()
  })

  it('canAfford returns true when enough watt', () => {
    expect(canAfford({ current: 100 }, 50)).toBe(true)
    expect(canAfford({ current: 100 }, 100)).toBe(true)
  })

  it('canAfford returns false when not enough', () => {
    expect(canAfford({ current: 100 }, 101)).toBe(false)
  })

  it('spendWatt deducts cost', () => {
    const result = spendWatt({ current: 200 }, 80)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.current).toBe(120)
    }
  })

  it('spendWatt fails when insufficient', () => {
    const result = spendWatt({ current: 50 }, 80)
    expect(result.ok).toBe(false)
  })
})
