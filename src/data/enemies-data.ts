import type { EnemyScoutInfo, Roster } from '../core/types'

export interface EnemyPreset {
  readonly name: string
  readonly nameKo: string
  readonly difficulty: 'easy' | 'normal' | 'hard' | 'nightmare'
  readonly roster: Roster
  readonly ratios: readonly [number, number, number]
  readonly scout: EnemyScoutInfo
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
    nameKo: '루키 봇',
    difficulty: 'easy',
    roster: ROOKIE_BOT_ROSTER,
    ratios: [3, 1, 1],
    scout: {
      descriptionKo: '기본형 워커 위주의 초보 AI. 벌컨과 해머를 사용하며 특별한 전략 없이 전진한다.',
      strategyHintKo: '어떤 빌드든 무난하게 승리 가능. 조립 연습용.',
      tags: ['워커', '벌컨', '해머', '기본형'],
    },
  },
  {
    name: 'Tank Commander',
    nameKo: '탱크 커맨더',
    difficulty: 'normal',
    roster: TANK_COMMANDER_ROSTER,
    ratios: [2, 2, 1],
    scout: {
      descriptionKo: '저거너트 + 캐논 중전차를 주력으로 밀어온다. 느리지만 한 방이 아프다.',
      strategyHintKo: '사거리 긴 스나이퍼나 미사일로 접근 전에 처리. 스카웃 돌격병도 효과적.',
      tags: ['탱크', '중장갑', '캐논', '미사일'],
    },
  },
  {
    name: 'Swarm Master',
    nameKo: '스웜 마스터',
    difficulty: 'normal',
    roster: SWARM_MASTER_ROSTER,
    ratios: [3, 3, 2],
    scout: {
      descriptionKo: '스카웃과 호버 경량 유닛을 대량 생산. 벌컨 물량으로 압도한다.',
      strategyHintKo: '미사일 스플래시로 물량 처리. 요새 시너지로 방어력 확보도 좋다.',
      tags: ['스카웃', '호버', '벌컨', '물량전'],
    },
  },
  {
    name: 'Sniper Elite',
    nameKo: '스나이퍼 엘리트',
    difficulty: 'hard',
    roster: SNIPER_ELITE_ROSTER,
    ratios: [2, 1, 2],
    scout: {
      descriptionKo: '스파이더 + 스나이퍼로 원거리 저격. 탱크 + 캐논으로 전선 유지. 해머 근접병으로 돌파.',
      strategyHintKo: '빠른 스카웃으로 저격수 접근 후 처리. EMP로 저격 타이밍 끊기.',
      tags: ['스파이더', '스나이퍼', '탱크', '원거리'],
    },
  },
  {
    name: 'Omega Squad',
    nameKo: '오메가 스쿼드',
    difficulty: 'nightmare',
    roster: OMEGA_SQUAD_ROSTER,
    ratios: [2, 2, 1],
    scout: {
      descriptionKo: '중전차 + 저격수 + 미사일의 복합 전술. 모든 거리에서 강력하다.',
      strategyHintKo: '시너지 조합 필수. 한 가지 전략으로는 돌파 불가. 스킬 타이밍이 핵심.',
      tags: ['탱크', '스나이퍼', '미사일', '복합전술'],
    },
  },
]
