export interface BattleScore {
  total: number
  breakdown: ScoreBreakdown
  rank: 'S' | 'A' | 'B' | 'C' | 'D'
}

export interface ScoreBreakdown {
  killScore: number
  speedScore: number
  efficiencyScore: number
  damageScore: number
  baseDefenseScore: number
}

function determineRank(total: number): BattleScore['rank'] {
  if (total >= 1500) return 'S'
  if (total >= 1000) return 'A'
  if (total >= 600) return 'B'
  if (total >= 300) return 'C'
  return 'D'
}

export function calculateBattleScore(stats: {
  outcome: string
  elapsedSeconds: number
  kills: number
  deaths: number
  totalDamage: number
  playerBaseHpPct: number
}): BattleScore {
  const isWin = stats.outcome === 'player_win'

  const killScore = stats.kills * 100

  const speedScore = isWin
    ? Math.max(0, 500 - stats.elapsedSeconds * 2)
    : 0

  const efficiencyScore = Math.min(
    500,
    (stats.kills / Math.max(1, stats.deaths)) * 100,
  )

  const damageScore = Math.min(500, stats.totalDamage / 10)

  const baseDefenseScore = isWin
    ? stats.playerBaseHpPct * 300
    : 0

  const breakdown: ScoreBreakdown = {
    killScore: Math.round(killScore),
    speedScore: Math.round(speedScore),
    efficiencyScore: Math.round(efficiencyScore),
    damageScore: Math.round(damageScore),
    baseDefenseScore: Math.round(baseDefenseScore),
  }

  const total =
    breakdown.killScore +
    breakdown.speedScore +
    breakdown.efficiencyScore +
    breakdown.damageScore +
    breakdown.baseDefenseScore

  return {
    total,
    breakdown,
    rank: determineRank(total),
  }
}
