import type { PartnerPersonalityId, SkillName } from '../core/types'
import type { BattleUnit } from '../combat/unit'
import { isAlive } from '../combat/unit'
import type { Base } from '../combat/battlefield'
import type { CalloutMessage, CalloutPriority } from './types'

const DISPLAY_DURATION = 2.5

// ─── Trigger State Tracking ──────────────────────────

export interface CalloutTriggerState {
  lastKillTime: number
  killCount: number
  battleStarted: boolean
  lastPlayerSkillTime: number
  lastPlayerSkillName: SkillName | null
}

export function createCalloutTriggerState(): CalloutTriggerState {
  return {
    lastKillTime: -999,
    killCount: 0,
    battleStarted: false,
    lastPlayerSkillTime: -999,
    lastPlayerSkillName: null,
  }
}

// ─── Per-personality Korean callout text ─────────────

interface CalloutText {
  readonly baseDanger: readonly string[]
  readonly heavyEnemy: readonly string[]
  readonly skillAnnounce: Record<string, readonly string[]>
  readonly comboReaction: readonly string[]
  readonly killStreak: readonly string[]
  readonly battleStart: readonly string[]
  readonly battleWin: readonly string[]
  readonly battleLose: readonly string[]
}

const CALLOUT_TEXT: Record<PartnerPersonalityId, CalloutText> = {
  vanguard: {
    baseDanger: ['기지가 위험하다! 후퇴하자!', '기지 방어 필요! 적이 밀고 온다!'],
    heavyEnemy: ['대형기 포착! 집중 공격!', '적 중장갑기 발견!'],
    skillAnnounce: {
      'EMP Strike': ['EMP 발사! 적 시스템 정지!'],
      'Focus Fire': ['표적 지정! 한 놈만 팬다!'],
      'Overcharge': ['에너지 부스트! 전력 생산 가속!'],
    },
    comboReaction: ['좋은 타이밍! 콤보 들어간다!', '나도 맞춰서 간다!'],
    killStreak: ['파괴! 파괴! 멈추지 않는다!', '연속 격파! 이 기세를 이어가자!'],
    battleStart: ['출격이다! 전부 쓸어버려!', '카이-7, 출격 준비 완료!'],
    battleWin: ['임무 완료! 깔끔했다!'],
    battleLose: ['...다음엔 반드시.'],
  },
  bastion: {
    baseDanger: ['기지 피해 심각. 방어 전환 권고.', '기지 HP 30% 이하. 긴급 방어 필요.'],
    heavyEnemy: ['고비용 적 유닛 탐지. 주의 바람.', '중장갑 적 접근 중. 화력 집중 요청.'],
    skillAnnounce: {
      'Shield Burst': ['보호막 전개. 3초간 무적.'],
      'Repair Pulse': ['수리 파동 발동. 아군 HP 회복.'],
      'Scramble': ['적 조준 교란 개시.'],
    },
    comboReaction: ['연계 확인. 효과 증폭.', '합동 스킬 연계 성공.'],
    killStreak: ['효율적인 전투. 계속 유지.', '연속 처리 완료.'],
    battleStart: ['미라-3, 전투 태세 완료. 방어선 구축 개시.'],
    battleWin: ['작전 성공. 피해 분석 중.'],
    battleLose: ['패배 기록. 전략 재검토 필요.'],
  },
  artillery: {
    baseDanger: ['기지 위험 수준 도달. 원거리 엄호 전환.', '기지 방어 불가 시 후퇴 고려.'],
    heavyEnemy: ['고가치 표적 포착. 저격 준비.', '대형 적 발견. 정밀 사격 개시.'],
    skillAnnounce: {
      'Focus Fire': ['표적 고정. 집중 사격.'],
      'Overcharge': ['발전기 과부하. 에너지 급속 충전.'],
      'EMP Strike': ['전자기 펄스 발사. 적 제어계 교란.'],
    },
    comboReaction: ['타이밍 맞았다. 연계 공격 가능.', '합동 사격 개시.'],
    killStreak: ['연속 명중. 사격 패턴 유지.', '3연속 격파. 탄도 계산 정확.'],
    battleStart: ['제로-9, 사격 위치 확보. 전투 개시.'],
    battleWin: ['전투 종료. 명중률 분석 중.'],
    battleLose: ['사격 데이터 부족. 재조정 필요.'],
  },
  support: {
    baseDanger: ['기지가 위험해요! 빨리 돌아가야 해요!', '기지 HP가 낮아요! 치료 준비할게요!'],
    heavyEnemy: ['큰 적이 온다! 조심해요!', '강한 적 발견! 같이 상대해요!'],
    skillAnnounce: {
      'Repair Pulse': ['치료 시작! 모두 버텨요!'],
      'Shield Burst': ['보호막 올릴게요! 지금이에요!'],
      'Overcharge': ['에너지 충전! 힘내요!'],
    },
    comboReaction: ['우와, 멋져요! 나도 이어갈게요!', '호흡이 딱 맞았어요!'],
    killStreak: ['대단해요! 계속 가요!', '연속 격파! 최고예요!'],
    battleStart: ['루나-5, 출격! 모두 무사하길!', '같이 힘내요! 파이팅!'],
    battleWin: ['이겼다! 다들 수고했어요!'],
    battleLose: ['괜찮아요... 다음에 꼭 이길 수 있어요.'],
  },
}

function pick(arr: readonly string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function msg(
  speaker: PartnerPersonalityId,
  priority: CalloutPriority,
  text: string,
): CalloutMessage {
  return { priority, text, speaker, duration: DISPLAY_DURATION }
}

// ─── Trigger Checks ─────────────────────────────────

export function checkBaseDanger(
  speaker: PartnerPersonalityId,
  alliedBase: Base,
): CalloutMessage | null {
  if (alliedBase.hp / alliedBase.maxHp < 0.3) {
    return msg(speaker, 'CRITICAL', pick(CALLOUT_TEXT[speaker].baseDanger))
  }
  return null
}

export function checkHeavyEnemy(
  speaker: PartnerPersonalityId,
  enemyUnits: readonly BattleUnit[],
): CalloutMessage | null {
  const heavy = enemyUnits.find(u => isAlive(u) && u.wattCost > 150)
  if (heavy) {
    return msg(speaker, 'TACTICAL', pick(CALLOUT_TEXT[speaker].heavyEnemy))
  }
  return null
}

export function checkSkillAnnounce(
  speaker: PartnerPersonalityId,
  skillName: SkillName,
): CalloutMessage | null {
  const texts = CALLOUT_TEXT[speaker].skillAnnounce[skillName]
  if (texts && texts.length > 0) {
    return msg(speaker, 'TACTICAL', pick(texts))
  }
  return null
}

export function checkComboReaction(
  speaker: PartnerPersonalityId,
  triggerState: CalloutTriggerState,
  currentTime: number,
): CalloutMessage | null {
  if (
    triggerState.lastPlayerSkillName &&
    currentTime - triggerState.lastPlayerSkillTime < 3
  ) {
    return msg(speaker, 'REACTION', pick(CALLOUT_TEXT[speaker].comboReaction))
  }
  return null
}

export function checkKillStreak(
  speaker: PartnerPersonalityId,
  triggerState: CalloutTriggerState,
  currentTime: number,
  newKill: boolean,
): CalloutMessage | null {
  if (newKill) {
    if (currentTime - triggerState.lastKillTime < 5) {
      triggerState.killCount++
    } else {
      triggerState.killCount = 1
    }
    triggerState.lastKillTime = currentTime
  }
  if (triggerState.killCount >= 3) {
    triggerState.killCount = 0
    return msg(speaker, 'FLAVOR', pick(CALLOUT_TEXT[speaker].killStreak))
  }
  return null
}

export function getBattleStartCallout(
  speaker: PartnerPersonalityId,
): CalloutMessage {
  return msg(speaker, 'FLAVOR', pick(CALLOUT_TEXT[speaker].battleStart))
}

export function getBattleEndCallout(
  speaker: PartnerPersonalityId,
  won: boolean,
): CalloutMessage {
  const text = won
    ? pick(CALLOUT_TEXT[speaker].battleWin)
    : pick(CALLOUT_TEXT[speaker].battleLose)
  return msg(speaker, 'FLAVOR', text)
}

export function recordPlayerSkill(
  triggerState: CalloutTriggerState,
  skillName: SkillName,
  currentTime: number,
): void {
  triggerState.lastPlayerSkillTime = currentTime
  triggerState.lastPlayerSkillName = skillName
}
