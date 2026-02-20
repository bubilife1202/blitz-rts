import type { Roster } from '../core/types'
import type { MissionDefinition } from './types'

// Enemy rosters (verified valid builds from enemies-data.ts)

const ROOKIE_BOT_ROSTER: Roster = [
  { legsId: 'MP02', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP01' },
  { legsId: 'MP02', bodyId: 'BP01', weaponId: 'AP05', accessoryId: null },
  { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: null },
]

const TANK_COMMANDER_ROSTER: Roster = [
  { legsId: 'MP04', bodyId: 'BP05', weaponId: 'AP02', accessoryId: null },
  { legsId: 'MP04', bodyId: 'BP03', weaponId: 'AP04', accessoryId: 'ACP03' },
  { legsId: 'MP02', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP03' },
]

const SWARM_MASTER_ROSTER: Roster = [
  { legsId: 'MP01', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP01' },
  { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: 'ACP03' },
  { legsId: 'MP03', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP03' },
]

const SNIPER_ELITE_ROSTER: Roster = [
  { legsId: 'MP05', bodyId: 'BP04', weaponId: 'AP03', accessoryId: 'ACP05' },
  { legsId: 'MP04', bodyId: 'BP03', weaponId: 'AP02', accessoryId: null },
  { legsId: 'MP02', bodyId: 'BP01', weaponId: 'AP05', accessoryId: 'ACP04' },
]

const OMEGA_SQUAD_ROSTER: Roster = [
  { legsId: 'MP04', bodyId: 'BP05', weaponId: 'AP02', accessoryId: null },
  { legsId: 'MP05', bodyId: 'BP04', weaponId: 'AP03', accessoryId: 'ACP05' },
  { legsId: 'MP04', bodyId: 'BP03', weaponId: 'AP04', accessoryId: 'ACP01' },
]

// Double enemy: two heavy tanks + fast scout
// Tank(350) + Juggernaut(shoulder,200) + Missile(shoulder,130) + null = 330 <= 350
// Tank(350) + Fortress(shoulder,200) + Cannon(shoulder,150) + null = 350 <= 350
// Scout(160) + LightFrame(arm,50) + Vulcan(arm,80) + PowerChip(20) = 150 <= 160
const DOUBLE_ENEMY_ROSTER: Roster = [
  { legsId: 'MP04', bodyId: 'BP05', weaponId: 'AP04', accessoryId: null },
  { legsId: 'MP04', bodyId: 'BP03', weaponId: 'AP02', accessoryId: null },
  { legsId: 'MP01', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP01' },
]

// Enhanced sniper: double sniper focus
// Spider(300) + SniperBay(top,150) + Sniper(top,120) + PowerChip(20) = 290 <= 300
// Spider(300) + SniperBay(top,150) + Sniper(top,120) + Overdrive(30) = 300 <= 300
// Walker(200) + Standard(arm,100) + Hammer(arm,100) + null = 200 <= 200
const ENHANCED_SNIPER_ROSTER: Roster = [
  { legsId: 'MP05', bodyId: 'BP04', weaponId: 'AP03', accessoryId: 'ACP01' },
  { legsId: 'MP05', bodyId: 'BP04', weaponId: 'AP03', accessoryId: 'ACP05' },
  { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP05', accessoryId: null },
]

// 8-wave heavy: mixed heavy with missile spam
// Tank(350) + Fortress(shoulder,200) + Missile(shoulder,130) + PowerChip(20) = 350 <= 350
// Tank(350) + Juggernaut(shoulder,200) + Cannon(shoulder,150) + null = 350 <= 350
// Walker(200) + Standard(arm,100) + Vulcan(arm,80) + MiserCore(15) = 195 <= 200
const HEAVY_WAVE_ROSTER: Roster = [
  { legsId: 'MP04', bodyId: 'BP03', weaponId: 'AP04', accessoryId: 'ACP01' },
  { legsId: 'MP04', bodyId: 'BP05', weaponId: 'AP02', accessoryId: null },
  { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP01', accessoryId: 'ACP03' },
]

// 5-wave survival: mixed swarm
// Scout(160) + LightFrame(arm,50) + Vulcan(arm,80) + MiserCore(15) = 145 <= 160
// Hover(150) + LightFrame(arm,50) + Vulcan(arm,80) + MiserCore(15) = 145 <= 150
// Walker(200) + Standard(arm,100) + Hammer(arm,100) + null = 200 <= 200
const SURVIVAL_WAVE_ROSTER: Roster = [
  { legsId: 'MP01', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP03' },
  { legsId: 'MP03', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP03' },
  { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP05', accessoryId: null },
]

// Genesis AI boss roster (from enemies-data.ts, uses new parts MP06-MP08, AP06-AP08, etc.)
// Falls back to base parts for mission-data since new parts may not be added yet
// Tank(350) + Juggernaut(shoulder,200) + Cannon(shoulder,150) + null = 350 <= 350
// Spider(300) + SniperBay(top,150) + Sniper(top,120) + Overdrive(30) = 300 <= 300
// Scout(160) + LightFrame(arm,50) + Vulcan(arm,80) + PowerChip(20) = 150 <= 160
const GENESIS_BOSS_ROSTER: Roster = [
  { legsId: 'MP04', bodyId: 'BP05', weaponId: 'AP02', accessoryId: null },
  { legsId: 'MP05', bodyId: 'BP04', weaponId: 'AP03', accessoryId: 'ACP05' },
  { legsId: 'MP01', bodyId: 'BP01', weaponId: 'AP01', accessoryId: 'ACP01' },
]

export const MISSIONS: readonly MissionDefinition[] = [
  // ─── Mission 1: 첫 출격 (First Sortie) ───────────────
  {
    id: 1,
    title: 'First Sortie',
    titleKo: '첫 출격',
    partnerId: 'support',
    enemyName: 'Rookie Bot',
    enemyRoster: ROOKIE_BOT_ROSTER,
    enemyRatios: [2, 1, 1],
    baseHp: 3000,
    enemyBaseHp: 1500,
    timeLimitSeconds: 300,
    specialConditions: ['tutorial'],
    preDialogue: [
      { speaker: 'LUNA-5', emotion: 'excited', text: '첫 실전이에요! 긴장되지만... 같이 힘내요!' },
      { speaker: 'Commander', emotion: 'neutral', text: '루나, 신입 파일럿을 지원해라. 적은 구형 AI다.' },
      { speaker: 'LUNA-5', emotion: 'happy', text: '네! 제가 옆에서 도와줄게요. 걱정 마세요!' },
    ],
    postDialogueWin: [
      { speaker: 'LUNA-5', emotion: 'happy', text: '해냈어요! 첫 승리 축하해요!' },
      { speaker: 'Commander', emotion: 'neutral', text: '좋은 시작이다. 다음은 더 어려울 거다.' },
    ],
    postDialogueLose: [
      { speaker: 'LUNA-5', emotion: 'worried', text: '괜찮아요... 다시 해보면 돼요!' },
      { speaker: 'Commander', emotion: 'neutral', text: '기지 방어를 재정비하자.' },
    ],
  },

  // ─── Mission 2: 방벽 너머 (Beyond the Barrier) ────────
  {
    id: 2,
    title: 'Beyond the Barrier',
    titleKo: '방벽 너머',
    partnerId: 'support',
    enemyName: 'Tank Commander',
    enemyRoster: TANK_COMMANDER_ROSTER,
    enemyRatios: [2, 2, 1],
    baseHp: 3000,
    enemyBaseHp: 3000,
    timeLimitSeconds: 300,
    specialConditions: ['role-learning'],
    preDialogue: [
      { speaker: 'LUNA-5', emotion: 'worried', text: '이번 적은 탱크 위주래요. 단단할 거예요.' },
      { speaker: 'Commander', emotion: 'neutral', text: '방벽 너머에 적 기지가 있다. 중장갑에 대비해라.' },
      { speaker: 'LUNA-5', emotion: 'neutral', text: '제가 치료를 맡을 테니, 화력에 집중해 주세요!' },
    ],
    postDialogueWin: [
      { speaker: 'LUNA-5', emotion: 'happy', text: '역시! 호흡이 잘 맞아요!' },
      { speaker: 'Commander', emotion: 'neutral', text: '방벽 돌파 확인. 다음 구역으로 이동한다.' },
    ],
    postDialogueLose: [
      { speaker: 'LUNA-5', emotion: 'worried', text: '적 장갑이 너무 두꺼워요... 빌드를 바꿔볼까요?' },
      { speaker: 'Commander', emotion: 'neutral', text: '장비를 재정비하고 재출격.' },
    ],
  },

  // ─── Mission 3: 철풍과의 만남 (Meeting Iron Wind) ──────
  {
    id: 3,
    title: 'Meeting Iron Wind',
    titleKo: '철풍과의 만남',
    partnerId: 'vanguard',
    enemyName: 'Swarm Master',
    enemyRoster: SWARM_MASTER_ROSTER,
    enemyRatios: [3, 3, 2],
    baseHp: 3000,
    enemyBaseHp: 3000,
    timeLimitSeconds: 180,
    specialConditions: ['time-limit-3min', 'unlock-vanguard'],
    preDialogue: [
      { speaker: 'KAI-7', emotion: 'excited', text: '드디어 실전이냐? 좋아, 보여주지.' },
      { speaker: 'Commander', emotion: 'neutral', text: '카이, 적 물량이 많다. 3분 안에 끝내라.' },
      { speaker: 'KAI-7', emotion: 'angry', text: '3분? 1분이면 충분하다.' },
      { speaker: 'LUNA-5', emotion: 'worried', text: '카이 선배... 무리하지 마세요...' },
    ],
    postDialogueWin: [
      { speaker: 'KAI-7', emotion: 'happy', text: '어때? 이게 철풍의 전투야.' },
      { speaker: 'Commander', emotion: 'neutral', text: '카이-7 합류 확인. 전력이 강화됐다.' },
    ],
    postDialogueLose: [
      { speaker: 'KAI-7', emotion: 'angry', text: '시간이 부족했어... 다음엔 더 빨리 간다.' },
      { speaker: 'Commander', emotion: 'neutral', text: '시간 관리를 재검토하라.' },
    ],
  },

  // ─── Mission 4: 정밀 타격 (Precision Strike) ──────────
  {
    id: 4,
    title: 'Precision Strike',
    titleKo: '정밀 타격',
    partnerId: 'artillery',
    enemyName: 'Sniper Elite',
    enemyRoster: SNIPER_ELITE_ROSTER,
    enemyRatios: [2, 1, 2],
    baseHp: 3000,
    enemyBaseHp: 3000,
    timeLimitSeconds: 300,
    specialConditions: ['unlock-artillery'],
    preDialogue: [
      { speaker: 'ZERO-9', emotion: 'neutral', text: '적 저격수 다수 확인. 사격 패턴 분석 중.' },
      { speaker: 'Commander', emotion: 'neutral', text: '제로-9, 이번 작전은 정밀 타격이다.' },
      { speaker: 'ZERO-9', emotion: 'neutral', text: '오차 범위 0.3%. 문제없다.' },
    ],
    postDialogueWin: [
      { speaker: 'ZERO-9', emotion: 'happy', text: '명중률 98.7%. 만족스러운 결과다.' },
      { speaker: 'Commander', emotion: 'neutral', text: '제로-9 합류 확인. 원거리 전력 확보.' },
    ],
    postDialogueLose: [
      { speaker: 'ZERO-9', emotion: 'neutral', text: '...탄도 데이터 재계산 필요.' },
      { speaker: 'Commander', emotion: 'neutral', text: '적 저격수 위치를 재분석하라.' },
    ],
  },

  // ─── Mission 5: 끝없는 파도 (Endless Waves) ──────────
  {
    id: 5,
    title: 'Endless Waves',
    titleKo: '끝없는 파도',
    partnerId: 'choice',
    enemyName: 'Survival Wave',
    enemyRoster: SURVIVAL_WAVE_ROSTER,
    enemyRatios: [3, 3, 2],
    baseHp: 3000,
    enemyBaseHp: 3000,
    timeLimitSeconds: 300,
    specialConditions: ['5-wave-survival'],
    preDialogue: [
      { speaker: 'Commander', emotion: 'worried', text: '끝없는 적 물결이 몰려온다. 파트너를 선택하라.' },
      { speaker: 'Commander', emotion: 'neutral', text: '5차 파도까지 기지를 지켜라.' },
    ],
    postDialogueWin: [
      { speaker: 'Commander', emotion: 'happy', text: '전 파도 격퇴 확인! 훌륭했다.' },
    ],
    postDialogueLose: [
      { speaker: 'Commander', emotion: 'worried', text: '기지 함락... 방어 전략을 재수립하라.' },
    ],
  },

  // ─── Mission 6: 포위 돌파 (Breaking the Siege) ────────
  {
    id: 6,
    title: 'Breaking the Siege',
    titleKo: '포위 돌파',
    partnerId: 'bastion',
    enemyName: 'Double Force',
    enemyRoster: DOUBLE_ENEMY_ROSTER,
    enemyRatios: [2, 2, 2],
    baseHp: 3000,
    enemyBaseHp: 3000,
    timeLimitSeconds: 300,
    specialConditions: ['double-enemy', 'reduced-watt', 'unlock-bastion'],
    preDialogue: [
      { speaker: 'MIRA-3', emotion: 'neutral', text: '적 전력이 2배. 에너지 공급도 제한적이다.' },
      { speaker: 'Commander', emotion: 'worried', text: '포위당했다. 미라-3, 방어선을 지켜라.' },
      { speaker: 'MIRA-3', emotion: 'neutral', text: '철벽은 무너지지 않는다. 계산대로 진행하겠다.' },
    ],
    postDialogueWin: [
      { speaker: 'MIRA-3', emotion: 'happy', text: '포위 돌파 완료. 피해율 예상치 이하.' },
      { speaker: 'Commander', emotion: 'neutral', text: '미라-3 합류. 방어 전력 대폭 강화.' },
    ],
    postDialogueLose: [
      { speaker: 'MIRA-3', emotion: 'neutral', text: '방어선 붕괴. 변수 재계산 필요.' },
      { speaker: 'Commander', emotion: 'worried', text: '에너지 배분을 재검토하자.' },
    ],
  },

  // ─── Mission 7: 교차 작전 (Cross Operation) ───────────
  {
    id: 7,
    title: 'Cross Operation',
    titleKo: '교차 작전',
    partnerId: 'choice',
    enemyName: 'Omega Squad',
    enemyRoster: OMEGA_SQUAD_ROSTER,
    enemyRatios: [2, 2, 1],
    baseHp: 4500,
    enemyBaseHp: 3000,
    timeLimitSeconds: 300,
    specialConditions: ['base-hp-bonus-50%'],
    preDialogue: [
      { speaker: 'Commander', emotion: 'neutral', text: '오메가 스쿼드가 온다. 파트너를 선택하라.' },
      { speaker: 'Commander', emotion: 'neutral', text: '기지 보강이 완료됐다. HP 50% 추가.' },
      { speaker: 'Commander', emotion: 'worried', text: '하지만 적도 강하다. 교차 작전으로 돌파하라.' },
    ],
    postDialogueWin: [
      { speaker: 'Commander', emotion: 'happy', text: '오메가 스쿼드 격퇴! 교차 작전 성공.' },
    ],
    postDialogueLose: [
      { speaker: 'Commander', emotion: 'angry', text: '기지 보강에도 불구하고... 전략을 바꿔야 한다.' },
    ],
  },

  // ─── Mission 8: 이중 저격 (Double Sniper) ─────────────
  {
    id: 8,
    title: 'Double Sniper',
    titleKo: '이중 저격',
    partnerId: 'artillery',
    enemyName: 'Enhanced Sniper',
    enemyRoster: ENHANCED_SNIPER_ROSTER,
    enemyRatios: [2, 2, 1],
    baseHp: 3000,
    enemyBaseHp: 3000,
    timeLimitSeconds: 300,
    specialConditions: ['forced-team-synergy'],
    preDialogue: [
      { speaker: 'ZERO-9', emotion: 'neutral', text: '적 저격수 강화형 2기 확인. 흥미롭군.' },
      { speaker: 'Commander', emotion: 'neutral', text: '이번엔 팀 시너지가 핵심이다. 같은 기동 타입으로 맞춰라.' },
      { speaker: 'ZERO-9', emotion: 'neutral', text: '동일 기동 타입 시너지 공격력 +5%. 최적 해를 계산하겠다.' },
    ],
    postDialogueWin: [
      { speaker: 'ZERO-9', emotion: 'happy', text: '이중 저격 성공. 시너지 효과 확인 완료.' },
    ],
    postDialogueLose: [
      { speaker: 'ZERO-9', emotion: 'neutral', text: '시너지 불충분. 기동 타입을 맞춰라.' },
    ],
  },

  // ─── Mission 9: 최후의 방어선 (Last Defense Line) ──────
  {
    id: 9,
    title: 'Last Defense Line',
    titleKo: '최후의 방어선',
    partnerId: 'bastion',
    enemyName: 'Heavy Wave',
    enemyRoster: HEAVY_WAVE_ROSTER,
    enemyRatios: [2, 2, 2],
    baseHp: 4000,
    enemyBaseHp: 3000,
    timeLimitSeconds: 480,
    specialConditions: ['8-wave-endurance'],
    preDialogue: [
      { speaker: 'MIRA-3', emotion: 'neutral', text: '8차 파도 예상. 장기전 준비 완료.' },
      { speaker: 'Commander', emotion: 'worried', text: '최후의 방어선이다. 여기서 무너지면 끝이다.' },
      { speaker: 'MIRA-3', emotion: 'neutral', text: '기지 HP 4000. 방어력 최대치로 배분한다.' },
      { speaker: 'MIRA-3', emotion: 'neutral', text: '철벽을 믿어라. 한 발짝도 물러서지 않는다.' },
    ],
    postDialogueWin: [
      { speaker: 'MIRA-3', emotion: 'happy', text: '8차 파도 전멸. 방어선 유지 성공.' },
      { speaker: 'Commander', emotion: 'happy', text: '최후의 방어선을 지켰다! 이제 최종 작전만 남았다.' },
    ],
    postDialogueLose: [
      { speaker: 'MIRA-3', emotion: 'worried', text: '방어선 돌파당함. 철벽의 한계인가...' },
      { speaker: 'Commander', emotion: 'angry', text: '기지를 잃었다... 재정비 후 재도전.' },
    ],
  },

  // ─── Mission 10: 기원 (Genesis) ───────────────────────
  {
    id: 10,
    title: 'Genesis',
    titleKo: '기원',
    partnerId: 'choice',
    enemyName: 'Genesis AI',
    enemyRoster: GENESIS_BOSS_ROSTER,
    enemyRatios: [2, 2, 2],
    baseHp: 3000,
    enemyBaseHp: 5000,
    timeLimitSeconds: 600,
    specialConditions: ['boss-battle', 'rotating-partners'],
    preDialogue: [
      { speaker: 'Commander', emotion: 'worried', text: '제네시스 AI... 모든 전투 데이터를 학습한 최종 적이다.' },
      { speaker: 'KAI-7', emotion: 'excited', text: '드디어 최종 보스냐? 전부 쓸어버려 주지!' },
      { speaker: 'ZERO-9', emotion: 'neutral', text: '적 기지 HP 5000. 10분 안에 돌파해야 한다.' },
      { speaker: 'MIRA-3', emotion: 'neutral', text: '4인 교대 작전. 각자의 역할에 집중하라.' },
      { speaker: 'LUNA-5', emotion: 'worried', text: '모두... 무사하길 바라요. 끝까지 함께 해요!' },
    ],
    postDialogueWin: [
      { speaker: 'LUNA-5', emotion: 'happy', text: '해냈어요...! 정말 해냈어요!' },
      { speaker: 'KAI-7', emotion: 'happy', text: '하! 이게 우리 팀의 힘이다!' },
      { speaker: 'ZERO-9', emotion: 'happy', text: '제네시스 AI 완전 정지 확인. 임무 완료.' },
      { speaker: 'MIRA-3', emotion: 'happy', text: '전원 생존. 최상의 결과다.' },
      { speaker: 'Commander', emotion: 'happy', text: '...수고했다. 모두.' },
    ],
    postDialogueLose: [
      { speaker: 'Commander', emotion: 'angry', text: '제네시스가 너무 강하다... 하지만 포기할 수 없다.' },
      { speaker: 'LUNA-5', emotion: 'worried', text: '다시... 다시 해봐요. 우리라면 할 수 있어요.' },
    ],
  },
]

export function getMissionById(id: number): MissionDefinition | undefined {
  return MISSIONS.find(m => m.id === id)
}
