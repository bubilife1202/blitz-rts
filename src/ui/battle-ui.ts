import type { BattleState } from '../combat/battle'
import { getSkillDefinition } from '../combat/skills'
import { BATTLEFIELD_TILES, SP_MAX, WATT_MAX } from '../core/types'
import {
  clearCanvas,
  configureCanvas,
  drawBar,
  drawShape,
  drawText,
} from '../utils/render'

export interface BattleUiCallbacks {
  onSkillActivate(skillIndex: number): void
  onSpeedChange(speed: number): void
  onPause(): void
}

export interface BattleUiHandle {
  update(state: BattleState): void
  destroy(): void
}

const CANVAS_W = 960
const CANVAS_H = 400
const TIME_LIMIT_SECONDS = 300

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

function shapeForMoveType(moveType: string) {
  switch (moveType) {
    case 'reverse-joint':
      return 'triangle'
    case 'humanoid':
      return 'rect'
    case 'flying':
      return 'diamond'
    case 'tank':
      return 'wide-rect'
    case 'quadruped':
      return 'hex'
    default:
      return 'rect'
  }
}

function countAliveUnits(state: BattleState, side: 'player' | 'enemy'): number {
  let count = 0
  for (const u of state.units) {
    if (u.side === side && u.state !== 'dead') count++
  }
  return count
}

export function createBattleUi(
  container: HTMLElement,
  callbacks: BattleUiCallbacks,
): BattleUiHandle {
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
  timePill.textContent = `남은 시간 ${formatTime(TIME_LIMIT_SECONDS)}`
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

  const fieldPanel = document.createElement('div')
  fieldPanel.className = 'panel battle-canvas-wrap'
  const canvas = document.createElement('canvas')
  canvas.className = 'battle-canvas'
  canvas.setAttribute('width', String(CANVAS_W))
  canvas.setAttribute('height', String(CANVAS_H))
  fieldPanel.appendChild(canvas)

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

  let activeSpeed = 1

  const speedButtons: Array<{ readonly speed: number; readonly el: HTMLButtonElement }> = []
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
    speedButtons.push({ speed: s, el: btn })
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

  const { ctx } = configureCanvas(canvas, CANVAS_W, CANVAS_H)

  // Cache HUD element refs — avoid querySelector per frame
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
    for (const b of speedButtons) {
      const selected = b.speed === activeSpeed
      b.el.classList.toggle('btn-primary', selected)
      b.el.setAttribute('aria-pressed', selected ? 'true' : 'false')
    }
  }

  syncSpeedButtons()

  function drawBattlefield(state: BattleState): void {
    clearCanvas(ctx, CANVAS_W, CANVAS_H, '#0b0f15')

    const padX = 56
    const usableW = CANVAS_W - padX * 2
    const tileW = usableW / BATTLEFIELD_TILES

    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    for (let t = 0; t <= BATTLEFIELD_TILES; t++) {
      const x = padX + t * tileW
      ctx.beginPath()
      ctx.moveTo(x, 56)
      ctx.lineTo(x, CANVAS_H - 56)
      ctx.stroke()
    }
    ctx.restore()

    const playerBasePct = state.battlefield.playerBase.hp / state.battlefield.playerBase.maxHp
    const enemyBasePct = state.battlefield.enemyBase.hp / state.battlefield.enemyBase.maxHp

    drawBar(ctx, 14, 16, 260, 10, playerBasePct, {
      track: 'rgba(255,255,255,0.08)',
      fill: 'rgba(79,195,247,0.95)',
      border: 'rgba(0,0,0,0.5)',
    })
    drawBar(ctx, CANVAS_W - 274, 16, 260, 10, enemyBasePct, {
      track: 'rgba(255,255,255,0.08)',
      fill: 'rgba(239,83,80,0.95)',
      border: 'rgba(0,0,0,0.5)',
    })

    drawText(ctx, `BASE ${Math.ceil(state.battlefield.playerBase.hp)}`, 14, 34, {
      color: 'rgba(230,230,230,0.9)',
      font: '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
    })
    drawText(ctx, `BASE ${Math.ceil(state.battlefield.enemyBase.hp)}`, CANVAS_W - 14, 34, {
      color: 'rgba(230,230,230,0.9)',
      font: '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
      align: 'right',
    })

    const laneSpacing = 44
    const enemyLaneStart = 100
    const playerLaneStart = 260

    for (const u of state.units) {
      if (u.state === 'dead') continue

      const x = padX + (u.position - 0.5) * tileW
      const laneY = u.side === 'enemy'
        ? enemyLaneStart + u.buildIndex * laneSpacing
        : playerLaneStart + u.buildIndex * laneSpacing
      const jitter = ((u.id % 5) - 2) * 2
      const y = laneY + jitter

      const fill = u.side === 'player' ? 'rgba(79,195,247,0.9)' : 'rgba(239,83,80,0.9)'
      const stroke = u.side === 'player' ? 'rgba(160,230,255,0.9)' : 'rgba(255,170,170,0.9)'
      const kind = shapeForMoveType(u.moveType)
      drawShape(ctx, kind, x, y, 10, { fill, stroke })

      const hpPct = u.hp / u.maxHp
      drawBar(ctx, x - 16, y - 20, 32, 5, hpPct, {
        track: 'rgba(255,255,255,0.1)',
        fill: u.side === 'player' ? 'rgba(79,195,247,0.95)' : 'rgba(239,83,80,0.95)',
        border: 'rgba(0,0,0,0.45)',
      })
    }
  }

  function updateHud(state: BattleState): void {
    const remaining = TIME_LIMIT_SECONDS - state.elapsedSeconds
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

    spBar.value = state.skillSystem.sp.current
    spText.textContent = `${Math.floor(state.skillSystem.sp.current)}/${SP_MAX}`

    for (let i = 0; i < 3; i++) {
      const cd = state.skillSystem.cooldowns[i]
      const name = state.skillSystem.deck[i]
      if (!cd || !name) continue

      const def = getSkillDefinition(name)
      const canAfford = state.skillSystem.sp.current >= def.spCost
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
    update(state: BattleState): void {
      updateHud(state)
      drawBattlefield(state)
    },
    destroy(): void {
      screen.remove()
    },
  }
}
