import type {
  AccessoryPart,
  AssemblyValidationError,
  AssemblyValidationResult,
  BodyPart,
  LegsPart,
  MountType,
  WattTier,
  WeaponPart,
} from '../core/types'

export type WattTierRule = {
  readonly tier: WattTier
  readonly minWeightInclusive: number
  readonly maxWeightInclusive: number | null
  readonly wattCost: number
}

export const WATT_TIER_RULES: readonly WattTierRule[] = [
  { tier: 'T1', minWeightInclusive: 0, maxWeightInclusive: 130, wattCost: 60 },
  { tier: 'T2', minWeightInclusive: 131, maxWeightInclusive: 200, wattCost: 100 },
  { tier: 'T3', minWeightInclusive: 201, maxWeightInclusive: 280, wattCost: 160 },
  { tier: 'T4', minWeightInclusive: 281, maxWeightInclusive: null, wattCost: 220 },
] as const

export function calculateTotalWeight(params: {
  readonly body: BodyPart
  readonly weapon: WeaponPart
  readonly accessory: AccessoryPart | null
}): number {
  return params.body.weight + params.weapon.weight + (params.accessory?.weight ?? 0)
}

export function getWattTier(totalWeight: number): WattTier {
  for (const rule of WATT_TIER_RULES) {
    const withinMin = totalWeight >= rule.minWeightInclusive
    const withinMax = rule.maxWeightInclusive === null || totalWeight <= rule.maxWeightInclusive
    if (withinMin && withinMax) return rule.tier
  }
  return 'T4'
}

export function getBaseWattCostForTier(tier: WattTier): number {
  const rule = WATT_TIER_RULES.find((r) => r.tier === tier)
  if (!rule) throw new Error(`Unknown WattTier: ${tier}`)
  return rule.wattCost
}

export function applyMiserCoreDiscount(baseWattCost: number): number {
  return Math.floor(baseWattCost * 0.7)
}

export function getFinalWattCost(params: {
  readonly baseWattCost: number
  readonly accessory: AccessoryPart | null
}): number {
  if (!params.accessory) return params.baseWattCost
  if (params.accessory.effect.kind !== 'watt-cost-multiplier') return params.baseWattCost
  return applyMiserCoreDiscount(params.baseWattCost)
}

export function isMountTypeMatch(bodyMountType: MountType, weaponMountType: MountType): boolean {
  return bodyMountType === weaponMountType
}

export function validateAssembly(params: {
  readonly legs: LegsPart
  readonly body: BodyPart
  readonly weapon: WeaponPart
  readonly accessory: AccessoryPart | null
}): AssemblyValidationResult {
  const errors: AssemblyValidationError[] = []

  if (!isMountTypeMatch(params.body.mountType, params.weapon.mountType)) {
    errors.push({
      code: 'WEAPON_BODY_TYPE_MISMATCH',
      message: `Weapon mountType (${params.weapon.mountType}) must match body mountType (${params.body.mountType})`,
    })
  }

  const totalWeight = calculateTotalWeight({
    body: params.body,
    weapon: params.weapon,
    accessory: params.accessory,
  })

  if (totalWeight > params.legs.loadCapacity) {
    errors.push({
      code: 'OVER_WEIGHT',
      message: `Total weight ${totalWeight} exceeds legs loadCapacity ${params.legs.loadCapacity}`,
    })
  }

  if (errors.length === 0) return { ok: true }
  return { ok: false, errors }
}
