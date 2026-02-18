import type { SkillDefinition } from '../core/types'

export const SKILLS = [
  {
    name: 'Shield Burst',
    spCost: 30,
    cooldownSeconds: 30,
    effect: { kind: 'invincible-allies', durationSeconds: 3 },
  },
  {
    name: 'EMP Strike',
    spCost: 40,
    cooldownSeconds: 45,
    effect: { kind: 'freeze-enemies', durationSeconds: 5 },
  },
  {
    name: 'Overcharge',
    spCost: 30,
    cooldownSeconds: 60,
    effect: { kind: 'watt-regen-multiplier', multiplier: 3, durationSeconds: 10 },
  },
  {
    name: 'Focus Fire',
    spCost: 25,
    cooldownSeconds: 20,
    effect: { kind: 'focus-fire-highest-watt-enemy', durationSeconds: 10 },
  },
  {
    name: 'Repair Pulse',
    spCost: 35,
    cooldownSeconds: 40,
    effect: { kind: 'heal-allies-percent-maxhp', percent: 0.15 },
  },
  {
    name: 'Scramble',
    spCost: 20,
    cooldownSeconds: 25,
    effect: { kind: 'scramble-targeting', durationSeconds: 8 },
  },
] as const satisfies readonly SkillDefinition[]
