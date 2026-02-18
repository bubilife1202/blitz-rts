import type { WeaponSpecial } from '../core/types'

export type DamageInput = {
  readonly attack: number
  readonly fireRate: number
  readonly targetDefense: number
  readonly targetMaxHp: number
  readonly special: WeaponSpecial
}

export type WeaponHitProfile =
  | { readonly kind: 'single' }
  | { readonly kind: 'splash'; readonly splashRange: 2 }

export function getWeaponHitProfile(special: WeaponSpecial): WeaponHitProfile {
  if (special.kind === 'missile-splash') return { kind: 'splash', splashRange: special.splashRange }
  return { kind: 'single' }
}

export function calculateDps(input: DamageInput): number {
  if (input.attack < 0) throw new Error('attack must be >= 0')
  if (input.fireRate < 0) throw new Error('fireRate must be >= 0')
  if (input.targetDefense < 0) throw new Error('targetDefense must be >= 0')
  if (input.targetMaxHp < 0) throw new Error('targetMaxHp must be >= 0')

  switch (input.special.kind) {
    case 'hammer-true-damage': {
      const perHit = input.attack + input.targetMaxHp * input.special.maxHpPercent
      return perHit * input.fireRate
    }
    case 'vulcan-armor-pierce': {
      const effectiveDefense = input.targetDefense * input.special.defenseMultiplier
      return input.attack * (input.attack / (input.attack + effectiveDefense)) * input.fireRate
    }
    case 'none':
    case 'sniper-farthest':
    case 'missile-splash': {
      const effectiveDefense = input.targetDefense
      return input.attack * (input.attack / (input.attack + effectiveDefense)) * input.fireRate
    }
  }
}
