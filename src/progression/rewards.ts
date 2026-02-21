// ─── Campaign Mission Rewards ──────────────────────────────────────────────

import type { PartId } from '../core/types'

export interface MissionReward {
  gold: number
  parts: PartId[]
  labelKo: string
}

export interface ClaimedRewardResult {
  reward: MissionReward
  newParts: PartId[]   // parts that were actually new (not already owned)
}

const STORAGE_KEY = 'blitz-rts-claimed-rewards'

export const MISSION_REWARDS: Record<number, MissionReward> = {
  0: { gold: 50,  parts: ['MP02'],          labelKo: '워커 다리 해금' },
  1: { gold: 75,  parts: ['BP02'],          labelKo: '스탠다드 바디 해금' },
  2: { gold: 100, parts: ['AP03'],          labelKo: '스나이퍼 해금' },
  3: { gold: 100, parts: ['ACP02'],         labelKo: '실드젠 해금' },
  4: { gold: 150, parts: ['MP04'],          labelKo: '탱크 다리 해금' },
  5: { gold: 150, parts: ['AP04'],          labelKo: '미사일 해금' },
  6: { gold: 200, parts: ['BP04'],          labelKo: '스나이퍼 베이 해금' },
  7: { gold: 200, parts: ['AP06', 'ACP05'], labelKo: '레이저 & 오버드라이브 해금' },
  8: { gold: 250, parts: ['MP08', 'AP08'],  labelKo: '팬텀 & 레일건 해금' },
  9: { gold: 500, parts: ['BP05', 'ACP07'], labelKo: '저거너트 & 스텔스 해금' },
}

function readClaimed(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed as number[])
  } catch {
    return new Set()
  }
}

function writeClaimed(claimed: Set<number>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...claimed]))
  } catch {
    // localStorage unavailable
  }
}

export function isRewardClaimed(missionIndex: number): boolean {
  return readClaimed().has(missionIndex)
}

/**
 * Claim the reward for a mission. Returns the reward details if unclaimed,
 * or null if already claimed or no reward exists for this mission.
 */
export function claimMissionReward(
  missionIndex: number,
  ownedParts: Set<PartId>,
): ClaimedRewardResult | null {
  const reward = MISSION_REWARDS[missionIndex]
  if (!reward) return null

  if (isRewardClaimed(missionIndex)) return null

  const claimed = readClaimed()
  claimed.add(missionIndex)
  writeClaimed(claimed)

  const newParts = reward.parts.filter(p => !ownedParts.has(p))

  return { reward, newParts }
}
