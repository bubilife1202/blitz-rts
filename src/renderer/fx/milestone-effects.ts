import { Container, Graphics, Text } from 'pixi.js'
import type { BattleState } from '../../combat/battle'
import { triggerShake, type CameraState } from '../camera'
import { triggerFlash, type PostProcessState } from '../post-processing'
import { RENDER_W, RENDER_H } from '../pixi-app'

interface MilestoneText {
  text: Text
  timer: number
}

export interface MilestoneState {
  container: Container
  vignette: Graphics
  firstBloodFired: boolean
  killTimestamps: number[]
  baseAlerts: { player75: boolean; player50: boolean; player25: boolean; enemy75: boolean; enemy50: boolean; enemy25: boolean }
  halfwayFired: boolean
  criticalActive: boolean
  texts: MilestoneText[]
  vignetteAlpha: number
}

const TEXT_DURATION = 1.5
const VIGNETTE_FADE = 0.3

export function createMilestoneState(): MilestoneState {
  const container = new Container()

  // Vignette overlay (used for CRITICAL state)
  const vignette = new Graphics()
  vignette.alpha = 0
  container.addChild(vignette)

  return {
    container,
    vignette,
    firstBloodFired: false,
    killTimestamps: [],
    baseAlerts: { player75: false, player50: false, player25: false, enemy75: false, enemy50: false, enemy25: false },
    halfwayFired: false,
    criticalActive: false,
    texts: [],
    vignetteAlpha: 0,
  }
}

function showMilestoneText(
  state: MilestoneState,
  message: string,
  color: number,
): void {
  const text = new Text({
    text: message,
    style: {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: 28,
      fontWeight: '900',
      fill: color,
      letterSpacing: 6,
      dropShadow: {
        alpha: 0.7,
        blur: 6,
        distance: 0,
        color: 0x000000,
      },
      stroke: {
        color: 0x000000,
        width: 3,
      },
    },
  })
  text.anchor.set(0.5, 0.5)
  text.position.set(RENDER_W / 2, RENDER_H / 2 - 40)
  text.alpha = 0

  state.container.addChild(text)
  state.texts.push({ text, timer: TEXT_DURATION })
}

function drawVignette(gfx: Graphics, alpha: number, color: number): void {
  gfx.clear()
  if (alpha <= 0) return

  // Draw border rectangles for vignette effect
  const t = 20
  gfx.rect(0, 0, RENDER_W, t).fill({ color, alpha: alpha * 0.4 })
  gfx.rect(0, RENDER_H - t, RENDER_W, t).fill({ color, alpha: alpha * 0.4 })
  gfx.rect(0, 0, t, RENDER_H).fill({ color, alpha: alpha * 0.3 })
  gfx.rect(RENDER_W - t, 0, t, RENDER_H).fill({ color, alpha: alpha * 0.3 })
}

export function updateMilestones(
  state: MilestoneState,
  battle: BattleState,
  camera: CameraState,
  postProcess: PostProcessState,
  dt: number,
  time: number,
): void {
  // Count alive units
  let playerAlive = 0
  let enemyAlive = 0
  for (const u of battle.units) {
    if (u.state === 'dead') continue
    if (u.side === 'player') playerAlive++
    else enemyAlive++
  }
  const totalDead = battle.units.length - playerAlive - enemyAlive

  // FIRST BLOOD
  if (!state.firstBloodFired && totalDead > 0) {
    state.firstBloodFired = true
    showMilestoneText(state, 'FIRST BLOOD', 0xff4444)
    triggerShake(camera, 4)
  }

  // KILL STREAK: 3+ kills within 5 seconds
  // Track kill timestamps
  const prevDeadCount = state.killTimestamps.length > 0
    ? state.killTimestamps.length
    : 0
  if (totalDead > prevDeadCount) {
    // New kills happened
    for (let i = 0; i < totalDead - prevDeadCount; i++) {
      state.killTimestamps.push(time)
    }
  }
  // Check for 3 kills within 5s window
  const recentKills = state.killTimestamps.filter(t => time - t < 5)
  if (recentKills.length >= 3 && recentKills.length > state.killTimestamps.filter(t => time - t - dt < 5).length) {
    // Just crossed threshold
    if (recentKills.length === 3) {
      showMilestoneText(state, 'KILL STREAK', 0xffd700)
    }
  }

  // BASE ALERT
  const pHpPct = battle.battlefield.playerBase.hp / battle.battlefield.playerBase.maxHp
  const eHpPct = battle.battlefield.enemyBase.hp / battle.battlefield.enemyBase.maxHp

  if (pHpPct <= 0.75 && !state.baseAlerts.player75) {
    state.baseAlerts.player75 = true
    showMilestoneText(state, 'BASE UNDER ATTACK', 0xff6644)
    triggerShake(camera, 2)
  }
  if (pHpPct <= 0.50 && !state.baseAlerts.player50) {
    state.baseAlerts.player50 = true
    showMilestoneText(state, 'BASE CRITICAL', 0xff4444)
    triggerShake(camera, 3)
    triggerFlash(postProcess)
  }
  if (pHpPct <= 0.25 && !state.baseAlerts.player25) {
    state.baseAlerts.player25 = true
    showMilestoneText(state, 'BASE EMERGENCY', 0xff2222)
    triggerShake(camera, 5)
  }

  if (eHpPct <= 0.75 && !state.baseAlerts.enemy75) {
    state.baseAlerts.enemy75 = true
    showMilestoneText(state, 'ENEMY BASE DAMAGED', 0x4fc3f7)
  }
  if (eHpPct <= 0.50 && !state.baseAlerts.enemy50) {
    state.baseAlerts.enemy50 = true
    showMilestoneText(state, 'ENEMY BASE CRITICAL', 0x4fc3f7)
  }
  if (eHpPct <= 0.25 && !state.baseAlerts.enemy25) {
    state.baseAlerts.enemy25 = true
    showMilestoneText(state, 'ENEMY BASE FALLING', 0x00ff88)
    triggerFlash(postProcess)
  }

  // HALFWAY
  if (!state.halfwayFired && battle.elapsedSeconds >= 150) {
    state.halfwayFired = true
    showMilestoneText(state, '2:30 REMAINING', 0xffd700)
  }

  // CRITICAL: both bases below 30%
  const wasCritical = state.criticalActive
  state.criticalActive = pHpPct < 0.3 && eHpPct < 0.3

  if (state.criticalActive && !wasCritical) {
    showMilestoneText(state, 'CRITICAL PHASE', 0xff4444)
  }

  // Vignette for critical state
  if (state.criticalActive) {
    state.vignetteAlpha = Math.min(1, state.vignetteAlpha + dt / VIGNETTE_FADE)
  } else {
    state.vignetteAlpha = Math.max(0, state.vignetteAlpha - dt / VIGNETTE_FADE)
  }
  drawVignette(state.vignette, state.vignetteAlpha * 0.5, 0xff2222)

  // Animate milestone texts
  for (let i = state.texts.length - 1; i >= 0; i--) {
    const mt = state.texts[i]!
    mt.timer -= dt

    if (mt.timer <= 0) {
      state.container.removeChild(mt.text)
      mt.text.destroy()
      state.texts.splice(i, 1)
      continue
    }

    const life = mt.timer / TEXT_DURATION
    // Fade in for first 20%, hold, fade out last 20%
    if (life > 0.8) {
      mt.text.alpha = (1 - life) / 0.2
      mt.text.scale.set(1.2 - (1 - life) / 0.2 * 0.2)
    } else if (life < 0.2) {
      mt.text.alpha = life / 0.2
    } else {
      mt.text.alpha = 1
      mt.text.scale.set(1)
    }
  }
}
