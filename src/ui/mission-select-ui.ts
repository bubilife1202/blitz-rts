import { MISSIONS } from '../coop/mission-data'
import { getPartnerById } from '../coop/partner-data'

export interface MissionSelectCallbacks {
  onSelectMission(missionIndex: number): void
  onBack(): void
}

export interface MissionSelectHandle {
  destroy(): void
}

function difficultyStars(missionId: number): string {
  if (missionId <= 2) return '\u2605'
  if (missionId <= 4) return '\u2605\u2605'
  if (missionId <= 7) return '\u2605\u2605\u2605'
  if (missionId <= 9) return '\u2605\u2605\u2605\u2605'
  return '\u2605\u2605\u2605\u2605\u2605'
}

function getPartnerName(partnerId: string): string {
  if (partnerId === 'choice') return '선택 가능'
  try {
    const p = getPartnerById(partnerId as 'vanguard' | 'bastion' | 'artillery' | 'support')
    return `${p.name} (${p.codenameko})`
  } catch {
    return partnerId
  }
}

export function createMissionSelectUi(
  container: HTMLElement,
  unlockedCount: number,
  callbacks: MissionSelectCallbacks,
): MissionSelectHandle {
  const screen = document.createElement('div')
  screen.className = 'screen menu-layout'

  const title = document.createElement('h1')
  title.className = 'game-title'
  title.textContent = 'BLITZ RTS'

  const panel = document.createElement('div')
  panel.className = 'panel'

  const header = document.createElement('div')
  header.className = 'panel-header'
  header.innerHTML = `
    <h2 class="panel-title">\uCEA0\uD398\uC778</h2>
    <div class="muted">\uBBF8\uC158\uC744 \uC120\uD0DD\uD558\uC138\uC694</div>
  `

  const body = document.createElement('div')
  body.className = 'panel-body'

  const list = document.createElement('div')
  list.className = 'mission-list'

  for (let i = 0; i < MISSIONS.length; i++) {
    const mission = MISSIONS[i]!
    const locked = i >= unlockedCount
    const completed = i < unlockedCount - 1

    const card = document.createElement('button')
    card.type = 'button'
    card.className = locked ? 'card mission-card mission-locked' : 'card mission-card'
    if (locked) card.disabled = true

    const cardHeader = document.createElement('div')
    cardHeader.className = 'mission-card-header'

    const numEl = document.createElement('span')
    numEl.className = 'mission-number mono'
    numEl.textContent = `M-${String(mission.id).padStart(2, '0')}`

    const checkEl = document.createElement('span')
    checkEl.className = 'mission-check'
    checkEl.textContent = completed ? '\u2713' : ''

    cardHeader.appendChild(numEl)
    cardHeader.appendChild(checkEl)

    const titleEl = document.createElement('div')
    titleEl.className = 'mission-title'
    titleEl.textContent = mission.titleKo

    const metaEl = document.createElement('div')
    metaEl.className = 'mission-meta muted'

    const partnerEl = document.createElement('span')
    partnerEl.textContent = `\uD30C\uD2B8\uB108: ${getPartnerName(mission.partnerId)}`

    const diffEl = document.createElement('span')
    diffEl.className = 'mono'
    diffEl.textContent = difficultyStars(mission.id)

    const enemyEl = document.createElement('div')
    enemyEl.className = 'muted'
    enemyEl.style.marginTop = '4px'
    enemyEl.textContent = `적: ${mission.enemyName}`

    metaEl.appendChild(partnerEl)
    metaEl.appendChild(diffEl)

    card.appendChild(cardHeader)
    card.appendChild(titleEl)
    card.appendChild(metaEl)
    card.appendChild(enemyEl)

    if (!locked) {
      card.addEventListener('click', () => callbacks.onSelectMission(i))
    }

    list.appendChild(card)
  }

  body.appendChild(list)

  const actions = document.createElement('div')
  actions.style.marginTop = '16px'
  actions.style.display = 'flex'
  actions.style.justifyContent = 'center'

  const backBtn = document.createElement('button')
  backBtn.type = 'button'
  backBtn.className = 'btn btn-ghost'
  backBtn.textContent = '\uB4A4\uB85C'
  backBtn.addEventListener('click', () => callbacks.onBack())
  actions.appendChild(backBtn)

  body.appendChild(actions)
  panel.appendChild(header)
  panel.appendChild(body)

  screen.appendChild(title)
  screen.appendChild(panel)
  container.replaceChildren(screen)

  return {
    destroy(): void {
      screen.remove()
    },
  }
}
