export type CanvasSize = {
  readonly cssWidth: number
  readonly cssHeight: number
  readonly dpr: number
  readonly pixelWidth: number
  readonly pixelHeight: number
}

export function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D context not available')
  return ctx
}

export function configureCanvas(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
): { readonly ctx: CanvasRenderingContext2D; readonly size: CanvasSize } {
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1))
  const pixelWidth = Math.max(1, Math.floor(cssWidth * dpr))
  const pixelHeight = Math.max(1, Math.floor(cssHeight * dpr))

  canvas.width = pixelWidth
  canvas.height = pixelHeight

  const ctx = get2dContext(canvas)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  return {
    ctx,
    size: {
      cssWidth,
      cssHeight,
      dpr,
      pixelWidth,
      pixelHeight,
    },
  }
}

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
): void {
  ctx.save()
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  ctx.restore()
}

export function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke?: string,
): void {
  ctx.save()
  ctx.fillStyle = fill
  ctx.fillRect(x, y, w, h)
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, w, h)
  }
  ctx.restore()
}

export function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pct: number,
  params: {
    readonly track: string
    readonly fill: string
    readonly border: string
  },
): void {
  const p = Math.max(0, Math.min(1, pct))
  ctx.save()
  ctx.fillStyle = params.track
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = params.fill
  ctx.fillRect(x, y, w * p, h)
  ctx.strokeStyle = params.border
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, w, h)
  ctx.restore()
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  params: {
    readonly color: string
    readonly font: string
    readonly align?: CanvasTextAlign
    readonly baseline?: CanvasTextBaseline
  },
): void {
  ctx.save()
  ctx.fillStyle = params.color
  ctx.font = params.font
  ctx.textAlign = params.align ?? 'left'
  ctx.textBaseline = params.baseline ?? 'alphabetic'
  ctx.fillText(text, x, y)
  ctx.restore()
}

export type ShapeKind = 'triangle' | 'rect' | 'diamond' | 'wide-rect' | 'hex'

type Pt = { readonly x: number; readonly y: number }

function polygonPath(ctx: CanvasRenderingContext2D, points: readonly Pt[]): void {
  if (points.length === 0) return
  ctx.beginPath()
  ctx.moveTo(points[0]!.x, points[0]!.y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.y)
  }
  ctx.closePath()
}

function shapePoints(kind: ShapeKind, cx: number, cy: number, size: number): readonly Pt[] {
  const s = size
  switch (kind) {
    case 'triangle':
      return [
        { x: cx, y: cy - s },
        { x: cx + s, y: cy + s },
        { x: cx - s, y: cy + s },
      ]
    case 'rect':
      return [
        { x: cx - s, y: cy - s },
        { x: cx + s, y: cy - s },
        { x: cx + s, y: cy + s },
        { x: cx - s, y: cy + s },
      ]
    case 'wide-rect':
      return [
        { x: cx - s * 1.35, y: cy - s * 0.85 },
        { x: cx + s * 1.35, y: cy - s * 0.85 },
        { x: cx + s * 1.35, y: cy + s * 0.85 },
        { x: cx - s * 1.35, y: cy + s * 0.85 },
      ]
    case 'diamond':
      return [
        { x: cx, y: cy - s },
        { x: cx + s, y: cy },
        { x: cx, y: cy + s },
        { x: cx - s, y: cy },
      ]
    case 'hex':
      return [
        { x: cx - s * 0.9, y: cy - s * 0.5 },
        { x: cx, y: cy - s },
        { x: cx + s * 0.9, y: cy - s * 0.5 },
        { x: cx + s * 0.9, y: cy + s * 0.5 },
        { x: cx, y: cy + s },
        { x: cx - s * 0.9, y: cy + s * 0.5 },
      ]
  }
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  kind: ShapeKind,
  cx: number,
  cy: number,
  size: number,
  params: { readonly fill: string; readonly stroke: string },
): void {
  const points = shapePoints(kind, cx, cy, size)
  ctx.save()
  polygonPath(ctx, points)
  ctx.fillStyle = params.fill
  ctx.fill()
  ctx.strokeStyle = params.stroke
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()
}
