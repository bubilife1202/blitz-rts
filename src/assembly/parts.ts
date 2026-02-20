import type {
  AccessoryId,
  AccessoryPart,
  AssemblyValidationError,
  AssemblyValidationResult,
  BodyId,
  BodyPart,
  Build,
  BuildCoreStats,
  BuildDerived,
  LegsId,
  LegsPart,
  MountType,
  Part,
  PartId,
  WeaponId,
  WeaponPart,
} from '../core/types'
import { SPEED_UNIT_TILES_PER_SECOND } from '../core/types'
import {
  ACCESSORY_PARTS,
  BODY_PARTS,
  LEGS_PARTS,
  WEAPON_PARTS,
} from '../data/parts-data'
import {
  calculateTotalWeight,
  getBaseWattCostForTier,
  getFinalWattCost,
  getWattTier,
  validateAssembly,
} from './assembly-rules'

function indexById<T extends { readonly id: string }>(items: readonly T[]): ReadonlyMap<string, T> {
  const map = new Map<string, T>()
  for (const item of items) map.set(item.id, item)
  return map
}

const LEGS_BY_ID = indexById(LEGS_PARTS)
const BODY_BY_ID = indexById(BODY_PARTS)
const WEAPON_BY_ID = indexById(WEAPON_PARTS)
const ACCESSORY_BY_ID = indexById(ACCESSORY_PARTS)

export function getLegsById(id: LegsId): LegsPart | undefined {
  return LEGS_BY_ID.get(id)
}

export function getBodyById(id: BodyId): BodyPart | undefined {
  return BODY_BY_ID.get(id)
}

export function getWeaponById(id: WeaponId): WeaponPart | undefined {
  return WEAPON_BY_ID.get(id)
}

export function getAccessoryById(id: AccessoryId): AccessoryPart | undefined {
  return ACCESSORY_BY_ID.get(id)
}

export function getPartById(id: PartId): Part | undefined {
  if (id.startsWith('MP')) return getLegsById(id as LegsId)
  if (id.startsWith('BP')) return getBodyById(id as BodyId)
  if (id.startsWith('AP')) return getWeaponById(id as WeaponId)
  if (id.startsWith('ACP')) return getAccessoryById(id as AccessoryId)
  return undefined
}

export function listLegs(): readonly LegsPart[] {
  return LEGS_PARTS
}

export function listBodies(): readonly BodyPart[] {
  return BODY_PARTS
}

export function listWeapons(): readonly WeaponPart[] {
  return WEAPON_PARTS
}

export function listAccessories(): readonly AccessoryPart[] {
  return ACCESSORY_PARTS
}

export function filterBodiesByMountType(mountType: MountType): readonly BodyPart[] {
  return BODY_PARTS.filter((p) => p.mountType === mountType)
}

export function filterWeaponsByMountType(mountType: MountType): readonly WeaponPart[] {
  return WEAPON_PARTS.filter((p) => p.mountType === mountType)
}

export function resolveBuildParts(build: Build): {
  readonly legs: LegsPart
  readonly body: BodyPart
  readonly weapon: WeaponPart
  readonly accessory: AccessoryPart | null
} {
  const legs = getLegsById(build.legsId)
  const body = getBodyById(build.bodyId)
  const weapon = getWeaponById(build.weaponId)
  const accessory = build.accessoryId ? (getAccessoryById(build.accessoryId) ?? null) : null

  if (!legs) throw new Error(`Unknown legs id: ${build.legsId}`)
  if (!body) throw new Error(`Unknown body id: ${build.bodyId}`)
  if (!weapon) throw new Error(`Unknown weapon id: ${build.weaponId}`)
  if (build.accessoryId && !accessory) throw new Error(`Unknown accessory id: ${build.accessoryId}`)

  return { legs, body, weapon, accessory }
}

export function validateBuild(build: Build): AssemblyValidationResult {
  const errors: AssemblyValidationError[] = []

  const legs = getLegsById(build.legsId)
  const body = getBodyById(build.bodyId)
  const weapon = getWeaponById(build.weaponId)
  const accessory = build.accessoryId ? (getAccessoryById(build.accessoryId) ?? null) : null

  if (!legs) errors.push({ code: 'UNKNOWN_LEGS', message: `Unknown legs id: ${build.legsId}` })
  if (!body) errors.push({ code: 'UNKNOWN_BODY', message: `Unknown body id: ${build.bodyId}` })
  if (!weapon)
    errors.push({ code: 'UNKNOWN_WEAPON', message: `Unknown weapon id: ${build.weaponId}` })
  if (build.accessoryId && !accessory)
    errors.push({ code: 'UNKNOWN_ACCESSORY', message: `Unknown accessory id: ${build.accessoryId}` })

  if (errors.length > 0) return { ok: false, errors }
  if (!legs || !body || !weapon) return { ok: false, errors }

  const result = validateAssembly({ legs, body, weapon, accessory })
  if (!result.ok) errors.push(...result.errors)

  if (errors.length === 0) return { ok: true }
  return { ok: false, errors }
}

function applyAccessory(core: {
  readonly hp: number
  readonly defense: number
  readonly attack: number
  readonly range: number
  readonly fireRate: number
}, accessory: AccessoryPart | null): {
  readonly hp: number
  readonly defense: number
  readonly attack: number
  readonly range: number
  readonly fireRate: number
} {
  if (!accessory) return core

  switch (accessory.effect.kind) {
    case 'attack-flat':
      return { ...core, attack: core.attack + accessory.effect.attackBonus }
    case 'defense-flat':
      return { ...core, defense: core.defense + accessory.effect.defenseBonus }
    case 'hp-flat':
      return { ...core, hp: core.hp + accessory.effect.hpBonus }
    case 'range-fireRate-flat':
      return {
        ...core,
        range: core.range + accessory.effect.rangeBonus,
        fireRate: core.fireRate + accessory.effect.fireRateBonus,
      }
    case 'watt-cost-multiplier':
    case 'speed-flat':
    case 'stealth':
      return core
  }
}

export function calculateBuildCoreStats(build: Build): BuildCoreStats {
  const { legs, body, weapon, accessory } = resolveBuildParts(build)

  const base = {
    hp: body.hp,
    defense: body.defense,
    attack: weapon.attack,
    range: weapon.range,
    fireRate: weapon.fireRate,
  }

  const modified = applyAccessory(base, accessory)

  return {
    speed: legs.speed,
    tilesPerSecond: legs.speed * SPEED_UNIT_TILES_PER_SECOND,
    loadCapacity: legs.loadCapacity,
    hp: modified.hp,
    defense: modified.defense,
    sight: body.sight,
    attack: modified.attack,
    range: modified.range,
    fireRate: modified.fireRate,
    mountType: body.mountType,
    moveType: legs.moveType,
    weaponSpecial: weapon.special,
  }
}

export function calculateBuildDerived(build: Build): BuildDerived {
  const { body, weapon, accessory } = resolveBuildParts(build)

  const totalWeight = calculateTotalWeight({ body, weapon, accessory })
  const wattTier = getWattTier(totalWeight)
  const baseWattCost = getBaseWattCostForTier(wattTier)
  const finalWattCost = getFinalWattCost({ baseWattCost, accessory })

  return {
    core: calculateBuildCoreStats(build),
    cost: {
      weight: totalWeight,
      wattTier,
      baseWattCost,
      finalWattCost,
    },
  }
}
