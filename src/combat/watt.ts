import { WATT_INITIAL, WATT_MAX, WATT_REGEN_PER_SECOND } from '../core/types'

export interface WattState {
  readonly current: number
}

export function createWattState(): WattState {
  return { current: WATT_INITIAL }
}

export function regenWatt(
  state: WattState,
  dtSeconds: number,
  params?: { readonly regenMultiplier?: number },
): WattState {
  if (dtSeconds < 0) throw new Error('dtSeconds must be >= 0')
  const multiplier = params?.regenMultiplier ?? 1
  if (multiplier < 0) throw new Error('regenMultiplier must be >= 0')

  const next = state.current + WATT_REGEN_PER_SECOND * multiplier * dtSeconds
  return { current: Math.min(WATT_MAX, next) }
}

export function canAfford(state: WattState, cost: number): boolean {
  if (cost < 0) throw new Error('cost must be >= 0')
  return state.current >= cost
}

export function spendWatt(
  state: WattState,
  cost: number,
): { readonly ok: true; readonly state: WattState } | { readonly ok: false; readonly state: WattState } {
  if (!canAfford(state, cost)) return { ok: false, state }
  return { ok: true, state: { current: state.current - cost } }
}
