import { Application } from 'pixi.js'

export const RENDER_W = 960
export const RENDER_H = 540

export async function createPixiApp(container: HTMLElement): Promise<Application> {
  const app = new Application()
  await app.init({
    width: RENDER_W,
    height: RENDER_H,
    backgroundColor: 0x0b0f15,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  })
  container.appendChild(app.canvas)
  return app
}
