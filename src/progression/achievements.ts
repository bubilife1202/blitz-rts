// ─── Achievement / Medal System ──────────────────────────────────────────────

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  condition: (stats: BattleEndStats) => boolean
}

export interface BattleEndStats {
  outcome: 'player_win' | 'enemy_win' | 'draw'
  elapsedSeconds: number
  totalKills: number
  totalDeaths: number
  totalDamage: number
  baseHpPct: number
  enemyId: string
}

export interface UnlockedAchievement {
  id: string
  unlockedAt: number
}

const STORAGE_KEY = 'blitz-rts-achievements'

const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-victory',
    name: '첫 승리',
    description: '첫 전투에서 승리',
    icon: '⚔️',
    condition: (s) => s.outcome === 'player_win',
  },
  {
    id: 'speedrun',
    name: '신속 작전',
    description: '60초 안에 승리',
    icon: '⚡',
    condition: (s) => s.outcome === 'player_win' && s.elapsedSeconds < 60,
  },
  {
    id: 'flawless',
    name: '무피해',
    description: '유닛 손실 없이 승리',
    icon: '🛡️',
    condition: (s) => s.outcome === 'player_win' && s.totalDeaths === 0,
  },
  {
    id: 'killer',
    name: '학살자',
    description: '한 전투에서 10킬 이상',
    icon: '💀',
    condition: (s) => s.totalKills >= 10,
  },
  {
    id: 'survivor',
    name: '생존자',
    description: '기지 HP 10% 이하에서 승리',
    icon: '❤️',
    condition: (s) => s.outcome === 'player_win' && s.baseHpPct <= 0.1,
  },
  {
    id: 'three-star',
    name: '완벽한 작전',
    description: '3성 획득',
    icon: '⭐',
    condition: (s) => {
      if (s.outcome !== 'player_win') return false
      // 3-star logic mirrors result-ui.ts: win < 60s or 0 deaths
      return s.elapsedSeconds < 60 || s.totalDeaths === 0
    },
  },
  {
    id: 'win-streak-3',
    name: '연승의 시작',
    description: '3연승 달성',
    icon: '🔥',
    condition: () => getWinStreak() >= 3,
  },
  {
    id: 'win-streak-5',
    name: '불멸의 사령관',
    description: '5연승 달성',
    icon: '🏆',
    condition: () => getWinStreak() >= 5,
  },
  {
    id: 'campaign-clear',
    name: '캠페인 클리어',
    description: '캠페인 완료',
    icon: '🎯',
    // Unlocked externally via unlockById
    condition: () => false,
  },
  {
    id: 'all-weapons',
    name: '무기 수집가',
    description: '모든 무기 타입 구매',
    icon: '🔧',
    // Unlocked externally via unlockById
    condition: () => false,
  },
  {
    id: 'high-damage',
    name: '데미지 딜러',
    description: '한 전투에서 5000 이상 데미지',
    icon: '💥',
    condition: (s) => s.totalDamage >= 5000,
  },
  {
    id: 'economist',
    name: '절약가',
    description: '1000골드 이상 보유',
    icon: '💰',
    // Unlocked externally via unlockById
    condition: () => false,
  },
] as const

// ─── Win streak tracking ────────────────────────────────────────────────────

const STREAK_KEY = 'blitz-rts-win-streak'

function getWinStreak(): number {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    return raw ? parseInt(raw, 10) || 0 : 0
  } catch {
    return 0
  }
}

function updateWinStreak(outcome: 'player_win' | 'enemy_win' | 'draw'): void {
  try {
    if (outcome === 'player_win') {
      localStorage.setItem(STREAK_KEY, String(getWinStreak() + 1))
    } else {
      localStorage.setItem(STREAK_KEY, '0')
    }
  } catch {
    // localStorage unavailable
  }
}

// ─── Persistence ────────────────────────────────────────────────────────────

function readStore(): UnlockedAchievement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as UnlockedAchievement[]
  } catch {
    return []
  }
}

function writeStore(data: UnlockedAchievement[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage unavailable
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function getAllAchievements(): Achievement[] {
  return [...ACHIEVEMENTS]
}

export function getUnlockedAchievements(): UnlockedAchievement[] {
  return readStore()
}

export function isUnlocked(id: string): boolean {
  return readStore().some((a) => a.id === id)
}

/**
 * Check all achievement conditions against the given battle stats.
 * Updates win streak, unlocks any newly earned achievements, and returns them.
 */
export function checkAndUnlock(stats: BattleEndStats): Achievement[] {
  updateWinStreak(stats.outcome)

  const store = readStore()
  const alreadyUnlocked = new Set(store.map((a) => a.id))
  const newlyUnlocked: Achievement[] = []
  const now = Date.now()

  for (const achievement of ACHIEVEMENTS) {
    if (alreadyUnlocked.has(achievement.id)) continue
    if (achievement.condition(stats)) {
      store.push({ id: achievement.id, unlockedAt: now })
      newlyUnlocked.push(achievement)
    }
  }

  if (newlyUnlocked.length > 0) {
    writeStore(store)
  }

  return newlyUnlocked
}

/**
 * Unlock a specific achievement by id (for external triggers like
 * campaign-clear, all-weapons, economist).
 * Returns the achievement if newly unlocked, or null if already unlocked / not found.
 */
export function unlockById(id: string): Achievement | null {
  if (isUnlocked(id)) return null

  const achievement = ACHIEVEMENTS.find((a) => a.id === id)
  if (!achievement) return null

  const store = readStore()
  store.push({ id, unlockedAt: Date.now() })
  writeStore(store)

  return achievement
}
