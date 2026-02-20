import { ENEMY_PRESETS } from '../data/enemies-data'
import { isMuted, playSfx, setMuted } from './audio'
import { renderMechSvg } from './mech-renderer'

export interface MainMenuCallbacks {
  onSelectEnemy(presetIndex: number): void
  onGoShop(): void
  onShowGuide(): void
  onReplayTutorial(): void
  onCampaign?(): void
  onCoopBattle?(): void
}

const STAR_MAP: Record<string, string> = {
  easy: '★',
  normal: '★★',
  hard: '★★★',
  nightmare: '★★★★',
}

const BADGE_CLASS: Record<string, string> = {
  easy: 'badge badge-easy',
  normal: 'badge badge-normal',
  hard: 'badge badge-hard',
  nightmare: 'badge badge-nightmare',
}

type MenuMode = 'campaign' | 'free' | 'coop'

export function createMainMenu(
  container: HTMLElement,
  gold: number,
  callbacks: MainMenuCallbacks,
): { destroy(): void } {
  let selectedMode: MenuMode = 'free'

  const screen = document.createElement('div')
  screen.className = 'screen menu-layout'

  const title = document.createElement('h1')
  title.className = 'game-title'
  title.textContent = 'BLITZ RTS'

  // ── Top Bar ──
  const topbar = document.createElement('div')
  topbar.className = 'topbar'

  const meta = document.createElement('div')
  meta.className = 'meta'

  const goldPill = document.createElement('span')
  goldPill.className = 'pill'
  goldPill.appendChild(document.createTextNode('골드 '))
  const goldValue = document.createElement('strong')
  goldValue.className = 'mono'
  goldValue.textContent = `${gold} G`
  goldPill.appendChild(goldValue)
  meta.appendChild(goldPill)

  const shopBtn = document.createElement('button')
  shopBtn.type = 'button'
  shopBtn.className = 'btn btn-ghost'
  shopBtn.textContent = '상점'
  shopBtn.addEventListener('click', () => callbacks.onGoShop())

  const actionMeta = document.createElement('div')
  actionMeta.className = 'meta'

  const muteBtn = document.createElement('button')
  muteBtn.type = 'button'
  muteBtn.className = 'btn btn-ghost'
  const syncMuteButtonLabel = (): void => {
    muteBtn.textContent = isMuted() ? '🔇' : '🔊'
  }
  syncMuteButtonLabel()
  muteBtn.addEventListener('click', () => {
    setMuted(!isMuted())
    syncMuteButtonLabel()
    playSfx('click')
  })

  const guideBtn = document.createElement('button')
  guideBtn.type = 'button'
  guideBtn.className = 'btn btn-ghost'
  guideBtn.textContent = '게임 설명'
  guideBtn.addEventListener('click', () => callbacks.onShowGuide())

  const replayTutorialBtn = document.createElement('button')
  replayTutorialBtn.type = 'button'
  replayTutorialBtn.className = 'btn btn-ghost'
  replayTutorialBtn.textContent = '다시 보기'
  replayTutorialBtn.addEventListener('click', () => callbacks.onReplayTutorial())

  actionMeta.append(muteBtn, guideBtn, replayTutorialBtn, shopBtn)

  topbar.appendChild(meta)
  topbar.appendChild(actionMeta)

  // ── Mode Cards ──
  const modeCards = document.createElement('div')
  modeCards.className = 'mode-cards'

  function createModeCard(
    mode: MenuMode,
    titleText: string,
    subtitle: string,
    icon: string,
  ): HTMLButtonElement {
    const card = document.createElement('button')
    card.type = 'button'
    card.className = `mode-card mode-card--${mode}`
    card.innerHTML = `
      <div class="mode-card-icon">${icon}</div>
      <div class="mode-card-title">${titleText}</div>
      <div class="mode-card-subtitle">${subtitle}</div>
    `
    card.addEventListener('click', () => {
      selectedMode = mode
      syncModeCards()
      syncEnemyGrid()
      if (mode === 'campaign') callbacks.onCampaign?.()
      if (mode === 'coop') callbacks.onCoopBattle?.()
    })
    return card
  }

  const campaignCard = createModeCard('campaign', 'CAMPAIGN', '캠페인 모드', '⚔')
  const freeCard = createModeCard('free', 'FREE BATTLE', '프리 배틀', '⚡')
  const coopCard = createModeCard('coop', 'CO-OP', '코옵 배틀', '🤝')
  modeCards.append(campaignCard, freeCard, coopCard)

  function syncModeCards(): void {
    for (const card of [campaignCard, freeCard, coopCard]) {
      card.setAttribute('aria-selected', 'false')
    }
    if (selectedMode === 'campaign') campaignCard.setAttribute('aria-selected', 'true')
    else if (selectedMode === 'free') freeCard.setAttribute('aria-selected', 'true')
    else coopCard.setAttribute('aria-selected', 'true')
  }
  syncModeCards()

  // ── Enemy Grid (horizontal cards) ──
  const enemyPanel = document.createElement('div')
  enemyPanel.className = 'panel'
  enemyPanel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">적 선택</h2>
      <div class="muted">적 프리셋을 선택하세요</div>
    </div>
    <div class="panel-body">
      <div class="enemy-grid-horizontal" data-role="enemy-list"></div>
    </div>
  `

  const list = enemyPanel.querySelector<HTMLElement>('[data-role="enemy-list"]')
  if (!list) throw new Error('Missing enemy list')

  for (let i = 0; i < ENEMY_PRESETS.length; i++) {
    const preset = ENEMY_PRESETS[i]!

    const card = document.createElement('button')
    card.type = 'button'
    card.className = 'enemy-card-horizontal'

    const nameEl = document.createElement('div')
    nameEl.className = 'enemy-name'
    nameEl.textContent = preset.nameKo

    const badgeEl = document.createElement('span')
    badgeEl.className = BADGE_CLASS[preset.difficulty] ?? 'badge'
    badgeEl.textContent = preset.difficulty

    const kickerEl = document.createElement('div')
    kickerEl.className = 'card-kicker'
    kickerEl.textContent = preset.name

    const starsEl = document.createElement('div')
    starsEl.className = 'mono'
    starsEl.style.opacity = '0.8'
    starsEl.textContent = `난이도 ${STAR_MAP[preset.difficulty] ?? '—'}`

    const mechRow = document.createElement('div')
    mechRow.className = 'enemy-mech-row'
    for (const build of preset.roster) {
      const mechEl = document.createElement('div')
      mechEl.className = 'enemy-mech-thumb'
      mechEl.innerHTML = renderMechSvg(build, 40, 'enemy')
      mechRow.appendChild(mechEl)
    }

    const scoutDesc = document.createElement('div')
    scoutDesc.style.marginTop = '6px'
    scoutDesc.style.fontSize = '12px'
    scoutDesc.textContent = preset.scout.descriptionKo

    const hoverDetails = document.createElement('div')
    hoverDetails.className = 'enemy-hover-details'

    const stratEl = document.createElement('div')
    stratEl.className = 'muted'
    stratEl.style.marginTop = '6px'
    const stratLabel = document.createElement('span')
    stratLabel.className = 'mono'
    stratLabel.textContent = '전략 '
    stratEl.appendChild(stratLabel)
    stratEl.appendChild(document.createTextNode(preset.scout.strategyHintKo))

    const tagRow = document.createElement('div')
    tagRow.className = 'tag-row'
    tagRow.style.marginTop = '8px'
    for (const t of preset.scout.tags) {
      const tag = document.createElement('span')
      tag.className = 'tag'
      tag.textContent = t
      tagRow.appendChild(tag)
    }

    hoverDetails.appendChild(stratEl)
    hoverDetails.appendChild(tagRow)

    card.appendChild(nameEl)
    card.appendChild(badgeEl)
    card.appendChild(kickerEl)
    card.appendChild(starsEl)
    card.appendChild(mechRow)
    card.appendChild(scoutDesc)
    card.appendChild(hoverDetails)

    card.addEventListener('click', () => {
      callbacks.onSelectEnemy(i)
    })

    list.appendChild(card)
  }

  function syncEnemyGrid(): void {
    enemyPanel.style.display = selectedMode === 'free' ? '' : 'none'
  }
  syncEnemyGrid()

  screen.appendChild(title)
  screen.appendChild(topbar)
  screen.appendChild(modeCards)
  screen.appendChild(enemyPanel)

  container.replaceChildren(screen)

  return {
    destroy(): void {
      screen.remove()
    },
  }
}
