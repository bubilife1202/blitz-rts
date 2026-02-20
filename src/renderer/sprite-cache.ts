import { Texture } from 'pixi.js'
import type { Build } from '../core/types'
import { renderMechSvg } from '../ui/mech-renderer'

const textureCache = new Map<string, Texture>()
const loading = new Set<string>()

function buildKey(build: Build, side: 'player' | 'enemy'): string {
  return `${build.legsId}.${build.bodyId}.${build.weaponId}.${build.accessoryId ?? 'X'}.${side}`
}

function loadTexture(key: string, svgStr: string): void {
  if (loading.has(key)) return
  loading.add(key)

  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()

  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 600
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, 400, 600)
    URL.revokeObjectURL(url)

    const texture = Texture.from(canvas)
    textureCache.set(key, texture)
    loading.delete(key)
  }

  img.onerror = () => {
    URL.revokeObjectURL(url)
    loading.delete(key)
  }

  img.src = url
}

export function getMechTexture(build: Build, side: 'player' | 'enemy'): Texture | null {
  const key = buildKey(build, side)
  const cached = textureCache.get(key)
  if (cached) return cached

  const svgStr = renderMechSvg(build, 400, side)
  loadTexture(key, svgStr)
  return null
}

export function preloadMechTexture(build: Build, side: 'player' | 'enemy'): void {
  const key = buildKey(build, side)
  if (textureCache.has(key) || loading.has(key)) return
  const svgStr = renderMechSvg(build, 400, side)
  loadTexture(key, svgStr)
}
