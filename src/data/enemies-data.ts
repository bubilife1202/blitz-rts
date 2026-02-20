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

// Laser Corps (Hard)
// Build A: Strider(MP06) + ReconFrame(BP06,arm) + Laser(AP06,arm) + SpeedBooster(ACP06) — weight=130+20=150, load=170 ✅
// Build B: Phantom(MP08) + ReconFrame(BP06,arm) + Shotgun(AP07,arm) + null — weight=110, load=120 ✅
// Build C: Walker(MP02) + Standard(BP02,arm) + Laser(AP06,arm) + null — weight=190, load=200 ✅
const LASER_CORPS_ROSTER: Roster = [
  { legsId: 'MP06', bodyId: 'BP06', weaponId: 'AP06', accessoryId: 'ACP06' },
  { legsId: 'MP08', bodyId: 'BP06', weaponId: 'AP07', accessoryId: null },
  { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP06', accessoryId: null },
]

// Speed Demons (Normal)
// Build A: Strider(MP06) + ReconFrame(BP06,arm) + Vulcan(AP01,arm) + SpeedBooster(ACP06) — weight=140, load=170 ✅
// Build B: Phantom(MP08) + ReconFrame(BP06,arm) + Shotgun(AP07,arm) + null — weight=110, load=120 ✅
// Build C: Strider(MP06) + LightFrame(BP01,arm) + Hammer(AP05,arm) + SpeedBooster(ACP06) — weight=170, load=170 ✅
const SPEED_DEMONS_ROSTER: Roster = [
  { legsId: 'MP06', bodyId: 'BP06', weaponId: 'AP01', accessoryId: 'ACP06' },
  { legsId: 'MP08', bodyId: 'BP06', weaponId: 'AP07', accessoryId: null },
  { legsId: 'MP06', bodyId: 'BP01', weaponId: 'AP05', accessoryId: 'ACP06' },
]

// Rail Artillery (Hard)
// Build A: Tank(MP04) + SniperBay(BP04,top) + Railgun(AP08,top) + null — weight=310, load=350 ✅
// Build B: Tank(MP04) + Fortress(BP03,shoulder) + Missile(AP04,shoulder) + null — weight=330, load=350 ✅
// Build C: Goliath(MP07) + ReconFrame(BP06,arm) + Laser(AP06,arm) + HPModule(ACP04) — weight=155, load=280 ✅
const RAIL_ARTILLERY_ROSTER: Roster = [
  { legsId: 'MP04', bodyId: 'BP04', weaponId: 'AP08', accessoryId: null },
  { legsId: 'MP04', bodyId: 'BP03', weaponId: 'AP04', accessoryId: null },
  { legsId: 'MP07', bodyId: 'BP06', weaponId: 'AP06', accessoryId: 'ACP04' },
]

// Stealth Squad (Nightmare)
// Build A: Scout(MP01) + ReconFrame(BP06,arm) + Laser(AP06,arm) + StealthModule(ACP07) — weight=155, load=160 ✅
// Build B: Strider(MP06) + LightFrame(BP01,arm) + Vulcan(AP01,arm) + StealthModule(ACP07) — weight=155, load=170 ✅
// Build C: Walker(MP02) + ReconFrame(BP06,arm) + Shotgun(AP07,arm) + StealthModule(ACP07) — weight=135, load=200 ✅
const STEALTH_SQUAD_ROSTER: Roster = [
  { legsId: 'MP01', bodyId: 'BP06', weaponId: 'AP06', accessoryId: 'ACP07' },
  { legsId: 'MP06', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP07' },
  { legsId: 'MP02', bodyId: 'BP06', weaponId: 'AP07', accessoryId: 'ACP07' },
]

// Genesis AI (Nightmare - Boss)
// Build A: Tank(MP04) + SniperBay(BP04,top) + Railgun(AP08,top) + PowerChip(ACP01) — weight=330, load=350 ✅
// Build B: Goliath(MP07) + ReconFrame(BP06,arm) + Laser(AP06,arm) + HPModule(ACP04) — weight=155, load=280 ✅
// Build C: Strider(MP06) + LightFrame(BP01,arm) + Shotgun(AP07,arm) + SpeedBooster(ACP06) — weight=140, load=170 ✅
const GENESIS_AI_ROSTER: Roster = [
  { legsId: 'MP04', bodyId: 'BP04', weaponId: 'AP08', accessoryId: 'ACP01' },
  { legsId: 'MP07', bodyId: 'BP06', weaponId: 'AP06', accessoryId: 'ACP04' },
  { legsId: 'MP06', bodyId: 'BP01', weaponId: 'AP07', accessoryId: 'ACP06' },
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
  {
    name: 'Laser Corps',
    nameKo: '레이저 군단',
    difficulty: 'hard',
    roster: LASER_CORPS_ROSTER,
    ratios: [2, 2, 1],
    scout: {
      descriptionKo: '레이저와 정찰 프레임 조합. 관통 레이저로 다수 유닛을 동시에 타격한다.',
      strategyHintKo: '유닛을 분산 배치하여 관통 피해를 줄이고, 중장갑으로 버텨라.',
      tags: ['레이저', '정찰', '관통', '스트라이더'],
    },
  },
  {
    name: 'Speed Demons',
    nameKo: '스피드 데몬',
    difficulty: 'normal',
    roster: SPEED_DEMONS_ROSTER,
    ratios: [3, 2, 2],
    scout: {
      descriptionKo: '스트라이더와 팬텀 고속 유닛 위주. 빠른 속도로 기지를 기습한다.',
      strategyHintKo: '장거리 무기로 접근 전에 처리. 요새 시너지로 방어선 구축.',
      tags: ['스트라이더', '팬텀', '고속', '기습'],
    },
  },
  {
    name: 'Rail Artillery',
    nameKo: '레일 포병대',
    difficulty: 'hard',
    roster: RAIL_ARTILLERY_ROSTER,
    ratios: [2, 1, 2],
    scout: {
      descriptionKo: '레일건 + 탱크 중화력 조합. 충전 사격으로 원거리에서 유닛을 한 방에 격파한다.',
      strategyHintKo: '빠른 스카웃으로 레일건 사거리 안에 진입하여 충전 전에 처리.',
      tags: ['레일건', '탱크', '중화력', '원거리'],
    },
  },
  {
    name: 'Stealth Squad',
    nameKo: '스텔스 분대',
    difficulty: 'nightmare',
    roster: STEALTH_SQUAD_ROSTER,
    ratios: [2, 2, 1],
    scout: {
      descriptionKo: '스텔스 모듈 장착 유닛들. 공격 전까지 감지 불가. 기습에 특화되어 있다.',
      strategyHintKo: '넓은 시야의 정찰 유닛 배치. 스플래시 무기로 은폐 유닛도 함께 처리.',
      tags: ['스텔스', '은폐', '기습', '레이저'],
    },
  },
  {
    name: 'Genesis AI',
    nameKo: '제네시스 AI',
    difficulty: 'nightmare',
    roster: GENESIS_AI_ROSTER,
    ratios: [2, 2, 2],
    scout: {
      descriptionKo: '보스급 AI. 레일건, 레이저, 샷건 등 모든 신형 무기를 활용한 복합 전술.',
      strategyHintKo: '시너지 극대화 필수. 모든 스킬을 적절히 활용하고, 원거리+근거리 조합으로 대응.',
      tags: ['보스', '레일건', '레이저', '샷건', '복합전술'],
    },
  },
]
