import { Container, Graphics } from 'pixi.js'

interface VisualEffect {
  gfx: Graphics | Container
  life: number
  maxLife: number
  update: (t: number, dt: number) => void
}

export interface SkillEffectState {
  container: Container
  activeEffects: VisualEffect[]
}

export function createSkillEffectState(): SkillEffectState {
  return {
    container: new Container(),
    activeEffects: [],
  }
}

export function updateSkillEffects(state: SkillEffectState, dt: number): void {
  for (let i = state.activeEffects.length - 1; i >= 0; i--) {
    const effect = state.activeEffects[i]!
    effect.life -= dt
    const t = 1 - effect.life / effect.maxLife // 0..1 progress

    if (effect.life <= 0) {
      state.container.removeChild(effect.gfx)
      effect.gfx.destroy()
      state.activeEffects.splice(i, 1)
      continue
    }

    effect.update(t, dt)
  }
}

function addEffect(state: SkillEffectState, effect: VisualEffect): void {
  state.container.addChild(effect.gfx)
  state.activeEffects.push(effect)
}

/** Gold hexagon expanding outward */
export function showShieldDome(state: SkillEffectState, x: number, y: number): void {
  const gfx = new Graphics()
  const maxLife = 1.0

  addEffect(state, {
    gfx,
    life: maxLife,
    maxLife,
    update(t) {
      gfx.clear()
      const radius = 10 + t * 30
      const alpha = 1 - t
      const sides = 6
      gfx.moveTo(
        x + Math.cos(0) * radius,
        y + Math.sin(0) * radius,
      )
      for (let i = 1; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2
        gfx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius)
      }
      gfx.stroke({ color: 0xffd700, width: 2, alpha })
    },
  })
}

/** Cyan expanding ring */
export function showEmpWave(state: SkillEffectState, cx: number, cy: number): void {
  const gfx = new Graphics()
  const maxLife = 0.8

  addEffect(state, {
    gfx,
    life: maxLife,
    maxLife,
    update(t) {
      gfx.clear()
      const radius = t * 80
      const alpha = 1 - t
      gfx.circle(cx, cy, radius).stroke({ color: 0x00ffff, width: 3, alpha })
      gfx.circle(cx, cy, radius * 0.7).stroke({ color: 0x4fc3f7, width: 1.5, alpha: alpha * 0.5 })
    },
  })
}

/** Gold pulsing area */
export function showOverchargeGlow(state: SkillEffectState, x: number, y: number): void {
  const gfx = new Graphics()
  const maxLife = 1.2

  addEffect(state, {
    gfx,
    life: maxLife,
    maxLife,
    update(t) {
      gfx.clear()
      const pulse = 1 + Math.sin(t * Math.PI * 6) * 0.3
      const radius = 20 * pulse
      const alpha = (1 - t) * 0.6
      gfx.circle(x, y, radius).fill({ color: 0xffd700, alpha: alpha * 0.3 })
      gfx.circle(x, y, radius).stroke({ color: 0xffaa00, width: 2, alpha })
    },
  })
}

/** Green rising crosses */
export function showRepairPulse(state: SkillEffectState, x: number, y: number): void {
  const gfx = new Graphics()
  const maxLife = 1.0

  addEffect(state, {
    gfx,
    life: maxLife,
    maxLife,
    update(t) {
      gfx.clear()
      const alpha = 1 - t
      const rise = t * 30
      // Draw 3 crosses at different offsets
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * 16
        const cy = y - rise - i * 8
        const cx = x + ox
        const s = 5
        gfx.rect(cx - 1, cy - s, 2, s * 2).fill({ color: 0x00ff88, alpha })
        gfx.rect(cx - s, cy - 1, s * 2, 2).fill({ color: 0x00ff88, alpha })
      }
    },
  })
}

/** Purple static noise */
export function showScrambleNoise(state: SkillEffectState, x: number, y: number): void {
  const gfx = new Graphics()
  const maxLife = 1.5

  addEffect(state, {
    gfx,
    life: maxLife,
    maxLife,
    update(t) {
      gfx.clear()
      const alpha = (1 - t) * 0.7
      for (let i = 0; i < 8; i++) {
        const ox = (Math.random() - 0.5) * 40
        const oy = (Math.random() - 0.5) * 40
        const size = 1 + Math.random() * 3
        const color = Math.random() > 0.5 ? 0xaa00ff : 0x8844ff
        gfx.rect(x + ox, y + oy, size, size).fill({ color, alpha })
      }
    },
  })
}

/** Red crosshair reticle */
export function showFocusReticle(state: SkillEffectState, x: number, y: number): void {
  const gfx = new Graphics()
  const maxLife = 0.8

  addEffect(state, {
    gfx,
    life: maxLife,
    maxLife,
    update(t) {
      gfx.clear()
      const alpha = 1 - t
      const r = 12 + t * 8
      // Outer ring
      gfx.circle(x, y, r).stroke({ color: 0xff2222, width: 2, alpha })
      // Crosshair lines
      const len = 8
      gfx.moveTo(x - r - len, y).lineTo(x - r + 4, y).stroke({ color: 0xff2222, width: 1.5, alpha })
      gfx.moveTo(x + r - 4, y).lineTo(x + r + len, y).stroke({ color: 0xff2222, width: 1.5, alpha })
      gfx.moveTo(x, y - r - len).lineTo(x, y - r + 4).stroke({ color: 0xff2222, width: 1.5, alpha })
      gfx.moveTo(x, y + r - 4).lineTo(x, y + r + len).stroke({ color: 0xff2222, width: 1.5, alpha })
    },
  })
}

/** Red explosion zones (artillery) */
export function showArtilleryImpact(state: SkillEffectState, x: number, y: number): void {
  const gfx = new Graphics()
  const maxLife = 1.0

  addEffect(state, {
    gfx,
    life: maxLife,
    maxLife,
    update(t) {
      gfx.clear()
      const alpha = (1 - t) * 0.8
      // Multiple impact rings
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * 30
        const delay = i * 0.15
        const localT = Math.max(0, t - delay) / (1 - delay)
        if (localT <= 0) continue
        const r = localT * 25
        gfx.circle(x + ox, y, r).fill({ color: 0xff4400, alpha: alpha * 0.3 })
        gfx.circle(x + ox, y, r).stroke({ color: 0xff2222, width: 2, alpha })
      }
    },
  })
}

/** Blue shield outline */
export function showFortifyShield(state: SkillEffectState, x: number, y: number): void {
  const gfx = new Graphics()
  const maxLife = 1.2

  addEffect(state, {
    gfx,
    life: maxLife,
    maxLife,
    update(t) {
      gfx.clear()
      const pulse = 1 + Math.sin(t * Math.PI * 4) * 0.15
      const alpha = (1 - t) * 0.7
      const r = 18 * pulse
      // Hexagonal shield outline
      const sides = 6
      gfx.moveTo(x + Math.cos(0) * r, y + Math.sin(0) * r)
      for (let i = 1; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2
        gfx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r)
      }
      gfx.stroke({ color: 0x4fc3f7, width: 2.5, alpha })
    },
  })
}

/** Orange speed lines */
export function showOverdriveLines(state: SkillEffectState, x: number, y: number): void {
  const gfx = new Graphics()
  const maxLife = 0.8

  // Pre-compute random line offsets
  const lines: { oy: number; len: number }[] = []
  for (let i = 0; i < 6; i++) {
    lines.push({ oy: (Math.random() - 0.5) * 30, len: 15 + Math.random() * 20 })
  }

  addEffect(state, {
    gfx,
    life: maxLife,
    maxLife,
    update(t) {
      gfx.clear()
      const alpha = 1 - t
      for (const line of lines) {
        const startX = x - 10 + t * 40
        gfx.moveTo(startX, y + line.oy)
          .lineTo(startX + line.len, y + line.oy)
          .stroke({ color: 0xff8800, width: 1.5, alpha })
      }
    },
  })
}

/** Golden energy burst (watt surge) */
export function showWattSurge(state: SkillEffectState, x: number, y: number): void {
  const gfx = new Graphics()
  const maxLife = 0.6

  addEffect(state, {
    gfx,
    life: maxLife,
    maxLife,
    update(t) {
      gfx.clear()
      const alpha = (1 - t) * 0.9
      // Expanding golden rings
      const r1 = t * 40
      const r2 = t * 25
      gfx.circle(x, y, r1).stroke({ color: 0xffd700, width: 3, alpha })
      gfx.circle(x, y, r2).fill({ color: 0xffaa00, alpha: alpha * 0.2 })
      // Radial spark lines
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2
        const inner = r2 * 0.5
        const outer = r1
        gfx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner)
          .lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer)
          .stroke({ color: 0xffd700, width: 1, alpha: alpha * 0.7 })
      }
    },
  })
}
