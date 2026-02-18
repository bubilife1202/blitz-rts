import type { Roster } from '../core/types'

export interface EnemyPreset {
  readonly name: string
  readonly difficulty: 'easy' | 'normal' | 'hard' | 'nightmare'
  readonly roster: Roster
  readonly ratios: readonly [number, number, number]
}

// Rookie Bot (Easy)
// Build A: Walker(MP02) + LightFrame(BP01) + Vulcan(AP01) + PowerChip(ACP01) — weight=150, load=200 ✅
// Build B: Walker(MP02) + LightFrame(BP01) + Hammer(AP05) + null — weight=150, load=200 ✅
// Build C: Walker(MP02) + Standard(BP02) + Vulcan(AP01) + null — weight=180, load=200 ✅
const ROOKIE_BOT_ROSTER: Roster = [
  { legsId: 'MP02', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP01' },
  { legsId: 'MP02', bodyId: 'BP01', weaponId: 'AP05', accessoryId: null },
  { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: null },
]

// Tank Commander (Normal)
// Build A: Tank(MP04) + Juggernaut(BP05) + Cannon(AP02) + null — weight=350, load=350 ✅
// Build B: Tank(MP04) + Fortress(BP03) + Missile(AP04) + MiserCore(ACP03) — weight=345, load=350 ✅
// Build C: Walker(MP02) + LightFrame(BP01) + Vulcan(AP01) + MiserCore(ACP03) — weight=145, load=200 ✅
const TANK_COMMANDER_ROSTER: Roster = [
  { legsId: 'MP04', bodyId: 'BP05', weaponId: 'AP02', accessoryId: null },
  { legsId: 'MP04', bodyId: 'BP03', weaponId: 'AP04', accessoryId: 'ACP03' },
  { legsId: 'MP02', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP03' },
]

// Swarm Master (Normal)
// Build A: Scout(MP01) + LightFrame(BP01) + Vulcan(AP01) + PowerChip(ACP01) — weight=150, load=160 ✅
// Build B: Walker(MP02) + Standard(BP02) + Vulcan(AP01) + MiserCore(ACP03) — weight=195, load=200 ✅
// Build C: Hover(MP03) + LightFrame(BP01) + Vulcan(AP01) + MiserCore(ACP03) — weight=145, load=150 ✅
const SWARM_MASTER_ROSTER: Roster = [
  { legsId: 'MP01', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP01' },
  { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: 'ACP03' },
  { legsId: 'MP03', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP03' },
]

// Sniper Elite (Hard)
// Build A: Spider(MP05) + SniperBay(BP04) + Sniper(AP03) + Overdrive(ACP05) — weight=300, load=300 ✅
// Build B: Tank(MP04) + Fortress(BP03) + Cannon(AP02) + null — weight=350, load=350 ✅
// Build C: Walker(MP02) + LightFrame(BP01) + Hammer(AP05) + HPModule(ACP04) — weight=175, load=200 ✅
const SNIPER_ELITE_ROSTER: Roster = [
  { legsId: 'MP05', bodyId: 'BP04', weaponId: 'AP03', accessoryId: 'ACP05' },
  { legsId: 'MP04', bodyId: 'BP03', weaponId: 'AP02', accessoryId: null },
  { legsId: 'MP02', bodyId: 'BP01', weaponId: 'AP05', accessoryId: 'ACP04' },
]

// Omega Squad (Nightmare)
// Build A: Tank(MP04) + Juggernaut(BP05) + Cannon(AP02) + null — weight=350, load=350 ✅
// Build B: Spider(MP05) + SniperBay(BP04) + Sniper(AP03) + Overdrive(ACP05) — weight=300, load=300 ✅
// Build C: Tank(MP04) + Fortress(BP03) + Missile(AP04) + PowerChip(ACP01) — weight=350, load=350 ✅
const OMEGA_SQUAD_ROSTER: Roster = [
  { legsId: 'MP04', bodyId: 'BP05', weaponId: 'AP02', accessoryId: null },
  { legsId: 'MP05', bodyId: 'BP04', weaponId: 'AP03', accessoryId: 'ACP05' },
  { legsId: 'MP04', bodyId: 'BP03', weaponId: 'AP04', accessoryId: 'ACP01' },
]

export const ENEMY_PRESETS: readonly EnemyPreset[] = [
  {
    name: 'Rookie Bot',
    difficulty: 'easy',
    roster: ROOKIE_BOT_ROSTER,
    ratios: [3, 1, 1],
  },
  {
    name: 'Tank Commander',
    difficulty: 'normal',
    roster: TANK_COMMANDER_ROSTER,
    ratios: [2, 2, 1],
  },
  {
    name: 'Swarm Master',
    difficulty: 'normal',
    roster: SWARM_MASTER_ROSTER,
    ratios: [3, 3, 2],
  },
  {
    name: 'Sniper Elite',
    difficulty: 'hard',
    roster: SNIPER_ELITE_ROSTER,
    ratios: [2, 1, 2],
  },
  {
    name: 'Omega Squad',
    difficulty: 'nightmare',
    roster: OMEGA_SQUAD_ROSTER,
    ratios: [2, 2, 1],
  },
]
