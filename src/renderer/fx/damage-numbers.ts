import { Container, Text, type TextStyleOptions } from 'pixi.js'

interface DamageEntry {
  text: Text
  life: number
  vy: number
  active: boolean
}

export interface DamageNumberPool {
  container: Container
  entries: DamageEntry[]
}

const MAX_ENTRIES = 30
const LIFE_DURATION = 0.8
const RISE_SPEED = -60

const baseStyle: TextStyleOptions = {
  fontFamily: 'monospace',
  fontSize: 14,
  fontWeight: 'bold',
  fill: 0xff4444,
  stroke: { color: 0x000000, width: 2 },
}

export function createDamageNumberPool(): DamageNumberPool {
  const container = new Container()
  const entries: DamageEntry[] = []

  for (let i = 0; i < MAX_ENTRIES; i++) {
    const text = new Text({ text: '', style: { ...baseStyle } })
    text.anchor.set(0.5)
    text.visible = false
    container.addChild(text)

    entries.push({
      text,
      life: 0,
      vy: RISE_SPEED,
      active: false,
    })
  }

  return { container, entries }
}

export function showDamageNumber(
  pool: DamageNumberPool,
  x: number,
  y: number,
  damage: number,
  color: number = 0xff4444,
): void {
  for (const entry of pool.entries) {
    if (!entry.active) {
      entry.text.text = Math.round(damage).toString()
      entry.text.style.fill = color
      entry.text.position.set(x, y)
      entry.text.alpha = 1
      entry.text.scale.set(1)
      entry.text.visible = true
      entry.life = LIFE_DURATION
      entry.vy = RISE_SPEED
      entry.active = true
      return
    }
  }
}

export function updateDamageNumbers(pool: DamageNumberPool, dt: number): void {
  for (const entry of pool.entries) {
    if (!entry.active) continue

    entry.life -= dt
    entry.text.y += entry.vy * dt

    if (entry.life <= 0) {
      entry.active = false
      entry.text.visible = false
      continue
    }

    const lifeRatio = entry.life / LIFE_DURATION
    entry.text.alpha = lifeRatio
    entry.text.scale.set(0.8 + lifeRatio * 0.2)
  }
}
