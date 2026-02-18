import type { BattleConfig, BattleResult } from '../combat/battle'
import { createBattle } from '../combat/battle'
import { ENEMY_PRESETS } from '../data/enemies-data'
import type { PartId } from './types'
import type { Inventory } from '../assembly/inventory'
import { addGold, buyPart, createStartingInventory } from '../assembly/inventory'
import type { AssemblyResult } from '../ui/assembly-ui'
import { createAssemblyUi } from '../ui/assembly-ui'
import { createBattleUi } from '../ui/battle-ui'
import { createMainMenu } from '../ui/main-menu'
import { createResultUi } from '../ui/result-ui'
import { createShopUi } from '../ui/shop-ui'

type ScreenHandle = { destroy(): void }

export function startGame(): void {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) throw new Error('Missing #app root element')

  const root = document.createElement('div')
  root.className = 'app-root'
  app.replaceChildren(root)

  let current: ScreenHandle | null = null
  let enemyPresetIndex: number | null = null
  let lastAssembly: AssemblyResult | null = null
  let inventory: Inventory = createStartingInventory()

  let battleSpeed = 1
  let battlePaused = false
  let rafId: number | null = null
  let battleRunning = false

  function setScreen(next: ScreenHandle): void {
    if (battleRunning) {
      battleRunning = false
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = null
    }

    current?.destroy()
    current = next
  }

  function buildBattleConfig(seed: number): BattleConfig {
    if (enemyPresetIndex === null) throw new Error('Enemy preset not selected')
    if (!lastAssembly) throw new Error('Missing assembly config')

    const preset = ENEMY_PRESETS[enemyPresetIndex]
    if (!preset) throw new Error('Invalid enemy preset index')

    return {
      playerRoster: lastAssembly.roster,
      playerRatios: lastAssembly.ratios,
      playerDeck: lastAssembly.deck,
      enemyRoster: preset.roster,
      enemyRatios: preset.ratios,
      seed,
      ticksPerSecond: 20,
      timeLimitSeconds: 300,
    }
  }

  function goMenu(): void {
    setScreen(
      createMainMenu(
        root,
        inventory.gold,
        {
          onSelectEnemy(presetIndex) {
            enemyPresetIndex = presetIndex
            goAssembly()
          },
          onGoShop() {
            goShop()
          },
        },
      ),
    )
  }

  function goShop(): void {
    let handle: ReturnType<typeof createShopUi> | null = null
    handle = createShopUi(root, inventory, {
      onBuy(partId: PartId) {
        const next = buyPart(inventory, partId)
        if (!next) return
        inventory = next
        handle?.refresh(inventory)
      },
      onBack() {
        goMenu()
      },
    })
    setScreen(handle)
  }

  function goAssembly(): void {
    setScreen(
      createAssemblyUi(root, {
        onLaunch(result) {
          lastAssembly = result
          goBattle()
        },
      }),
    )
  }

  function goBattle(): void {
    if (enemyPresetIndex === null) {
      goMenu()
      return
    }
    if (!lastAssembly) {
      goAssembly()
      return
    }

    battleSpeed = 1
    battlePaused = false

    const config = buildBattleConfig(Date.now())
    const engine = createBattle(config)
    const ui = createBattleUi(root, {
      onSkillActivate(skillIndex) {
        engine.activateSkill(skillIndex)
      },
      onSpeedChange(speed) {
        battleSpeed = speed
        battlePaused = false
      },
      onPause() {
        battlePaused = !battlePaused
      },
    })

    setScreen(ui)
    battleRunning = true

    const frame = (): void => {
      if (!battleRunning) return

      if (!battlePaused) {
        const ticksPerFrame = battleSpeed
        for (let i = 0; i < ticksPerFrame; i++) {
          engine.tick()
        }
      }

      const state = engine.getState()
      ui.update(state)

      if (engine.isFinished()) {
        battleRunning = false
        const result = state.result
        if (!result) throw new Error('Battle finished without result')
        goResult(result)
        return
      }

      rafId = requestAnimationFrame(frame)
    }

    rafId = requestAnimationFrame(frame)
  }

  function goResult(result: BattleResult): void {
    const goldReward = getGoldReward(result)
    inventory = addGold(inventory, goldReward)
    setScreen(
      createResultUi(root, result, {
        onPlayAgain() {
          goBattle()
        },
        onBackToAssembly() {
          goAssembly()
        },
      }),
    )
  }

  function getGoldReward(result: BattleResult): number {
    switch (result.outcome) {
      case 'player_win':
        return 100
      case 'enemy_win':
        return 30
      case 'draw':
        return 50
    }
  }

  goMenu()
}
