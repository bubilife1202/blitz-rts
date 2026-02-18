import type { BattleAnalysisTip, RosterIndex } from '../core/types'

export interface BuildBattleStats {
  readonly buildIndex: RosterIndex
  readonly produced: number
  readonly kills: number
  readonly losses: number
  readonly damageDealt: number
  readonly damageTaken: number
  readonly dominantEnemyBuild: RosterIndex | null
}

export function analyzeBattle(
  playerStats: readonly BuildBattleStats[],
  _enemyStats: readonly BuildBattleStats[],
): readonly BattleAnalysisTip[] {
  const tips: BattleAnalysisTip[] = []

  for (const ps of playerStats) {
    if (ps.losses === 0) continue

    const killRatio = ps.kills / Math.max(ps.losses, 1)
    if (killRatio < 0.5 && ps.losses >= 2) {
      tips.push({
        kind: 'build-countered',
        buildIndex: ps.buildIndex,
        messageKo: `빌드 ${buildLabel(ps.buildIndex)}가 반복적으로 격파당했습니다. 파츠 교체를 고려하세요.`,
      })
    }

    if (ps.damageDealt < ps.damageTaken * 0.3 && ps.produced >= 2) {
      tips.push({
        kind: 'range-disadvantage',
        buildIndex: ps.buildIndex,
        messageKo: `빌드 ${buildLabel(ps.buildIndex)}의 피해량이 매우 낮습니다. 사거리가 긴 무기를 고려하세요.`,
      })
    }
  }

  const totalPlayerDamage = playerStats.reduce((sum, s) => sum + s.damageDealt, 0)
  for (const ps of playerStats) {
    if (totalPlayerDamage === 0) continue
    const share = ps.damageDealt / totalPlayerDamage
    if (share < 0.1 && ps.produced >= 2) {
      tips.push({
        kind: 'watt-inefficient',
        buildIndex: ps.buildIndex,
        messageKo: `빌드 ${buildLabel(ps.buildIndex)}의 기여도가 10% 미만입니다. 와트 대비 효율을 점검하세요.`,
      })
    }
  }

  return tips
}

function buildLabel(index: RosterIndex): string {
  return ['A', 'B', 'C'][index]
}
