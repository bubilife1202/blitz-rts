import type { BattleOutcome } from '../combat/battle'

const STORAGE_KEY = 'blitz-rts-commander'
const MAX_LEVEL = 50

export interface CommanderProfile {
  level: number
  xp: number
  totalWins: number
  totalLosses: number
  totalBattles: number
  winStreak: number
  bestWinStreak: number
}

export interface BattleXpResult {
  xpGained: number
  leveledUp: boolean
  newLevel: number
}

function createDefaultProfile(): CommanderProfile {
  return {
    level: 1,
    xp: 0,
    totalWins: 0,
    totalLosses: 0,
    totalBattles: 0,
    winStreak: 0,
    bestWinStreak: 0,
  }
}

function saveProfile(profile: CommanderProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // localStorage unavailable
  }
}

export function getCommanderProfile(): CommanderProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultProfile()
    const parsed = JSON.parse(raw) as Partial<CommanderProfile>
    return {
      level: parsed.level ?? 1,
      xp: parsed.xp ?? 0,
      totalWins: parsed.totalWins ?? 0,
      totalLosses: parsed.totalLosses ?? 0,
      totalBattles: parsed.totalBattles ?? 0,
      winStreak: parsed.winStreak ?? 0,
      bestWinStreak: parsed.bestWinStreak ?? 0,
    }
  } catch {
    return createDefaultProfile()
  }
}

export function getXpForLevel(level: number): number {
  return level * 100
}

export function getXpProgress(): { current: number; needed: number; pct: number } {
  const profile = getCommanderProfile()
  if (profile.level >= MAX_LEVEL) {
    return { current: 0, needed: 0, pct: 100 }
  }
  const needed = getXpForLevel(profile.level)
  const current = profile.xp
  const pct = needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 100
  return { current, needed, pct }
}

export function addBattleResult(
  outcome: BattleOutcome,
  stars: number,
  kills: number,
): BattleXpResult {
  const profile = getCommanderProfile()

  // Calculate XP
  let xpGained = 0
  switch (outcome) {
    case 'player_win':
      xpGained = 100 + stars * 30
      break
    case 'enemy_win':
      xpGained = 30
      break
    case 'draw':
      xpGained = 50
      break
  }
  xpGained += kills * 10

  // Update battle counts
  profile.totalBattles += 1
  if (outcome === 'player_win') {
    profile.totalWins += 1
    profile.winStreak += 1
    if (profile.winStreak > profile.bestWinStreak) {
      profile.bestWinStreak = profile.winStreak
    }
  } else {
    if (outcome === 'enemy_win') {
      profile.totalLosses += 1
    }
    profile.winStreak = 0
  }

  // Apply XP and level up
  profile.xp += xpGained
  const startLevel = profile.level
  while (profile.level < MAX_LEVEL && profile.xp >= getXpForLevel(profile.level)) {
    profile.xp -= getXpForLevel(profile.level)
    profile.level += 1
  }

  // Cap at max level
  if (profile.level >= MAX_LEVEL) {
    profile.level = MAX_LEVEL
    profile.xp = 0
  }

  saveProfile(profile)

  return {
    xpGained,
    leveledUp: profile.level > startLevel,
    newLevel: profile.level,
  }
}
