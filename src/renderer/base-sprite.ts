import { Container, Graphics } from 'pixi.js'

export interface BaseSpriteState {
  container: Container
  structure: Graphics
  hpBar: Graphics
  hpBarBg: Graphics
  flashTimer: number
  side: 'player' | 'enemy'
}

const TOWER_W = 40
const TOWER_H = 80
const HP_BAR_W = 44
const HP_BAR_H = 5
const FLASH_DURATION = 0.15

export function createBaseSprite(side: 'player' | 'enemy'): BaseSpriteState {
  const container = new Container()

  const baseColor = side === 'player' ? 0x4fc3f7 : 0xef5350
  const darkColor = side === 'player' ? 0x1a3a4a : 0x4a1a1a

  // Tower structure
  const structure = new Graphics()

  // Subtle glow aura behind tower
  structure.circle(0, -4, 18)
    .fill({ color: baseColor, alpha: 0.05 })

  // Base platform
  structure.rect(-TOWER_W / 2 - 6, TOWER_H / 2 - 6, TOWER_W + 12, 10)
    .fill(darkColor)
  structure.rect(-TOWER_W / 2 - 6, TOWER_H / 2 - 6, TOWER_W + 12, 10)
    .stroke({ color: baseColor, width: 1.5, alpha: 0.5 })

  // Main tower body
  structure.rect(-TOWER_W / 2, -TOWER_H / 2, TOWER_W, TOWER_H)
    .fill(darkColor)
  structure.rect(-TOWER_W / 2, -TOWER_H / 2, TOWER_W, TOWER_H)
    .stroke({ color: baseColor, width: 2, alpha: 0.8 })

  // Top crown
  structure.rect(-TOWER_W / 2 - 5, -TOWER_H / 2 - 8, TOWER_W + 10, 10)
    .fill(darkColor)
  structure.rect(-TOWER_W / 2 - 5, -TOWER_H / 2 - 8, TOWER_W + 10, 10)
    .stroke({ color: baseColor, width: 1.5, alpha: 0.7 })

  // Antenna spire
  structure.moveTo(0, -TOWER_H / 2 - 8)
    .lineTo(0, -TOWER_H / 2 - 20)
    .stroke({ color: baseColor, width: 2, alpha: 0.9 })
  structure.circle(0, -TOWER_H / 2 - 20, 3)
    .fill({ color: baseColor, alpha: 0.7 })

  // Core light (larger)
  structure.circle(0, -4, 8)
    .fill({ color: baseColor, alpha: 0.35 })
  structure.circle(0, -4, 4)
    .fill({ color: 0xffffff, alpha: 0.6 })

  // Detail lines (more detail)
  structure.moveTo(-TOWER_W / 2 + 4, -TOWER_H / 2 + 12)
    .lineTo(TOWER_W / 2 - 4, -TOWER_H / 2 + 12)
    .stroke({ color: baseColor, width: 1, alpha: 0.3 })
  structure.moveTo(-TOWER_W / 2 + 4, 0)
    .lineTo(TOWER_W / 2 - 4, 0)
    .stroke({ color: baseColor, width: 1, alpha: 0.25 })
  structure.moveTo(-TOWER_W / 2 + 4, TOWER_H / 2 - 12)
    .lineTo(TOWER_W / 2 - 4, TOWER_H / 2 - 12)
    .stroke({ color: baseColor, width: 1, alpha: 0.3 })

  // Side panels
  structure.rect(-TOWER_W / 2 + 3, -TOWER_H / 2 + 16, 6, 20)
    .fill({ color: baseColor, alpha: 0.12 })
  structure.rect(TOWER_W / 2 - 9, -TOWER_H / 2 + 16, 6, 20)
    .fill({ color: baseColor, alpha: 0.12 })

  container.addChild(structure)

  // HP bar background
  const hpBarBg = new Graphics()
  hpBarBg.rect(-HP_BAR_W / 2, -TOWER_H / 2 - 14, HP_BAR_W, HP_BAR_H)
    .fill({ color: 0x333333, alpha: 0.7 })
  container.addChild(hpBarBg)

  // HP bar foreground
  const hpBar = new Graphics()
  container.addChild(hpBar)

  return {
    container,
    structure,
    hpBar,
    hpBarBg,
    flashTimer: 0,
    side,
  }
}

export function updateBaseSprite(
  state: BaseSpriteState,
  hpPct: number,
  dt: number,
): void {
  // Update HP bar
  state.hpBar.clear()
  const barW = HP_BAR_W * Math.max(0, hpPct)
  const barColor = hpPct > 0.5 ? 0x00ff88 : hpPct > 0.25 ? 0xffaa00 : 0xff4444
  state.hpBar.rect(-HP_BAR_W / 2, -TOWER_H / 2 - 14, barW, HP_BAR_H)
    .fill(barColor)

  // Flash effect
  if (state.flashTimer > 0) {
    state.flashTimer -= dt
    state.structure.alpha = 0.5 + Math.sin(state.flashTimer * 40) * 0.5
  } else {
    state.structure.alpha = 1
  }
}

export function triggerBaseFlash(state: BaseSpriteState): void {
  state.flashTimer = FLASH_DURATION
}
