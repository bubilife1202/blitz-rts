import type { BattleResult, BattleOutcome } from '../combat/battle'

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

function injectStyles(): void {
  if (document.getElementById('result-ui-styles')) return
  const style = document.createElement('style')
  style.id = 'result-ui-styles'
  style.textContent = `
    .result-container {
      max-width: 700px;
      margin: 40px auto;
      padding: 32px;
      background: #1a1a2e;
      border: 2px solid #333;
      border-radius: 12px;
      color: #e0e0e0;
      font-family: 'Segoe UI', sans-serif;
    }
    .result-banner {
      text-align: center;
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .result-victory { color: #4fc3f7; }
    .result-defeat { color: #ef5350; }
    .result-draw { color: #ffa726; }
    .result-time {
      text-align: center;
      font-size: 1rem;
      color: #888;
      margin-bottom: 24px;
    }
    .result-gold {
      text-align: center;
      font-size: 1.4rem;
      color: #ffd54f;
      margin-bottom: 24px;
    }
    .result-gold span { font-weight: bold; }
    .result-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 0.9rem;
    }
    .result-table th {
      background: #16213e;
      padding: 8px 12px;
      text-align: right;
      border-bottom: 2px solid #444;
      color: #aaa;
    }
    .result-table th:first-child { text-align: left; }
    .result-table td {
      padding: 8px 12px;
      text-align: right;
      border-bottom: 1px solid #333;
      font-family: 'Courier New', monospace;
    }
    .result-table td:first-child {
      text-align: left;
      font-weight: bold;
      color: #4fc3f7;
    }
    .result-dmg-bar {
      display: inline-block;
      height: 12px;
      background: #4fc3f7;
      border-radius: 2px;
      margin-right: 6px;
      vertical-align: middle;
    }
    .result-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
    }
    .result-btn {
      padding: 12px 28px;
      font-size: 1rem;
      border: 2px solid #4fc3f7;
      background: transparent;
      color: #4fc3f7;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .result-btn:hover {
      background: #4fc3f7;
      color: #1a1a2e;
    }
    .result-btn-primary {
      background: #4fc3f7;
      color: #1a1a2e;
      font-weight: bold;
    }
    .result-btn-primary:hover {
      background: #81d4fa;
    }
  `
  document.head.appendChild(style)
}

export function createResultUi(
  container: HTMLElement,
  result: BattleResult,
  callbacks: ResultUiCallbacks,
): { destroy(): void } {
  injectStyles()

  const root = document.createElement('div')
  root.className = 'result-container'

  const gold = GOLD_REWARDS[result.outcome]
  const buildLabels = ['Build A', 'Build B', 'Build C'] as const

  const totalDamage = result.playerBuildStats.reduce(
    (sum, s) => sum + s.damageDealt,
    0,
  )

  root.innerHTML = `
    <div class="result-banner ${OUTCOME_CLASSES[result.outcome]}">
      ${OUTCOME_LABELS[result.outcome]}
    </div>
    <div class="result-time">전투 시간: ${formatTime(result.elapsedSeconds)}</div>
    <div class="result-gold">획득 골드: <span>${gold} G</span></div>
    <table class="result-table">
      <thead>
        <tr>
          <th>빌드</th>
          <th>생산</th>
          <th>킬</th>
          <th>손실</th>
          <th>데미지</th>
          <th>피격</th>
          <th>비율</th>
        </tr>
      </thead>
      <tbody>
        ${result.playerBuildStats
          .map((stats, i) => {
            const pct = totalDamage > 0
              ? Math.round((stats.damageDealt / totalDamage) * 100)
              : 0
            const barWidth = Math.max(2, pct)
            return `
            <tr>
              <td>${buildLabels[i]}</td>
              <td>${stats.unitsProduced}</td>
              <td>${stats.kills}</td>
              <td>${stats.deaths}</td>
              <td>${Math.round(stats.damageDealt).toLocaleString()}</td>
              <td>${Math.round(stats.damageTaken).toLocaleString()}</td>
              <td>
                <span class="result-dmg-bar" style="width: ${barWidth}px"></span>
                ${pct}%
              </td>
            </tr>`
          })
          .join('')}
      </tbody>
    </table>
    <div class="result-actions">
      <button class="result-btn result-btn-primary" data-action="again">다시 하기</button>
      <button class="result-btn" data-action="assembly">조립실로</button>
    </div>
  `

  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const action = target.dataset.action
    if (action === 'again') callbacks.onPlayAgain()
    if (action === 'assembly') callbacks.onBackToAssembly()
  })

  container.innerHTML = ''
  container.appendChild(root)

  return {
    destroy() {
      root.remove()
    },
  }
}
