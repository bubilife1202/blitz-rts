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

export function createMainMenu(
  container: HTMLElement,
  gold: number,
  callbacks: MainMenuCallbacks,
): { destroy(): void } {
  const screen = document.createElement('div')
  screen.className = 'screen menu-layout'

  const title = document.createElement('h1')
  title.className = 'game-title'
  title.textContent = 'BLITZ RTS'

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

  const actionMeta = document.createElement('div')
  actionMeta.className = 'meta'
  actionMeta.append(muteBtn, guideBtn, replayTutorialBtn, shopBtn)

  topbar.appendChild(meta)
  topbar.appendChild(actionMeta)

  const panel = document.createElement('div')
  panel.className = 'panel'
  panel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">적 선택</h2>
      <div class="muted">적 프리셋을 선택하세요</div>
    </div>
    <div class="panel-body">
      <div class="enemy-list" data-role="enemy-list"></div>
    </div>
  `

  const list = panel.querySelector<HTMLElement>('[data-role="enemy-list"]')
  if (!list) throw new Error('Missing enemy list')

  for (let i = 0; i < ENEMY_PRESETS.length; i++) {
    const preset = ENEMY_PRESETS[i]!

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'card enemy-item'

    const nameEl = document.createElement('div')
    nameEl.className = 'enemy-name'
    nameEl.textContent = preset.nameKo

    const badgeEl = document.createElement('span')
    badgeEl.className = BADGE_CLASS[preset.difficulty] ?? 'badge'
    badgeEl.textContent = preset.difficulty

    const descEl = document.createElement('div')
    descEl.className = 'enemy-desc'

    const kickerEl = document.createElement('div')
    kickerEl.className = 'card-kicker'
    kickerEl.textContent = preset.name

    const starsEl = document.createElement('div')
    starsEl.className = 'mono'
    starsEl.style.opacity = '0.8'
    starsEl.textContent = `난이도 ${STAR_MAP[preset.difficulty] ?? '—'}`

    const scoutDesc = document.createElement('div')
    scoutDesc.style.marginTop = '6px'
    scoutDesc.textContent = preset.scout.descriptionKo

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
    tagRow.style.marginTop = '10px'
    for (const t of preset.scout.tags) {
      const tag = document.createElement('span')
      tag.className = 'tag'
      tag.textContent = t
      tagRow.appendChild(tag)
    }

    const mechRow = document.createElement('div')
    mechRow.className = 'enemy-mech-row'
    for (const build of preset.roster) {
      const mechEl = document.createElement('div')
      mechEl.className = 'enemy-mech-thumb'
      mechEl.innerHTML = renderMechSvg(build, 28, 'enemy')
      mechRow.appendChild(mechEl)
    }

    descEl.appendChild(kickerEl)
    descEl.appendChild(starsEl)
    descEl.appendChild(mechRow)
    descEl.appendChild(scoutDesc)
    descEl.appendChild(stratEl)
    descEl.appendChild(tagRow)

    btn.appendChild(nameEl)
    btn.appendChild(badgeEl)
    btn.appendChild(descEl)

    btn.addEventListener('click', () => {
      callbacks.onSelectEnemy(i)
    })

    list.appendChild(btn)
  }

  const modePanel = document.createElement('div')
  modePanel.className = 'panel'
  modePanel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">게임 모드</h2>
    </div>
    <div class="panel-body">
      <div class="btn-row" data-role="mode-buttons"></div>
    </div>
  `
  const modeButtons = modePanel.querySelector<HTMLElement>('[data-role="mode-buttons"]')!

  const campaignBtn = document.createElement('button')
  campaignBtn.type = 'button'
  campaignBtn.className = 'btn btn-primary'
  campaignBtn.textContent = '캠페인'
  campaignBtn.addEventListener('click', () => callbacks.onCampaign?.())
  modeButtons.appendChild(campaignBtn)

  const coopBtn = document.createElement('button')
  coopBtn.type = 'button'
  coopBtn.className = 'btn'
  coopBtn.textContent = '코옵 프리배틀'
  coopBtn.addEventListener('click', () => callbacks.onCoopBattle?.())
  modeButtons.appendChild(coopBtn)

  screen.appendChild(title)
  screen.appendChild(topbar)
  screen.appendChild(modePanel)
  screen.appendChild(panel)

  container.replaceChildren(screen)

  return {
    destroy(): void {
      screen.remove()
    },
  }
}
