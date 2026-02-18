import type { SkillDeck, SkillDefinition, SkillName } from '../core/types'
import { SP_INITIAL, SP_MAX, SP_REGEN_PER_SECOND } from '../core/types'
import { SKILLS } from '../data/skills-data'

export interface SpState {
  current: number
}

export interface SkillCooldownState {
  readonly name: SkillName
  remainingCooldown: number
}

export type ActiveEffect =
  | { readonly kind: 'invincible-allies'; remainingDuration: number }
  | { readonly kind: 'freeze-enemies'; remainingDuration: number }
  | {
      readonly kind: 'watt-regen-multiplier'
      remainingDuration: number
      readonly multiplier: number
    }
  | {
      readonly kind: 'focus-fire'
      remainingDuration: number
      readonly focusTargetId: number
    }
  | { readonly kind: 'scramble-targeting'; remainingDuration: number }

export type ActiveEffectKind = ActiveEffect['kind']

export interface SkillSystemState {
  readonly sp: SpState
  readonly cooldowns: SkillCooldownState[]
  readonly activeEffects: ActiveEffect[]
  readonly deck: SkillDeck
}

export function createSkillSystem(deck: SkillDeck): SkillSystemState {
  return {
    sp: { current: SP_INITIAL },
    cooldowns: [
      { name: deck[0], remainingCooldown: 0 },
      { name: deck[1], remainingCooldown: 0 },
      { name: deck[2], remainingCooldown: 0 },
    ],
    activeEffects: [],
    deck,
  }
}

export function regenSp(sp: SpState, dt: number): void {
  sp.current = Math.min(SP_MAX, sp.current + SP_REGEN_PER_SECOND * dt)
}

export function getSkillDefinition(name: SkillName): SkillDefinition {
  const def = SKILLS.find(s => s.name === name)
  if (!def) throw new Error(`Unknown skill: ${name}`)
  return def
}

export function canUseSkill(
  system: SkillSystemState,
  skillIndex: number,
): boolean {
  const cd = system.cooldowns[skillIndex]
  if (!cd) return false
  const def = getSkillDefinition(cd.name)
  return cd.remainingCooldown <= 0 && system.sp.current >= def.spCost
}

export function spendSp(sp: SpState, cost: number): void {
  sp.current -= cost
}

export function startCooldown(
  system: SkillSystemState,
  skillIndex: number,
): void {
  const cd = system.cooldowns[skillIndex]
  if (!cd) return
  const def = getSkillDefinition(cd.name)
  cd.remainingCooldown = def.cooldownSeconds
}

export function addActiveEffect(
  system: SkillSystemState,
  effect: ActiveEffect,
): void {
  const existingIdx = system.activeEffects.findIndex(
    e => e.kind === effect.kind,
  )
  if (existingIdx >= 0) {
    system.activeEffects.splice(existingIdx, 1)
  }
  system.activeEffects.push(effect)
}

export function removeActiveEffect(
  system: SkillSystemState,
  kind: ActiveEffectKind,
): void {
  const idx = system.activeEffects.findIndex(e => e.kind === kind)
  if (idx >= 0) {
    system.activeEffects.splice(idx, 1)
  }
}

export function updateEffects(
  system: SkillSystemState,
  dt: number,
): void {
  for (let i = system.activeEffects.length - 1; i >= 0; i--) {
    const effect = system.activeEffects[i]!
    effect.remainingDuration -= dt
    if (effect.remainingDuration <= 0) {
      system.activeEffects.splice(i, 1)
    }
  }
}

export function updateCooldowns(
  system: SkillSystemState,
  dt: number,
): void {
  for (const cd of system.cooldowns) {
    if (cd.remainingCooldown > 0) {
      cd.remainingCooldown = Math.max(0, cd.remainingCooldown - dt)
    }
  }
}

export function hasActiveEffect(
  system: SkillSystemState,
  kind: ActiveEffectKind,
): boolean {
  return system.activeEffects.some(e => e.kind === kind)
}

export function getFocusFireTarget(
  system: SkillSystemState,
): number | null {
  const effect = system.activeEffects.find(e => e.kind === 'focus-fire')
  if (effect && effect.kind === 'focus-fire') return effect.focusTargetId
  return null
}

export function getWattRegenMultiplier(
  system: SkillSystemState,
): number {
  const effect = system.activeEffects.find(
    e => e.kind === 'watt-regen-multiplier',
  )
  if (effect && effect.kind === 'watt-regen-multiplier')
    return effect.multiplier
  return 1
}
