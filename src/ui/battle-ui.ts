import type { BattleState } from '../combat/battle'
import type { SkillSystemState } from '../combat/skills'
import { getSkillDefinition } from '../combat/skills'
import { SP_MAX, WATT_MAX } from '../core/types'
import { createPixiApp, RENDER_W, RENDER_H } from '../renderer/pixi-app'
import { createLayers } from '../renderer/layers'
import {
  createBattleRenderer,
  updateBattleRenderer,
  destroyBattleRenderer,
  type BattleRendererState,
} from '../renderer/battle-renderer'
import type { Application } from 'pixi.js'

export interface BattleUiCallbacks {
  onSkillActivate(skillIndex: number): void
  onSpeedChange(speed: number): void
  onPause(): void
}

export interface BattleUiHandle {
  update(state: BattleState, realDelta?: number): void
  showCallout(text: string, speaker: string): void
  destroy(): void
}

const TIME_LIMIT_SECONDS = 300

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

function countAliveUnits(state: BattleState, side: 'player' | 'enemy'): number {
  let count = 0
  for (const u of state.units) {
    if (u.side === side && u.state !== 'dead') count++
  }
  return count
}

export async function createBattleUi(
  container: HTMLElement,
  callbacks: BattleUiCallbacks,
  timeLimitSeconds?: number,
): Promise<BattleUiHandle> {
  const timeLimit = timeLimitSeconds ?? TIME_LIMIT_SECONDS

  const screen = document.createElement('div')
  screen.className = 'screen'

  const title = document.createElement('h1')
  title.className = 'game-title'
  title.textContent = 'BLITZ RTS'

  const topbar = document.createElement('div')
  topbar.className = 'topbar'

  const topLeft = document.createElement('div')
  topLeft.className = 'meta'
  const timePill = document.createElement('span')
  timePill.className = 'pill mono'
  timePill.textContent = `남은 시간 ${formatTime(timeLimit)}`
  const capPill = document.createElement('span')
  capPill.className = 'pill mono'
  capPill.textContent = '유닛 0/15'
  topLeft.appendChild(timePill)
  topLeft.appendChild(capPill)

  topbar.appendChild(topLeft)
  screen.appendChild(title)
  screen.appendChild(topbar)

  const layout = document.createElement('div')
  layout.className = 'battle-layout'

  const calloutBubble = document.createElement('div')
  calloutBubble.className = 'callout-bubble'
  calloutBubble.style.display = 'none'
  const calloutSpeaker = document.createElement('div')
  calloutSpeaker.className = 'callout-speaker mono'
  const calloutText = document.createElement('div')
  calloutText.className = 'callout-text'
  calloutBubble.appendChild(calloutSpeaker)
  calloutBubble.appendChild(calloutText)
  layout.appendChild(calloutBubble)

  let calloutTimer: ReturnType<typeof setTimeout> | null = null

  // PixiJS container replaces the old Canvas element
  const fieldPanel = document.createElement('div')
  fieldPanel.className = 'panel battle-canvas-wrap'
  const pixiHost = document.createElement('div')
  pixiHost.style.width = `${RENDER_W}px`
  pixiHost.style.height = `${RENDER_H}px`
  pixiHost.style.maxWidth = '100%'
  pixiHost.style.overflow = 'hidden'
  fieldPanel.appendChild(pixiHost)

  const hudPanel = document.createElement('div')
  hudPanel.className = 'panel'
  const hudHeader = document.createElement('div')
  hudHeader.className = 'panel-header'
  hudHeader.innerHTML = `<h2 class="panel-title">전장 콘솔</h2>`
  const hudBody = document.createElement('div')
  hudBody.className = 'panel-body hud'
  hudPanel.appendChild(hudHeader)
  hudPanel.appendChild(hudBody)

  const baseBars = document.createElement('div')
  baseBars.className = 'grid'
  baseBars.innerHTML = `
    <div class="bar">
      <div class="bar-label"><span>아군 기지</span><span class="mono" data-role="p-base-text">—</span></div>
      <progress class="progress" data-role="p-base" max="1" value="1"></progress>
    </div>
    <div class="bar">
      <div class="bar-label"><span>적 기지</span><span class="mono" data-role="e-base-text">—</span></div>
      <progress class="progress progress-danger" data-role="e-base" max="1" value="1"></progress>
    </div>
  `
  hudBody.appendChild(baseBars)

  const resourceBars = document.createElement('div')
  resourceBars.className = 'grid'
  resourceBars.setAttribute('data-tutorial', 'resource-bars')
  resourceBars.innerHTML = `
    <div class="bar">
      <div class="bar-label"><span>와트</span><span class="mono" data-role="watt-text">—</span></div>
      <progress class="progress progress-gold" data-role="watt" max="${WATT_MAX}" value="0"></progress>
    </div>
    <div class="bar">
      <div class="bar-label"><span>SP</span><span class="mono" data-role="sp-text">—</span></div>
      <progress class="progress progress-sp" data-role="sp" max="${SP_MAX}" value="0"></progress>
    </div>
  `
  hudBody.appendChild(resourceBars)

  const skillBox = document.createElement('div')
  skillBox.className = 'grid'
  skillBox.innerHTML = `<div class="muted">스킬</div>`
  const skillButtons = document.createElement('div')
  skillButtons.className = 'skill-buttons'
  skillButtons.setAttribute('data-tutorial', 'skill-buttons')
  skillBox.appendChild(skillButtons)
  hudBody.appendChild(skillBox)

  const skillBtnEls: HTMLButtonElement[] = []
  const skillCdEls: HTMLProgressElement[] = []
  const skillTitleEls: HTMLElement[] = []
  const skillSubEls: HTMLElement[] = []

  for (let i = 0; i < 3; i++) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'skill-btn'
    btn.innerHTML = `
      <div class="skill-btn-title" data-role="title">—</div>
      <div class="skill-btn-sub" data-role="sub">—</div>
      <progress class="progress progress-danger" data-role="cd" max="1" value="0"></progress>
    `
    btn.addEventListener('click', () => callbacks.onSkillActivate(i))
    const titleEl = btn.querySelector<HTMLElement>('[data-role="title"]')
    const subEl = btn.querySelector<HTMLElement>('[data-role="sub"]')
    const cdEl = btn.querySelector<HTMLProgressElement>('[data-role="cd"]')
    if (!titleEl || !subEl || !cdEl) throw new Error('Skill button template missing')
    skillBtnEls.push(btn)
    skillTitleEls.push(titleEl)
    skillSubEls.push(subEl)
    skillCdEls.push(cdEl)
    skillButtons.appendChild(btn)
  }

  const speedBox = document.createElement('div')
  speedBox.className = 'grid'
  speedBox.innerHTML = `<div class="muted">속도</div>`
  const speedControls = document.createElement('div')
  speedControls.className = 'speed-controls'
  speedControls.setAttribute('data-tutorial', 'speed-controls')

  let activeSpeed = 1

  const speedBtns: Array<{ readonly speed: number; readonly el: HTMLButtonElement }> = []
  for (const s of [1, 2, 4]) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn'
    btn.textContent = `${s}x`
    btn.addEventListener('click', () => {
      activeSpeed = s
      syncSpeedButtons()
      callbacks.onSpeedChange(s)
    })
    speedBtns.push({ speed: s, el: btn })
    speedControls.appendChild(btn)
  }

  const pauseBtn = document.createElement('button')
  pauseBtn.type = 'button'
  pauseBtn.className = 'btn btn-ghost'
  pauseBtn.textContent = '일시정지'
  pauseBtn.addEventListener('click', () => callbacks.onPause())
  speedControls.appendChild(pauseBtn)

  speedBox.appendChild(speedControls)
  hudBody.appendChild(speedBox)

  layout.appendChild(fieldPanel)
  layout.appendChild(hudPanel)
  screen.appendChild(layout)
  container.replaceChildren(screen)

  // Initialize PixiJS
  let pixiApp: Application | null = null
  let renderer: BattleRendererState | null = null

  try {
    pixiApp = await createPixiApp(pixiHost)
    const layers = createLayers(pixiApp)
    renderer = createBattleRenderer(pixiApp, layers)
  } catch {
    // PixiJS failed — leave pixiHost empty, rendering will be a no-op
  }

  // Cache HUD element refs
  function requireEl<T extends Element>(sel: string): T {
    const el = hudBody.querySelector<T>(sel)
    if (!el) throw new Error(`Missing HUD element: ${sel}`)
    return el
  }
  const pBaseBar = requireEl<HTMLProgressElement>('[data-role="p-base"]')
  const eBaseBar = requireEl<HTMLProgressElement>('[data-role="e-base"]')
  const pBaseText = requireEl<HTMLElement>('[data-role="p-base-text"]')
  const eBaseText = requireEl<HTMLElement>('[data-role="e-base-text"]')
  const wattBar = requireEl<HTMLProgressElement>('[data-role="watt"]')
  const spBar = requireEl<HTMLProgressElement>('[data-role="sp"]')
  const wattText = requireEl<HTMLElement>('[data-role="watt-text"]')
  const spText = requireEl<HTMLElement>('[data-role="sp-text"]')

  function syncSpeedButtons(): void {
    for (const b of speedBtns) {
      const selected = b.speed === activeSpeed
      b.el.classList.toggle('btn-primary', selected)
      b.el.setAttribute('aria-pressed', selected ? 'true' : 'false')
    }
  }

  syncSpeedButtons()

  function updateHud(state: BattleState, skills: SkillSystemState): void {
    const remaining = timeLimit - state.elapsedSeconds
    timePill.textContent = `남은 시간 ${formatTime(remaining)}`

    const playerAlive = countAliveUnits(state, 'player')
    const enemyAlive = countAliveUnits(state, 'enemy')
    capPill.textContent = `아군 ${playerAlive} vs 적 ${enemyAlive}`

    pBaseBar.max = state.battlefield.playerBase.maxHp
    pBaseBar.value = state.battlefield.playerBase.hp
    pBaseText.textContent = `${Math.ceil(state.battlefield.playerBase.hp)}/${state.battlefield.playerBase.maxHp}`

    eBaseBar.max = state.battlefield.enemyBase.maxHp
    eBaseBar.value = state.battlefield.enemyBase.hp
    eBaseText.textContent = `${Math.ceil(state.battlefield.enemyBase.hp)}/${state.battlefield.enemyBase.maxHp}`

    wattBar.value = state.playerWatt.current
    wattText.textContent = `${Math.floor(state.playerWatt.current)}/${WATT_MAX}`

    spBar.value = skills.sp.current
    spText.textContent = `${Math.floor(skills.sp.current)}/${SP_MAX}`

    for (let i = 0; i < 3; i++) {
      const cd = skills.cooldowns[i]
      const name = skills.deck[i]
      if (!cd || !name) continue

      const def = getSkillDefinition(name)
      const canAfford = skills.sp.current >= def.spCost
      const ready = cd.remainingCooldown <= 0 && canAfford

      skillTitleEls[i]!.textContent = name
      const cdLabel = cd.remainingCooldown > 0 ? `CD ${Math.ceil(cd.remainingCooldown)}s` : 'READY'
      skillSubEls[i]!.textContent = `SP ${def.spCost} · ${cdLabel}`

      skillBtnEls[i]!.disabled = !ready
      skillCdEls[i]!.max = def.cooldownSeconds
      skillCdEls[i]!.value = Math.max(0, cd.remainingCooldown)
    }
  }

  return {
    update(state: BattleState, realDelta?: number): void {
      updateHud(state, state.skillSystem)

      if (renderer && realDelta != null && realDelta > 0) {
        updateBattleRenderer(renderer, state, realDelta)
      }
    },
    showCallout(text: string, speaker: string): void {
      if (calloutTimer !== null) clearTimeout(calloutTimer)

      calloutSpeaker.textContent = speaker
      calloutText.textContent = text
      calloutBubble.style.display = ''
      calloutBubble.classList.remove('callout-fade-out')
      calloutBubble.classList.add('callout-fade-in')

      calloutTimer = setTimeout(() => {
        calloutBubble.classList.remove('callout-fade-in')
        calloutBubble.classList.add('callout-fade-out')
        calloutTimer = setTimeout(() => {
          calloutBubble.style.display = 'none'
          calloutBubble.classList.remove('callout-fade-out')
          calloutTimer = null
        }, 300)
      }, 2500)
    },
    destroy(): void {
      if (calloutTimer !== null) clearTimeout(calloutTimer)
      if (renderer) destroyBattleRenderer(renderer)
      if (pixiApp) pixiApp.destroy(true, { children: true })
      screen.remove()
    },
  }
}
