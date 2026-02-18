import { ENEMY_PRESETS } from '../data/enemies-data'

export interface MainMenuCallbacks {
  onSelectEnemy(presetIndex: number): void
  onGoShop(): void
}

function difficultyBadgeClass(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return 'badge badge-easy'
    case 'normal':
      return 'badge badge-normal'
    case 'hard':
      return 'badge badge-hard'
    case 'nightmare':
      return 'badge badge-nightmare'
    default:
      return 'badge'
  }
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
  goldPill.innerHTML = `골드 <strong class="mono">${gold} G</strong>`
  meta.appendChild(goldPill)

  const shopBtn = document.createElement('button')
  shopBtn.type = 'button'
  shopBtn.className = 'btn btn-ghost'
  shopBtn.textContent = 'Shop'
  shopBtn.addEventListener('click', () => callbacks.onGoShop())

  topbar.appendChild(meta)
  topbar.appendChild(shopBtn)

  const panel = document.createElement('div')
  panel.className = 'panel'
  panel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">ENEMY SELECTION</h2>
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
    btn.className = 'btn enemy-item'
    btn.innerHTML = `
      <span class="enemy-name">${preset.name}</span>
      <span class="${difficultyBadgeClass(preset.difficulty)}">${preset.difficulty}</span>
    `
    btn.addEventListener('click', () => {
      callbacks.onSelectEnemy(i)
    })
    list.appendChild(btn)
  }

  screen.appendChild(title)
  screen.appendChild(topbar)
  screen.appendChild(panel)

  container.replaceChildren(screen)

  return {
    destroy(): void {
      screen.remove()
    },
  }
}
