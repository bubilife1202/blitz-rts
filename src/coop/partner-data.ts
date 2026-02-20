import type { PartnerPersonality } from './types'

// ─── KAI-7 / vanguard / 철풍 ─────────────────────────
// Aggressive frontline fighter. Rushes enemies with fast, light mechs.
// Builds verified: mount types match, weight within capacity.
//   Build 0: Scout(160) + LightFrame(arm,50) + Vulcan(arm,80) + PowerChip(20) = 150 <= 160
//   Build 1: Hover(150) + LightFrame(arm,50) + Vulcan(arm,80) + MiserCore(15) = 145 <= 150
//   Build 2: Walker(200) + Standard(arm,100) + Hammer(arm,100) + null = 200 <= 200
export const KAI_7: PartnerPersonality = {
  id: 'vanguard',
  name: 'KAI-7',
  codename: 'Vanguard',
  codenameko: '철풍',
  description: 'Aggressive frontline pilot who believes the best defense is an overwhelming offense.',
  preferredSkills: ['EMP Strike', 'Focus Fire', 'Overcharge'],
  roster: [
    { legsId: 'MP01', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP01' },
    { legsId: 'MP03', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP03' },
    { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP05', accessoryId: null },
  ],
  ratios: [3, 2, 1],
  aggressiveness: 0.8,
  skillTiming: 'proactive',
}

// ─── MIRA-3 / bastion / 철벽 ─────────────────────────
// Calm defensive specialist. Heavy armor and long-range firepower.
// Builds verified: mount types match, weight within capacity.
//   Build 0: Tank(350) + Juggernaut(shoulder,200) + Cannon(shoulder,150) + null = 350 <= 350
//   Build 1: Tank(350) + Fortress(shoulder,200) + Missile(shoulder,130) + PowerChip(20) = 350 <= 350
//   Build 2: Tank(350) + Fortress(shoulder,200) + Cannon(shoulder,150) + null = 350 <= 350
export const MIRA_3: PartnerPersonality = {
  id: 'bastion',
  name: 'MIRA-3',
  codename: 'Bastion',
  codenameko: '철벽',
  description: 'Calm analytical defender who turns the battlefield into an impenetrable fortress.',
  preferredSkills: ['Shield Burst', 'Repair Pulse', 'Scramble'],
  roster: [
    { legsId: 'MP04', bodyId: 'BP05', weaponId: 'AP02', accessoryId: null },
    { legsId: 'MP04', bodyId: 'BP03', weaponId: 'AP04', accessoryId: 'ACP01' },
    { legsId: 'MP04', bodyId: 'BP03', weaponId: 'AP02', accessoryId: null },
  ],
  ratios: [2, 1, 2],
  aggressiveness: 0.3,
  skillTiming: 'reactive',
}

// ─── ZERO-9 / artillery / 먹구름 ─────────────────────
// Precise and tactical. Long-range snipers backed by missile support.
// Builds verified: mount types match, weight within capacity.
//   Build 0: Spider(300) + SniperBay(top,150) + Sniper(top,120) + Overdrive(30) = 300 <= 300
//   Build 1: Tank(350) + Fortress(shoulder,200) + Missile(shoulder,130) + PowerChip(20) = 350 <= 350
//   Build 2: Walker(200) + Standard(arm,100) + Vulcan(arm,80) + PowerChip(20) = 200 <= 200
export const ZERO_9: PartnerPersonality = {
  id: 'artillery',
  name: 'ZERO-9',
  codename: 'Artillery',
  codenameko: '먹구름',
  description: 'Precise tactical operative who eliminates targets from extreme range.',
  preferredSkills: ['Focus Fire', 'Overcharge', 'EMP Strike'],
  roster: [
    { legsId: 'MP05', bodyId: 'BP04', weaponId: 'AP03', accessoryId: 'ACP05' },
    { legsId: 'MP04', bodyId: 'BP03', weaponId: 'AP04', accessoryId: 'ACP01' },
    { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: 'ACP01' },
  ],
  ratios: [2, 2, 1],
  aggressiveness: 0.5,
  skillTiming: 'balanced',
}

// ─── LUNA-5 / support / 달빛 ─────────────────────────
// Warm and encouraging. Cost-efficient swarm with healing focus.
// Builds verified: mount types match, weight within capacity.
//   Build 0: Walker(200) + LightFrame(arm,50) + Vulcan(arm,80) + MiserCore(15) = 145 <= 200
//   Build 1: Scout(160) + LightFrame(arm,50) + Vulcan(arm,80) + MiserCore(15) = 145 <= 160
//   Build 2: Hover(150) + LightFrame(arm,50) + Vulcan(arm,80) + MiserCore(15) = 145 <= 150
export const LUNA_5: PartnerPersonality = {
  id: 'support',
  name: 'LUNA-5',
  codename: 'Support',
  codenameko: '달빛',
  description: 'Warm encouraging pilot who keeps allies alive with efficient economy and timely heals.',
  preferredSkills: ['Repair Pulse', 'Shield Burst', 'Overcharge'],
  roster: [
    { legsId: 'MP02', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP03' },
    { legsId: 'MP01', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP03' },
    { legsId: 'MP03', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP03' },
  ],
  ratios: [2, 3, 1],
  aggressiveness: 0.4,
  skillTiming: 'reactive',
}

export const ALL_PARTNERS: readonly PartnerPersonality[] = [
  KAI_7,
  MIRA_3,
  ZERO_9,
  LUNA_5,
]

export function getPartnerById(id: PartnerPersonality['id']): PartnerPersonality {
  const partner = ALL_PARTNERS.find(p => p.id === id)
  if (!partner) throw new Error(`Unknown partner: ${id}`)
  return partner
}
