export type LegsId = 'MP01' | 'MP02' | 'MP03' | 'MP04' | 'MP05'
export type BodyId = 'BP01' | 'BP02' | 'BP03' | 'BP04' | 'BP05'
export type WeaponId = 'AP01' | 'AP02' | 'AP03' | 'AP04' | 'AP05'
export type AccessoryId = 'ACP01' | 'ACP02' | 'ACP03' | 'ACP04' | 'ACP05'

export type PartId = LegsId | BodyId | WeaponId | AccessoryId

export type PartSlot = 'legs' | 'body' | 'weapon' | 'accessory'
export type MountType = 'arm' | 'shoulder' | 'top'

export type LegsMoveType =
  | 'reverse-joint'
  | 'humanoid'
  | 'flying'
  | 'tank'
  | 'quadruped'

export type WattTier = 'T1' | 'T2' | 'T3' | 'T4'

export type WeaponSpecial =
  | { readonly kind: 'none' }
  | { readonly kind: 'vulcan-armor-pierce'; readonly defenseMultiplier: 0.7 }
  | { readonly kind: 'sniper-farthest' }
  | { readonly kind: 'missile-splash'; readonly splashRange: 2 }
  | { readonly kind: 'hammer-true-damage'; readonly maxHpPercent: 0.02 }

export type AccessoryEffect =
  | { readonly kind: 'attack-flat'; readonly attackBonus: 10 }
  | { readonly kind: 'defense-flat'; readonly defenseBonus: 10 }
  | {
      readonly kind: 'watt-cost-multiplier'
      readonly multiplier: 0.7
      readonly rounding: 'floor'
    }
  | { readonly kind: 'hp-flat'; readonly hpBonus: 200 }
  | {
      readonly kind: 'range-fireRate-flat'
      readonly rangeBonus: 2
      readonly fireRateBonus: 1
    }

export type SkillName =
  | 'Shield Burst'
  | 'EMP Strike'
  | 'Overcharge'
  | 'Focus Fire'
  | 'Repair Pulse'
  | 'Scramble'

export type SkillEffect =
  | { readonly kind: 'invincible-allies'; readonly durationSeconds: 3 }
  | { readonly kind: 'freeze-enemies'; readonly durationSeconds: 5 }
  | {
      readonly kind: 'watt-regen-multiplier'
      readonly multiplier: 3
      readonly durationSeconds: 10
    }
  | { readonly kind: 'focus-fire-highest-watt-enemy'; readonly durationSeconds: 10 }
  | { readonly kind: 'heal-allies-percent-maxhp'; readonly percent: 0.15 }
  | { readonly kind: 'scramble-targeting'; readonly durationSeconds: 8 }

export type SkillDeck = readonly [SkillName, SkillName, SkillName]

export interface LegsPart {
  readonly slot: 'legs'
  readonly id: LegsId
  readonly name: string
  readonly moveType: LegsMoveType
  readonly speed: number
  readonly loadCapacity: number
  readonly weight: 0
}

export interface BodyPart {
  readonly slot: 'body'
  readonly id: BodyId
  readonly name: string
  readonly mountType: MountType
  readonly hp: number
  readonly defense: number
  readonly sight: number
  readonly weight: number
}

export interface WeaponPart {
  readonly slot: 'weapon'
  readonly id: WeaponId
  readonly name: string
  readonly mountType: MountType
  readonly attack: number
  readonly range: number
  readonly fireRate: number
  readonly weight: number
  readonly special: WeaponSpecial
}

export interface AccessoryPart {
  readonly slot: 'accessory'
  readonly id: AccessoryId
  readonly name: string
  readonly weight: number
  readonly effect: AccessoryEffect
}

export type Part = LegsPart | BodyPart | WeaponPart | AccessoryPart

export interface Build {
  readonly legsId: LegsId
  readonly bodyId: BodyId
  readonly weaponId: WeaponId
  readonly accessoryId: AccessoryId | null
}

export type RosterIndex = 0 | 1 | 2

export type Roster = readonly [Build, Build, Build]

export interface BuildCoreStats {
  readonly speed: number
  readonly tilesPerSecond: number
  readonly loadCapacity: number
  readonly hp: number
  readonly defense: number
  readonly sight: number
  readonly attack: number
  readonly range: number
  readonly fireRate: number
  readonly mountType: MountType
  readonly moveType: LegsMoveType
  readonly weaponSpecial: WeaponSpecial
}

export interface BuildCost {
  readonly weight: number
  readonly wattTier: WattTier
  readonly baseWattCost: number
  readonly finalWattCost: number
}

export interface BuildDerived {
  readonly core: BuildCoreStats
  readonly cost: BuildCost
}

export type AssemblyValidationErrorCode =
  | 'UNKNOWN_LEGS'
  | 'UNKNOWN_BODY'
  | 'UNKNOWN_WEAPON'
  | 'UNKNOWN_ACCESSORY'
  | 'WEAPON_BODY_TYPE_MISMATCH'
  | 'OVER_WEIGHT'

export interface AssemblyValidationError {
  readonly code: AssemblyValidationErrorCode
  readonly message: string
}

export type AssemblyValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly errors: readonly AssemblyValidationError[] }

export const SPEED_UNIT_TILES_PER_SECOND = 0.5
export const BATTLEFIELD_TILES = 30
export const BASE_HP = 2000
export const BASE_DEFENSE = 15
export const UNIT_CAP_PER_SIDE = 15

export const WATT_INITIAL = 100
export const WATT_REGEN_PER_SECOND = 20
export const WATT_MAX = 500

export const SP_INITIAL = 30
export const SP_REGEN_PER_SECOND = 5
export const SP_MAX = 100

export interface SkillDefinition {
  readonly name: SkillName
  readonly spCost: number
  readonly cooldownSeconds: number
  readonly effect: SkillEffect
}
