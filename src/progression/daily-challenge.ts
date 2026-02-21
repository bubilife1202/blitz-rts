import { ENEMY_PRESETS } from '../data/enemies-data'

export type ChallengeConstraint =
  | { type: 'time-limit'; seconds: number }
  | { type: 'no-skill'; skillName: string }
  | { type: 'single-build' }
  | { type: 'speed-locked'; speed: number }

export interface DailyChallenge {
  readonly seed: number
  readonly enemyIndex: number
  readonly modifierKo: string
  readonly modifierEn: string
  readonly bonusGold: number
  readonly constraints: readonly ChallengeConstraint[]
}

const STORAGE_KEY = 'blitz-rts-daily-challenge'

interface DailyChallengeStorage {
  date: string
  completed: boolean
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function hashDateString(dateStr: string): number {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    const ch = dateStr.charCodeAt(i)
    hash = ((hash << 5) - hash + ch) | 0
  }
  return Math.abs(hash)
}

export function getDailyChallenge(): DailyChallenge {
  const today = getTodayString()
  const seed = hashDateString(today)
  const enemyIndex = seed % ENEMY_PRESETS.length
  const modifierIndex = Math.floor(seed / 7) % 5

  let modifierKo: string
  let modifierEn: string
  const constraints: ChallengeConstraint[] = []

  switch (modifierIndex) {
    case 0:
      modifierKo = '\uC2DC\uAC04 \uC81C\uD55C 2\uBD84'
      modifierEn = '2-Minute Time Limit'
      constraints.push({ type: 'time-limit', seconds: 120 })
      break
    case 1:
      modifierKo = '\uB2E8\uC77C \uBE4C\uB4DC'
      modifierEn = 'Single Build'
      constraints.push({ type: 'single-build' })
      break
    case 2:
      modifierKo = '\uC2A4\uD0AC \uC81C\uD55C'
      modifierEn = 'Skill Restriction'
      constraints.push({ type: 'no-skill', skillName: 'third' })
      break
    case 3:
      modifierKo = '\uAC15\uD654\uB41C \uC801'
      modifierEn = 'Enhanced Enemy'
      break
    case 4:
      modifierKo = '\uC18D\uB3C4 \uACE0\uC815 1x'
      modifierEn = 'Speed Locked 1x'
      constraints.push({ type: 'speed-locked', speed: 1 })
      break
    default:
      modifierKo = '\uC2DC\uAC04 \uC81C\uD55C 2\uBD84'
      modifierEn = '2-Minute Time Limit'
      constraints.push({ type: 'time-limit', seconds: 120 })
  }

  return {
    seed,
    enemyIndex,
    modifierKo,
    modifierEn,
    bonusGold: 200,
    constraints,
  }
}

function loadStorage(): DailyChallengeStorage | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DailyChallengeStorage
  } catch {
    return null
  }
}

function saveStorage(data: DailyChallengeStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage unavailable
  }
}

export function isDailyChallengeCompleted(): boolean {
  const today = getTodayString()
  const stored = loadStorage()
  if (!stored) return false
  return stored.date === today && stored.completed
}

export function completeDailyChallenge(): void {
  const today = getTodayString()
  saveStorage({ date: today, completed: true })
}
