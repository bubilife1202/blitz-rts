import type { BattleResult, BattleOutcome } from '../combat/battle'
import type { Build, RosterIndex } from '../core/types'
import { analyzeBattle } from '../combat/analysis'
import { renderMechSvg } from './mech-renderer'

export interface ResultUiCallbacks {
  onPlayAgain(): void
  onBackToAssembly(): void
}

const GOLD_REWARDS: Record<BattleOutcome, number> = {
  player_win: 100,
  enemy_win: 30,
  draw: 50,
}

const OUTCOME_LABELS: Record<BattleOutcome, string> = {
  player_win: '승리!',
  enemy_win: '패배...',
  draw: '무승부',
}

const OUTCOME_CLASSES: Record<BattleOutcome, string> = {
  player_win: 'result-victory',
  enemy_win: 'result-defeat',
  draw: 'result-draw',
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function buildLabel(index: RosterIndex): string {
  return ['A', 'B', 'C'][index]
}

function mvpIndex(result: BattleResult): RosterIndex {
  let best: RosterIndex = 0
  let bestScore = -Infinity
  for (let i = 0; i < 3; i++) {
    const s = result.playerBuildStats[i]!
    const score = s.damageDealt + s.kills * 50 - s.deaths * 15
    if (score > bestScore) {
      bestScore = score
      best = i as RosterIndex
    }
  }
  return best
}

export function createResultUi(
  container: HTMLElement,
  result: BattleResult,
  callbacks: ResultUiCallbacks,
): { destroy(): void } {
  const screen = document.createElement('div')
  screen.className = 'screen result-layout'

  const title = document.createElement('h1')
  title.className = 'game-title'
  title.textContent = 'BLITZ RTS'

  const panel = document.createElement('div')
  panel.className = 'panel'

  const header = document.createElement('div')
  header.className = 'panel-header'
  header.innerHTML = `<h2 class="panel-title">결과</h2><div class="muted">전투 로그 요약</div>`

  const body = document.createElement('div')
  body.className = 'panel-body'

  const RESULT_MECH_BUILDS: readonly Build[] = [
    { legsId: 'MP01', bodyId: 'BP01', weaponId: 'AP01', accessoryId: null },
    { legsId: 'MP02', bodyId: 'BP02', weaponId: 'AP02', accessoryId: null },
    { legsId: 'MP04', bodyId: 'BP03', weaponId: 'AP04', accessoryId: null },
  ]

  const banner = document.createElement('div')
  banner.className = `result-banner ${OUTCOME_CLASSES[result.outcome]}`
  const bannerTitle = document.createElement('div')
  bannerTitle.className = 'result-banner-title'
  bannerTitle.textContent = OUTCOME_LABELS[result.outcome]
  const bannerSub = document.createElement('div')
  bannerSub.className = 'muted'
  bannerSub.textContent = `MVP: 빌드 ${buildLabel(mvpIndex(result))}`
  const bannerMech = document.createElement('div')
  bannerMech.className = 'result-mech-preview'
  const side = result.outcome === 'enemy_win' ? 'enemy' as const : 'player' as const
  bannerMech.innerHTML = renderMechSvg(RESULT_MECH_BUILDS[mvpIndex(result)]!, 42, side)
  banner.appendChild(bannerTitle)
  banner.appendChild(bannerMech)
  banner.appendChild(bannerSub)

  const goldReward = GOLD_REWARDS[result.outcome]
  const kpis = document.createElement('div')
  kpis.className = 'result-kpi'
  kpis.innerHTML = `
    <div class="kpi"><div class="label">전투 시간</div><div class="value mono">${formatTime(result.elapsedSeconds)}</div></div>
    <div class="kpi"><div class="label">획득 골드</div><div class="value mono" data-role="gold">0 G</div></div>
  `

  const goldEl = kpis.querySelector<HTMLElement>('[data-role="gold"]')
  if (!goldEl) throw new Error('Missing gold element')

  const tableWrap = document.createElement('div')
  tableWrap.style.marginTop = '14px'

  const buildLabels = ['빌드 A', '빌드 B', '빌드 C'] as const
  const totalDamage = result.playerBuildStats.reduce((sum, s) => sum + s.damageDealt, 0)

  const table = document.createElement('table')
  table.className = 'stat-table'
  table.innerHTML = `
    <thead>
      <tr>
        <th>빌드</th>
        <th class="mono" style="text-align:right">생산</th>
        <th class="mono" style="text-align:right">킬</th>
        <th class="mono" style="text-align:right">손실</th>
        <th class="mono" style="text-align:right">데미지</th>
        <th class="mono" style="text-align:right">비율</th>
      </tr>
    </thead>
    <tbody>
      ${result.playerBuildStats
        .map((stats, i) => {
          const pct = totalDamage > 0 ? Math.round((stats.damageDealt / totalDamage) * 100) : 0
          const bar = Math.max(2, Math.min(100, pct))
          return `
            <tr>
              <td>${buildLabels[i]}</td>
              <td style="text-align:right">${stats.unitsProduced}</td>
              <td style="text-align:right">${stats.kills}</td>
              <td style="text-align:right">${stats.deaths}</td>
              <td style="text-align:right">${Math.round(stats.damageDealt).toLocaleString()}</td>
              <td style="text-align:right">
                <span style="display:inline-block; width:${bar}px; height:10px; border-radius:999px; background:rgba(79,195,247,0.55); border:1px solid rgba(79,195,247,0.22); vertical-align:middle; margin-right:8px"></span>
                <span class="mono">${pct}%</span>
              </td>
            </tr>
          `
        })
        .join('')}
    </tbody>
  `
  tableWrap.appendChild(table)

  const analysisPanel = document.createElement('div')
  analysisPanel.className = 'panel'
  analysisPanel.style.marginTop = '14px'
  analysisPanel.innerHTML = `
    <div class="panel-header">
      <h3 class="panel-title">전투 분석</h3>
      <div class="muted">패배/무승부 시 개선 팁</div>
    </div>
    <div class="panel-body" data-role="analysis"></div>
  `
  const analysisBody = analysisPanel.querySelector<HTMLDivElement>('[data-role="analysis"]')
  if (!analysisBody) throw new Error('Missing analysis body')

  if (result.outcome === 'player_win') {
    analysisBody.innerHTML = `<div class="muted">좋은 전투였습니다. 다른 적을 정찰해 보세요.</div>`
  } else {
    const playerStats = result.playerBuildStats.map((s, i) => ({
      buildIndex: i as RosterIndex,
      produced: s.unitsProduced,
      kills: s.kills,
      losses: s.deaths,
      damageDealt: s.damageDealt,
      damageTaken: s.damageTaken,
      dominantEnemyBuild: null,
    }))
    const enemyStats = result.enemyBuildStats.map((s, i) => ({
      buildIndex: i as RosterIndex,
      produced: s.unitsProduced,
      kills: s.kills,
      losses: s.deaths,
      damageDealt: s.damageDealt,
      damageTaken: s.damageTaken,
      dominantEnemyBuild: null,
    }))
    const tips = analyzeBattle(playerStats, enemyStats)
    if (tips.length === 0) {
      analysisBody.innerHTML = `<div class="muted">뚜렷한 원인이 감지되지 않았습니다. 시너지 조합을 실험해 보세요.</div>`
    } else {
      const list = document.createElement('div')
      list.className = 'analysis-list'
      for (const t of tips) {
        const item = document.createElement('div')
        item.className = 'analysis-tip'
        item.innerHTML = `<strong>빌드 ${buildLabel(t.buildIndex)}</strong><div style="margin-top:6px">${t.messageKo}</div>`
        list.appendChild(item)
      }
      analysisBody.replaceChildren(list)
    }
  }

  const actions = document.createElement('div')
  actions.className = 'result-actions'
  actions.style.marginTop = '16px'

  const againBtn = document.createElement('button')
  againBtn.type = 'button'
  againBtn.className = 'btn btn-primary'
  againBtn.textContent = '다시 하기'
  againBtn.addEventListener('click', () => callbacks.onPlayAgain())

  const lobbyBtn = document.createElement('button')
  lobbyBtn.type = 'button'
  lobbyBtn.className = 'btn btn-ghost'
  lobbyBtn.textContent = '로비로'
  lobbyBtn.addEventListener('click', () => callbacks.onBackToAssembly())

  actions.appendChild(againBtn)
  actions.appendChild(lobbyBtn)

  body.appendChild(banner)
  body.appendChild(kpis)
  body.appendChild(tableWrap)
  body.appendChild(analysisPanel)
  body.appendChild(actions)

  panel.appendChild(header)
  panel.appendChild(body)

  screen.appendChild(title)
  screen.appendChild(panel)
  container.replaceChildren(screen)

  let rafId: number | null = null
  const start = performance.now()
  const duration = 650

  const animate = (now: number): void => {
    const t = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    const value = Math.round(goldReward * eased)
    goldEl.textContent = `${value} G`
    if (t < 1) rafId = requestAnimationFrame(animate)
  }
  rafId = requestAnimationFrame(animate)

  return {
    destroy(): void {
      if (rafId !== null) cancelAnimationFrame(rafId)
      screen.remove()
    },
  }
}
