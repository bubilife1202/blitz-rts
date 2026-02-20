import { Container, type Application } from 'pixi.js'

export interface RenderLayers {
  background: Container
  ground: Container
  units: Container
  projectiles: Container
  effects: Container
  particles: Container
  overlay: Container
}

export function createLayers(app: Application): RenderLayers {
  const layers: RenderLayers = {
    background: new Container(),
    ground: new Container(),
    units: new Container(),
    projectiles: new Container(),
    effects: new Container(),
    particles: new Container(),
    overlay: new Container(),
  }

  app.stage.addChild(
    layers.background,
    layers.ground,
    layers.units,
    layers.projectiles,
    layers.effects,
    layers.particles,
    layers.overlay,
  )

  return layers
}
