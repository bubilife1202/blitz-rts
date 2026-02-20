export type LegsId = 'MP01' | 'MP02' | 'MP03' | 'MP04' | 'MP05' | 'MP06' | 'MP07' | 'MP08'
export type BodyId = 'BP01' | 'BP02' | 'BP03' | 'BP04' | 'BP05' | 'BP06' | 'BP07'
export type WeaponId = 'AP01' | 'AP02' | 'AP03' | 'AP04' | 'AP05' | 'AP06' | 'AP07' | 'AP08'
export type AccessoryId = 'ACP01' | 'ACP02' | 'ACP03' | 'ACP04' | 'ACP05' | 'ACP06' | 'ACP07'

export type PartId = LegsId | BodyId | WeaponId | AccessoryId

export type PartSlot = 'legs' | 'body' | 'weapon' | 'accessory'
export type MountType = 'arm' | 'shoulder' | 'top'

export type LegsMoveType =
  | 'reverse-joint'
  | 'humanoid'
  | 'flying'
  | 'tank'
  | 'quadruped'
  | 'wheeled'
  | 'hexapod'

export type WattTier = 'T1' | 'T2' | 'T3' | 'T4'

export type WeaponSpecial =
  | { readonly kind: 'none' }
  | { readonly kind: 'vulcan-armor-pierce'; readonly defenseMultiplier: 0.7 }
  | { readonly kind: 'sniper-farthest' }
  | { readonly kind: 'missile-splash'; readonly splashRange: 2 }
  | { readonly kind: 'hammer-true-damage'; readonly maxHpPercent: 0.02 }
  | { readonly kind: 'laser-pierce'; readonly pierceCount: 3 }
  | { readonly kind: 'shotgun-close'; readonly closeRangeMultiplier: 1.5; readonly closeRange: 2 }
  | { readonly kind: 'railgun-charge'; readonly chargeSeconds: 3; readonly chargeMultiplier: 3 }

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
  | { readonly kind: 'speed-flat'; readonly speedBonus: 2 }
  | { readonly kind: 'stealth'; readonly revealOnAttack: true }

export type SkillName =
  | 'Shield Burst'
  | 'EMP Strike'
  | 'Overcharge'
  | 'Focus Fire'
  | 'Repair Pulse'
  | 'Scramble'
  | 'Artillery Barrage'
  | 'Fortify'
  | 'Overdrive Protocol'
  | 'Decoy Deployment'
  | 'Emergency Recall'
  | 'Watt Surge'

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
  | { readonly kind: 'area-damage'; readonly damage: 200; readonly tileRadius: 5 }
  | { readonly kind: 'defense-buff'; readonly defenseBonus: 10; readonly durationSeconds: 8 }
  | { readonly kind: 'fire-rate-buff'; readonly multiplier: 1.5; readonly durationSeconds: 6 }
  | { readonly kind: 'spawn-decoys'; readonly count: 3; readonly hp: 300; readonly durationSeconds: 10 }
  | { readonly kind: 'recall-heal'; readonly stunSeconds: 2 }
  | { readonly kind: 'watt-instant'; readonly amount: 150 }

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

// ─── Co-op Constants ─────────────────────────────────

export const COOP_BASE_HP = 3000
export const COOP_UNIT_CAP = 10
export const COOP_WATT_REGEN = 15
export const COOP_SP_REGEN = 4

export type PartnerPersonalityId = 'vanguard' | 'bastion' | 'artillery' | 'support'

// ─── Synergy System ────────────────────────────────────

export type SynergyId =
  | 'aerial-sniper'
  | 'heavy-tank'
  | 'striker'
  | 'fortress'
  | 'rapid-battery'
  | 'missile-platform'
  | 'mobile-strike'
  | 'sniper-nest'

export type SynergyBonusKind =
  | { readonly kind: 'range-flat'; readonly value: number }
  | { readonly kind: 'fire-rate-flat'; readonly value: number }
  | { readonly kind: 'attack-percent'; readonly value: number }
  | { readonly kind: 'defense-aura'; readonly range: number; readonly value: number }
  | { readonly kind: 'speed-damage'; readonly percent: number }
  | { readonly kind: 'splash-range-flat'; readonly value: number }
  | { readonly kind: 'move-attack' }
  | { readonly kind: 'crit-chance'; readonly percent: number }
  | { readonly kind: 'first-hit-multiplier'; readonly multiplier: number }

export interface SynergyCondition {
  readonly legsMove?: LegsMoveType
  readonly bodyMount?: MountType
  readonly bodyId?: BodyId
  readonly weaponId?: WeaponId
  readonly accessoryId?: AccessoryId
}

export interface SynergyDefinition {
  readonly id: SynergyId
  readonly name: string
  readonly nameKo: string
  readonly description: string
  readonly condition: SynergyCondition
  readonly bonus: SynergyBonusKind
}

// ─── Enemy Scouting ────────────────────────────────────

export interface EnemyScoutInfo {
  readonly descriptionKo: string
  readonly strategyHintKo: string
  readonly tags: readonly string[]
}

// ─── Battle Analysis ───────────────────────────────────

export type AnalysisTipKind =
  | 'build-countered'
  | 'range-disadvantage'
  | 'speed-mismatch'
  | 'watt-inefficient'
  | 'synergy-hint'

export interface BattleAnalysisTip {
  readonly kind: AnalysisTipKind
  readonly buildIndex: RosterIndex
  readonly messageKo: string
}
